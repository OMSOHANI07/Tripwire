import "server-only";
import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import type { Explanation, OptionView, ResultsView } from "../api-types";
import { templateExplanations } from "../explain-template";
import { formatRange } from "../format";
import { db } from "./supabase";
import type { TripRow } from "./trips";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
/** Bump when the prompt changes so cached explanations are regenerated. */
const PROMPT_VERSION = 3;

interface CachedExplanations {
  source: "ai" | "template";
  items: Record<string, Explanation>;
}

/** Identifies the exact computed results an explanation was written for. */
export function explanationKey(options: OptionView[]): string {
  const basis = options.map((o) => [o.destinationId, o.groupScore, o.window, o.fits.map((f) => [f.name, f.fit])]);
  return createHash("sha256").update(JSON.stringify([PROMPT_VERSION, basis])).digest("hex").slice(0, 32);
}

/** Cached explanations if they match the current results. */
export function cachedFor(trip: TripRow, options: OptionView[]): CachedExplanations | null {
  if (!trip.explanations || trip.explanations_key !== explanationKey(options)) return null;
  return trip.explanations as CachedExplanations;
}

/** Attach cached or template explanations to a results view (no AI call). */
export function withExplanations(view: ResultsView, trip: TripRow): ResultsView {
  const options = view.options ?? [];
  if (options.length === 0) return view;
  const cached = cachedFor(trip, options);
  if (cached) {
    return { ...view, explanations: cached.items, explanationSource: cached.source, explanationsStale: false };
  }
  return {
    ...view,
    explanations: templateExplanations(options),
    explanationSource: "template",
    explanationsStale: Boolean(process.env.GEMINI_API_KEY),
  };
}

/**
 * Only the computed results go to Gemini: destination, dates, cost, scores
 * and trade-offs. No raw form answers, notes, budgets or tokens.
 */
function promptFor(options: OptionView[], people: string[]): string {
  const payload = options.map((o, i) => ({
    rank: i + 1,
    destinationId: o.destinationId,
    destination: `${o.name}, ${o.state}`,
    types: o.types,
    dates: o.window ? formatRange(o.window.start, o.window.end) : null,
    estCostPerPersonINR: o.cost,
    groupScore: o.groupScore,
    perPersonFit: o.fits.map((f) => ({ name: f.name, fit: f.fit, components: f.parts })),
    tradeOffs: o.tradeOffs,
    dreamDestinationOf: o.dreamOf,
  }));
  return [
    `A group of friends (${people.join(", ")}) is choosing a 3–4 day trip in India.`,
    "A deterministic scoring engine already ranked the top options. Fit scores are 0–100 per person;",
    "components are budget headroom, destination-type preference, travel time and season (each 0–100).",
    "For EACH option write, in a warm, casual tone a friend would use in a group chat:",
    '- "why": 2–3 sentences on why it works for this group. Talk in human terms (it\'s cheap, it\'s their favourite',
    "  kind of trip, short journey, great time of year) and name people. Mention at most two numbers, e.g. the group",
    "  score or the cost in rupees (write ₹9,000, not INR). Never quote the component scores themselves.",
    '- "compromise": one sentence naming who compromises most and why, in plain words (e.g. "not really their kind of',
    '  trip", "a long journey from home"). Use they/them for everyone.',
    "If dreamDestinationOf lists anyone, mention warmly that it's their dream destination.",
    "Do not change, re-rank or invent scores, prices or facts. Plain text, no markdown.",
    "",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

async function askGemini(options: OptionView[], people: string[]): Promise<Record<string, Explanation>> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: promptFor(options, people),
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                destinationId: { type: "string" },
                why: { type: "string" },
                compromise: { type: "string" },
              },
              required: ["destinationId", "why", "compromise"],
            },
          },
        },
        required: ["options"],
      },
      abortSignal: AbortSignal.timeout(20_000),
    },
  });
  const parsed = JSON.parse(res.text ?? "{}") as { options?: (Explanation & { destinationId: string })[] };
  const items: Record<string, Explanation> = {};
  for (const o of options) {
    const hit = parsed.options?.find((x) => x.destinationId === o.destinationId);
    if (!hit?.why || !hit?.compromise) throw new Error(`Gemini response missing ${o.destinationId}`);
    items[o.destinationId] = { why: hit.why.trim(), compromise: hit.compromise.trim() };
  }
  return items;
}

/**
 * Generate (or reuse) explanations for the current results and cache them on
 * the trip. Falls back to templates if there's no key or Gemini fails.
 */
export async function ensureExplanations(view: ResultsView, trip: TripRow): Promise<ResultsView> {
  const options = view.options ?? [];
  if (options.length === 0) return view;
  const cached = cachedFor(trip, options);
  if (cached) return withExplanations(view, trip);

  const key = explanationKey(options);
  let result: CachedExplanations;
  if (!process.env.GEMINI_API_KEY) {
    result = { source: "template", items: templateExplanations(options) };
  } else {
    try {
      result = { source: "ai", items: await askGemini(options, view.people ?? []) };
    } catch (e) {
      console.error("Gemini explainer failed, using template:", e instanceof Error ? e.message : e);
      // Don't cache a failure: we'll retry Gemini on the next visit.
      return { ...view, explanations: templateExplanations(options), explanationSource: "template", explanationsStale: false };
    }
  }
  await db().from("trips").update({ explanations: result, explanations_key: key }).eq("id", trip.id);
  trip.explanations = result;
  trip.explanations_key = key;
  return { ...view, explanations: result.items, explanationSource: result.source, explanationsStale: false };
}
