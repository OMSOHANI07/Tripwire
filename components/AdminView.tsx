"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CompletionTracker } from "./CompletionTracker";
import { LinkBox } from "./CopyButton";
import { DecisionBanner, useResults } from "./Results";
import { btn, Card, Loading, Notice } from "./ui";
import { ApiError, api, links, rememberTrip } from "@/lib/client";
import { formatRange, listNames, suggestionLine } from "@/lib/format";

export function AdminView({ tripId, orgKey }: { tripId: string; orgKey: string | null }) {
  const [authed, setAuthed] = useState<boolean | null>(orgKey ? null : false);
  const { data, error, reload } = useResults(tripId);
  const [confirming, setConfirming] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgKey) return;
    api(`/api/trips/${tripId}/admin?key=${encodeURIComponent(orgKey)}`)
      .then(() => {
        setAuthed(true);
        rememberTrip({ tripId, organizerKey: orgKey });
      })
      .catch(() => setAuthed(false));
  }, [tripId, orgKey]);

  // Keep the tracker fresh while the organizer has the page open.
  useEffect(() => {
    const id = setInterval(reload, 20000);
    return () => clearInterval(id);
  }, [reload]);

  async function lock(confirm: boolean) {
    setLocking(true);
    setLockError(null);
    try {
      await api(`/api/trips/${tripId}/lock`, { body: { key: orgKey, confirm } });
      setConfirming(false);
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === "confirm_required") setConfirming(true);
      else setLockError(e instanceof Error ? e.message : "Couldn't lock the decision");
    } finally {
      setLocking(false);
    }
  }

  if (authed === false) {
    return (
      <Notice tone="error" title="This organizer link isn't valid">
        Check you copied the whole link, including the part after <code>?key=</code>. Just want to fill in the form?{" "}
        <Link className="underline" href={`/t/${tripId}`}>Go to the trip</Link>.
      </Notice>
    );
  }
  if (error && !data) return <Notice tone="error" title="Couldn't load this trip">{error}</Notice>;
  if (authed === null || !data) return <Loading />;

  const { trip } = data;
  const options = data.options ?? [];
  const votes = data.votes;
  const allVoted = votes ? votes.notVoted.length === 0 && votes.voted.length > 0 : false;
  const leader = options.find((o) => o.destinationId === votes?.winnerId);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-brand-700">Organizer view</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{trip.name}</h1>
      </div>

      <DecisionBanner trip={trip} people={data.people ?? []} />
      <CompletionTracker trip={trip} />

      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900">Links</h2>
        <LinkBox label="Share link (for the group)" url={links.share(tripId)} />
        <LinkBox label="Status page (safe to share)" url={links.status(tripId)} />
        <LinkBox label="Results page" url={links.results(tripId)} />
      </Card>

      {!data.locked && !trip.decided && (
        <Card className="space-y-3">
          <h2 className="font-semibold text-slate-900">Final decision</h2>
          {options.length === 0 ? (
            <Notice tone="warn">
              No destination passes everyone&apos;s filters, so there&apos;s nothing to vote on yet. See the results page for what&apos;s blocking.
              {data.dateSuggestion && (
                <p className="mt-1 font-medium">
                  <span aria-hidden>💡 </span>Dates: {suggestionLine(data.dateSuggestion, data.basedOn ?? trip.total)}
                </p>
              )}
            </Notice>
          ) : (
            <>
              <ul className="space-y-1 text-sm">
                {options.map((o) => (
                  <li key={o.destinationId} className="flex justify-between gap-3">
                    <span>
                      {o.name} <span className="text-slate-500">· score {o.groupScore}{o.window ? ` · ${formatRange(o.window.start, o.window.end)}` : ""}</span>
                    </span>
                    <strong className="tabular-nums">{votes?.counts[o.destinationId] ?? 0}</strong>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-700">
                {votes?.voted.length}/{(data.people ?? []).length} voted.{" "}
                {votes && votes.notVoted.length > 0 ? <>Waiting on {listNames(votes.notVoted)}.</> : "Everyone has voted."}{" "}
                {leader && <>Locking now picks <strong>{leader.name}</strong>{votes?.totalVotes ? "" : " (highest group score, no votes yet)"}.</>}
              </p>
              {confirming ? (
                <div className="space-y-2 rounded-xl border border-orange-300 bg-orange-50 p-3">
                  <p className="text-sm font-medium text-orange-900">
                    {votes?.notVoted.length} still to vote. Lock the decision anyway? This can&apos;t be undone.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btn.danger} disabled={locking} onClick={() => lock(true)}>
                      {locking ? "Locking…" : "Yes, lock it"}
                    </button>
                    <button type="button" className={btn.secondary} onClick={() => setConfirming(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" className={`${allVoted ? btn.primary : btn.secondary} w-full sm:w-auto`} disabled={locking} onClick={() => lock(allVoted)}>
                  {locking ? "Locking…" : allVoted ? "Lock decision" : "Lock decision early…"}
                </button>
              )}
              {lockError && <Notice tone="error">{lockError}</Notice>}
            </>
          )}
          <Link href={`/t/${tripId}/results`} className="inline-block text-sm font-medium text-brand-800 underline">Open full results →</Link>
        </Card>
      )}
    </div>
  );
}
