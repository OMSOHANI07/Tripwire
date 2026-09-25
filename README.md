# Group Trip Decider

**One link in, one decision out.** Five friends in five cities can't agree on a trip over WhatsApp. The organizer creates a trip and shares one link. Everyone fills a 2-minute form on their phone. The app filters and scores destinations, shows the top 3 with where each person stands, and the group votes and locks one decision.

Built with Next.js (App Router) + TypeScript + Tailwind, Supabase Postgres, and Gemini for the plain-language explanations. The scores are computed by plain, deterministic code. The AI never changes them.

## Try it

- Landing page → **Load demo trip**. This creates a trip with Riya, Siddharth, Karan, Aisha and Preethi, all with different preferences, so the results grid is meaningful. Your browser votes as Riya; the other four personal links are listed under the button.
- Or from the terminal: `npm run seed:demo` prints the share, results, organizer and personal links.

## How each box in the components map is implemented

### 1. Collect

| Component | Where |
| --- | --- |
| **Organizer setup** | `/new` → `components/NewTripForm.tsx` → `POST /api/trips`. Trip name, date window, trip length, deadline (date + time, entered in IST), and 2–10 participant names. On create it shows the share link, the private organizer link, and a copy-ready WhatsApp message. |
| **Preference form (via the one link)** | `/t/[tripId]` → `components/PreferenceForm.tsx`. Pick your name (already-submitted names are marked), home city, available dates (`DateCalendar`, limited to the trip window, with Select all / +Fri–Sun / Clear), max budget (slider + ₹ input), rank beach/hills/city/adventure (`RankList`: drag or ↑/↓ buttons), dealbreakers (flights, travel over 8h, treks), a searchable "places I won't go" list from the catalog, and an optional note. After submitting you get your personal edit link, `/t/[tripId]/me?token=…`. |
| **Why a form, not a poll** | Explained on the landing page. Structured fields are what make the scoring possible. |

### 2. Store & track

| Component | Where |
| --- | --- |
| **Response store (Supabase)** | `supabase/migrations/20260925000000_init.sql`: `trips`, `participants`, `responses`, `destinations`, `votes`, with foreign keys, `created_at`/`updated_at`, and an `updated_at` trigger. **RLS is on for every table with no policies.** Only the server (service role key) can read or write. |
| **Completion tracker** | `components/CompletionTracker.tsx`, shown on the admin page and on `/t/[tripId]/status`: "4/5 submitted", progress bar, who's missing, and **Copy reminder for WhatsApp** (names the missing people and includes the share link and deadline). Results stay locked until everyone submits or the deadline passes. After a deadline with people missing, results show **"Partial: based on X of N"**. |
| **Lock rule** | `POST /api/trips/[id]/responses` rejects edits after the deadline (HTTP 423) and after the decision is locked. Results only use responses whose `updated_at` is at or before the deadline (`frozenResponses` in `lib/server/trips.ts`), so they always reflect the answers as they stood at the deadline. |

### 3. Match & score

| Component | Where |
| --- | --- |
| **Destination catalog** | 32 real Indian destinations in `lib/catalog-data.ts`, generated into `supabase/seed.sql` by `npm run gen:seed`. Each has types, a per-person cost band for 3–4 days (excluding travel), best months, travel hours and whether a flight is needed from each of the 7 home cities, and whether it involves treks. |
| **Hard filters** | `hardFilterBlocks` in `lib/scoring.ts` |
| **Scoring engine (deterministic)** | `lib/scoring.ts`. Pure functions, tested in `tests/scoring.test.ts`. |
| **AI explainer (Gemini)** | `lib/server/explain.ts` + `POST /api/trips/[id]/explain`. It sends only the **computed** results (destination, dates, cost, group score, per-person fit and its components, trade-offs) to Gemini. No raw answers, notes or budgets are sent. For each option Gemini returns a 2–3 sentence "why it works" and a "who compromises most" line, using a JSON response schema. The text is cached on the trip (`trips.explanations`, keyed by a hash of the results plus a prompt version), so Gemini is only called again when the results change. If there is no key or Gemini fails, `lib/explain-template.ts` writes a template explanation instead and the page still works. |

### 4. Decide

| Component | Where |
| --- | --- |
| **Results page: top 3** | `/t/[tripId]/results` → `components/Results.tsx`. Each card shows the destination, best date window, estimated cost per person (with the band), group score, the AI explanation, and trade-offs. |
| **Where each person stands** | `StandsGrid`: people × options, 0–100. Cells are green for 80+, amber for 65–79 and red below 65, and every cell shows its number (plus a screen-reader "low" marker), so colour is never the only signal. Hover a cell to see its components. |
| **"Nobody can make X" notes** | `computeDateNotes` groups consecutive days by who can't make them ("Nobody can make 16–17 Nov", "24 Nov: Aisha can't make it"). A "Why not…?" section lists strong destinations that were filtered out, and why. |
| **Final decision** | Each person votes for one of the 3 with their personal token (`POST /api/trips/[id]/votes`) and can change it until the decision is locked. The organizer clicks **Lock decision** (`POST /api/trips/[id]/lock`). It is enabled once everyone has voted; before that there is a "Lock decision early…" button with a confirmation step. The most votes wins, and a tie goes to the higher group score. Once locked, everyone sees a **Trip decided** banner and a **Copy summary for WhatsApp** button (destination, dates, cost, who's going, results link). |

## Scoring formula

All of it is in `lib/scoring.ts`.

**1. Date overlap.** Every window of *trip length* consecutive days inside the trip window where **all** participants are available. For each destination, the best window is the one with the most days in that destination's good months; ties go to the earliest.

**2. Hard filters.** A destination is dropped if, for **any** participant:
- there's no common window at all;
- the estimated cost (midpoint of the cost band) is above their max budget;
- it needs a flight from their city and they said no flights;
- travel from their city is over 8 hours and they said no long travel;
- it involves treks and they said no treks;
- it's on their "won't go" list.

**3. Per-person fit (0–100)** = 30% budget + 35% type + 20% travel + 15% season, where:

| Component | Points |
| --- | --- |
| Budget headroom | 40 at exactly their max, rising linearly to 100 at 40%+ headroom (0 if over budget) |
| Destination type | Best-ranked matching type: 1st = 100, 2nd = 70, 3rd = 40, 4th = 10 |
| Travel time | 100 at ≤1h, falling linearly to 0 at ≥13h |
| Season | Share of the chosen window's days that fall in the destination's good months |

**4. Group score** = average fit − 15 × (number of people with fit below 50), floored at 0. This means an option that's decent for all 5 beats one that's great for 4 and bad for 1.

**5. Top 3** by group score. Ties go to higher average fit, then lower cost, then name.

**6. Nobody passes?** You get the 3 closest options: blocked by the fewest people, then the fewest rules, then the best score. Each comes with the exact person and rule that blocks it (e.g. "Aisha: Est. ₹12,500 is over Aisha's max of ₹12,000"). If the problem is dates, the people whose calendars break the overlap are named (a person "blocks" if removing just them would open a window).

**Vote tally.** Most votes wins, and a tie goes to the higher group score. Votes for destinations that dropped out of the top 3 (because someone edited before the deadline) are ignored.

## No logins: how tokens work

- **Share link** `/t/[tripId]`: public within the group. Anyone with it can claim a name that hasn't been submitted yet.
- **Personal edit link** `/t/[tripId]/me?token=…`: issued on first submit, needed to edit or vote. It's also remembered in the browser's localStorage so voting works on the same phone.
- **Organizer link** `/t/[tripId]/admin?key=…`: needed to lock the decision.
- Only **SHA-256 hashes** of the tokens and keys are stored. Claiming a name is atomic (`update … where token_hash is null`), so two people can't claim the same name.
- Every write goes through a Next.js route handler that validates input and tokens. The Supabase service role key and the Gemini key are server-only (`lib/server/*` imports `server-only`) and never reach the browser.

## Setup

Requirements: Node 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # fill in the values below
```

Apply the schema and seed the catalog. Pick one:

- **Supabase SQL editor:** paste and run `supabase/migrations/20260925000000_init.sql`, then `supabase/seed.sql`.
- **Supabase CLI:** `supabase link --project-ref <ref>`, then `supabase db push`, then run `seed.sql` in the SQL editor (or with `psql`).
- **After the migration**, `npm run seed:catalog` upserts the catalog using your service key (equivalent to `seed.sql`).

Then:

```bash
npm run dev          # http://localhost:3000
npm run seed:demo    # optional: prints links for a demo trip
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm test` | Vitest (scoring engine, filters, date overlap, "nobody passes", vote tally, formatting) |
| `npm run seed:demo` | Creates the 5-friend demo trip and prints its links |
| `npm run seed:catalog` | Upserts the destination catalog via the service key |
| `npm run gen:seed` | Regenerates `supabase/seed.sql` from `lib/catalog-data.ts` |

### Environment variables

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (server routes and scripts) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Listed for completeness. The app never queries Supabase from the browser, and RLS blocks this key anyway. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** All reads and writes. |
| `GEMINI_API_KEY` | **Server only.** Optional: without it, template explanations are used. |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.8-flash`. |
| `NEXT_PUBLIC_SITE_URL` | Optional. Base URL printed by `seed:demo` (the app itself builds links from the current origin). |

### Deploying to Vercel

Import the repo on vercel.com (framework preset: Next.js) and add the four variables above to the Production environment. No other configuration is needed.

## Decisions I made (and why)

- **Gemini model:** `gemini-3.8-flash`, the latest stable Flash model this key can use (checked against the models list). It can be overridden with `GEMINI_MODEL`.
- **Explanations load lazily:** the results page renders straight away with cached or template text, then calls `/explain` in the background, so a slow AI call never blocks the page.
- **"Other" home city:** travel time is the average across the 7 known cities, and a flight is assumed if most of them need one.
- **Travel data** is approximate one-way door-to-door hours using the practical mode: overland under ~14h, otherwise a flight including airport time and the last-mile transfer. Costs are rough per-person bands excluding travel. Both are estimates and are labelled as such.
- **Voting opens when results unlock** (everyone in, or the deadline), not only after the deadline. If someone edits before the deadline and the top 3 changes, votes for options that dropped out are ignored and those people can vote again.
- **Zero votes + lock:** by the tie rule this picks the highest group score. The organizer has to confirm locking before everyone has voted.
- **Name claiming:** anyone with the share link can claim an unsubmitted name (that's what "one link, no logins" implies). Once claimed, only the personal token can edit it. A lost personal link can't be recovered in-app (the token is only stored hashed).
- **Deadlines** are entered and shown in IST (`Asia/Kolkata`). Dates are stored as plain `date` values.
- **Demo trip dates** are relative to today (window starts on the 12th of the month after next), so the demo never goes stale.
- **Scoring curve:** I first tried a gentler travel curve (0 at 16h), but it put almost every cell in the green. The steeper 13h curve makes the grid actually discriminate.

## Out of scope (the cut)

Bookings, payments or splitting costs; live flight and hotel prices (the catalog uses estimated bands); day-by-day itineraries; group chat or comments inside the tool.

## Project layout

```
app/                    pages and API route handlers
  api/trips/...         create, public info, responses, me, results, explain, votes, admin, lock
  api/demo, api/destinations
  t/[tripId]/           form, me, status, results, admin
components/             UI (PreferenceForm, DateCalendar, RankList, CompletionTracker, Results, AdminView, …)
lib/scoring.ts          the scoring engine (pure)
lib/catalog-data.ts     destination catalog source
lib/demo.ts             demo trip generator
lib/server/             server-only: Supabase client, validation, tokens, results view, Gemini explainer
supabase/               migration + seed
tests/                  Vitest
scripts/                seed-demo, seed-catalog, gen-seed
```
