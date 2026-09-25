import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Container, DestPhoto, Eyebrow, PinIcon, Wave } from "@/components/brand";
import { DemoButton } from "@/components/DemoButton";
import { MyTrips } from "@/components/MyTrips";
import { btn } from "@/components/ui";
import { CATALOG } from "@/lib/catalog-data";
import { inr } from "@/lib/format";

const FEATURED = ["goa", "udaipur", "munnar", "andaman", "manali", "pondicherry"];

const STEPS = [
  { icon: "🔗", title: "Collect", body: "One link, a 2-minute form" },
  { icon: "✅", title: "Track", body: "See who's missing, nudge them" },
  { icon: "📊", title: "Score", body: "Hard filters, then fair scores" },
  { icon: "🗳️", title: "Decide", body: "Top 3, vote, lock it in" },
];

export default function Home() {
  const featured = FEATURED.map((id) => CATALOG.find((d) => d.id === id)!);

  return (
    <>
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative isolate bg-brand-900">
        <Image src="/photos/hero.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/75 to-ink/45 sm:via-ink/60 sm:to-ink/0" />
        <Container className="pb-28 pt-14 sm:pb-40 sm:pt-24">
          <div className="max-w-xl space-y-6">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
              <PinIcon className="h-3.5 w-3.5" /> Havelock Island, Andaman
            </p>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              One link in.
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">One trip decision out.</span>
            </h1>
            <p className="max-w-md text-base text-slate-200 sm:text-lg">
              Everyone submits their preferences on their phone. We filter and score destinations and show exactly where each friend
              stands on the top 3. No more 1,200-message threads.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Link href="/new" className={`${btn.primary} w-full sm:w-auto`}>
                Plan a trip <ArrowRight />
              </Link>
              <DemoButton onDark />
            </div>
          </div>
        </Container>
        <Wave />
      </section>

      {/* Saved trips (only shows if this device has any) ------------------ */}
      <Container className="pt-12 empty:hidden">
        <MyTrips limit={3} />
      </Container>

      {/* How it works (template's "popular destination" block) ----------- */}
      <section id="how" className="scroll-mt-20 py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <Collage />
          <div className="space-y-6">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Decide together, <span className="text-brand-600">in one link</span>
            </h2>
            <p className="text-slate-600">
              The organizer sets the date window and deadline once. Friends pick the days they can make, their budget, the kind of
              trip they want, and their hard no&apos;s. Anything that breaks someone&apos;s dealbreakers is dropped for the whole group.
              Everything else is scored for each person, so an option that works for all five beats one that&apos;s great for four.
            </p>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.title} className="flex flex-col items-start gap-2">
                  <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl shadow-md ring-1 ring-brand-100">
                    {s.icon}
                  </span>
                  <span className="text-sm font-semibold text-ink">{s.title}</span>
                  <span className="text-xs text-slate-500">{s.body}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-5 py-4 ring-1 ring-brand-100">
              <PinIcon className="h-6 w-6 shrink-0 text-brand-600" />
              <div>
                <p className="font-semibold text-ink">Five friends, five cities, one decision</p>
                <p className="text-sm text-slate-600">No logins: the link carries a trip token, and everyone gets a personal edit link.</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Scenic banner ------------------------------------------------------ */}
      <section className="relative isolate py-28 text-center sm:py-40">
        <Image src="/photos/banner.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-ink/45" />
        <Wave flip />
        <Container className="space-y-3">
          <p aria-hidden className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-white/80 text-2xl text-white">✈</p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Less arguing, more travelling</h2>
          <p className="text-slate-100">Scores are plain maths anyone can check. AI only writes the explanations.</p>
        </Container>
        <Wave />
      </section>

      {/* Destinations ------------------------------------------------------- */}
      <section className="py-16 sm:py-24">
        <Container className="space-y-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="space-y-3">
              <Eyebrow>Explore the catalog</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Where your group could <span className="text-brand-600">end up</span>
              </h2>
            </div>
            <Link href="/destinations" className={btn.secondary}>
              View all {CATALOG.length} destinations <ArrowRight />
            </Link>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((d) => (
              <li key={d.id}>
                <Link href={`/destinations/${d.id}`} className="group block overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-12px_rgba(11,37,69,0.25)] ring-1 ring-slate-200/70 transition hover:-translate-y-1">
                  <DestPhoto id={d.id} alt={d.name} className="h-48" />
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold text-ink">
                        <PinIcon className="h-4 w-4 text-brand-600" /> {d.name}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">{d.blurb}</p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        {inr(d.costMin)}–{inr(d.costMax)} per person
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-brand-600 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

/** Tilted polaroid-style photo collage with a dashed flight path. */
function Collage() {
  return (
    <div aria-hidden className="relative mx-auto h-[340px] w-full max-w-md sm:h-[420px]">
      <svg viewBox="0 0 120 80" className="absolute -left-2 top-6 h-16 w-24 text-brand-500" fill="none">
        <path d="M5 70 C 30 70, 20 30, 60 35 S 100 20, 105 10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
        <path d="M98 6 116 2l-7 16-3-7z" fill="currentColor" />
      </svg>
      <Polaroid id="andaman" className="left-[12%] top-[10%] h-[55%] w-[68%] -rotate-3" />
      <Polaroid id="udaipur" className="right-0 top-0 h-[34%] w-[38%] rotate-6" />
      <Polaroid id="munnar" className="bottom-[6%] left-0 h-[34%] w-[40%] -rotate-6" />
      <Polaroid id="goa" className="bottom-0 right-[4%] h-[38%] w-[44%] rotate-3" />
    </div>
  );
}

function Polaroid({ id, className }: { id: string; className: string }) {
  return (
    <div className={`absolute rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200 ${className}`}>
      <DestPhoto id={id} alt="" sizes="300px" className="h-full w-full rounded-xl" />
    </div>
  );
}
