"use client";

import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { btn, Card, Notice } from "./ui";
import type { TripPublic } from "@/lib/api-types";
import { links } from "@/lib/client";
import { formatDeadline, listNames, plural } from "@/lib/format";

export function reminderMessage(trip: TripPublic): string {
  const missing = trip.participants.filter((p) => !p.submitted).map((p) => p.name);
  const hey = missing.length ? `Hey ${listNames(missing)}! 👋` : "Hey all! 👋";
  return (
    `${hey} We're nearly there on "${trip.name}". ${trip.submittedCount}/${trip.total} of us have filled in the trip form. ` +
    `It takes about 2 minutes: ${links.share(trip.id)}\n` +
    `Submissions close ${formatDeadline(trip.deadline)}, then we get our top 3 options. 🙏`
  );
}

/** "4/5 submitted", who's missing, and a copy-ready WhatsApp nudge. */
export function CompletionTracker({ trip }: { trip: TripPublic }) {
  const missing = trip.participants.filter((p) => !p.submitted);
  const pct = trip.total ? Math.round((trip.submittedCount / trip.total) * 100) : 0;

  return (
    <Card className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Who&apos;s in</h2>
          <p className="text-3xl font-bold text-slate-900">
            {trip.submittedCount}/{trip.total} <span className="text-base font-medium text-slate-600">submitted</span>
          </p>
        </div>
        {trip.resultsAvailable && (
          <Link href={`/t/${trip.id}/results`} className={btn.small}>
            Results →
          </Link>
        )}
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={trip.submittedCount} aria-valuemin={0} aria-valuemax={trip.total} aria-label="Submissions">
        <div className="h-full rounded-full bg-brand-700 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex flex-wrap gap-2">
        {trip.participants.map((p) => (
          <li key={p.id} className={`rounded-full px-3 py-1 text-sm font-medium ${p.submitted ? "bg-emerald-100 text-emerald-900" : "border border-dashed border-slate-300 text-slate-600"}`}>
            {p.submitted ? "✓ " : "… "}
            {p.name}
            <span className="sr-only">{p.submitted ? " (submitted)" : " (not yet)"}</span>
          </li>
        ))}
      </ul>

      {trip.decided ? null : missing.length === 0 ? (
        <Notice tone="success" title="Everyone's in! Results are unlocked.">
          People can still tweak answers until {formatDeadline(trip.deadline)}.
        </Notice>
      ) : trip.deadlinePassed ? (
        <Notice tone="warn" title={`Deadline passed. Partial: based on ${trip.submittedCount} of ${trip.total}`}>
          {listNames(missing.map((p) => p.name))} didn&apos;t submit in time. Results use the answers as they stood at {formatDeadline(trip.deadline)}.
        </Notice>
      ) : (
        <>
          <p className="text-sm text-slate-700">
            Waiting on <strong>{listNames(missing.map((p) => p.name))}</strong>. Submissions close on{" "}
            {formatDeadline(trip.deadline)}. {plural(missing.length, "person", "people")} still to go. Results stay locked until
            everyone&apos;s in or the deadline passes.
          </p>
          <CopyButton text={reminderMessage(trip)} label="Copy reminder for WhatsApp" className={`${btn.secondary} w-full sm:w-auto`} />
        </>
      )}
    </Card>
  );
}
