import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Container, DestPhoto, Eyebrow, PinIcon, Wave } from "@/components/brand";
import { btn, Card } from "@/components/ui";
import { CATALOG } from "@/lib/catalog-data";
import { inr, TYPE_EMOJI, TYPE_LABELS } from "@/lib/format";
import { costEstimate } from "@/lib/scoring";
import { CATALOG_CITIES } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function generateStaticParams() {
  return CATALOG.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/destinations/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = CATALOG.find((x) => x.id === id);
  return { title: d ? `${d.name} · Group Trip Decider` : "Destination not found" };
}

export default async function DestinationPage({ params }: PageProps<"/destinations/[id]">) {
  const { id } = await params;
  const d = CATALOG.find((x) => x.id === id);
  if (!d) notFound();

  const similar = CATALOG.filter((x) => x.id !== d.id && x.types.some((t) => d.types.includes(t))).slice(0, 3);

  return (
    <>
      <section className="relative isolate bg-brand-900">
        <Image src={`/photos/${d.id}.jpg`} alt={`${d.name}, ${d.state}`} fill priority sizes="100vw" className="-z-10 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/50 to-ink/20" />
        <Container className="pb-24 pt-16 sm:pb-32 sm:pt-28">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-200">
            <Link href="/destinations" className="hover:text-white hover:underline">Destinations</Link>
            <span aria-hidden> / </span>
            <span className="text-white">{d.name}</span>
          </nav>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
            <PinIcon className="h-3.5 w-3.5" /> {d.state}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">{d.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-slate-100">{d.blurb}</p>
        </Container>
        <Wave />
      </section>

      <Container className="space-y-10 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Est. cost per person" value={inr(costEstimate(d))} sub={`${inr(d.costMin)}–${inr(d.costMax)} for 3–4 days, excl. travel`} />
          <Fact label="Best months" value={d.bestMonths.map((m) => MONTHS[m - 1]).join(", ")} />
          <Fact label="Kind of trip" value={d.types.map((t) => `${TYPE_EMOJI[t]} ${TYPE_LABELS[t]}`).join("  ·  ")} />
          <Fact label="Treks" value={d.hasTreks ? "Yes, involves treks" : "No strenuous treks"} />
        </div>

        <Card>
          <Eyebrow>Getting there</Eyebrow>
          <h2 className="mt-2 text-2xl font-bold">Travel time from each home city</h2>
          <p className="mt-1 text-sm text-slate-500">Approximate one-way, door to door, using the practical way to get there.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th scope="col" className="py-2 font-medium">From</th>
                  <th scope="col" className="py-2 font-medium">Time</th>
                  <th scope="col" className="py-2 font-medium">How</th>
                </tr>
              </thead>
              <tbody>
                {CATALOG_CITIES.map((city) => {
                  const t = d.travel[city];
                  if (!t) return null;
                  return (
                    <tr key={city} className="border-b border-slate-100 last:border-0">
                      <th scope="row" className="py-2.5 text-left font-semibold text-ink">{city}</th>
                      <td className="py-2.5 tabular-nums text-slate-700">~{t.hours}h{t.hours > 8 && <span className="ml-2 text-xs text-orange-700">over 8h</span>}</td>
                      <td className="py-2.5 text-slate-700">{t.flight ? "✈️ Flight" : "🚆 Train / road"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-2xl font-bold">Want {d.name} for your group?</p>
            <p className="text-brand-100">Start a trip and see how it scores against everyone&apos;s preferences.</p>
          </div>
          <Link href="/new" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-brand-800 hover:bg-brand-50">
            Plan a trip <ArrowRight />
          </Link>
        </div>

        {similar.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-2">
                <Eyebrow>More like this</Eyebrow>
                <h2 className="text-2xl font-bold">Similar destinations</h2>
              </div>
              <Link href="/destinations" className={btn.secondary}>
                All destinations <ArrowRight />
              </Link>
            </div>
            <ul className="grid gap-6 sm:grid-cols-3">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link href={`/destinations/${s.id}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-12px_rgba(11,37,69,0.25)] ring-1 ring-slate-200/70 transition hover:-translate-y-1">
                    <DestPhoto id={s.id} alt={s.name} className="h-40" />
                    <div className="flex items-center justify-between gap-2 p-4">
                      <span className="flex items-center gap-1.5 font-semibold text-ink">
                        <PinIcon className="h-4 w-4 text-brand-600" /> {s.name}
                      </span>
                      <ArrowRight className="h-5 w-5 text-brand-600 transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5! sm:p-5!">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-lg font-bold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}
