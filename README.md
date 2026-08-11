# LesseeTrail — ASC 842 Lease Accounting Calculator

Upload a commercial lease PDF → an AI step extracts the key terms → a deterministic
(non-AI) calculation engine builds the ASC 842 right-of-use asset and lease liability
amortization schedule, classification walkthrough, and journal entries.

**Core design principle:** the AI extraction step and the calculation engine are
completely separate. The AI never touches a number in the amortization math — it only
reads the document and returns structured JSON, which a human reviews and confirms
before the calculation engine (`src/engine/`, zero dependencies, pure functions) ever
sees it. Every field in the UI is stamped **Verify** (came from AI, check it),
**Manual** (you entered it), or **Calculated** (produced by code).

## Project structure

```
src/engine/          The deterministic calculation core. No AI calls anywhere in here.
  types.ts             All input/output types
  classification.ts    Walks all 5 ASC 842 finance-lease tests + short-term expedient check
  paymentSchedule.ts   Projects cash payments per period (escalations, rent holidays)
  initialMeasurement.ts  PV of payments -> initial lease liability & ROU asset
  amortization.ts      Period-by-period schedule (finance and operating mechanics)
  journalEntries.ts    Journal entries derived directly from the schedule
  index.ts             runLeaseCalculation() — the one function the UI calls
  __tests__/           Verification tests against published Big 4 / industry examples

src/extraction/types.ts   Shape of the AI extraction output (a dead-end structure —
                           nothing flows from here into the engine without human review)
src/state.ts               Review-form state + conversion to/from extraction & LeaseInputs
src/components/             UploadStep, ReviewStep, ResultsStep, Stamp
api/extract.ts               The ONLY file that calls the Claude API
```

## Verification

The engine is tested against two published third-party examples (FinQuery/LeaseQuery's
ASC 842 guide) with known present-value answers:

- **Operating lease**: $200,000/year, 10-year term, 6.25% IBR → published PV = $1,545,659.
  The engine matches this within $10.
- **Finance lease**: $2,000/month, 24-month term, $100 step-up in year 2, 6.25% rate →
  published PV = $46,342. The engine matches this exactly to the dollar.

Run `npm test` to see all 18 checks (PV accuracy, schedule fully amortizes to zero,
journal entries balance every period, classification tests trigger correctly).

Three additional sample lease PDFs are included in `/samples` for end-to-end testing
of the full upload → extract → review → calculate flow. See `TESTING.md` for expected
reference values for each.

## Local development

You won't be running this locally day-to-day (see GitHub web-editing workflow below),
but if you ever do:

```bash
npm install
npm run dev       # local dev server
npm test           # run the engine verification tests
npm run build       # type-check + production build
```

## Cost of the AI extraction step

Each document sent to Claude for extraction is roughly 5,000–15,000 tokens (a typical
10–20 page lease). This costs a fraction of a cent per document — realistically the
total cost stays near zero even after dozens of test runs. Nothing else in the app
calls any AI API or costs anything to run.

## Deployment (GitHub → Vercel)

1. **Create a GitHub repo** and push this project (or upload the files through GitHub's
   web interface, per your usual workflow).
2. **Do not commit an API key.** `api/extract.ts` reads `process.env.ANTHROPIC_API_KEY`
   at runtime — it is never in the code or the repo.
3. **Import the repo into Vercel** (vercel.com → Add New → Project → import from GitHub).
   Vercel will auto-detect the Vite framework preset — no config needed.
4. **Add the environment variable** in Vercel: Project Settings → Environment Variables
   → add `ANTHROPIC_API_KEY` with your key, for the Production (and Preview, if you
   want previews to work) environment.
5. **Deploy.** Vercel builds and serves both the static frontend and the `/api/extract`
   serverless function automatically — no separate backend to stand up.

If you ever want to test extraction locally, you'd need `vercel dev` (which reads a
local `.env` file for `ANTHROPIC_API_KEY`) rather than plain `npm run dev`, since plain
Vite dev doesn't run the `/api` serverless function.

## Rate limiting

`api/extract.ts` includes a lightweight, best-effort daily cap (20 extractions
per IP, 150 total per day) to protect against runaway API cost. This is an
in-memory counter, so it resets on redeploys/cold starts and isn't perfectly
enforced across Vercel's distributed edge instances — it's meant to blunt
casual abuse or a stray bug, not stop a determined attacker. If this app ever
sees meaningful real traffic, swap it for a shared store like Vercel KV or
Upstash Redis so the limit holds consistently everywhere.

## What's not yet decided

- **Naming**: this repo is currently just called "lease-calculator" as a placeholder.
  Let's pick a real name once you've clicked through the tool.
- **Renewal option handling**: the review screen shows extracted renewal options as a
  note, but you manually fold reasonably-certain renewal months into the total lease
  term yourself — there's no separate "renewal" input in the engine. Flagging in case
  you'd rather that be more automatic.
