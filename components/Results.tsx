"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DestPhoto, PinIcon } from "./brand";
import { CopyButton } from "./CopyButton";
import { btn, Card, Loading, Notice } from "./ui";
import type { Explanation, MeView, OptionView, ResultsView, TripPublic } from "@/lib/api-types";
import { api, links, loadToken } from "@/lib/client";
import { formatDeadline, formatRange, inr, listNames, plural, TYPE_EMOJI, TYPE_LABELS } from "@/lib/format";
import type { DateNote } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Data hook: results + (lazy) AI explanations
// ---------------------------------------------------------------------------

export function useResults(tripId: string) {
  const [data, setData] = useState<ResultsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Ask the server to (re)generate the AI explanations, then swap them in.
  const explain = useCallback(() => {
    setExplaining(true);
    api<{ explanations: Record<string, Explanation>; explanationSource: "ai" | "template" }>(`/api/trips/${tripId}/explain`, { method: "POST", body: {} })
      .then((e) => setData((d) => (d ? { ...d, explanations: e.explanations, explanationSource: e.explanationSource, explanationsStale: false } : d)))
      .catch(() => {})
      .finally(() => setExplaining(false));
  }, [tripId]);

  const load = useCallback(
    () =>
      api<ResultsView>(`/api/trips/${tripId}/results`).then(
        (r) => {
          setData(r);
          setError(null);
          if (r.explanationsStale) explain();
        },
        (e) => setError(e instanceof Error ? e.message : "Couldn't load results"),
      ),
    [tripId, explain],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, explaining, reload: load };
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

export function scoreClass(n: number): string {
  if (n >= 80) return "bg-emerald-700 text-white";
  if (n >= 65) return "bg-amber-300 text-slate-900";
  return "bg-red-700 text-white";
}

export function summaryMessage(trip: TripPublic, people: string[]): string {
  const d = trip.decided!;
  const lines = [
    `✅ Trip decided: ${d.name}!`,
    d.start && d.end ? `📅 ${formatRange(d.start, d.end)}` : null,
    d.cost ? `💸 About ${inr(d.cost)} per person (excluding travel)` : null,
    `👥 Going: ${listNames(people.length ? people : trip.participants.map((p) => p.name))}`,
    `🔗 Details: ${links.results(trip.id)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function DecisionBanner({ trip, people }: { trip: TripPublic; people: string[] }) {
  const d = trip.decided;
  if (!d) return null;
  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white shadow-lg shadow-brand-900/20" role="status">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-100">Trip decided 🎉</p>
      <p className="mt-1 font-display text-3xl font-bold text-white">{d.name}</p>
      <p className="mt-1 text-brand-50">
        {d.start && d.end ? formatRange(d.start, d.end) : "Dates to confirm"}
        {d.cost ? ` · about ${inr(d.cost)} per person` : ""}
      </p>
      <p className="mt-1 text-sm text-brand-100">Going: {listNames(people.length ? people : trip.participants.map((p) => p.name))}</p>
      <div className="mt-4">
        <CopyButton
          text={summaryMessage(trip, people)}
          label="Copy summary for WhatsApp"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-brand-900 hover:bg-brand-50"
        />
      </div>
    </div>
  );
}

function OptionCard({
  o,
  rank,
  explanation,
  explaining,
  aiSource,
  votes,
  myVote,
  canVote,
  onVote,
  voting,
  isWinner,
}: {
  o: OptionView;
  rank: number;
  explanation?: Explanation;
  explaining: boolean;
  aiSource: boolean;
  votes: number;
  myVote: boolean;
  canVote: boolean;
  onVote: () => void;
  voting: boolean;
  isWinner: boolean;
}) {
  return (
    <Card className={`space-y-4 overflow-hidden p-0! sm:p-0! ${isWinner ? "ring-2 ring-brand-600" : ""}`}>
      <div className="relative">
        <DestPhoto id={o.destinationId} alt={o.name} sizes="(min-width: 768px) 720px, 100vw" className="h-44 sm:h-52" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Option {String.fromCharCode(64 + rank)}
        </span>
        <div className="absolute right-4 top-4 rounded-2xl bg-white/95 px-3 py-1.5 text-center shadow-md">
          <p className="font-display text-2xl font-bold leading-none text-brand-700">{o.groupScore}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">group score</p>
        </div>
        <div className="absolute inset-x-4 bottom-3">
          <h3 className="flex items-center gap-1.5 text-2xl font-bold text-white">
            <PinIcon className="h-5 w-5 text-brand-300" /> {o.name}
          </h3>
          <p className="text-sm text-slate-200">{o.state}</p>
        </div>
      </div>
      <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">

      <div className="flex flex-wrap gap-1.5">
        {o.types.map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            <span aria-hidden className="mr-1">{TYPE_EMOJI[t]}</span>
            {TYPE_LABELS[t]}
          </span>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">Best dates</dt>
          <dd className="font-semibold text-slate-900">{o.window ? formatRange(o.window.start, o.window.end) : "No shared window"}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">Est. cost / person</dt>
          <dd className="font-semibold text-slate-900">{inr(o.cost)}</dd>
          <dd className="text-xs text-slate-500">{inr(o.costMin)}–{inr(o.costMax)}, excl. travel</dd>
        </div>
      </dl>

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          Why it works
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">
            {explaining ? "AI writing…" : aiSource ? "✨ AI summary" : "Auto summary"}
          </span>
        </p>
        <p className="text-sm leading-relaxed text-slate-700">{explanation?.why}</p>
        {explanation?.compromise && <p className="text-sm text-slate-700"><strong>Who compromises most:</strong> {explanation.compromise}</p>}
      </div>

      {o.tradeOffs.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900">Trade-offs</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
            {o.tradeOffs.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-600">{plural(votes, "vote")}{isWinner && votes > 0 ? " · leading" : ""}</p>
        {canVote && (
          <button type="button" onClick={onVote} disabled={voting || myVote} aria-pressed={myVote} className={myVote ? btn.small + " border-brand-700 bg-brand-50 text-brand-900" : btn.small}>
            {myVote ? "✓ Your vote" : voting ? "Voting…" : `Vote for ${o.name}`}
          </button>
        )}
      </div>
      </div>
    </Card>
  );
}

export function StandsGrid({ options, people }: { options: OptionView[]; people: string[] }) {
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Where each person stands</h2>
      <p className="text-sm text-slate-500">Fit for each person, 0–100.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-1 text-sm sm:border-spacing-1.5">
          <caption className="sr-only">Per-person fit scores for each option</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[5.5rem] text-left text-xs font-medium text-slate-500 sm:w-28 sm:text-sm">Person</th>
              {options.map((o, i) => (
                <th key={o.destinationId} scope="col" className="break-words text-center text-xs font-semibold leading-tight text-slate-800 sm:text-sm">
                  <span className="block text-xs font-medium text-slate-500">Option {String.fromCharCode(65 + i)}</span>
                  {o.name.split(" (")[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((name) => (
              <tr key={name}>
                <th scope="row" className="truncate pr-1 text-left font-semibold text-slate-900">{name}</th>
                {options.map((o) => {
                  const f = o.fits.find((x) => x.name === name);
                  const n = f?.fit ?? 0;
                  return (
                    <td key={o.destinationId} className={`rounded-lg py-2 text-center font-bold tabular-nums ${scoreClass(n)}`}
                      title={f ? `Budget ${f.parts.budget} · Type ${f.parts.type} · Travel ${f.parts.travel} · Season ${f.parts.season}` : undefined}>
                      {n}
                      {n < 65 && <span className="sr-only"> (low)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-700" /> 80+ great</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-300" /> 65–79 okay</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-700" /> below 65 compromise</span>
      </div>
    </Card>
  );
}

function DateNotes({ notes }: { notes: DateNote[] }) {
  if (notes.length === 0) return null;
  const sorted = [...notes].sort((a, b) => Number(b.everyone) - Number(a.everyone));
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Date notes</h2>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {sorted.map((n) => (
          <li key={n.start}>
            {n.everyone ? (
              <><strong>Nobody can make {formatRange(n.start, n.end)}</strong></>
            ) : (
              <>
                <strong>{formatRange(n.start, n.end)}:</strong> {listNames(n.unavailable)} can&apos;t make it
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BlockedOption({ o, hideDates }: { o: OptionView; hideDates: boolean }) {
  const blocks = hideDates ? o.blocks.filter((b) => b.rule !== "dates") : o.blocks;
  return (
    <Card className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">{o.name}</h3>
        <span className="text-sm text-slate-500">{inr(o.cost)} / person</span>
      </div>
      {blocks.length === 0 ? (
        <p className="text-sm text-slate-700">Works for everyone apart from the dates.</p>
      ) : (
        <p className="text-sm font-medium text-slate-800">{hideDates ? "Also blocked by:" : "Blocked by:"}</p>
      )}
      <ul className="space-y-1 text-sm">
        {blocks.map((b, i) => (
          <li key={i} className="flex gap-2 text-slate-700">
            <span className="h-fit shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-800">{b.name}</span>
            {b.detail}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ResultsPage({ tripId, token: urlToken }: { tripId: string; token?: string | null }) {
  const { data, error, explaining, reload } = useResults(tripId);
  const [token] = useState<string | null>(() => urlToken ?? loadToken(tripId));
  const [me, setMe] = useState<MeView | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    if (token) api<MeView>(`/api/trips/${tripId}/me?token=${encodeURIComponent(token)}`).then(setMe, () => setMe(null));
  }, [tripId, token]);

  async function vote(destinationId: string) {
    if (!token) return;
    setVoting(destinationId);
    setVoteError(null);
    try {
      await api(`/api/trips/${tripId}/votes`, { body: { token, destinationId } });
      setMe((m) => (m ? { ...m, voteDestinationId: destinationId } : m));
      await reload();
    } catch (e) {
      setVoteError(e instanceof Error ? e.message : "Couldn't save your vote");
    } finally {
      setVoting(null);
    }
  }

  if (error && !data) return <Notice tone="error" title="Couldn't load results">{error}</Notice>;
  if (!data) return <Loading label="Crunching the numbers…" />;
  const { trip } = data;

  const header = (
    <div>
      <p className="text-sm font-medium text-brand-700">Results</p>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{trip.name}</h1>
    </div>
  );

  if (data.locked) {
    const missing = trip.participants.filter((p) => !p.submitted).map((p) => p.name);
    return (
      <div className="space-y-5">
        {header}
        <Notice tone="info" title="Results are locked for now 🔒">
          They unlock when everyone has submitted, or at the deadline ({formatDeadline(trip.deadline)}), whichever comes first.{" "}
          {trip.submittedCount}/{trip.total} are in; waiting on {listNames(missing)}.
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Link href={`/t/${tripId}/status`} className={btn.primary}>See who&apos;s missing</Link>
          <Link href={`/t/${tripId}`} className={btn.secondary}>Fill in the form</Link>
        </div>
      </div>
    );
  }

  const options = data.options ?? [];
  const people = data.people ?? [];
  const votes = data.votes;
  const eligible = Boolean(me && people.includes(me.participant.name));
  const canVote = eligible && !trip.decided && options.length > 0;

  return (
    <div className="space-y-5">
      {header}
      <DecisionBanner trip={trip} people={people} />

      {trip.partial && (
        <Notice tone="warn" title={`Partial: based on ${data.basedOn} of ${trip.total}`}>
          The deadline passed before everyone submitted. {listNames(trip.participants.filter((p) => !p.submitted).map((p) => p.name))}{" "}
          {trip.total - (data.basedOn ?? 0) === 1 ? "isn't" : "aren't"} counted.
        </Notice>
      )}

      {data.status === "ok" && (
        <>
          <p className="text-sm text-slate-600">
            {plural(data.commonWindowCount ?? 0, "date window")} work for everyone.{" "}
            Top 3 of the destinations that pass everyone&apos;s budget and dealbreakers, ranked by group score.
          </p>

          {!trip.decided && votes && (
            <Card className="space-y-2">
              <h2 className="font-semibold text-slate-900">Final decision: vote for one</h2>
              <p className="text-sm text-slate-700">
                {votes.voted.length}/{people.length} voted.
                {votes.notVoted.length > 0 && <> Waiting on {listNames(votes.notVoted)}.</>} Most votes wins; a tie goes to the higher group score.
                You can change your vote until the organizer locks it.
              </p>
              {me && !eligible && <Notice tone="warn">Your answers weren&apos;t counted (submitted after the deadline?), so you can&apos;t vote.</Notice>}
              {!me && (
                <p className="text-sm text-slate-500">To vote, open your personal link (the one you got after submitting) on this device.</p>
              )}
              {me && eligible && <p className="text-sm text-slate-700">Voting as <strong>{me.participant.name}</strong>.</p>}
              {voteError && <Notice tone="error">{voteError}</Notice>}
            </Card>
          )}

          <div className="space-y-4">
            {options.map((o, i) => (
              <OptionCard
                key={o.destinationId}
                o={o}
                rank={i + 1}
                explanation={data.explanations?.[o.destinationId]}
                explaining={explaining}
                aiSource={data.explanationSource === "ai"}
                votes={votes?.counts[o.destinationId] ?? 0}
                myVote={me?.voteDestinationId === o.destinationId}
                canVote={canVote}
                onVote={() => vote(o.destinationId)}
                voting={voting === o.destinationId}
                isWinner={trip.decided ? trip.decided.destinationId === o.destinationId : (votes?.totalVotes ?? 0) > 0 && votes?.winnerId === o.destinationId}
              />
            ))}
          </div>

          <StandsGrid options={options} people={people} />
        </>
      )}

      {data.status === "none_pass" && (
        <>
          <Notice tone="warn" title="No destination works for everyone yet">
            Every option breaks at least one person&apos;s hard rule. Here are the closest ones and exactly what blocks each. Someone
            relaxing one rule (and editing before the deadline) could unlock them.
          </Notice>
          {data.commonWindowCount === 0 && (
            <Notice tone="error" title={`No ${trip.tripLength}-day stretch works for everyone`}>
              {(data.closest?.[0]?.blocks ?? [])
                .filter((b) => b.rule === "dates")
                .map((b) => b.detail)
                .join(". ")}
              . Check the date notes below to see who can&apos;t make what.
            </Notice>
          )}
          <div className="space-y-4">
            {(data.closest ?? []).map((o) => (
              <BlockedOption key={o.destinationId} o={o} hideDates={data.commonWindowCount === 0} />
            ))}
          </div>
        </>
      )}

      {data.status === "no_participants" && <Notice tone="warn">Nobody submitted before the deadline, so there&apos;s nothing to score.</Notice>}

      <DateNotes notes={data.dateNotes ?? []} />

      {(data.filteredOut?.length ?? 0) > 0 && (
        <Card>
          <details>
            <summary className="cursor-pointer font-semibold text-slate-900">Why not…? (strong options that got filtered out)</summary>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {data.filteredOut!.map((f) => (
                <li key={f.name}>
                  <strong>{f.name}:</strong> {f.reasons.join("; ")}
                </li>
              ))}
            </ul>
          </details>
        </Card>
      )}
    </div>
  );
}
