import { useState } from "react";
import { extractPdfText } from "../lib/pdfText";
import { ExtractionResult } from "../extraction/types";

interface Props {
  onExtracted: (extraction: ExtractionResult, documentTextLength: number) => void;
  onSkip: () => void;
}

export function UploadStep({ onExtracted, onSkip }: Props) {
  const [status, setStatus] = useState<"idle" | "reading" | "extracting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");

  async function handleFile(file: File) {
    setFileName(file.name);
    setErrorMsg("");
    setStatus("reading");
    try {
      const text = await extractPdfText(file);
      setStatus("extracting");
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Extraction failed.");
      }
      onExtracted(data.extraction as ExtractionResult, text.length);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong reading this file.");
      setStatus("error");
    }
  }

  return (
    <div className="card">
      <div className="section-label">Step 1 — Upload lease document</div>
      <h2>Upload a commercial lease PDF</h2>
      <p>
        The document's text is read in your browser, then sent to an AI extraction step that pulls
        out key lease terms as structured data. Nothing is calculated yet — you'll review and confirm
        every extracted value on the next screen before any math happens.
      </p>

      <label htmlFor="lease-pdf">Lease PDF</label>
      <input
        id="lease-pdf"
        type="file"
        accept="application/pdf"
        disabled={status === "reading" || status === "extracting"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {fileName && status !== "idle" && (
        <p style={{ marginTop: "0.75rem" }}>
          <span className="mono">{fileName}</span>
          {status === "reading" && " — reading PDF text…"}
          {status === "extracting" && " — extracting lease terms…"}
        </p>
      )}

      {status === "error" && (
        <div
          className="card"
          style={{ background: "var(--danger-bg)", borderColor: "var(--danger)", marginTop: "1rem" }}
        >
          <strong style={{ color: "var(--danger)" }}>Extraction failed:</strong> {errorMsg}
        </div>
      )}

      <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--rule)", paddingTop: "1.5rem" }}>
        <p style={{ marginBottom: "0.75rem" }}>
          No PDF handy? You can also skip extraction and enter lease terms manually.
        </p>
        <button className="secondary" onClick={onSkip}>
          Enter terms manually instead
        </button>
      </div>
    </div>
  );
}
