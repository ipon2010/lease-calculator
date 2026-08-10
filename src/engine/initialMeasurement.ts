import { InitialMeasurement, LeaseInputs, PaymentPeriod } from "./types";
import { periodsPerYear } from "./dateUtils";

/**
 * Computes the present value of the payment schedule at the discount rate,
 * and derives the initial lease liability and ROU asset.
 *
 * PV convention: payments are treated as due at the START of each period
 * (ordinary annuity-due, the standard convention for lease payments, which are
 * almost always payable in advance). Period 1's payment is therefore NOT discounted;
 * period 2 onward is discounted by (1+r)^(t-1).
 */
export function computeInitialMeasurement(
  inputs: LeaseInputs,
  schedule: PaymentPeriod[]
): InitialMeasurement {
  const ppy = periodsPerYear(inputs.paymentFrequency);
  const periodicRate = inputs.discountRateAnnual / ppy;

  let pv = 0;
  for (const row of schedule) {
    const discountFactor = Math.pow(1 + periodicRate, row.period - 1);
    pv += row.cashPayment / discountFactor;
  }

  const leaseLiabilityInitial = pv;
  const rouAssetInitial =
    leaseLiabilityInitial + inputs.initialDirectCosts + inputs.prepaidRent - inputs.leaseIncentives;

  return {
    presentValueOfPayments: pv,
    leaseLiabilityInitial,
    rouAssetInitial,
    periodicDiscountRate: periodicRate,
    periodsPerYear: ppy,
    numberOfPeriods: schedule.length,
  };
}
