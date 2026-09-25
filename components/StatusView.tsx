"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CompletionTracker } from "./CompletionTracker";
import { LinkBox } from "./CopyButton";
import { btn, Card, Loading, Notice } from "./ui";
import type { TripPublic } from "@/lib/api-types";
import { api, links } from "@/lib/client";
import { formatRange, plural } from "@/lib/format";

export function useTrip(tripId: string, refreshMs = 20000) {
  const [trip, setTrip] = useState<TripPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      api<TripPublic>(`/api/trips/${tripId}`).then(
        (t) => {
          setTrip(t);
          setError(null);
        },
        (e) => setError(e instanceof Error ? e.message : "Couldn't load the trip"),
      ),
    [tripId],
  );
  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);
  return { trip, error, reload: load };
}

export function StatusView({ tripId }: { tripId: string }) {
  const { trip, error } = useTrip(tripId);
  if (error && !trip) return <Notice tone="error" title="Couldn't load this trip">{error}</Notice>;
  if (!trip) return <Loading />;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{trip.name}</h1>
        <p className="mt-1 text-stone-600">{plural(trip.tripLength, "day")} between {formatRange(trip.windowStart, trip.windowEnd)}</p>
      </div>
      <CompletionTracker trip={trip} />
      <Card>
        <LinkBox label="Share link" url={links.share(trip.id)} />
      </Card>
      <div className="flex flex-wrap gap-2">
        <Link href={`/t/${trip.id}`} className={btn.secondary}>Fill in the form</Link>
        <Link href={`/t/${trip.id}/results`} className={btn.secondary}>Results</Link>
      </div>
    </div>
  );
}
