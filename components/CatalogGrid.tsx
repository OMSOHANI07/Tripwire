"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, DestPhoto, PinIcon } from "./brand";
import { inr, TYPE_EMOJI, TYPE_LABELS } from "@/lib/format";
import { DEST_TYPES, type Destination, type DestType } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Filterable grid of destination cards. */
export function CatalogGrid({ destinations }: { destinations: Destination[] }) {
  const [type, setType] = useState<DestType | null>(null);
  const shown = type ? destinations.filter((d) => d.types.includes(type)) : destinations;

  return (
    <div className="space-y-8">
      <div role="group" aria-label="Filter by trip type" className="flex flex-wrap gap-2">
        {[null, ...DEST_TYPES].map((t) => (
          <button
            key={t ?? "all"}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${type === t ? "bg-brand-600 text-white shadow-md shadow-brand-600/25" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-300"}`}
          >
            {t ? (
              <>
                <span aria-hidden className="mr-1.5">{TYPE_EMOJI[t]}</span>
                {TYPE_LABELS[t]}
              </>
            ) : (
              `All (${destinations.length})`
            )}
          </button>
        ))}
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((d) => (
          <li key={d.id}>
            <Link
              href={`/destinations/${d.id}`}
              className="group block h-full overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-12px_rgba(11,37,69,0.25)] ring-1 ring-slate-200/70 transition hover:-translate-y-1"
            >
            <DestPhoto id={d.id} alt={d.name} className="h-44" />
            <div className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-lg font-semibold">
                  <PinIcon className="h-4 w-4 text-brand-600" /> {d.name}
                </h2>
                <span className="shrink-0 text-xs text-slate-500">{d.state}</span>
              </div>
              <p className="text-sm text-slate-600">{d.blurb}</p>
              <div className="flex flex-wrap gap-1.5">
                {d.types.map((t) => (
                  <span key={t} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">
                    {TYPE_LABELS[t]}
                  </span>
                ))}
                {d.hasTreks && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800">Treks</span>}
              </div>
              <dl className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <dt className="text-slate-500">Est. cost / person</dt>
                  <dd className="font-semibold text-ink">{inr(d.costMin)}–{inr(d.costMax)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Best months</dt>
                  <dd className="font-semibold text-ink">{d.bestMonths.map((m) => MONTHS[m - 1]).join(", ")}</dd>
                </div>
              </dl>
              <p className="flex items-center gap-1 pt-1 text-sm font-semibold text-brand-700">
                View details <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </p>
            </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
