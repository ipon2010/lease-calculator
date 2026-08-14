import { useState, useEffect } from "react";
import { UploadStep } from "./components/UploadStep";
import { ReviewStep } from "./components/ReviewStep";
import { ResultsStep } from "./components/ResultsStep";
import { AboutPage, TermsPage, PrivacyPage, DisclaimerPage } from "./components/LegalPages";
import { emptyReviewState, extractionToReviewState, reviewStateToLeaseInputs, ReviewFormState } from "./state";
import { ExtractionResult } from "./extraction/types";
import { runLeaseCalculation } from "./engine";
import { EngineResult } from "./engine/types";

type Step = "upload" | "review" | "results";
type Page = "app" | "about" | "terms" | "privacy" | "disclaimer";
type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "lesseetrail-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [step, setStep] = useState<Step>("upload");
  const [page, setPage] = useState<Page>("app");
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [reviewState, setReviewState] = useState<ReviewFormState>(emptyReviewState());
  const [result, setResult] = useState<EngineResult | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
    <div>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem 3rem" }}>
        <header
          style={{
            marginBottom: "2.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <div className="section-label" style={{ border: "none", marginBottom: "0.5rem" }}>
              LesseeTrail
            </div>
            <h1>ASC 842 lease accounting, from document to amortization schedule</h1>
            <p>
              AI reads the document. Code does the math. Every extracted term is stamped{" "}
              <span className="stamp verify">Verify</span> and every calculated figure is stamped{" "}
              <span className="stamp calculated">Calculated</span> — so it's always clear which is which.
            </p>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </header>

        {page === "about" && <AboutPage onBack={() => setPage("app")} />}
        {page === "terms" && <TermsPage onBack={() => setPage("app")} />}
        {page === "privacy" && <PrivacyPage onBack={() => setPage("app")} />}
        {page === "disclaimer" && <DisclaimerPage onBack={() => setPage("app")} />}

        {page === "app" && (
          <>
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
          </>
        )}
      </div>

      <footer className="site-footer">
        <div className="footer-inner">
          <nav>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage("about");
              }}
            >
              About
            </a>
            <a href="mailto:support@dashcraftco.com">Contact</a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage("terms");
              }}
            >
              Terms of Use
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage("privacy");
              }}
            >
              Privacy Policy
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setPage("disclaimer");
              }}
            >
              Disclaimer &amp; Limitations
            </a>
          </nav>
          <div className="footer-copyright">© 2026 DashCraftCo · LesseeTrail</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
