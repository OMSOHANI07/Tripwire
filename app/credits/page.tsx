import type { Metadata } from "next";
import { Container, PageFrame } from "@/components/brand";
import { PageTitle } from "@/components/ui";
import credits from "@/lib/photo-credits.json";

export const metadata: Metadata = { title: "Photo credits · Group Trip Decider" };

type Credit = { title: string; artist: string; license: string; source: string };

export default function CreditsPage() {
  const rows = Object.entries(credits as Record<string, Credit>).sort(([a], [b]) => a.localeCompare(b));
  return (
    <PageFrame>
      <Container className="max-w-3xl px-0 sm:px-0">
        <PageTitle sub="All photos are from Wikimedia Commons under free licenses. Thank you to the photographers.">Photo credits</PageTitle>
        <ul className="divide-y divide-slate-200 rounded-3xl bg-white px-5 ring-1 ring-slate-200/70">
          {rows.map(([id, c]) => (
            <li key={id} className="py-3 text-sm">
              <a href={c.source} className="font-medium text-brand-700 underline-offset-2 hover:underline">
                {c.title}
              </a>
              <span className="text-slate-600">
                {" "}by {c.artist}, {c.license}
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </PageFrame>
  );
}
