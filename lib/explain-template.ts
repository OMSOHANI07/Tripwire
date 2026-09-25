// Template-generated explanations: used when Gemini isn't configured or fails,
// so the results page always has a readable "why" for every option.
import type { Explanation, OptionView } from "./api-types";
import { formatRange, inr, TYPE_LABELS } from "./format";

const PART_LABELS: Record<string, string> = {
  budget: "budget",
  type: "the kind of trip",
  travel: "travel time",
  season: "timing",
};

export function templateExplanation(o: OptionView): Explanation {
  const types = o.types.map((t) => TYPE_LABELS[t].toLowerCase()).join(" and ");
  const dates = o.window ? ` The best window is ${formatRange(o.window.start, o.window.end)}.` : "";
  const sorted = [...o.fits].sort((a, b) => b.fit - a.fit);
  const top = sorted.slice(0, 2).map((f) => f.name);
  const why =
    `${o.name} is a ${types} pick at about ${inr(o.cost)} per person, within everyone's budget, ` +
    `with an average fit of ${o.avgFit}/100.` +
    dates +
    (top.length ? ` It suits ${top.join(" and ")} best.` : "");

  const low = sorted[sorted.length - 1];
  let compromise = "Nobody gives up much here.";
  if (low && o.fits.length > 1) {
    const weakest = (Object.entries(low.parts) as [string, number][]).sort((a, b) => a[1] - b[1])[0];
    compromise = `${low.name} compromises most (fit ${low.fit}), mainly on ${PART_LABELS[weakest[0]]}.`;
  }
  return { why, compromise };
}

export function templateExplanations(options: OptionView[]): Record<string, Explanation> {
  return Object.fromEntries(options.map((o) => [o.destinationId, templateExplanation(o)]));
}
