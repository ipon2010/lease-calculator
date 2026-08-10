import { ReviewFormState, EscalationFormRow, RentHolidayFormRow } from "../state";
import { Stamp } from "./Stamp";

interface Props {
  state: ReviewFormState;
  onChange: (next: ReviewFormState) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const genId = () => `row-${Math.random().toString(36).slice(2, 9)}`;

export function ReviewStep({ state, onChange, onSubmit, onBack }: Props) {
  const set = <K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) =>
    onChange({ ...state, [key]: value });

  const updateEscalation = (id: string, patch: Partial<EscalationFormRow>) =>
    onChange({
      ...state,
      escalations: state.escalations.map((e) => (e.id === id ? { ...e, ...patch, source: "manual" } : e)),
    });

  const removeEscalation = (id: string) =>
    onChange({ ...state, escalations: state.escalations.filter((e) => e.id !== id) });

  const addEscalation = () =>
    onChange({
      ...state,
      escalations: [
        ...state.escalations,
        {
          id: genId(),
          type: "fixed_percent",
          value: "",
          effectiveDate: "",
          isEstimate: false,
          notes: "",
          source: "manual",
        },
      ],
    });

  const updateHoliday = (id: string, patch: Partial<RentHolidayFormRow>) =>
    onChange({
      ...state,
      rentHolidays: state.rentHolidays.map((h) => (h.id === id ? { ...h, ...patch, source: "manual" } : h)),
    });

  const removeHoliday = (id: string) =>
    onChange({ ...state, rentHolidays: state.rentHolidays.filter((h) => h.id !== id) });

  const addHoliday = () =>
    onChange({
      ...state,
      rentHolidays: [...state.rentHolidays, { id: genId(), startDate: "", endDate: "", source: "manual" }],
    });

  const canSubmit =
    state.commencementDate && state.termMonths && state.paymentAmount && state.discountRateAnnual;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card">
        <div className="section-label">Step 2 — Review extracted terms</div>
        <h2>Verify before we calculate anything</h2>
        <p>
          Fields marked <span className="stamp verify">Verify</span> came from the AI extraction step —
          check them against the document. Everything below is editable. Nothing has been calculated yet.
        </p>
        {state.extractionConfidenceNotes && (
          <p style={{ fontStyle: "italic" }}>Extraction notes: {state.extractionConfidenceNotes}</p>
        )}
      </div>

      <div className="card">
        <div className="section-label">Basic lease terms</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label>
              Commencement date <Stamp source={state.commencementDateSource} />
            </label>
            <input
              type="date"
              value={state.commencementDate}
              onChange={(e) => set("commencementDate", e.target.value)}
            />
          </div>
          <div>
            <label>
              Lease term (months) <Stamp source={state.termMonthsSource} />
            </label>
            <input
              type="number"
              value={state.termMonths}
              onChange={(e) => set("termMonths", e.target.value)}
              placeholder="e.g. 60"
            />
          </div>
          <div>
            <label>
              Base rent payment <Stamp source={state.paymentAmountSource} />
            </label>
            <input
              type="number"
              value={state.paymentAmount}
              onChange={(e) => set("paymentAmount", e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          <div>
            <label>
              Payment frequency <Stamp source={state.paymentFrequencySource} />
            </label>
            <select
              value={state.paymentFrequency}
              onChange={(e) => set("paymentFrequency", e.target.value as any)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>

        {state.renewalOptionsNote && (
          <p style={{ marginTop: "1rem" }}>
            <strong>Renewal options found in document:</strong> {state.renewalOptionsNote}
            <br />
            If a renewal is reasonably certain to be exercised, add its additional months to the lease
            term above — the engine works off total term months only.
          </p>
        )}
      </div>

      <div className="card">
        <div className="section-label">Rent escalations</div>
        {state.escalations.length === 0 && <p>No escalations. Add one if the lease has rent increases.</p>}
        {state.escalations.map((e) => (
          <div
            key={e.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: "0.75rem",
              alignItems: "end",
              marginBottom: "0.75rem",
              paddingBottom: "0.75rem",
              borderBottom: "1px dotted var(--rule-strong)",
            }}
          >
            <div>
              <label>
                Type <Stamp source={e.source} />
              </label>
              <select value={e.type} onChange={(ev) => updateEscalation(e.id, { type: ev.target.value as any })}>
                <option value="fixed_percent">Fixed % annual increase</option>
                <option value="fixed_dollar">Fixed $ step-up</option>
                <option value="cpi_estimated">CPI-based (needs estimate)</option>
              </select>
            </div>
            <div>
              <label>{e.type === "fixed_dollar" ? "Step-up amount ($)" : "Rate (%)"}</label>
              <input
                type="number"
                value={e.value}
                placeholder={e.type === "cpi_estimated" ? "Your assumed % — required" : ""}
                onChange={(ev) => updateEscalation(e.id, { value: ev.target.value })}
              />
              {e.type === "cpi_estimated" && (
                <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  Future CPI can't be known at lease commencement. Enter your own assumed annual %.
                </p>
              )}
            </div>
            <div>
              <label>Effective date</label>
              <input
                type="date"
                value={e.effectiveDate}
                onChange={(ev) => updateEscalation(e.id, { effectiveDate: ev.target.value })}
              />
            </div>
            <button className="secondary" onClick={() => removeEscalation(e.id)}>
              Remove
            </button>
          </div>
        ))}
        <button className="secondary" onClick={addEscalation}>
          + Add escalation
        </button>
      </div>

      <div className="card">
        <div className="section-label">Rent holidays / free rent periods</div>
        {state.rentHolidays.length === 0 && <p>None found or entered.</p>}
        {state.rentHolidays.map((h) => (
          <div
            key={h.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: "0.75rem",
              alignItems: "end",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <label>
                Start date <Stamp source={h.source} />
              </label>
              <input type="date" value={h.startDate} onChange={(e) => updateHoliday(h.id, { startDate: e.target.value })} />
            </div>
            <div>
              <label>End date</label>
              <input type="date" value={h.endDate} onChange={(e) => updateHoliday(h.id, { endDate: e.target.value })} />
            </div>
            <button className="secondary" onClick={() => removeHoliday(h.id)}>
              Remove
            </button>
          </div>
        ))}
        <button className="secondary" onClick={addHoliday}>
          + Add rent holiday
        </button>
      </div>

      <div className="card">
        <div className="section-label">Discount rate — always entered manually</div>
        <p>
          <strong>Incremental Borrowing Rate (IBR):</strong> the rate the lessee would pay to borrow, over
          a similar term, an amount equal to the lease payments, in a similar economic environment, with
          similar collateral. <strong>Rate implicit in the lease:</strong> the rate that equates the PV of
          payments (plus unguaranteed residual) to the asset's fair value. Per ASC 842, use the implicit
          rate if it is readily determinable; otherwise use the IBR. Leases almost never state a
          determinable implicit rate, so IBR is the typical choice.
        </p>
        {state.rateImplicitExtracted != null && (
          <p style={{ fontStyle: "italic" }}>
            The document extraction found a possible stated rate of {(state.rateImplicitExtracted * 100).toFixed(2)}%.
            Evidence: "{state.rateImplicitEvidence}" — verify this is truly the rate implicit in the lease
            before using it.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label>Rate source</label>
            <select
              value={state.discountRateSource}
              onChange={(e) => set("discountRateSource", e.target.value as any)}
            >
              <option value="incremental_borrowing_rate">Incremental borrowing rate (typical)</option>
              <option value="rate_implicit_in_lease">Rate implicit in the lease</option>
            </select>
          </div>
          <div>
            <label>Annual rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={state.discountRateAnnual}
              onChange={(e) => set("discountRateAnnual", e.target.value)}
              placeholder="e.g. 6.25"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-label">Other amounts</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div>
            <label>
              Initial direct costs ($) <Stamp source={state.initialDirectCostsSource} />
            </label>
            <input
              type="number"
              value={state.initialDirectCosts}
              onChange={(e) => set("initialDirectCosts", e.target.value)}
            />
          </div>
          <div>
            <label>
              Lease incentives ($) <Stamp source={state.leaseIncentivesSource} />
            </label>
            <input
              type="number"
              value={state.leaseIncentives}
              onChange={(e) => set("leaseIncentives", e.target.value)}
            />
          </div>
          <div>
            <label>Prepaid rent ($)</label>
            <input type="number" value={state.prepaidRent} onChange={(e) => set("prepaidRent", e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label>Asset useful life (months) — used to cap ROU amortization for finance leases</label>
          <input
            type="number"
            value={state.assetUsefulLifeMonths}
            onChange={(e) => set("assetUsefulLifeMonths", e.target.value)}
            placeholder="Optional — defaults to lease term if left blank"
          />
        </div>
      </div>

      <div className="card">
        <div className="section-label">Classification inputs — the 5 ASC 842 tests</div>
        <div className="field-row">
          <span className="field-label">
            Ownership transfers to lessee at end of term <Stamp source={state.ownershipTransfersAtEndSource} />
          </span>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={state.ownershipTransfersAtEnd}
            onChange={(e) => set("ownershipTransfersAtEnd", e.target.checked)}
          />
        </div>
        <div className="field-row">
          <span className="field-label">
            Bargain purchase option reasonably certain to be exercised <Stamp source={state.bargainPurchaseOptionSource} />
          </span>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={state.bargainPurchaseOptionReasonablyCertain}
            onChange={(e) => set("bargainPurchaseOptionReasonablyCertain", e.target.checked)}
          />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label>Asset's remaining economic life at commencement (months)</label>
          <input
            type="number"
            value={state.assetRemainingEconomicLifeMonths}
            onChange={(e) => set("assetRemainingEconomicLifeMonths", e.target.value)}
            placeholder="Needed for the 'major part of economic life' test"
          />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label>Asset fair value at commencement ($)</label>
          <input
            type="number"
            value={state.assetFairValue}
            onChange={(e) => set("assetFairValue", e.target.value)}
            placeholder="Needed for the 'substantially all fair value' test"
          />
        </div>
        <div className="field-row" style={{ marginTop: "1rem" }}>
          <span className="field-label">Asset is specialized — no alternative use to lessor at end of term</span>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={state.noAlternativeUseToLessor}
            onChange={(e) => set("noAlternativeUseToLessor", e.target.checked)}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between" }}>
        <button className="secondary" onClick={onBack}>
          ← Back
        </button>
        <button onClick={onSubmit} disabled={!canSubmit}>
          Calculate ROU asset & lease liability →
        </button>
      </div>
    </div>
  );
}
