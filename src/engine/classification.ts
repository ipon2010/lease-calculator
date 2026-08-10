import {
  ClassificationInputs,
  ClassificationResult,
  ClassificationTestResult,
  LeaseInputs,
} from "./types";
import { buildPaymentSchedule } from "./paymentSchedule";
import { computeInitialMeasurement } from "./initialMeasurement";

// Common practice thresholds carried over from pre-ASC-842 guidance. ASC 842 itself
// removed explicit bright lines, but these percentages remain the widely used
// reference points in practice (see e.g. ASC 842-10-55-2). They are shown, not hidden,
// so the user can apply judgment rather than treat them as automatic pass/fail.
const MAJOR_PART_OF_ECONOMIC_LIFE_THRESHOLD = 0.75;
const SUBSTANTIALLY_ALL_FAIR_VALUE_THRESHOLD = 0.9;

export function classifyLease(inputs: LeaseInputs): ClassificationResult {
  const tests: ClassificationTestResult[] = [];
  const c: ClassificationInputs = inputs.classification;

  // Test 1: Ownership transfer
  tests.push({
    testName: "Ownership transfers to lessee by end of lease term",
    triggered: c.ownershipTransfersAtEnd,
    detail: c.ownershipTransfersAtEnd
      ? "Ownership transfer at end of term was indicated. This alone makes the lease a finance lease."
      : "No ownership transfer indicated.",
  });

  // Test 2: Bargain purchase option
  tests.push({
    testName: "Lease contains a bargain purchase option reasonably certain to be exercised",
    triggered: c.bargainPurchaseOptionReasonablyCertain,
    detail: c.bargainPurchaseOptionReasonablyCertain
      ? "A bargain purchase option reasonably certain to be exercised was indicated."
      : "No bargain purchase option reasonably certain to be exercised.",
  });

  // Test 3: Major part of remaining economic life
  let majorPartTriggered = false;
  let majorPartDetail = "Asset remaining economic life not provided — this test could not be evaluated and requires manual judgment.";
  if (c.assetRemainingEconomicLifeMonths && c.assetRemainingEconomicLifeMonths > 0) {
    const ratio = inputs.termMonths / c.assetRemainingEconomicLifeMonths;
    majorPartTriggered = ratio >= MAJOR_PART_OF_ECONOMIC_LIFE_THRESHOLD;
    majorPartDetail = `Lease term (${inputs.termMonths} mo) is ${(ratio * 100).toFixed(
      1
    )}% of the asset's remaining economic life (${c.assetRemainingEconomicLifeMonths} mo). Commonly referenced threshold: ${(
      MAJOR_PART_OF_ECONOMIC_LIFE_THRESHOLD * 100
    ).toFixed(0)}%. ASC 842 does not mandate a bright line — use judgment, especially near the threshold.`;
  }
  tests.push({
    testName: "Lease term is for the major part of the remaining economic life of the asset",
    triggered: majorPartTriggered,
    detail: majorPartDetail,
  });

  // Test 4: Substantially all of fair value
  let fairValueTriggered = false;
  let fairValueDetail = "Asset fair value not provided — this test could not be evaluated and requires manual judgment.";
  if (c.assetFairValue && c.assetFairValue > 0) {
    const schedule = buildPaymentSchedule(inputs);
    const measurement = computeInitialMeasurement(inputs, schedule);
    const ratio = measurement.presentValueOfPayments / c.assetFairValue;
    fairValueTriggered = ratio >= SUBSTANTIALLY_ALL_FAIR_VALUE_THRESHOLD;
    fairValueDetail = `PV of lease payments (${measurement.presentValueOfPayments.toFixed(
      2
    )}) is ${(ratio * 100).toFixed(1)}% of asset fair value (${c.assetFairValue.toFixed(
      2
    )}). Commonly referenced threshold: ${(SUBSTANTIALLY_ALL_FAIR_VALUE_THRESHOLD * 100).toFixed(
      0
    )}%. ASC 842 does not mandate a bright line — use judgment, especially near the threshold.`;
  }
  tests.push({
    testName: "Present value of lease payments is substantially all of the asset's fair value",
    triggered: fairValueTriggered,
    detail: fairValueDetail,
  });

  // Test 5: No alternative use to lessor
  tests.push({
    testName: "Underlying asset is so specialized it has no alternative use to the lessor at end of term",
    triggered: c.noAlternativeUseToLessor,
    detail: c.noAlternativeUseToLessor
      ? "Asset was indicated to have no alternative use to the lessor at end of term."
      : "No indication the asset lacks alternative use to the lessor.",
  });

  const classification = tests.some((t) => t.triggered) ? "finance" : "operating";

  const shortTermExpedientEligible =
    inputs.termMonths <= 12 && !c.bargainPurchaseOptionReasonablyCertain;

  const shortTermExpedientNote = shortTermExpedientEligible
    ? "This lease's term is 12 months or less and does not contain a purchase option reasonably certain to be exercised. Under the ASC 842 short-term lease practical expedient, the entity may elect NOT to recognize a right-of-use asset or lease liability for this lease, and instead recognize lease payments as expense on a straight-line basis over the term. This is a policy election made by asset class, not a per-lease choice — confirm whether your organization has made this election for this class of underlying asset."
    : "This lease does not qualify for the short-term lease practical expedient (term exceeds 12 months, or a purchase option reasonably certain to be exercised is present).";

  return {
    classification,
    tests,
    shortTermExpedientEligible,
    shortTermExpedientNote,
  };
}
