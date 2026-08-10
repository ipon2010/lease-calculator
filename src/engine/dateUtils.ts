import { PaymentFrequency } from "./types";

export function monthsPerPeriod(frequency: PaymentFrequency): number {
  switch (frequency) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "annual":
      return 12;
  }
}

export function periodsPerYear(frequency: PaymentFrequency): number {
  return 12 / monthsPerPeriod(frequency);
}

export function numberOfPeriods(termMonths: number, frequency: PaymentFrequency): number {
  const mpp = monthsPerPeriod(frequency);
  // Round up so a partial final period is still represented; in practice lease
  // terms are expected to divide evenly by the payment frequency.
  return Math.ceil(termMonths / mpp);
}

/** Adds `months` calendar months to an ISO date string and returns an ISO date string. */
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  const result = new Date(d.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result.toISOString().slice(0, 10);
}

export function periodDate(commencementDate: string, period: number, frequency: PaymentFrequency): string {
  const mpp = monthsPerPeriod(frequency);
  return addMonths(commencementDate, (period - 1) * mpp);
}

/** Whole calendar months between two ISO dates (b - a), used to convert an
 * absolute date (e.g. an escalation's effective date) into a period index. */
export function monthsBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + "T00:00:00Z");
  const b = new Date(isoB + "T00:00:00Z");
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

/** Converts an absolute ISO date into the 1-based period index it falls in,
 * relative to the lease commencement date and payment frequency. */
export function dateToPeriod(
  commencementDate: string,
  targetDate: string,
  frequency: PaymentFrequency
): number {
  const mpp = monthsPerPeriod(frequency);
  const monthsIn = monthsBetween(commencementDate, targetDate);
  return Math.max(1, Math.floor(monthsIn / mpp) + 1);
}
