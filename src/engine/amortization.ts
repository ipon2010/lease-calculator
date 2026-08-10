import {
  AmortizationRow,
  ClassificationResult,
  InitialMeasurement,
  LeaseInputs,
  PaymentPeriod,
} from "./types";
import { numberOfPeriods, monthsPerPeriod } from "./dateUtils";

/**
 * Builds the full period-by-period amortization schedule.
 *
 * Liability mechanics (identical for both classifications, since ASC 842 measures
 * the lease liability the same way regardless of classification — only the ROU
 * asset / expense pattern differs):
 *   - Payments are in advance (annuity-due), matching computeInitialMeasurement.
 *   - Period 1: the payment is made at commencement, before any time has elapsed,
 *     so interest expense = 0 and the full payment reduces principal.
 *   - Period 2+: interest accrues on the opening balance (which already reflects
 *     the prior period's payment) at the periodic rate, then the payment reduces
 *     principal by (payment - interest).
 *
 * ROU asset mechanics differ by classification:
 *   - Finance lease: straight-line amortization over the shorter of the lease
 *     term or the asset's useful life (useful life governs when ownership
 *     transfers or a bargain purchase option exists).
 *   - Operating lease: total lease cost (all cash payments + initial direct
 *     costs - incentives) is straight-lined across the term first. ROU
 *     amortization each period is the PLUG needed to keep total period expense
 *     (interest + ROU amortization) equal to that constant straight-line amount.
 */
export function buildAmortizationSchedule(
  inputs: LeaseInputs,
  schedule: PaymentPeriod[],
  measurement: InitialMeasurement,
  classificationResult: ClassificationResult
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const periodicRate = measurement.periodicDiscountRate;

  const isFinance = classificationResult.classification === "finance";

  // --- Determine ROU amortization basis for finance leases ---
  const ownershipTransferOrBpo =
    classificationResult.tests[0].triggered || classificationResult.tests[1].triggered;
  let rouAmortizationPeriods = schedule.length;
  if (isFinance && ownershipTransferOrBpo && inputs.assetUsefulLifeMonths) {
    const usefulLifePeriods = numberOfPeriods(inputs.assetUsefulLifeMonths, inputs.paymentFrequency);
    rouAmortizationPeriods = usefulLifePeriods;
  } else if (
    isFinance &&
    inputs.assetUsefulLifeMonths &&
    numberOfPeriods(inputs.assetUsefulLifeMonths, inputs.paymentFrequency) < schedule.length
  ) {
    // Useful life shorter than the term (unusual but possible) — cap at useful life.
    rouAmortizationPeriods = numberOfPeriods(inputs.assetUsefulLifeMonths, inputs.paymentFrequency);
  }
  const financeRouAmortPerPeriod = measurement.rouAssetInitial / rouAmortizationPeriods;

  // --- Determine straight-line total lease cost for operating leases ---
  const totalCashPayments = schedule.reduce((sum, r) => sum + r.cashPayment, 0);
  const totalLeaseCost = totalCashPayments + inputs.initialDirectCosts - inputs.leaseIncentives;
  const straightLineExpense = totalLeaseCost / schedule.length;

  let openingLiability = measurement.leaseLiabilityInitial;
  let openingRou = measurement.rouAssetInitial;

  for (const p of schedule) {
    const interestExpense = p.period === 1 ? 0 : openingLiability * periodicRate;
    const principalReduction = p.cashPayment - interestExpense;
    let endingLiability = openingLiability - principalReduction;
    // Guard against floating point dust in the final period.
    if (p.period === schedule.length && Math.abs(endingLiability) < 0.01) {
      endingLiability = 0;
    }

    let rouAmortization: number;
    let straightLineExpenseForRow: number | undefined;

    if (isFinance) {
      rouAmortization = p.period <= rouAmortizationPeriods ? financeRouAmortPerPeriod : 0;
    } else {
      rouAmortization = straightLineExpense - interestExpense;
      straightLineExpenseForRow = straightLineExpense;
    }

    let endingRou = openingRou - rouAmortization;
    if (p.period === schedule.length && isFinance && Math.abs(endingRou) < 0.01) {
      endingRou = 0;
    }

    rows.push({
      period: p.period,
      date: p.date,
      openingLiability,
      interestExpense,
      cashPayment: p.cashPayment,
      principalReduction,
      endingLiability,
      openingRouAsset: openingRou,
      rouAmortization,
      endingRouAsset: endingRou,
      straightLineExpense: straightLineExpenseForRow,
    });

    openingLiability = endingLiability;
    openingRou = endingRou;
  }

  return rows;
}
