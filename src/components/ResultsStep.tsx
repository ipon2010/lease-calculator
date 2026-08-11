import { useState } from "react";
import { EngineResult } from "../engine/types";
import { CalculatedStamp } from "./Stamp";

interface Props {
  result: EngineResult;
  onBack: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const fmtPct = (n: number) => `${(n * 100).toFixed(3)}%`;

export function ResultsStep({ result, onBack }: Props) {
  const [scheduleView, setScheduleView] = useState<"full" | "annual">("full");
  const { classification, initialMeasurement, amortizationSchedule, journalEntries } = result;

  const isFinance = classification.classification === "finance";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card">
        <div className="section-label">Step 3 — Results</div>
        <h2>
          Classification: {isFinance ? "Finance lease" : "Operating lease"} <CalculatedStamp />
        </h2>
        <p>Every number below is produced by deterministic code — the same formulas you'd build in an Excel amortization table. No AI touches this step.</p>
      </div>

      <div className="card">
        <div className="section-label">Classification walkthrough — all 5 ASC 842 tests</div>
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {classification.tests.map((t, i) => (
              <tr key={i}>
                <td style={{ textAlign: "left", whiteSpace: "normal" }}>
                  <strong>{t.testName}</strong>
                  <br />
                  <span style={{ color: "var(--ink-soft)", fontFamily: "var(--font-sans)", fontSize: "0.82rem" }}>
                    {t.detail}
                  </span>
                </td>
                <td>
                  <span
                    className="stamp"
                    style={{
                      border: `1.5px solid ${t.triggered ? "var(--danger)" : "var(--calculated)"}`,
                      color: t.triggered ? "var(--danger)" : "var(--calculated)",
                      background: t.triggered ? "var(--danger-bg)" : "var(--calculated-bg)",
                      transform: "none",
                    }}
                  >
                    {t.triggered ? "Triggered" : "Not triggered"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: "1rem" }}>
          <strong>Short-term lease practical expedient:</strong> {classification.shortTermExpedientNote}
        </p>
      </div>

      <div className="card">
        <div className="section-label">
          Initial measurement <CalculatedStamp />
        </div>
        <div className="field-row">
          <span className="field-label">Present value of lease payments</span>
          <span className="field-value">{fmt(initialMeasurement.presentValueOfPayments)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Lease liability (initial)</span>
          <span className="field-value">{fmt(initialMeasurement.leaseLiabilityInitial)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Right-of-use (ROU) asset (initial)</span>
          <span className="field-value">{fmt(initialMeasurement.rouAssetInitial)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Periodic discount rate</span>
          <span className="field-value">{fmtPct(initialMeasurement.periodicDiscountRate)}</span>
        </div>
        <div className="field-row">
          <span className="field-label">Number of periods</span>
          <span className="field-value">{initialMeasurement.numberOfPeriods}</span>
        </div>
      </div>

      <div className="card">
        <div className="section-label">
          Amortization schedule <CalculatedStamp />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <button
            className={scheduleView === "full" ? "" : "secondary"}
            style={{ marginRight: "0.5rem" }}
            onClick={() => setScheduleView("full")}
          >
            Every period
          </button>
          <button className={scheduleView === "annual" ? "" : "secondary"} onClick={() => setScheduleView("annual")}>
            Year-end snapshot
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Date</th>
                <th>Opening liability</th>
                <th>Interest</th>
                <th>Cash payment</th>
                <th>Principal reduction</th>
                <th>Ending liability</th>
                <th>ROU amortization</th>
                <th>Ending ROU asset</th>
              </tr>
            </thead>
            <tbody>
              {(scheduleView === "full"
                ? amortizationSchedule
                : amortizationSchedule.filter((_, i) => (i + 1) % 12 === 0 || i === amortizationSchedule.length - 1)
              ).map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{row.date}</td>
                  <td>{fmt(row.openingLiability)}</td>
                  <td>{fmt(row.interestExpense)}</td>
                  <td>{fmt(row.cashPayment)}</td>
                  <td>{fmt(row.principalReduction)}</td>
                  <td>{fmt(row.endingLiability)}</td>
                  <td>{fmt(row.rouAmortization)}</td>
                  <td>{fmt(row.endingRouAsset)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-label">
          Journal entries <CalculatedStamp />
        </div>
        <div style={{ borderBottom: "2px solid var(--ink)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>{result.initialJournalEntry.description}</div>
          <table>
            <tbody>
              {result.initialJournalEntry.lines.map((line, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: line.credit ? "1.5rem" : 0 }}>{line.account}</td>
                  <td>{line.debit != null ? fmt(line.debit) : ""}</td>
                  <td>{line.credit != null ? fmt(line.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "500px", overflowY: "auto" }}>
          {journalEntries.slice(0, 12).map((je) => (
            <div key={je.period} style={{ borderBottom: "1px dotted var(--rule-strong)", paddingBottom: "0.75rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>{je.description}</div>
              <table>
                <tbody>
                  {je.lines.map((line, i) => (
                    <tr key={i}>
                      <td style={{ paddingLeft: line.credit ? "1.5rem" : 0 }}>{line.account}</td>
                      <td>{line.debit != null ? fmt(line.debit) : ""}</td>
                      <td>{line.credit != null ? fmt(line.credit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {journalEntries.length > 12 && (
            <p>Showing the first 12 periods of {journalEntries.length} — the full schedule follows the same entry logic every period.</p>
          )}
        </div>
      </div>

      <button className="secondary" onClick={onBack}>
        ← Back to review
      </button>
    </div>
  );
}
