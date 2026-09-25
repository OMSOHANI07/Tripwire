"use client";

import Link from "next/link";
import { useState } from "react";
import { LinkBox } from "./CopyButton";
import { btn, Card, Notice } from "./ui";
import { api, links, saveToken } from "@/lib/client";
import type { DemoTrip } from "@/lib/demo";

export function DemoButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState<DemoTrip | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const d = await api<DemoTrip>("/api/demo", { method: "POST", body: {} });
      // Act as Riya on this device so voting works straight away.
      saveToken(d.tripId, d.people[0].token);
      setDemo(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the demo trip");
    } finally {
      setBusy(false);
    }
  }

  if (demo) {
    return (
      <Card className="mt-4 w-full space-y-4 text-left">
        <Notice tone="success" title="Demo trip ready">
          Five friends have already submitted, so results are unlocked. This device is signed in as Riya for voting.
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Link href={`/t/${demo.tripId}/results`} className={btn.primary}>
            See results
          </Link>
          <Link href={`/t/${demo.tripId}/admin?key=${encodeURIComponent(demo.organizerKey)}`} className={btn.secondary}>
            Organizer view
          </Link>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-stone-800">Everyone&apos;s personal links (to try voting as each friend)</summary>
          <div className="mt-3 space-y-3">
            {demo.people.map((p) => (
              <LinkBox key={p.name} label={p.name} url={links.me(demo.tripId, p.token)} />
            ))}
          </div>
        </details>
      </Card>
    );
  }

  return (
    <>
      <button type="button" onClick={load} disabled={busy} className={`${btn.secondary} w-full sm:w-auto`}>
        {busy ? "Creating demo…" : "Load demo trip"}
      </button>
      {error && (
        <div className="w-full">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </>
  );
}
