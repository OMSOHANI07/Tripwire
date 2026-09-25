"use client";

import { useState } from "react";
import type { DestType } from "@/lib/types";
import { TYPE_EMOJI, TYPE_LABELS } from "@/lib/format";

/** Rank destination types by drag (desktop) or up/down buttons (everywhere). */
export function RankList({ value, onChange }: { value: DestType[]; onChange: (v: DestType[]) => void }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    setAnnounce(`${TYPE_LABELS[item]} moved to position ${to + 1} of ${value.length}`);
  }

  return (
    <fieldset>
      <legend className="font-medium text-stone-900">Rank the kind of trip you want</legend>
      <p className="text-sm text-stone-500">Top = favourite. Drag, or use the arrows.</p>
      <ol className="mt-3 space-y-2">
        {value.map((t, i) => (
          <li
            key={t}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null) move(dragging, i);
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${dragging === i ? "border-teal-700 bg-teal-50" : "border-stone-200 bg-white"}`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">{i + 1}</span>
            <span aria-hidden className="cursor-grab select-none text-stone-400">⋮⋮</span>
            <span className="flex-1 font-medium">
              <span aria-hidden>{TYPE_EMOJI[t]} </span>
              {TYPE_LABELS[t]}
            </span>
            <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${TYPE_LABELS[t]} up`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} aria-label={`Move ${TYPE_LABELS[t]} down`}
              className="grid h-9 w-9 place-items-center rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-30">↓</button>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">{announce}</p>
    </fieldset>
  );
}
