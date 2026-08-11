interface PageProps {
  onBack: () => void;
}

function PageShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card">
        <div className="section-label">LesseeTrail</div>
        <h2>{title}</h2>
        {children}
      </div>
      <button className="secondary" onClick={onBack}>
        ← Back to the tool
      </button>
    </div>
  );
}

export function AboutPage({ onBack }: PageProps) {
  return (
    <PageShell title="About LesseeTrail" onBack={onBack}>
      <p>
        LesseeTrail is a portfolio project built to demonstrate a specific idea: an accounting standard's
        calculation logic can be encoded directly into software, with AI used only for the one task AI is
        actually good at — reading messy documents — never for the arithmetic itself.
      </p>
      <p>
        Upload a commercial lease PDF and an AI step extracts the key terms (dates, rent, escalations,
        purchase options, and so on) into an editable review screen. Once you've verified those terms, a
        separate, deterministic calculation engine — plain code with no AI involvement — builds the ASC 842
        right-of-use asset and lease liability amortization schedule, walks through the 5-test lease
        classification, and generates the journal entries. Every field in the tool is stamped to show where
        it came from: <span className="stamp verify">Verify</span> for AI-extracted values,{" "}
        <span className="stamp manual">Manual</span> for values you entered yourself, and{" "}
        <span className="stamp calculated">Calculated</span> for anything the engine computed.
      </p>
      <p>
        The calculation engine has been checked against published third-party ASC 842 examples with known
        present-value answers, not just internal test data.
      </p>
      <p>
        This is a demonstration and portfolio tool, not a commercial lease accounting product. See the Terms
        of Use for details on how it's intended to be used.
      </p>
    </PageShell>
  );
}

export function TermsPage({ onBack }: PageProps) {
  return (
    <PageShell title="Terms of Use" onBack={onBack}>
      <p style={{ fontStyle: "italic" }}>Last updated: August 11, 2026</p>

      <h3>What this is</h3>
      <p>
        LesseeTrail is provided as a free, informational and portfolio-demonstration tool. It is not a
        substitute for professional accounting, tax, or legal advice. Consult a qualified CPA or accounting
        professional before relying on any figure produced by this tool for financial reporting, audit, tax,
        or other formal purposes.
      </p>

      <h3>No warranty</h3>
      <p>
        This tool is provided "as is," without warranty of any kind, express or implied, including but not
        limited to accuracy, completeness, or fitness for a particular purpose. While the calculation engine
        has been tested against published reference examples, you are responsible for independently
        verifying every figure before relying on it.
      </p>

      <h3>Limitation of liability</h3>
      <p>
        To the fullest extent permitted by law, the DashCraftCo founder shall not be liable for any damages,
        losses, or claims arising from the use of, or inability to use, this tool, including without
        limitation any accounting, tax, or financial decisions made based on its output.
      </p>

      <h3>AI-extracted content</h3>
      <p>
        Lease terms extracted from an uploaded document by the AI step are a starting point for your review,
        not a verified fact. You are responsible for confirming every extracted value against the source
        document before using it in any calculation.
      </p>

      <h3>Acceptable use</h3>
      <p>
        Please don't use this tool to upload documents you don't have the right to process, or in a way that
        attempts to abuse, overload, or circumvent its rate limits.
      </p>

      <h3>Changes</h3>
      <p>
        This tool, its features, and these terms may change or be discontinued at any time without notice.
      </p>

      <h3>Contact</h3>
      <p>
        <a href="mailto:support@dashcraftco.com">Email us for any concerns, feedback, or questions.</a>
      </p>
    </PageShell>
  );
}

export function PrivacyPage({ onBack }: PageProps) {
  return (
    <PageShell title="Privacy" onBack={onBack}>
      <p style={{ fontStyle: "italic" }}>Last updated: August 11, 2026</p>

      <h3>What happens to your document</h3>
      <p>
        When you upload a lease PDF, the text is read directly in your browser. That text (not the original
        PDF file) is sent to Anthropic's Claude API to extract key lease terms into structured data. This
        tool does not store your document or the extracted text on any server — once the extraction
        response is returned to your browser, nothing is retained server-side.
      </p>

      <h3>Third parties involved</h3>
      <p>
        <strong>Anthropic</strong> processes the extracted document text solely to perform the extraction
        step. See Anthropic's own privacy policy and API terms for details on how they handle data submitted
        through their API.
        <br />
        <strong>Vercel</strong> hosts this application and may log standard technical information (such as
        IP address and request timing) for operational purposes, including the basic rate-limiting used to
        keep this free tool's costs manageable.
      </p>

      <h3>No accounts, no tracking</h3>
      <p>
        This tool does not require an account, does not use cookies for tracking, and does not collect or
        sell personal information. Any figures you enter or calculate stay in your browser session and are
        not saved anywhere once you close the tab.
      </p>

      <h3>Questions</h3>
      <p>
        <a href="mailto:support@dashcraftco.com">Email us for any concerns, feedback, or questions.</a>
      </p>
    </PageShell>
  );
}
