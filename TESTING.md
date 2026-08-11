# Testing guide

## Automated verification (already run, all passing)

`npm test` runs 18 checks in `src/engine/__tests__/knownAnswer.test.ts` against two
published third-party examples — see README.md for the specific figures. This is the
"proof" layer: it confirms the math engine itself is correct, independent of the UI or
AI extraction.

## End-to-end testing with the sample leases

The three PDFs in `/samples` are original documents (written for this project, not
copied from a real lease) designed to exercise different parts of the tool: a fixed %
escalation, a fixed $ step-up with a bargain purchase option, and a CPI-based
escalation with free rent. Upload each one through the app and compare what the
Review screen extracts, and what the Results screen calculates, against the reference
values below.

**Important:** these reference values were computed by running the *verified engine*
directly against the ground-truth inputs (since I wrote the source documents, I know
exactly what's in them) — they are not independently published third-party figures
like the ones in the automated tests. Use them to confirm (a) the AI extraction step
pulls the right terms from the PDF text, and (b) the engine handles each mechanism
(fixed %, fixed $, CPI, free rent, bargain purchase option) correctly — not as a
second independent check on the arithmetic itself, which the automated tests already
cover.

---

### Sample 1 — `sample_1_office_lease.pdf`

Office lease. Tests: fixed % annual escalation, 1-month free rent, initial direct
costs, lease incentive, unstated discount rate (you must enter IBR manually).

Key facts to verify were extracted:
- Commencement: **Feb 1, 2026**, term **60 months**
- Base rent: **$22,400/month**, 3% escalation on EVERY annual anniversary (not just once —
  this requires 4 separate escalation rows in the Review screen, at periods 13/25/37/49)
- 1 month free rent (Feb 2026)
- Initial direct costs: **$6,500**; lease incentive: **$84,000**
- No stated rate implicit in the lease — IBR field should be blank, requiring manual entry
- No ownership transfer, no purchase option → should classify as **operating**

Reference output (using an assumed 6.5% IBR, and 4 escalation rows of 3% each at
2027-02-01 / 2028-02-01 / 2029-02-01 / 2030-02-01):
- Lease liability (initial): **$1,195,130.47**
- ROU asset (initial): **$1,117,630.47** (liability + $6,500 IDC − $84,000 incentive)
- Classification: **Operating lease** (no tests triggered)

If you enter a different IBR, your numbers will differ — that's expected; re-run the
reference calc with your chosen rate if you want an exact match.

---

### Sample 2 — `sample_2_equipment_finance_lease.pdf`

Equipment lease. Tests: fixed $ step-up escalation, bargain purchase option, stated
rate implicit in the lease, useful-life-capped ROU amortization, finance classification
via multiple triggered tests.

Key facts to verify were extracted:
- Commencement: **Jul 1, 2026**, term **72 months**
- Base rent: **$5,450/month**, $250 step-up starting month 37
- $1 purchase option, reasonably certain → **bargain purchase option = yes**
- Asset fair value **$410,000**, remaining economic life **84 months**
- Useful life **90 months**
- Rate implicit in the lease stated: **6.00%**
- Initial direct costs: **$3,200**; no lease incentive
- Should classify as **finance lease**, triggering the bargain purchase option test,
  the major-part-of-economic-life test (72/84 = 85.7%), and the no-alternative-use test

Reference output (at the stated 6.00% implicit rate):
- Lease liability (initial): **$337,396.06**
- ROU asset (initial): **$340,596.06** (liability + $3,200 IDC)
- Classification: **Finance lease** — 3 of 5 tests triggered

---

### Sample 3 — `sample_3_retail_lease_cpi.pdf`

Retail lease. Tests: CPI-based escalation (should NOT be auto-estimated by the AI —
verify the extraction leaves this blank for you to fill in), 3-month free rent,
unstated discount rate.

Key facts to verify were extracted:
- Commencement: **Nov 1, 2025**, term **84 months**
- Base rent: **$6,200/month**
- CPI-based annual escalation, capped at 5% — extraction should flag this as
  requiring a manual estimate, NOT return a guessed percentage
- 3 months free rent (Nov 2025–Jan 2026)
- Initial direct costs: **$9,300**; lease incentive: **$55,000**
- No stated rate implicit in the lease
- No ownership transfer, no purchase option → should classify as **operating**

Reference output (using an assumed 3% CPI estimate per year and an assumed 7% IBR —
both must be entered manually):
- Lease liability (initial): **$430,093.50**
- ROU asset (initial): **$384,393.50** (liability + $9,300 IDC − $55,000 incentive)
- Classification: **Operating lease**

Since this sample has a CPI escalation in every year of an 84-month term, you'll need
to add 6 escalation rows in the Review screen (one per annual anniversary from month 13
through month 73), each with your assumed CPI %, to match this reference exactly.

---

## What "done" looks like

Before calling this portfolio-ready, confirm:
1. All 20 automated tests pass (`npm test`)
2. Each sample PDF extracts its key terms correctly (dates, rent, escalation type,
   free rent, IDC, incentives) — with the CPI sample correctly leaving the escalation
   % blank rather than guessing
3. Entering the reference discount rates and escalation rows for each sample produces
   the reference lease liability / ROU asset figures above
4. The classification walkthrough on Sample 2 shows the correct 3 triggered tests
5. The Journal Entries card shows a day-one initial recognition entry (ROU asset /
   lease liability / IDC / incentive) above the periodic entries, and it balances
6. Journal entries balance (debits = credits) on every period for all three samples
