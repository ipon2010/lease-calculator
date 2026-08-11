import { describe, it, expect } from "vitest";
import { runLeaseCalculation } from "../index";
import { LeaseInputs } from "../types";

/**
 * VERIFICATION AGAINST PUBLISHED KNOWN-ANSWER EXAMPLES
 *
 * Source: FinQuery (LeaseQuery) "ASC 842 Lease Accounting Guide: Examples,
 * Journal Entries & More" — https://finquery.com/blog/asc-842-summary-new-lease-accounting-standards/
 * Both the operating and finance lease examples below are taken directly from
 * that published guide, including their stated present-value results, so the
 * engine's PV and amortization output can be checked against a third-party answer.
 */

const emptyClassification = {
  ownershipTransfersAtEnd: false,
  bargainPurchaseOptionReasonablyCertain: false,
  assetRemainingEconomicLifeMonths: null,
  assetFairValue: null,
  noAlternativeUseToLessor: false,
};

describe("Known-answer example 1: Operating lease (FinQuery/LeaseQuery)", () => {
  // Facts: $200,000 annually paid Jan 1 in advance, 10-year term, IBR 6.25%.
  // Published PV of payments = $1,545,659. Published straight-line annual expense = $200,000.
  const inputs: LeaseInputs = {
    commencementDate: "2024-01-01",
    termMonths: 120,
    paymentAmount: 200000,
    paymentFrequency: "annual",
    escalations: [],
    rentHolidays: [],
    discountRateAnnual: 0.0625,
    discountRateSource: "incremental_borrowing_rate",
    initialDirectCosts: 0,
    leaseIncentives: 0,
    prepaidRent: 0,
    assetUsefulLifeMonths: null,
    classification: emptyClassification,
  };

  const result = runLeaseCalculation(inputs);

  it("classifies as operating lease (no criteria met)", () => {
    expect(result.classification.classification).toBe("operating");
  });

  it("matches published present value of $1,545,659 within rounding tolerance", () => {
    expect(result.initialMeasurement.presentValueOfPayments).toBeCloseTo(1545659, -1);
    // -1 precision = within $10, well inside typical PV-calculator rounding differences.
  });

  it("initial ROU asset equals initial lease liability (no IDC/incentives/prepaid)", () => {
    expect(result.initialMeasurement.rouAssetInitial).toBeCloseTo(
      result.initialMeasurement.leaseLiabilityInitial,
      6
    );
  });

  it("recognizes constant $200,000 straight-line expense every period", () => {
    for (const row of result.amortizationSchedule) {
      expect(row.straightLineExpense).toBeCloseTo(200000, 1);
    }
  });

  it("liability schedule amortizes fully to zero by end of term", () => {
    const last = result.amortizationSchedule[result.amortizationSchedule.length - 1];
    expect(last.endingLiability).toBeCloseTo(0, 1);
  });

  it("ROU asset schedule amortizes fully to zero by end of term", () => {
    const last = result.amortizationSchedule[result.amortizationSchedule.length - 1];
    expect(last.endingRouAsset).toBeCloseTo(0, 1);
  });

  it("total interest expense across the schedule equals PV minus sum of principal (internal consistency)", () => {
    const totalInterest = result.amortizationSchedule.reduce((s, r) => s + r.interestExpense, 0);
    const totalPrincipal = result.amortizationSchedule.reduce((s, r) => s + r.principalReduction, 0);
    const totalCash = result.amortizationSchedule.reduce((s, r) => s + r.cashPayment, 0);
    expect(totalInterest + totalPrincipal).toBeCloseTo(totalCash, 1);
  });

  it("journal entries balance (debits = credits) every period", () => {
    for (const je of result.journalEntries) {
      const debits = je.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
      const credits = je.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
      expect(debits).toBeCloseTo(credits, 2);
    }
  });

  it("initial journal entry balances (debits = credits) and reflects ROU asset / lease liability", () => {
    const je = result.initialJournalEntry;
    const debits = je.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const credits = je.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    expect(debits).toBeCloseTo(credits, 2);
    expect(je.lines.find((l) => l.account === "Right-of-Use Asset")?.debit).toBeCloseTo(
      result.initialMeasurement.rouAssetInitial,
      2
    );
    expect(je.lines.find((l) => l.account === "Lease Liability")?.credit).toBeCloseTo(
      result.initialMeasurement.leaseLiabilityInitial,
      2
    );
  });
});

describe("Known-answer example 2: Finance lease (FinQuery/LeaseQuery)", () => {
  // Facts: 2-year term, $2,000/month in advance with $100 increase in year 2
  // (i.e. $2,100/month from month 13), 6.25% rate.
  // Published PV of payments = $46,342. ROU amortized straight-line over 24 months.
  const inputs: LeaseInputs = {
    commencementDate: "2024-01-01",
    termMonths: 24,
    paymentAmount: 2000,
    paymentFrequency: "monthly",
    escalations: [
      {
        type: "fixed_dollar",
        value: 100,
        effectiveFromPeriod: 13,
        isEstimate: false,
        notes: "Stated $100 increase in year 2 per lease terms.",
      },
    ],
    rentHolidays: [],
    discountRateAnnual: 0.0625,
    discountRateSource: "incremental_borrowing_rate",
    initialDirectCosts: 0,
    leaseIncentives: 0,
    prepaidRent: 0,
    assetUsefulLifeMonths: null,
    classification: {
      ...emptyClassification,
      // Example doesn't specify which of the 5 tests is met, only that the
      // lessee determined it to be a finance lease. We force classification
      // via the "no alternative use" flag purely to exercise the finance path;
      // in the real UI this would come from the user's actual classification inputs.
      noAlternativeUseToLessor: true,
    },
  };

  const result = runLeaseCalculation(inputs);

  it("classifies as finance lease", () => {
    expect(result.classification.classification).toBe("finance");
  });

  it("matches published present value of $46,342 within rounding tolerance", () => {
    expect(result.initialMeasurement.presentValueOfPayments).toBeCloseTo(46342, 0);
  });

  it("applies the $100 escalation starting period 13", () => {
    const period12 = result.paymentSchedule.find((p) => p.period === 12)!;
    const period13 = result.paymentSchedule.find((p) => p.period === 13)!;
    expect(period12.cashPayment).toBeCloseTo(2000, 2);
    expect(period13.cashPayment).toBeCloseTo(2100, 2);
  });

  it("amortizes ROU asset straight-line over 24 months", () => {
    const perPeriod = result.initialMeasurement.rouAssetInitial / 24;
    for (const row of result.amortizationSchedule) {
      expect(row.rouAmortization).toBeCloseTo(perPeriod, 2);
    }
  });

  it("liability schedule amortizes fully to zero by end of term", () => {
    const last = result.amortizationSchedule[result.amortizationSchedule.length - 1];
    expect(last.endingLiability).toBeCloseTo(0, 1);
  });

  it("ROU asset schedule amortizes fully to zero by end of term", () => {
    const last = result.amortizationSchedule[result.amortizationSchedule.length - 1];
    expect(last.endingRouAsset).toBeCloseTo(0, 1);
  });

  it("initial journal entry balances (debits = credits) and reflects ROU asset / lease liability", () => {
    const je = result.initialJournalEntry;
    const debits = je.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const credits = je.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    expect(debits).toBeCloseTo(credits, 2);
    expect(je.lines.find((l) => l.account === "Right-of-Use Asset")?.debit).toBeCloseTo(
      result.initialMeasurement.rouAssetInitial,
      2
    );
    expect(je.lines.find((l) => l.account === "Lease Liability")?.credit).toBeCloseTo(
      result.initialMeasurement.leaseLiabilityInitial,
      2
    );
  });

  it("journal entries balance (debits = credits) every period", () => {
    for (const je of result.journalEntries) {
      const debits = je.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
      const credits = je.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
      expect(debits).toBeCloseTo(credits, 2);
    }
  });
});

describe("Classification test walkthrough", () => {
  it("triggers finance classification on ownership transfer alone", () => {
    const inputs: LeaseInputs = {
      commencementDate: "2024-01-01",
      termMonths: 36,
      paymentAmount: 1000,
      paymentFrequency: "monthly",
      escalations: [],
      rentHolidays: [],
      discountRateAnnual: 0.05,
      discountRateSource: "incremental_borrowing_rate",
      initialDirectCosts: 0,
      leaseIncentives: 0,
      prepaidRent: 0,
      assetUsefulLifeMonths: null,
      classification: { ...emptyClassification, ownershipTransfersAtEnd: true },
    };
    const result = runLeaseCalculation(inputs);
    expect(result.classification.classification).toBe("finance");
    expect(result.classification.tests[0].triggered).toBe(true);
  });

  it("flags short-term expedient eligibility for a 12-month lease with no purchase option", () => {
    const inputs: LeaseInputs = {
      commencementDate: "2024-01-01",
      termMonths: 12,
      paymentAmount: 1000,
      paymentFrequency: "monthly",
      escalations: [],
      rentHolidays: [],
      discountRateAnnual: 0.05,
      discountRateSource: "incremental_borrowing_rate",
      initialDirectCosts: 0,
      leaseIncentives: 0,
      prepaidRent: 0,
      assetUsefulLifeMonths: null,
      classification: emptyClassification,
    };
    const result = runLeaseCalculation(inputs);
    expect(result.classification.shortTermExpedientEligible).toBe(true);
  });

  it("does not flag short-term expedient eligibility for a 13-month lease", () => {
    const inputs: LeaseInputs = {
      commencementDate: "2024-01-01",
      termMonths: 13,
      paymentAmount: 1000,
      paymentFrequency: "monthly",
      escalations: [],
      rentHolidays: [],
      discountRateAnnual: 0.05,
      discountRateSource: "incremental_borrowing_rate",
      initialDirectCosts: 0,
      leaseIncentives: 0,
      prepaidRent: 0,
      assetUsefulLifeMonths: null,
      classification: emptyClassification,
    };
    const result = runLeaseCalculation(inputs);
    expect(result.classification.shortTermExpedientEligible).toBe(false);
  });
});
