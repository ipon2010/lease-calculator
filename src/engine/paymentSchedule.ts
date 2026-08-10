import { LeaseInputs, PaymentPeriod } from "./types";
import { numberOfPeriods, periodDate } from "./dateUtils";

/**
 * Builds the full period-by-period cash payment schedule for the lease term,
 * applying escalations and zeroing out rent holiday periods. This is a pure
 * projection step — no present value math happens here.
 */
export function buildPaymentSchedule(inputs: LeaseInputs): PaymentPeriod[] {
  const n = numberOfPeriods(inputs.termMonths, inputs.paymentFrequency);
  const schedule: PaymentPeriod[] = [];

  // Track the "current" base payment as escalations apply cumulatively over time.
  let currentAmount = inputs.paymentAmount;

  for (let period = 1; period <= n; period++) {
    const notes: string[] = [];

    // Apply any escalations effective as of this period, in the order provided.
    for (const esc of inputs.escalations) {
      if (esc.effectiveFromPeriod === period) {
        if (esc.type === "fixed_percent" || esc.type === "cpi_estimated") {
          currentAmount = currentAmount * (1 + esc.value);
          notes.push(
            `${esc.type === "cpi_estimated" ? "CPI-based (user estimate)" : "Fixed %"} escalation of ${(
              esc.value * 100
            ).toFixed(2)}% applied.`
          );
        } else if (esc.type === "fixed_dollar") {
          currentAmount = currentAmount + esc.value;
          notes.push(`Fixed $ step-up of ${esc.value.toFixed(2)} applied.`);
        }
      }
    }

    const isHoliday = inputs.rentHolidays.some(
      (h) => period >= h.startPeriod && period <= h.endPeriod
    );
    if (isHoliday) notes.push("Rent holiday period — no cash payment due.");

    schedule.push({
      period,
      date: periodDate(inputs.commencementDate, period, inputs.paymentFrequency),
      cashPayment: isHoliday ? 0 : currentAmount,
      isRentHoliday: isHoliday,
      appliedEscalationNotes: notes,
    });
  }

  return schedule;
}
