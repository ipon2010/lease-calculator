import { EngineResult, LeaseInputs } from "./types";
import { classifyLease } from "./classification";
import { buildPaymentSchedule } from "./paymentSchedule";
import { computeInitialMeasurement } from "./initialMeasurement";
import { buildAmortizationSchedule } from "./amortization";
import { generateJournalEntries, generateInitialJournalEntry } from "./journalEntries";

/**
 * Runs the complete deterministic ASC 842 calculation pipeline.
 * This is the ONLY function the UI should call to get final numbers.
 * It takes no AI-provided values except what the user has already reviewed
 * and confirmed as LeaseInputs — there is no path back to the AI extraction
 * step from here.
 */
export function runLeaseCalculation(inputs: LeaseInputs): EngineResult {
  const classification = classifyLease(inputs);
  const paymentSchedule = buildPaymentSchedule(inputs);
  const initialMeasurement = computeInitialMeasurement(inputs, paymentSchedule);
  const amortizationSchedule = buildAmortizationSchedule(
    inputs,
    paymentSchedule,
    initialMeasurement,
    classification
  );
  const journalEntries = generateJournalEntries(amortizationSchedule, classification);
  const initialJournalEntry = generateInitialJournalEntry(inputs, initialMeasurement);

  return {
    classification,
    paymentSchedule,
    initialMeasurement,
    amortizationSchedule,
    initialJournalEntry,
    journalEntries,
  };
}

export * from "./types";
