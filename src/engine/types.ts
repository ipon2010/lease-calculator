// ASC 842 Lease Accounting Calculation Engine — Type Definitions
// This file defines the shape of every input and output in the deterministic
// calculation pipeline. Nothing in this file or any file in /engine calls an AI API.

export type PaymentFrequency = "monthly" | "quarterly" | "annual";

export type EscalationType = "fixed_percent" | "fixed_dollar" | "cpi_estimated";

export interface Escalation {
  type: EscalationType;
  /** For fixed_percent: e.g. 0.03 for 3%. For fixed_dollar: the $ step-up amount.
   *  For cpi_estimated: the user-entered assumed annual % (since actual future CPI is unknowable). */
  value: number;
  /** Period index (1-based) at which this escalation first takes effect. */
  effectiveFromPeriod: number;
  /** True if this originated as a CPI-based clause and the value is a manual user estimate, not extracted fact. */
  isEstimate: boolean;
  notes?: string;
}

export interface RentHoliday {
  /** Period index (1-based) at which free rent starts. */
  startPeriod: number;
  /** Period index (1-based) at which free rent ends (inclusive). */
  endPeriod: number;
}

export interface ClassificationInputs {
  ownershipTransfersAtEnd: boolean;
  bargainPurchaseOptionReasonablyCertain: boolean;
  /** Remaining economic life of the underlying asset, in months, at lease commencement. */
  assetRemainingEconomicLifeMonths: number | null;
  /** Fair value of the underlying asset at lease commencement. */
  assetFairValue: number | null;
  /** True if the asset is so specialized it has no alternative use to the lessor at end of term. */
  noAlternativeUseToLessor: boolean;
}

export interface LeaseInputs {
  commencementDate: string; // ISO date
  termMonths: number;
  paymentAmount: number;
  paymentFrequency: PaymentFrequency;
  escalations: Escalation[];
  rentHolidays: RentHoliday[];
  /** Annual discount rate as a decimal, e.g. 0.06 for 6%. */
  discountRateAnnual: number;
  discountRateSource: "rate_implicit_in_lease" | "incremental_borrowing_rate";
  initialDirectCosts: number;
  leaseIncentives: number;
  prepaidRent: number;
  /** Useful life of the underlying asset in months, used to cap finance-lease ROU amortization. */
  assetUsefulLifeMonths: number | null;
  classification: ClassificationInputs;
}

export type LeaseClassification = "finance" | "operating";

export interface ClassificationTestResult {
  testName: string;
  triggered: boolean;
  detail: string;
}

export interface ClassificationResult {
  classification: LeaseClassification;
  tests: ClassificationTestResult[];
  shortTermExpedientEligible: boolean;
  shortTermExpedientNote: string;
}

export interface PaymentPeriod {
  period: number; // 1-based
  date: string; // ISO date, approximate period date
  cashPayment: number;
  isRentHoliday: boolean;
  appliedEscalationNotes: string[];
}

export interface InitialMeasurement {
  presentValueOfPayments: number;
  leaseLiabilityInitial: number;
  rouAssetInitial: number;
  periodicDiscountRate: number;
  periodsPerYear: number;
  numberOfPeriods: number;
}

export interface AmortizationRow {
  period: number;
  date: string;
  openingLiability: number;
  interestExpense: number;
  cashPayment: number;
  principalReduction: number;
  endingLiability: number;
  openingRouAsset: number;
  rouAmortization: number;
  endingRouAsset: number;
  /** Only populated for operating leases: the constant straight-line total period expense. */
  straightLineExpense?: number;
}

export interface JournalEntryLine {
  account: string;
  debit?: number;
  credit?: number;
}

export interface JournalEntry {
  period: number;
  date: string;
  description: string;
  lines: JournalEntryLine[];
}

export interface EngineResult {
  classification: ClassificationResult;
  paymentSchedule: PaymentPeriod[];
  initialMeasurement: InitialMeasurement;
  amortizationSchedule: AmortizationRow[];
  initialJournalEntry: JournalEntry;
  journalEntries: JournalEntry[];
}
