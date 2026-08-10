import { ExtractionResult } from "./extraction/types";
import { Escalation, LeaseInputs, PaymentFrequency, RentHoliday } from "./engine/types";
import { dateToPeriod } from "./engine/dateUtils";

/** A single field's provenance, used to decide which stamp to render. */
export type FieldSource = "extracted" | "manual" | "unset";

export interface EscalationFormRow {
  id: string;
  type: "fixed_percent" | "fixed_dollar" | "cpi_estimated";
  value: string; // raw text input, parsed on submit
  effectiveDate: string; // ISO date, converted to a period at calc time
  isEstimate: boolean;
  notes: string;
  source: FieldSource;
}

export interface RentHolidayFormRow {
  id: string;
  startDate: string;
  endDate: string;
  source: FieldSource;
}

export interface ReviewFormState {
  commencementDate: string;
  commencementDateSource: FieldSource;

  termMonths: string;
  termMonthsSource: FieldSource;

  paymentAmount: string;
  paymentAmountSource: FieldSource;

  paymentFrequency: PaymentFrequency;
  paymentFrequencySource: FieldSource;

  escalations: EscalationFormRow[];
  rentHolidays: RentHolidayFormRow[];

  discountRateAnnual: string; // always manual — see product rationale
  discountRateSource: "rate_implicit_in_lease" | "incremental_borrowing_rate";
  rateImplicitExtracted: number | null; // shown as a hint if the AI found a stated rate
  rateImplicitEvidence: string;

  initialDirectCosts: string;
  initialDirectCostsSource: FieldSource;

  leaseIncentives: string;
  leaseIncentivesSource: FieldSource;

  prepaidRent: string;

  assetUsefulLifeMonths: string;
  assetDescription: string;

  // Classification inputs
  ownershipTransfersAtEnd: boolean;
  ownershipTransfersAtEndSource: FieldSource;

  bargainPurchaseOptionReasonablyCertain: boolean;
  bargainPurchaseOptionSource: FieldSource;
  purchaseOptionNotes: string;

  assetRemainingEconomicLifeMonths: string;
  assetFairValue: string;
  noAlternativeUseToLessor: boolean;

  renewalOptionsNote: string; // free-text summary of extracted renewal options, for the user's awareness
  extractionConfidenceNotes: string;
}

let idCounter = 0;
const nextId = () => `row-${idCounter++}`;

export function emptyReviewState(): ReviewFormState {
  return {
    commencementDate: "",
    commencementDateSource: "unset",
    termMonths: "",
    termMonthsSource: "unset",
    paymentAmount: "",
    paymentAmountSource: "unset",
    paymentFrequency: "monthly",
    paymentFrequencySource: "unset",
    escalations: [],
    rentHolidays: [],
    discountRateAnnual: "",
    discountRateSource: "incremental_borrowing_rate",
    rateImplicitExtracted: null,
    rateImplicitEvidence: "",
    initialDirectCosts: "0",
    initialDirectCostsSource: "unset",
    leaseIncentives: "0",
    leaseIncentivesSource: "unset",
    prepaidRent: "0",
    assetUsefulLifeMonths: "",
    assetDescription: "",
    ownershipTransfersAtEnd: false,
    ownershipTransfersAtEndSource: "unset",
    bargainPurchaseOptionReasonablyCertain: false,
    bargainPurchaseOptionSource: "unset",
    purchaseOptionNotes: "",
    assetRemainingEconomicLifeMonths: "",
    assetFairValue: "",
    noAlternativeUseToLessor: false,
    renewalOptionsNote: "",
    extractionConfidenceNotes: "",
  };
}

/** Converts raw AI extraction output into the editable review form state.
 * Every populated field is tagged "extracted" so the UI can stamp it for
 * the user's verification; nothing here is treated as final. */
export function extractionToReviewState(ex: ExtractionResult): ReviewFormState {
  const s = emptyReviewState();

  if (ex.commencement_date) {
    s.commencementDate = ex.commencement_date;
    s.commencementDateSource = "extracted";
  }
  if (ex.lease_term_months) {
    s.termMonths = String(ex.lease_term_months);
    s.termMonthsSource = "extracted";
  }
  if (ex.base_rent_amount) {
    s.paymentAmount = String(ex.base_rent_amount);
    s.paymentAmountSource = "extracted";
  }
  if (ex.base_rent_frequency) {
    s.paymentFrequency = ex.base_rent_frequency;
    s.paymentFrequencySource = "extracted";
  }

  s.escalations = ex.escalations.map((e) => ({
    id: nextId(),
    type: e.type === "cpi" ? "cpi_estimated" : e.type === "other" ? "fixed_percent" : e.type,
    value: e.type === "cpi" ? "" : e.value != null ? String(e.value) : "",
    effectiveDate: e.effective_date ?? "",
    isEstimate: e.type === "cpi",
    notes: e.notes,
    source: "extracted" as FieldSource,
  }));

  s.rentHolidays = ex.rent_holidays.map((h) => ({
    id: nextId(),
    startDate: h.start_date ?? "",
    endDate: h.end_date ?? "",
    source: "extracted" as FieldSource,
  }));

  if (ex.rate_implicit_in_lease != null) {
    s.rateImplicitExtracted = ex.rate_implicit_in_lease;
    s.rateImplicitEvidence = ex.rate_implicit_in_lease_evidence;
    s.discountRateSource = "rate_implicit_in_lease";
    s.discountRateAnnual = String(ex.rate_implicit_in_lease);
  }

  if (ex.initial_direct_costs != null) {
    s.initialDirectCosts = String(ex.initial_direct_costs);
    s.initialDirectCostsSource = "extracted";
  }
  if (ex.lease_incentives != null) {
    s.leaseIncentives = String(ex.lease_incentives);
    s.leaseIncentivesSource = "extracted";
  }
  s.assetDescription = ex.asset_description ?? "";

  s.ownershipTransfersAtEnd = ex.ownership_transfer_at_end;
  s.ownershipTransfersAtEndSource = "extracted";

  s.bargainPurchaseOptionReasonablyCertain = ex.purchase_option_bargain === "yes";
  s.bargainPurchaseOptionSource = "extracted";
  s.purchaseOptionNotes = ex.purchase_option_notes;

  if (ex.renewal_options.length > 0) {
    s.renewalOptionsNote = ex.renewal_options
      .map(
        (r) =>
          `+${r.additional_months ?? "?"} months, reasonably certain: ${r.reasonably_certain} — ${r.evidence}`
      )
      .join(" | ");
  }

  s.extractionConfidenceNotes = ex.extraction_confidence_notes;

  return s;
}

/** Converts the (user-reviewed) form state into the strict LeaseInputs the
 * deterministic engine consumes. This is the one-way boundary: once this
 * function runs, nothing downstream can be influenced by the AI step again. */
export function reviewStateToLeaseInputs(s: ReviewFormState): LeaseInputs {
  const commencementDate = s.commencementDate;

  const escalations: Escalation[] = s.escalations
    .filter((e) => e.value !== "" || e.type === "cpi_estimated")
    .map((e) => ({
      type: e.type,
      value: parseFloat(e.value) / (e.type === "fixed_dollar" ? 1 : 100) || 0,
      effectiveFromPeriod: e.effectiveDate
        ? dateToPeriod(commencementDate, e.effectiveDate, s.paymentFrequency)
        : 1,
      isEstimate: e.isEstimate,
      notes: e.notes,
    }));

  const rentHolidays: RentHoliday[] = s.rentHolidays
    .filter((h) => h.startDate && h.endDate)
    .map((h) => ({
      startPeriod: dateToPeriod(commencementDate, h.startDate, s.paymentFrequency),
      endPeriod: dateToPeriod(commencementDate, h.endDate, s.paymentFrequency),
    }));

  return {
    commencementDate,
    termMonths: parseFloat(s.termMonths) || 0,
    paymentAmount: parseFloat(s.paymentAmount) || 0,
    paymentFrequency: s.paymentFrequency,
    escalations,
    rentHolidays,
    discountRateAnnual: (parseFloat(s.discountRateAnnual) || 0) / 100,
    discountRateSource: s.discountRateSource,
    initialDirectCosts: parseFloat(s.initialDirectCosts) || 0,
    leaseIncentives: parseFloat(s.leaseIncentives) || 0,
    prepaidRent: parseFloat(s.prepaidRent) || 0,
    assetUsefulLifeMonths: s.assetUsefulLifeMonths ? parseFloat(s.assetUsefulLifeMonths) : null,
    classification: {
      ownershipTransfersAtEnd: s.ownershipTransfersAtEnd,
      bargainPurchaseOptionReasonablyCertain: s.bargainPurchaseOptionReasonablyCertain,
      assetRemainingEconomicLifeMonths: s.assetRemainingEconomicLifeMonths
        ? parseFloat(s.assetRemainingEconomicLifeMonths)
        : null,
      assetFairValue: s.assetFairValue ? parseFloat(s.assetFairValue) : null,
      noAlternativeUseToLessor: s.noAlternativeUseToLessor,
    },
  };
}
