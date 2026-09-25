"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CopyButton, LinkBox } from "./CopyButton";
import { btn, Card, Field, input, Notice } from "./ui";
import { api, links } from "@/lib/client";
import { formatDeadline } from "@/lib/format";

/** Calendar date in IST, so server and browser agree on the defaults. */
function isoDate(d: Date) {
  return new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

export function NewTripForm() {
  const today = new Date();
  const plus = (days: number) => isoDate(new Date(today.getTime() + days * 86_400_000));

  const [name, setName] = useState("");
  const [windowStart, setWindowStart] = useState(plus(30));
  const [windowEnd, setWindowEnd] = useState(plus(51));
  const [tripLength, setTripLength] = useState(3);
  const [deadlineDate, setDeadlineDate] = useState(plus(7));
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [people, setPeople] = useState<string[]>(["", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ tripId: string; organizerKey: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ tripId: string; organizerKey: string }>("/api/trips", {
        body: { name, windowStart, windowEnd, tripLength, deadlineDate, deadlineTime, participants: people },
      });
      setCreated(res);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the trip");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    const share = links.share(created.tripId);
    const deadline = formatDeadline(new Date(`${deadlineDate}T${deadlineTime}:00+05:30`).toISOString());
    const msg = `Trip planning time! 🧳 Fill this in (takes ~2 min) so we can finally decide where we're going: ${share}\nSubmissions close ${deadline}.`;
    return (
      <div className="space-y-5">
        <Notice tone="success" title={`"${name}" is set up`}>
          Share the first link in your group chat. Keep the organizer link to yourself.
        </Notice>
        <Card className="space-y-5">
          <LinkBox label="Share link for the group" url={share} hint="Everyone picks their name and fills the form." />
          <div className="flex flex-wrap gap-2">
            <CopyButton text={msg} label="Copy WhatsApp message" className={btn.secondary} />
          </div>
          <hr className="border-stone-200" />
          <LinkBox
            label="Your organizer link (private)"
            url={links.admin(created.tripId, created.organizerKey)}
            hint="See who's submitted, nudge people and lock the final decision. Save it somewhere safe: it can't be recovered."
          />
        </Card>
        <div className="flex flex-wrap gap-2">
          <Link href={`/t/${created.tripId}`} className={btn.primary}>
            Fill in my own preferences
          </Link>
          <Link href={`/t/${created.tripId}/admin?key=${encodeURIComponent(created.organizerKey)}`} className={btn.secondary}>
            Open organizer view
          </Link>
        </div>
      </div>
    );
  }

  const setPerson = (i: number, v: string) => setPeople((ps) => ps.map((p, j) => (j === i ? v : p)));

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card className="space-y-5">
        <Field label="Trip name" htmlFor="name">
          <input id="name" required maxLength={80} className={input} placeholder="College gang reunion" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <fieldset className="space-y-1.5">
          <legend className="font-medium text-stone-900">Possible dates</legend>
          <p className="text-sm text-stone-500">The widest window you&apos;d consider. Friends pick the days they can make inside it.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-stone-700">
              From
              <input type="date" className={`${input} mt-1`} value={windowStart} min={isoDate(today)} onChange={(e) => setWindowStart(e.target.value)} />
            </label>
            <label className="text-sm text-stone-700">
              To
              <input type="date" className={`${input} mt-1`} value={windowEnd} min={windowStart} onChange={(e) => setWindowEnd(e.target.value)} />
            </label>
          </div>
        </fieldset>

        <Field label="Trip length (days)" htmlFor="len" hint="How many consecutive days the trip should be.">
          <div className="flex items-center gap-2">
            <button type="button" className={btn.small} aria-label="Fewer days" onClick={() => setTripLength((n) => Math.max(1, n - 1))}>
              −
            </button>
            <input id="len" type="number" min={1} max={14} className={`${input} w-20 text-center`} value={tripLength}
              onChange={(e) => setTripLength(Math.max(1, Math.min(14, Number(e.target.value) || 1)))} />
            <button type="button" className={btn.small} aria-label="More days" onClick={() => setTripLength((n) => Math.min(14, n + 1))}>
              +
            </button>
          </div>
        </Field>

        <fieldset className="space-y-1.5">
          <legend className="font-medium text-stone-900">Submission deadline (IST)</legend>
          <p className="text-sm text-stone-500">Answers freeze at this time. Results unlock once everyone&apos;s in, or at the deadline.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-stone-700">
              Date
              <input type="date" className={`${input} mt-1`} value={deadlineDate} min={isoDate(today)} onChange={(e) => setDeadlineDate(e.target.value)} />
            </label>
            <label className="text-sm text-stone-700">
              Time
              <input type="time" className={`${input} mt-1`} value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} />
            </label>
          </div>
        </fieldset>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="font-medium text-stone-900">Who&apos;s coming?</h2>
          <p className="text-sm text-stone-500">2 to 10 people, including you. Everyone picks their name from this list.</p>
        </div>
        <ol className="space-y-2">
          {people.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <label htmlFor={`p${i}`} className="w-6 text-right text-sm text-stone-500">
                {i + 1}
                <span className="sr-only"> participant name</span>
              </label>
              <input id={`p${i}`} className={input} maxLength={40} placeholder={i === 0 ? "Your name" : "Friend's name"} value={p} onChange={(e) => setPerson(i, e.target.value)} />
              {people.length > 2 && (
                <button type="button" className={btn.small} aria-label={`Remove participant ${i + 1}`} onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>
        {people.length < 10 && (
          <button type="button" className={btn.small} onClick={() => setPeople((ps) => [...ps, ""])}>
            + Add person
          </button>
        )}
      </Card>

      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" disabled={busy} className={`${btn.primary} w-full`}>
        {busy ? "Creating…" : "Create trip and get links"}
      </button>
    </form>
  );
}
