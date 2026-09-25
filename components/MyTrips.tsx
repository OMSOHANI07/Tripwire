"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, Eyebrow, PinIcon } from "./brand";
import { btn } from "./ui";
import type { MeView, TripPublic } from "@/lib/api-types";
import { ApiError, api, forgetTrip, importLegacyTokens, parseTrips, rememberTrip, subscribeTrips, tripsSnapshot, type SavedTrip } from "@/lib/client";
import { formatDeadline, formatRange } from "@/lib/format";

/**
 * Trips this device created, joined or opened (saved in localStorage).
 * Renders nothing when the list is empty, unless `showEmpty` is set.
 */
export function MyTrips({
  limit,
  showEmpty = false,
  heading = true,
  twoColumns = false,
}: {
  limit?: number;
  showEmpty?: boolean;
  heading?: boolean;
  twoColumns?: boolean;
}) {
  const snapshot = useSyncExternalStore(subscribeTrips, tripsSnapshot, () => "[]");
  useEffect(() => importLegacyTokens(), []);
  const trips = parseTrips(snapshot);
  const shown = limit ? trips.slice(0, limit) : trips;

  if (trips.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200/70">
        <p className="font-display text-xl font-bold text-ink">No saved trips yet</p>
        <p className="mt-1 text-slate-600">
          Trips you create, join or open on this device will show up here, so you can always get back to them.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/new" className={btn.primary}>
            Plan a trip <ArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="my-trips" className="space-y-5">
      {heading && (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Eyebrow>Saved on this device</Eyebrow>
            <h2 id="my-trips" className="text-3xl font-bold tracking-tight">
              Your <span className="text-brand-600">trips</span>
            </h2>
          </div>
          {limit && trips.length > limit && (
            <Link href="/trips" className={btn.secondary}>
              All {trips.length} trips <ArrowRight />
            </Link>
          )}
        </div>
      )}
      <ul className={`grid gap-4 sm:grid-cols-2 ${twoColumns ? "" : "lg:grid-cols-3"}`}>
        {shown.map((t) => (
          <TripCard key={t.tripId} saved={t} />
        ))}
      </ul>
    </section>
  );
}

function TripCard({ saved }: { saved: SavedTrip }) {
  const [trip, setTrip] = useState<TripPublic | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    api<TripPublic>(`/api/trips/${saved.tripId}`).then(
      (t) => active && setTrip(t),
      (e) => active && e instanceof ApiError && e.status === 404 && setMissing(true),
    );
    return () => {
      active = false;
    };
  }, [saved.tripId]);

  // Links imported from older sessions don't know whose they are: look it up once.
  useEffect(() => {
    if (!saved.token || saved.participantName) return;
    api<MeView>(`/api/trips/${saved.tripId}/me?token=${encodeURIComponent(saved.token)}`).then(
      (m) => rememberTrip({ tripId: saved.tripId, participantName: m.participant.name, name: m.trip.name }),
      () => {},
    );
  }, [saved.tripId, saved.token, saved.participantName]);

  const name = trip?.name ?? saved.name ?? "Trip";
  const id = encodeURIComponent;

  let status: React.ReactNode = <span className="text-slate-400">Loading…</span>;
  if (missing) status = <span className="text-red-700">This trip no longer exists.</span>;
  else if (trip?.decided)
    status = (
      <span className="font-semibold text-emerald-800">
        ✓ Decided: {trip.decided.name}
        {trip.decided.start && trip.decided.end ? ` · ${formatRange(trip.decided.start, trip.decided.end)}` : ""}
      </span>
    );
  else if (trip?.resultsAvailable)
    status = (
      <span className="text-brand-800">
        Results ready{trip.partial ? " (partial)" : ""} · {trip.submittedCount}/{trip.total} submitted
      </span>
    );
  else if (trip)
    status = (
      <span className="text-slate-700">
        {trip.submittedCount}/{trip.total} submitted · closes {formatDeadline(trip.deadline)}
      </span>
    );

  return (
    <li className="flex flex-col justify-between gap-4 rounded-3xl bg-white p-5 shadow-[0_8px_30px_-12px_rgba(11,37,69,0.18)] ring-1 ring-slate-200/70">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {saved.organizerKey && <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">Organizer</span>}
          {saved.token && (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
              You{saved.participantName ? `: ${saved.participantName}` : ""}
            </span>
          )}
        </div>
        <p className="flex items-start gap-1.5 font-display text-lg font-bold text-ink">
          <PinIcon className="mt-1 h-4 w-4 shrink-0 text-brand-600" /> {name}
        </p>
        {trip && <p className="text-xs text-slate-500">{trip.tripLength} days · {formatRange(trip.windowStart, trip.windowEnd)}</p>}
        <p className="text-sm">{status}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!missing && (
          <>
            <Link href={`/t/${saved.tripId}/results`} className={btn.small}>
              Results
            </Link>
            {saved.organizerKey && (
              <Link href={`/t/${saved.tripId}/admin?key=${id(saved.organizerKey)}`} className={btn.small}>
                Organizer view
              </Link>
            )}
            {saved.token && (
              <Link href={`/t/${saved.tripId}/me?token=${id(saved.token)}`} className={btn.small}>
                {trip?.deadlinePassed || trip?.decided ? "My answers" : "Edit answers"}
              </Link>
            )}
            {!saved.token && !saved.organizerKey && (
              <Link href={`/t/${saved.tripId}`} className={btn.small}>
                Open
              </Link>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => {
            if (missing || window.confirm(`Remove "${name}" from this device's list? The trip itself isn't deleted.`)) forgetTrip(saved.tripId);
          }}
          className="ml-auto text-sm font-medium text-slate-500 underline-offset-2 hover:text-red-700 hover:underline"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
