import Link from "next/link";
import { DemoButton } from "@/components/DemoButton";
import { btn, Card } from "@/components/ui";

const STEPS = [
  { n: "1", title: "Collect", body: "Share one link. Everyone fills a 2-minute form on their phone: dates, budget, trip type, dealbreakers." },
  { n: "2", title: "Track", body: "See who's in and who's missing, and copy a friendly WhatsApp nudge. Answers freeze at the deadline." },
  { n: "3", title: "Score", body: "Destinations that break anyone's hard rules are dropped. The rest are scored for each person." },
  { n: "4", title: "Decide", body: "Top 3 options, where each person stands, then a quick vote and one locked decision." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-5 pt-2 text-center sm:pt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">No more 1,200-message threads</p>
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
          One link in.
          <br />
          One trip decision out.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-stone-600">
          Everyone submits their preferences, the tool filters and scores destinations, and shows exactly where each
          person stands on the top 3.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/new" className={`${btn.primary} w-full sm:w-auto`}>
            Plan a trip
          </Link>
          <DemoButton />
        </div>
      </section>

      <ol className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.n}>
            <Card className="h-full">
              <p className="flex items-center gap-2 font-semibold text-stone-900">
                <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-teal-50 text-sm text-teal-800">
                  {s.n}
                </span>
                {s.title}
              </p>
              <p className="mt-2 text-sm text-stone-600">{s.body}</p>
            </Card>
          </li>
        ))}
      </ol>

      <Card>
        <h2 className="font-semibold text-stone-900">Why a form, not a poll?</h2>
        <p className="mt-1 text-sm text-stone-600">
          Structured answers are data the engine can compute on. Free-text chat and emoji reactions can&apos;t be
          added up. No logins either: the link carries a trip token, and each friend gets their own edit link.
        </p>
      </Card>
    </div>
  );
}
