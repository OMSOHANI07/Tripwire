import type { Metadata } from "next";
import { Container, Eyebrow, Wave } from "@/components/brand";
import { CatalogGrid } from "@/components/CatalogGrid";
import { CATALOG } from "@/lib/catalog-data";

export const metadata: Metadata = { title: "Destinations · Group Trip Decider" };

export default function DestinationsPage() {
  return (
    <>
      <section className="relative bg-brand-800 pb-20 pt-12 sm:pb-28 sm:pt-16">
        <div aria-hidden className="absolute inset-0 bg-[url('/photos/gokarna.jpg')] bg-cover bg-center opacity-40" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink/85 to-ink/20" />
        <Container className="relative space-y-3">
          <Eyebrow light>The catalog</Eyebrow>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {CATALOG.length} places your group <span className="text-brand-300">could land on</span>
          </h1>
          <p className="max-w-xl text-slate-200">
            Every trip is scored against this list. Costs are rough per-person bands for 3–4 days, excluding travel.
          </p>
        </Container>
        <Wave />
      </section>
      <Container className="py-12">
        <CatalogGrid destinations={CATALOG} />
      </Container>
    </>
  );
}
