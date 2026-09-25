"use client";

import { enumerateDates } from "@/lib/scoring";
import { btn } from "./ui";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Multi-select calendar limited to the trip window. */
export function DateCalendar({
  start,
  end,
  selected,
  onChange,
  tripLength,
}: {
  start: string;
  end: string;
  selected: string[];
  onChange: (dates: string[]) => void;
  tripLength: number;
}) {
  const all = enumerateDates(start, end);
  const sel = new Set(selected);
  const months = new Map<string, string[]>();
  for (const d of all) {
    const k = d.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), d]);
  }
  const toggle = (d: string) => onChange(sel.has(d) ? selected.filter((x) => x !== d) : [...selected, d].sort());
  const weekends = all.filter((d) => [0, 5, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()));

  return (
    <fieldset>
      <legend className="font-medium text-stone-900">Dates you CAN travel</legend>
      <p className="text-sm text-stone-500">
        Tap every day you&apos;re free. We need {tripLength} days in a row that work for everyone.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btn.small} onClick={() => onChange(all)}>Select all</button>
        <button type="button" className={btn.small} onClick={() => onChange([...new Set([...selected, ...weekends])].sort())}>+ Fri–Sun</button>
        <button type="button" className={btn.small} onClick={() => onChange([])}>Clear</button>
        <span className="self-center text-sm text-stone-600" aria-live="polite">
          {selected.length} of {all.length} days selected
        </span>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {[...months.entries()].map(([key, days]) => {
          const [y, m] = key.split("-").map(Number);
          const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
          const inMonth = new Set(days);
          const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
          const cells: (string | null)[] = Array(firstDow).fill(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(`${key}-${String(d).padStart(2, "0")}`);
          return (
            <div key={key}>
              <p className="mb-2 text-sm font-semibold text-stone-800">{MONTH_NAMES[m - 1]} {y}</p>
              <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label={`${MONTH_NAMES[m - 1]} ${y}`}>
                {WEEKDAYS.map((w, i) => (
                  <span key={i} aria-hidden className="text-xs font-medium text-stone-400">{w}</span>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <span key={`e${i}`} />;
                  const day = Number(d.slice(8));
                  if (!inMonth.has(d)) {
                    return <span key={d} aria-hidden className="py-2 text-sm text-stone-300">{day}</span>;
                  }
                  const on = sel.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${day} ${MONTH_NAMES[m - 1]}${on ? ", available" : ""}`}
                      onClick={() => toggle(d)}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors ${on ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-stone-100 text-stone-800 hover:bg-stone-200"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
