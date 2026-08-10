import { useState } from "react";
import { UploadStep } from "./components/UploadStep";
import { ReviewStep } from "./components/ReviewStep";
import { ResultsStep } from "./components/ResultsStep";
import { emptyReviewState, extractionToReviewState, reviewStateToLeaseInputs, ReviewFormState } from "./state";
import { ExtractionResult } from "./extraction/types";
import { runLeaseCalculation } from "./engine";
import { EngineResult } from "./engine/types";

type Step = "upload" | "review" | "results";

function App() {
  const [step, setStep] = useState<Step>("upload");
  const [reviewState, setReviewState] = useState<ReviewFormState>(emptyReviewState());
  const [result, setResult] = useState<EngineResult | null>(null);

  function handleExtracted(extraction: ExtractionResult) {
    setReviewState(extractionToReviewState(extraction));
    setStep("review");
  }

  function handleSkipToManual() {
    setReviewState(emptyReviewState());
    setStep("review");
  }

  function handleCalculate() {
    const inputs = reviewStateToLeaseInputs(reviewState);
    const engineResult = runLeaseCalculation(inputs);
    setResult(engineResult);
    setStep("results");
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <div className="section-label" style={{ border: "none", marginBottom: "0.5rem" }}>
          ASC 842 Lease Accounting Calculator
        </div>
        <h1>From lease document to amortization schedule</h1>
        <p>
          AI reads the document. Code does the math. Every extracted term is stamped{" "}
          <span className="stamp verify">Verify</span> and every calculated figure is stamped{" "}
          <span className="stamp calculated">Calculated</span> — so it's always clear which is which.
        </p>
      </header>

      {step === "upload" && <UploadStep onExtracted={handleExtracted} onSkip={handleSkipToManual} />}

      {step === "review" && (
        <ReviewStep
          state={reviewState}
          onChange={setReviewState}
          onSubmit={handleCalculate}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "results" && result && <ResultsStep result={result} onBack={() => setStep("review")} />}
    </div>
  );
}

export default App;
