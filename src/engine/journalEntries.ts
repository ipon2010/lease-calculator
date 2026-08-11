import { AmortizationRow, ClassificationResult, InitialMeasurement, JournalEntry, LeaseInputs } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Generates the day-one journal entry recognizing the ROU asset and lease
 * liability at commencement. This is separate from the periodic entries
 * (which record subsequent interest, principal, and amortization) and must
 * be posted once, before the first period's entry.
 *
 * Entry logic:
 *   Dr Right-of-Use Asset        rouAssetInitial
 *   Dr Cash (incentive received) leaseIncentives   [only if incentives > 0]
 *   Cr Lease Liability           leaseLiabilityInitial
 *   Cr Cash (initial direct costs) initialDirectCosts   [only if > 0]
 *   Cr Cash (prepaid rent)       prepaidRent   [only if > 0]
 *
 * This balances by construction, since:
 *   rouAssetInitial = leaseLiabilityInitial + initialDirectCosts + prepaidRent - leaseIncentives
 *   => rouAssetInitial + leaseIncentives = leaseLiabilityInitial + initialDirectCosts + prepaidRent
 */
export function generateInitialJournalEntry(
  inputs: LeaseInputs,
  measurement: InitialMeasurement
): JournalEntry {
  const lines: JournalEntry["lines"] = [
    { account: "Right-of-Use Asset", debit: round2(measurement.rouAssetInitial) },
  ];
  if (inputs.leaseIncentives > 0) {
    lines.push({ account: "Cash (lease incentive received)", debit: round2(inputs.leaseIncentives) });
  }
  lines.push({ account: "Lease Liability", credit: round2(measurement.leaseLiabilityInitial) });
  if (inputs.initialDirectCosts > 0) {
    lines.push({ account: "Cash (initial direct costs)", credit: round2(inputs.initialDirectCosts) });
  }
  if (inputs.prepaidRent > 0) {
    lines.push({ account: "Cash (prepaid rent)", credit: round2(inputs.prepaidRent) });
  }

  return {
    period: 0,
    date: inputs.commencementDate,
    description: "Lease commencement — initial recognition of ROU asset and lease liability",
    lines,
  };
}

/**
 * Generates period journal entries directly from the amortization schedule rows.
 * No independent logic here — every number is pulled straight from the schedule
 * that was already built (and tested) in amortization.ts.
 */
export function generateJournalEntries(
  rows: AmortizationRow[],
  classificationResult: ClassificationResult
): JournalEntry[] {
  const isFinance = classificationResult.classification === "finance";

  return rows.map((row) => {
    if (isFinance) {
      // Two entries per period, shown as one combined entry for readability:
      // 1) Debt-service entry: interest + principal reduction against cash.
      // 2) ROU amortization entry.
      return {
        period: row.period,
        date: row.date,
        description: `Period ${row.period} — Finance lease: debt service and ROU amortization`,
        lines: [
          { account: "Interest Expense", debit: round2(row.interestExpense) },
          { account: "Lease Liability", debit: round2(row.principalReduction) },
          { account: "Cash", credit: round2(row.cashPayment) },
          { account: "Amortization Expense — ROU Asset", debit: round2(row.rouAmortization) },
          { account: "Accumulated Amortization — ROU Asset", credit: round2(row.rouAmortization) },
        ],
      };
    } else {
      // Single compound entry per period for operating leases: one "Lease Expense"
      // line, with the liability and ROU asset adjusted underneath it.
      // Debits: Lease Expense (straight-line) + Lease Liability (principal reduction)
      // Credits: Right-of-Use Asset (amortization) + Cash (actual payment)
      // These balance by construction: SL expense = interest + ROU amort, and
      // principal reduction = cash payment - interest.
      const slExpense = row.straightLineExpense ?? 0;
      return {
        period: row.period,
        date: row.date,
        description: `Period ${row.period} — Operating lease: straight-line expense`,
        lines: [
          { account: "Lease Expense", debit: round2(slExpense) },
          { account: "Lease Liability", debit: round2(row.principalReduction) },
          { account: "Right-of-Use Asset", credit: round2(row.rouAmortization) },
          { account: "Cash", credit: round2(row.cashPayment) },
        ],
      };
    }
  });
}
