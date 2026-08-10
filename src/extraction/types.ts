// Shape of the AI extraction step's output. This is a dead-end data structure —
// nothing here flows into the calculation engine until a human has reviewed and
// confirmed it via the review screen, at which point it is transformed into
// LeaseInputs (see src/engine/types.ts). The AI never sees or influences the math.

export interface ExtractedRenewalOption {
  additional_months: number | null;
  reasonably_certain: "yes" | "no" | "unclear";
  evidence: string;
}

export interface ExtractedEscalation {
  type: "fixed_percent" | "fixed_dollar" | "cpi" | "other";
  value: number | null;
  effective_date: string | null;
  notes: string;
}

export interface ExtractedRentHoliday {
  start_date: string | null;
  end_date: string | null;
}

export interface ExtractionResult {
  commencement_date: string | null;
  lease_term_months: number | null;
  renewal_options: ExtractedRenewalOption[];
  base_rent_amount: number | null;
  base_rent_frequency: "monthly" | "quarterly" | "annual" | null;
  escalations: ExtractedEscalation[];
  rent_holidays: ExtractedRentHoliday[];
  initial_direct_costs: number | null;
  lease_incentives: number | null;
  asset_description: string | null;
  rate_implicit_in_lease: number | null;
  rate_implicit_in_lease_evidence: string;
  purchase_option_exists: boolean;
  purchase_option_bargain: "yes" | "no" | "unclear";
  purchase_option_notes: string;
  ownership_transfer_at_end: boolean;
  extraction_confidence_notes: string;
}

export const EMPTY_EXTRACTION: ExtractionResult = {
  commencement_date: null,
  lease_term_months: null,
  renewal_options: [],
  base_rent_amount: null,
  base_rent_frequency: null,
  escalations: [],
  rent_holidays: [],
  initial_direct_costs: null,
  lease_incentives: null,
  asset_description: null,
  rate_implicit_in_lease: null,
  rate_implicit_in_lease_evidence: "",
  purchase_option_exists: false,
  purchase_option_bargain: "unclear",
  purchase_option_notes: "",
  ownership_transfer_at_end: false,
  extraction_confidence_notes: "",
};
