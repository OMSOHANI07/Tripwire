"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LinkBox } from "./CopyButton";
import { btn, Card, Field, input, Loading, Notice } from "./ui";
import { DateCalendar } from "./DateCalendar";
import { RankList } from "./RankList";
import { ApiError, api, links, loadToken, saveToken } from "@/lib/client";
import type { DestinationLite, MeView, TripPublic } from "@/lib/api-types";
import { formatDeadline, formatRange, plural } from "@/lib/format";
import { DEALBREAKERS, DEALBREAKER_LABELS, HOME_CITIES, type Dealbreaker, type DestType } from "@/lib/types";

const BUDGET_MIN = 2000;
const BUDGET_MAX = 50000;

interface Props {
  tripId: string;
  /** Personal token from the /me link (edit mode). */
  token?: string | null;
}

export function PreferenceForm({ tripId, token: urlToken }: Props) {
  const [trip, setTrip] = useState<TripPublic | null>(null);
  const [destinations, setDestinations] = useState<DestinationLite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<MeView | null>(null);
  const [storedMe, setStoredMe] = useState<MeView | null>(null);

  // form state
  const [participantId, setParticipantId] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [budget, setBudget] = useState(12000);
  const [ranking, setRanking] = useState<DestType[]>(["beach", "hills", "city", "adventure"]);
  const [dealbreakers, setDealbreakers] = useState<Dealbreaker[]>([]);
  const [wontGo, setWontGo] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ token: string; name: string; created: boolean } | null>(null);

  const editMode = Boolean(urlToken);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, d] = await Promise.all([
          api<TripPublic>(`/api/trips/${tripId}`),
          api<DestinationLite[]>("/api/destinations"),
        ]);
        if (cancelled) return;
        setTrip(t);
        setDestinations(d);
        if (urlToken) {
          const m = await api<MeView>(`/api/trips/${tripId}/me?token=${encodeURIComponent(urlToken)}`);
          if (cancelled) return;
          setMe(m);
          saveToken(tripId, urlToken);
          setParticipantId(m.participant.id);
          if (m.response) {
            setHomeCity(m.response.homeCity);
            setDates(m.response.availableDates);
            setBudget(m.response.maxBudget);
            setRanking(m.response.typeRanking);
            setDealbreakers(m.response.dealbreakers);
            setWontGo(m.response.wontGo);
            setNote(m.response.note ?? "");
          }
        } else {
          // Already submitted from this device? Offer the edit link.
          const stored = loadToken(tripId);
          if (stored) {
            api<MeView>(`/api/trips/${tripId}/me?token=${encodeURIComponent(stored)}`)
              .then((m) => !cancelled && setStoredMe(m))
              .catch(() => {});
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof ApiError && e.status === 404 ? "We couldn't find this trip. Check the link?" : e instanceof Error ? e.message : "Couldn't load the trip");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, urlToken]);

  const selected = trip?.participants.find((p) => p.id === participantId);
  const closed = trip ? trip.deadlinePassed || Boolean(trip.decided) : false;
  const remaining = trip ? trip.total - trip.submittedCount : 0;

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!participantId) m.push("your name");
    if (!homeCity) m.push("home city");
    if (dates.length === 0) m.push("dates");
    return m;
  }, [participantId, homeCity, dates]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (missing.length) {
      setError(`Please add ${missing.join(", ")}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; name: string; created: boolean }>(`/api/trips/${tripId}/responses`, {
        body: { participantId, token: urlToken ?? undefined, homeCity, availableDates: dates, maxBudget: budget, typeRanking: ranking, dealbreakers, wontGo, note },
      });
      saveToken(tripId, res.token);
      setDone(res);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your answers");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <Notice tone="error" title="Something's off">{loadError}</Notice>;
  if (!trip) return <Loading label="Loading the trip…" />;

  if (done) {
    const personal = links.me(tripId, done.token);
    return (
      <div className="space-y-5">
        <Notice tone="success" title={done.created ? `Thanks ${done.name}, you're in! 🎉` : `Saved, ${done.name}.`}>
          {done.created ? "Your answers are saved." : "Your changes are saved."} You can edit them until{" "}
          {formatDeadline(trip.deadline)}.
        </Notice>
        <Card className="space-y-3">
          <LinkBox
            label="Your personal edit link"
            url={personal}
            hint="Save this! Bookmark it or send it to yourself on WhatsApp. You'll need it to edit your answers or vote from another device."
          />
        </Card>
        <div className="flex flex-wrap gap-2">
          <Link href={`/t/${tripId}/status`} className={btn.primary}>
            See who&apos;s submitted
          </Link>
          <Link href={`/t/${tripId}/results`} className={btn.secondary}>
            Results
          </Link>
          <button type="button" className={btn.secondary} onClick={() => setDone(null)}>
            Keep editing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{trip.name}</h1>
        <p className="mt-1 text-stone-600">
          {plural(trip.tripLength, "day")} somewhere between {formatRange(trip.windowStart, trip.windowEnd)}. Takes about 2 minutes.
        </p>
      </div>

      {trip.decided ? (
        <Notice tone="success" title={`Trip decided: ${trip.decided.name}`}>
          <Link className="underline" href={`/t/${tripId}/results`}>See the final plan</Link>
        </Notice>
      ) : trip.deadlinePassed ? (
        <Notice tone="warn" title={`Submissions closed on ${formatDeadline(trip.deadline)}`}>
          Answers are frozen. <Link className="underline" href={`/t/${tripId}/results`}>See the results</Link>
        </Notice>
      ) : (
        <Notice tone="info">
          Submissions close on <strong>{formatDeadline(trip.deadline)}</strong> (IST).{" "}
          {remaining > 0 ? `${plural(remaining, "person", "people")} still to go.` : "Everyone's in! You can still edit until then."}
        </Notice>
      )}

      {!editMode && storedMe && (
        <Notice tone="success" title={`You've already submitted as ${storedMe.participant.name}`}>
          <Link className="underline" href={`/t/${tripId}/me?token=${encodeURIComponent(loadToken(tripId) ?? "")}`}>
            Edit your answers
          </Link>
        </Notice>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        <fieldset disabled={closed} className="space-y-5 disabled:opacity-70">
          {/* Name */}
          <Card>
            {editMode && me ? (
              <p className="text-stone-700">
                Editing as <strong className="text-stone-900">{me.participant.name}</strong>
              </p>
            ) : (
              <fieldset>
                <legend className="font-medium text-stone-900">Who are you?</legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {trip.participants.map((p) => (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal-700 ${p.submitted ? "border-stone-200 bg-stone-50 text-stone-500" : "border-stone-300"}`}
                    >
                      <span className="flex items-center gap-2">
                        <input type="radio" name="participant" value={p.id} checked={participantId === p.id} onChange={() => setParticipantId(p.id)} className="sr-only" />
                        <span className="font-medium">{p.name}</span>
                      </span>
                      {p.submitted && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">✓ done</span>}
                    </label>
                  ))}
                </div>
                {selected?.submitted && (
                  <div className="mt-3">
                    <Notice tone="warn" title={`${selected.name} has already submitted`}>
                      To change your answers, open your personal edit link (you got it after submitting). Lost it? Ask
                      the organizer.
                    </Notice>
                  </div>
                )}
              </fieldset>
            )}
          </Card>

          {/* Home city */}
          <Card>
            <Field label="Home city" htmlFor="city" hint="Where you'll be travelling from.">
              <select id="city" className={input} value={homeCity} onChange={(e) => setHomeCity(e.target.value)}>
                <option value="">Choose a city…</option>
                {HOME_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </Card>

          {/* Dates */}
          <Card>
            <DateCalendar start={trip.windowStart} end={trip.windowEnd} selected={dates} onChange={setDates} tripLength={trip.tripLength} />
          </Card>

          {/* Budget */}
          <Card>
            <Field label="Max budget per person" htmlFor="budget" hint="For stay, food and activities, not counting travel to get there.">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={500}
                  value={Math.min(BUDGET_MAX, budget)}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  aria-label="Max budget slider"
                  className="flex-1"
                />
                <div className="relative w-32">
                  <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">₹</span>
                  <input
                    id="budget"
                    type="number"
                    inputMode="numeric"
                    min={1000}
                    max={500000}
                    step={500}
                    value={budget}
                    onChange={(e) => setBudget(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                    className={`${input} pl-7`}
                  />
                </div>
              </div>
            </Field>
          </Card>

          {/* Ranking */}
          <Card>
            <RankList value={ranking} onChange={setRanking} />
          </Card>

          {/* Dealbreakers */}
          <Card className="space-y-4">
            <fieldset>
              <legend className="font-medium text-stone-900">Dealbreakers (hard no&apos;s)</legend>
              <p className="text-sm text-stone-500">Any option that breaks one of these is dropped for the whole group. Only tick real no&apos;s.</p>
              <div className="mt-3 space-y-2">
                {DEALBREAKERS.map((d) => (
                  <label key={d} className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-2.5 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-orange-600"
                      checked={dealbreakers.includes(d)}
                      onChange={(e) => setDealbreakers((xs) => (e.target.checked ? [...xs, d] : xs.filter((x) => x !== d)))}
                    />
                    {DEALBREAKER_LABELS[d]}
                  </label>
                ))}
              </div>
            </fieldset>
            <WontGoPicker destinations={destinations} value={wontGo} onChange={setWontGo} />
          </Card>

          {/* Note */}
          <Card>
            <Field label="Anything else? (optional)" htmlFor="note">
              <textarea id="note" rows={3} maxLength={500} className={input} placeholder="e.g. I can leave Friday evening" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </Card>
        </fieldset>

        {error && <Notice tone="error">{error}</Notice>}
        {!closed && (
          <button type="submit" disabled={busy || (!editMode && selected?.submitted)} className={`${btn.primary} sticky bottom-3 w-full shadow-lg`}>
            {busy ? "Saving…" : editMode ? "Save changes" : "Submit my preferences"}
          </button>
        )}
      </form>
    </div>
  );
}

function WontGoPicker({ destinations, value, onChange }: { destinations: DestinationLite[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const shown = destinations.filter((d) => `${d.name} ${d.state}`.toLowerCase().includes(q.toLowerCase()));
  const names = value.map((id) => destinations.find((d) => d.id === id)?.name ?? id);
  return (
    <details className="rounded-xl border border-stone-200 px-3 py-2.5" open={value.length > 0}>
      <summary className="cursor-pointer font-medium text-stone-900">
        Places I won&apos;t go {value.length > 0 && <span className="text-sm font-normal text-stone-600">({names.join(", ")})</span>}
      </summary>
      <div className="mt-3 space-y-2">
        <input type="search" aria-label="Search destinations" placeholder="Search…" className={input} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {shown.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50">
              <input
                type="checkbox"
                className="h-4 w-4 accent-orange-600"
                checked={value.includes(d.id)}
                onChange={(e) => onChange(e.target.checked ? [...value, d.id] : value.filter((x) => x !== d.id))}
              />
              <span>
                {d.name} <span className="text-sm text-stone-500">· {d.state}</span>
              </span>
            </label>
          ))}
          {shown.length === 0 && <p className="px-2 text-sm text-stone-500">No matches.</p>}
        </div>
      </div>
    </details>
  );
}
