import { useEffect, useMemo, useState } from "react";
import { estimatedNpsImpact, money, tdsDifference } from "./lib/tax";
import taxCheckIllustration from "./assets/tax-check-illustration.svg";

type Stage =
  | "home"
  | "documents"
  | "parsing"
  | "understood"
  | "question"
  | "opportunity"
  | "readiness";
type ScenarioId = "priya" | "arjun" | "meera";
type Theme = "light" | "dark" | "system";
type TaxRegime = "new" | "old";

type Scenario = {
  id: ScenarioId;
  firstName: string;
  label: string;
  income: number;
  form16Tds: number;
  aisTds: number;
  status: "ready" | "almost" | "stop";
  attention: number;
  note: string;
};

type TaxHistoryEntry = {
  year: string;
  paid: number;
  status: string;
};

type DocumentOption = {
  icon: string;
  title: string;
  detail: string;
  source: string;
  checks: string[];
  supported: boolean;
};

type SavingCheck = {
  icon: string;
  title: string;
  detail: string;
  checklist: string;
};

const scenarios: Record<ScenarioId, Scenario> = {
  priya: {
    id: "priya",
    firstName: "Priya",
    label: "Opportunity + mismatch",
    income: 12_90_000,
    form16Tds: 1_42_000,
    aisTds: 1_32_000,
    status: "stop",
    attention: 2,
    note: "The full hero journey: an NPS opportunity and a TDS mismatch.",
  },
  arjun: {
    id: "arjun",
    firstName: "Arjun",
    label: "Clean salaried taxpayer",
    income: 9_80_000,
    form16Tds: 71_500,
    aisTds: 71_500,
    status: "ready",
    attention: 0,
    note: "A clean check for a taxpayer who is ready to move forward.",
  },
  meera: {
    id: "meera",
    firstName: "Meera",
    label: "Missing bank interest",
    income: 11_40_000,
    form16Tds: 1_08_000,
    aisTds: 1_08_000,
    status: "almost",
    attention: 1,
    note: "A gentle prompt to review interest reported by a bank.",
  },
};

const taxPaidHistory: Record<ScenarioId, TaxHistoryEntry[]> = {
  priya: [
    { year: "FY 2024–25", paid: 1_35_400, status: "Filed" },
    { year: "FY 2023–24", paid: 1_21_600, status: "Filed" },
    { year: "FY 2022–23", paid: 1_08_900, status: "Filed" },
  ],
  arjun: [
    { year: "FY 2024–25", paid: 76_200, status: "Filed" },
    { year: "FY 2023–24", paid: 68_400, status: "Filed" },
    { year: "FY 2022–23", paid: 59_800, status: "Filed" },
  ],
  meera: [
    { year: "FY 2024–25", paid: 1_02_300, status: "Filed" },
    { year: "FY 2023–24", paid: 94_700, status: "Filed" },
    { year: "FY 2022–23", paid: 87_100, status: "Filed" },
  ],
};

const documentOptions: DocumentOption[] = [
  {
    icon: "▤",
    title: "Form 16",
    detail: "Best place to start",
    source: "Employer-issued tax certificate",
    checks: ["Salary income", "TDS deducted", "Employer details"],
    supported: true,
  },
  {
    icon: "◫",
    title: "AIS",
    detail: "Your reported income",
    source: "Annual Information Statement",
    checks: ["Interest income", "Dividends", "Reported TDS"],
    supported: false,
  },
  {
    icon: "✓",
    title: "26AS",
    detail: "Your TDS records",
    source: "Tax credit statement",
    checks: ["TDS credits", "Advance tax", "Self-assessment tax"],
    supported: false,
  },
  {
    icon: "▱",
    title: "Investment proof",
    detail: "Savings & deductions",
    source: "Investment and insurance records",
    checks: ["Section 80C", "Health insurance", "NPS contributions"],
    supported: false,
  },
  {
    icon: "⌂",
    title: "Home-loan certificate",
    detail: "Interest & principal",
    source: "Lender-issued annual certificate",
    checks: ["Interest paid", "Principal repayment", "Property details"],
    supported: false,
  },
  {
    icon: "⋯",
    title: "Other document",
    detail: "Salary slip, bank statement…",
    source: "Supporting tax document",
    checks: ["Income item", "Potential deduction", "Supporting evidence"],
    supported: false,
  },
];

const oldRegimeSavingChecks: SavingCheck[] = [
  {
    icon: "▱",
    title: "Section 80C investments",
    detail: "Investments and principal repayment — up to ₹1.5 lakh limit",
    checklist:
      "Check your EPF, PPF, ELSS, life-insurance, tuition-fee or eligible home-loan-principal records. The combined Section 80C limit and actual proofs still need verification.",
  },
  {
    icon: "✚",
    title: "Health insurance · 80D",
    detail: "Premiums for yourself, family or parents may matter",
    checklist:
      "Check the premium certificate, who paid it, and the insured persons’ ages. The available limit can vary, so this demo does not estimate a benefit yet.",
  },
  {
    icon: "⌂",
    title: "Home-loan interest · 24(b)",
    detail: "Interest certificate and property details may matter",
    checklist:
      "Use the lender’s annual certificate to separate interest from principal, then confirm the property use and applicable conditions before claiming anything.",
  },
  {
    icon: "⌁",
    title: "HRA and rent",
    detail: "Salary structure and rent evidence may affect exemption",
    checklist:
      "Check whether your salary includes HRA, your rent receipts and the relevant city details. TaxPath keeps this as a review item, not an automatic claim.",
  },
];

const stages: Record<Stage, number> = {
  home: 0,
  documents: 1,
  parsing: 1,
  understood: 2,
  question: 3,
  opportunity: 4,
  readiness: 5,
};
function Icon({ children }: { children: string }) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}

function App() {
  const [stage, setStage] = useState<Stage>("home");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("priya");
  const [regime, setRegime] = useState<TaxRegime>("old");
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("taxpath-theme") as Theme) || "light",
  );
  const [showWhy, setShowWhy] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [selectedSavingCheck, setSelectedSavingCheck] =
    useState<SavingCheck | null>(null);
  const [npsAnswer, setNpsAnswer] = useState<"yes" | "no" | "unsure" | null>(
    null,
  );
  const [assistant, setAssistant] = useState<string | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState<string | null>(
    null,
  );
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentOption | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [tourStep, setTourStep] = useState(() =>
    localStorage.getItem("taxpath-tour-seen") ? -1 : 0,
  );
  const scenario = scenarios[scenarioId] ?? scenarios.priya;
  const isOldRegime = regime === "old";
  const impact = useMemo(
    () => (isOldRegime ? estimatedNpsImpact(50_000) : 0),
    [isOldRegime],
  );
  const mismatch = tdsDifference(scenario.form16Tds, scenario.aisTds);

  useEffect(() => {
    localStorage.setItem("taxpath-theme", theme);
    const actualTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.dataset.theme = actualTheme;
  }, [theme]);

  function beginParsing() {
    setSelectedDocument(null);
    setStage("parsing");
    window.setTimeout(() => setStage("understood"), 1600);
  }
  function answerNps(answer: "yes" | "no" | "unsure") {
    setNpsAnswer(answer);
    setSelectedSavingCheck(null);
    window.setTimeout(() => setStage("opportunity"), 340);
  }
  function selectScenario(id: ScenarioId) {
    setScenarioId(id);
    setNpsAnswer(null);
    setAssistant(null);
    setAssistantQuestion(null);
    setSelectedDocument(null);
    setAssistantOpen(false);
    setShowExplain(false);
    setSelectedSavingCheck(null);
    setStage("home");
  }
  function quickAnswer(prompt: string) {
    const question = prompt.trim();
    if (!question) return;
    const answers: Record<string, string> = {
      "Why is my tax this high?":
        "Most of " +
        scenario.firstName +
        "'s tax comes from salary. We have not treated the NPS check as a confirmed saving yet.",
      "Can I save tax?": isOldRegime
        ? "The old-regime demo highlights NPS, Section 80C, health insurance, home-loan interest and HRA as separate items to verify. TaxPath will not promise a saving until the relevant conditions and proofs are checked."
        : "In this new-regime demo, TaxPath does not apply a personal NPS deduction. You can compare regimes before you file.",
      "What is this mismatch?": mismatch
        ? "Your Form 16 and AIS differ by " +
          money.format(mismatch) +
          " in TDS. Check the source records before filing."
        : "The TDS records shown in this synthetic scenario agree.",
      "What should I do next?":
        scenario.status === "stop"
          ? "Review the AIS / Form 16 TDS difference before you move to filing."
          : "Complete the remaining check, then review your filing readiness.",
    };
    const stageGuidance: Record<Stage, string> = {
      home: "Start with the synthetic Form 16. I’ll show what I understood before asking any follow-up questions.",
      documents:
        "Choose the highlighted Form 16 for the strongest demo journey, or select any document you recognise to get a helpful explanation.",
      parsing:
        "I’m reading the safe, preloaded sample now. No real document or government account is involved.",
      understood:
        "Review the income and TDS summary, then continue to the short relevant check.",
      question:
        "Answer based on what you know. You can open “Why are you asking?” before choosing, and the prototype does not make a final eligibility decision.",
      opportunity:
        "This screen shows a potential benefit, not a promise. Use “Show me why” to see the assumptions before you continue.",
      readiness:
        scenario.status === "stop"
          ? "Open the highlighted review item, compare the source records, and update the demo only after you confirm the amount."
          : "Review the highlighted item before continuing. TaxPath keeps the decision clear and does not submit anything for you.",
    };
    setAssistantQuestion(question);
    setAssistant(
      answers[question] ??
        "I can help with this screen. " +
          stageGuidance[stage] +
          " For official tax advice, confirm the source documents or speak to a qualified professional.",
    );
    setAssistantOpen(true);
  }
  function closeTour() {
    localStorage.setItem("taxpath-tour-seen", "true");
    setTourStep(-1);
  }
  function nextTourStep() {
    if (tourStep >= 3) {
      closeTour();
      return;
    }
    setTourStep(tourStep + 1);
  }
  function restartTour() {
    setTourStep(0);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setStage("home")}
          aria-label="Go to TaxPath home"
        >
          <span className="brand-mark">✦</span>
          <span>taxpath</span>
        </button>
        <div className="top-actions">
          <label className="scenario-select">
            <span className="sr-only">Demo scenario</span>
            <select
              value={scenarioId}
              onChange={(event) =>
                selectScenario(event.target.value as ScenarioId)
              }
            >
              {Object.values(scenarios).map((item) => (
                <option key={item.id} value={item.id}>
                  Demo: {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="regime-select">
            <span className="sr-only">Tax regime</span>
            <select
              value={regime}
              onChange={(event) => {
                setRegime(event.target.value as TaxRegime);
                setSelectedSavingCheck(null);
              }}
            >
              <option value="new">New regime</option>
              <option value="old">Old regime</option>
            </select>
          </label>
          <label className="theme-select">
            <span className="sr-only">Colour theme</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <span className="demo-pill">Demo mode</span>
        </div>
        <div className="profile-actions">
          <button
            className="tour-button"
            onClick={restartTour}
            aria-label="See a walkthrough of TaxPath"
          >
            ?
          </button>
          <button className="avatar" aria-label="Open profile">
            P
          </button>
        </div>
      </header>
      <main>
        {stage !== "home" && <Progress active={stages[stage]} />}
        {stage === "home" && (
          <section className="hero page">
            <div className="eyebrow">
              <span className="pulse" /> Independent prototype · Build What
              Moves India
            </div>
            <div className="hero-grid">
              <div>
                <h1>
                  Your tax,
                  <br />
                  <em>without</em> the tax headache.
                </h1>
                <p className="hero-copy">
                  I’ll look at what you already have and help you figure out
                  what’s worth checking—before you file.
                </p>
                <div className="button-row">
                  <button
                    className="button primary"
                    onClick={() => setStage("documents")}
                  >
                    Start my tax check <span>→</span>
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setStage("documents")}
                  >
                    I already have documents
                  </button>
                </div>
                <p className="privacy-note">
                  <Icon>⌁</Icon> This demo uses only synthetic information.
                  Please don’t upload real tax documents.
                </p>
                <div className="hero-art" aria-hidden="true">
                  <img src={taxCheckIllustration} alt="" />
                  <span>Understand · check · proceed</span>
                </div>
              </div>
              <aside className="snapshot-card">
                <div className="snapshot-head">
                  <span>YOUR TAX CHECK</span>
                  <span className="year-chip">FY 2025–26</span>
                </div>
                <h2>{scenario.firstName}, here’s what I’ll help you check.</h2>
                <Mini
                  icon="↗"
                  colour="blue"
                  title="Understand"
                  detail="What your documents say"
                />
                <Mini
                  icon="✦"
                  colour="green"
                  title="Find opportunities"
                  detail="Benefits worth checking"
                />
                <Mini
                  icon="!"
                  colour="amber"
                  title="Catch issues"
                  detail="Before you move to filing"
                />
                <div className="scenario-note">{scenario.note}</div>
              </aside>
            </div>
            <TaxHistory scenarioId={scenario.id} />
          </section>
        )}
        {stage === "documents" && (
          <section className="page flow-page">
            <div className="step-label">STEP 1 OF 5</div>
            <h1>What do you have?</h1>
            <p className="intro">
              Start anywhere. I’ll work with what you have and tell you what may
              matter next.
            </p>
            <div className="document-grid">
              {documentOptions.map((document) => (
                <button
                  className={
                    "document-card " +
                    (document.supported ? "featured" : "guided")
                  }
                  key={document.title}
                  onClick={() =>
                    document.supported
                      ? beginParsing()
                      : setSelectedDocument(document)
                  }
                >
                  <span className="document-icon">{document.icon}</span>
                  <strong>{document.title}</strong>
                  <small>{document.detail}</small>
                  {document.supported ? (
                    <span className="recommended">Recommended</span>
                  ) : (
                    <span className="document-status">Guided preview</span>
                  )}
                </button>
              ))}
            </div>
            {selectedDocument && (
              <aside className="document-guide" aria-live="polite">
                <div>
                  <div className="step-label">DOCUMENT GUIDANCE</div>
                  <h2>{selectedDocument.title}</h2>
                  <p>
                    This document is recognised in the prototype, but its
                    automated analysis is not part of this demo journey yet.
                  </p>
                </div>
                <div className="document-guide-data">
                  <div>
                    <span>Source</span>
                    <strong>{selectedDocument.source}</strong>
                  </div>
                  <div>
                    <span>TaxPath would check</span>
                    <strong>{selectedDocument.checks.join(" · ")}</strong>
                  </div>
                  <div>
                    <span>Demo status</span>
                    <strong>Guidance available</strong>
                  </div>
                </div>
                <button className="button primary" onClick={beginParsing}>
                  Continue with Form 16 demo <span>→</span>
                </button>
              </aside>
            )}
            <button
              className="unknown-link"
              onClick={() => {
                setAssistantQuestion("I don’t know what I need");
                setAssistant(
                  "That’s okay. Start with any document you recognise. For this prototype’s complete, guided journey, choose the synthetic Form 16.",
                );
                setAssistantOpen(true);
              }}
            >
              I don’t know what I need <span>→</span>
            </button>
          </section>
        )}
        {stage === "parsing" && (
          <section
            className="page parse-page"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="document-preview">
              <div className="doc-top">
                FORM 16 <span>SYNTHETIC</span>
              </div>
              <div className="doc-lines" />
              <div className="doc-lines short" />
              <div className="doc-lines" />
              <div className="doc-stamp">
                TAXPATH
                <br />
                DEMO
              </div>
            </div>
            <div className="parse-copy">
              <div className="step-label">SYNTHETIC DOCUMENT</div>
              <h1>I’m understanding your Form 16.</h1>
              <p>
                <span className="loading-dot" aria-hidden="true" />
                Demo mode is reading a safe, preloaded sample. Nothing real is
                uploaded.
              </p>
              <div className="parse-steps">
                <span>✓ Uploading</span>
                <span>✓ Reading</span>
                <span className="active">◌ Understanding</span>
                <span>○ Extracting</span>
              </div>
            </div>
          </section>
        )}
        {stage === "understood" && (
          <section className="page understood-page">
            <div className="success-orb">✓</div>
            <div className="step-label">FORM 16 UNDERSTOOD</div>
            <h1>I’ve understood your Form 16.</h1>
            <p className="intro">
              Here’s the information I found. You can review it now; I’ll also
              check it against your other tax information later.
            </p>
            <div className="data-card">
              <Data
                label="Annual income"
                value={money.format(scenario.income)}
              />
              <Data
                label="TDS deducted"
                value={money.format(scenario.form16Tds)}
              />
              <Data label="Employer" value="Northstar Labs Pvt. Ltd." />
              <Data label="Financial year" value="2025–26" />
            </div>
            <div className="next-card">
              <span className="assistant-star">✦</span>
              <div>
                <strong>
                  Now I’ll check if there’s anything worth your attention.
                </strong>
                <p>I’ll ask only what could change your tax situation.</p>
              </div>
            </div>
            <button
              className="button primary"
              onClick={() => setStage("question")}
            >
              Let’s check <span>→</span>
            </button>
          </section>
        )}
        {stage === "question" && (
          <section className="page question-page">
            <div className="question-count">
              1 <span>/ 3 relevant checks</span>
            </div>
            <div className="question-card">
              <div className="question-symbol">✦</div>
              <div className="step-label">
                {isOldRegime ? "A POTENTIAL BENEFIT" : "A REGIME CHECK"}
              </div>
              <h1>Do you contribute to NPS?</h1>
              <p>
                {isOldRegime
                  ? "National Pension System contributions can matter to your tax calculation in some situations."
                  : "Your selected new regime changes how this personal NPS contribution is treated in this synthetic demo."}
              </p>
              <button
                className="why-button"
                onClick={() => setShowWhy(!showWhy)}
                aria-expanded={showWhy}
              >
                Why are you asking? <span>{showWhy ? "−" : "+"}</span>
              </button>
              {showWhy && (
                <div className="why-panel">
                  Because this may reveal a legitimate tax benefit you haven’t
                  considered. I’m checking rather than assuming—and I’ll ask for
                  the detail only if it changes something.
                </div>
              )}
              <div className="answer-row">
                <button onClick={() => answerNps("yes")}>Yes</button>
                <button onClick={() => answerNps("no")}>No</button>
                <button onClick={() => answerNps("unsure")}>
                  I’m not sure
                </button>
              </div>
            </div>
            <p className="quiet-note">
              You can change this answer later. This prototype never uses it to
              determine final eligibility.
            </p>
          </section>
        )}
        {stage === "opportunity" && (
          <section className="page opportunity-page">
            <div className="step-label">YOUR TAX OPPORTUNITIES</div>
            <h1>
              {isOldRegime
                ? npsAnswer === "no"
                  ? "Several things are still worth checking."
                  : "I found several areas worth checking."
                : "Your regime choice changes this check."}
            </h1>
            <p className="intro">
              {isOldRegime
                ? "This is not a confirmed tax saving. It is a useful next question based on the information in this synthetic demo."
                : "Under this synthetic new-regime scenario, TaxPath does not apply a personal NPS deduction. It keeps the item visible so you can compare before filing."}
            </p>
            <article className="opportunity-card">
              <div className="opportunity-icon">✦</div>
              <div className="opportunity-content">
                <div className="tag positive">
                  {isOldRegime ? "POTENTIAL BENEFIT" : "REGIME CHECK"}
                </div>
                <h2>NPS contribution</h2>
                <p>
                  {isOldRegime
                    ? "We found a possible contribution of ₹50,000 to check. Depending on your selected regime and applicable conditions, it may affect your calculation."
                    : "The ₹50,000 personal contribution remains visible for comparison, but TaxPath does not apply it as a deduction in this new-regime demo."}
                </p>
              </div>
              <div className="impact">
                <span>
                  {isOldRegime
                    ? "Potential tax impact"
                    : "Tax impact in this demo"}
                </span>
                <strong>{money.format(impact)}</strong>
                <small>
                  {isOldRegime
                    ? "Estimated, not confirmed"
                    : "Not applied in new regime"}
                </small>
              </div>
              <button
                className="explain-button"
                onClick={() => setShowExplain(!showExplain)}
              >
                Show me why <span>→</span>
              </button>
              {showExplain && (
                <div className="explain-panel">
                  <Data
                    label="Selected regime"
                    value={isOldRegime ? "Old regime" : "New regime"}
                  />
                  <span>↓</span>
                  <Data
                    label={
                      isOldRegime
                        ? "Possible NPS contribution"
                        : "Personal NPS deduction"
                    }
                    value={isOldRegime ? "₹50,000" : "Not applied in this demo"}
                  />
                  <span>↓</span>
                  <Data
                    label={isOldRegime ? "Potential tax impact" : "Next step"}
                    value={
                      isOldRegime
                        ? money.format(impact)
                        : "Compare before filing"
                    }
                  />
                  <p>
                    {isOldRegime
                      ? "This is a transparent illustration, not a filing calculation. TaxPath needs to verify the relevant conditions before treating it as a confirmed benefit."
                      : "This is a regime comparison, not a filing calculation. TaxPath keeps the contribution visible so you can make an informed choice before filing."}
                  </p>
                </div>
              )}
            </article>
            {isOldRegime && (
              <section className="saving-checks" aria-labelledby="saving-checks-title">
                <div className="saving-checks-heading">
                  <div>
                    <div className="step-label">MORE OLD-REGIME CHECKS</div>
                    <h2 id="saving-checks-title">Explore other tax-saving sections</h2>
                  </div>
                  <p>
                    These are separate checks, not additions to the NPS estimate.
                    Open one to see exactly what evidence to review.
                  </p>
                </div>
                <div className="saving-check-grid">
                  {oldRegimeSavingChecks.map((check) => (
                    <button
                      key={check.title}
                      className={
                        "saving-check" +
                        (selectedSavingCheck?.title === check.title
                          ? " selected"
                          : "")
                      }
                      onClick={() => setSelectedSavingCheck(check)}
                      aria-expanded={selectedSavingCheck?.title === check.title}
                    >
                      <span className="saving-check-icon" aria-hidden="true">
                        {check.icon}
                      </span>
                      <span>
                        <strong>{check.title}</strong>
                        <small>{check.detail}</small>
                      </span>
                      <span className="saving-check-arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  ))}
                </div>
                {selectedSavingCheck && (
                  <article className="saving-check-detail" aria-live="polite">
                    <div>
                      <span className="step-label">WHAT TO VERIFY</span>
                      <h3>{selectedSavingCheck.title}</h3>
                      <p>{selectedSavingCheck.checklist}</p>
                    </div>
                    <button
                      className="saving-check-close"
                      onClick={() => setSelectedSavingCheck(null)}
                    >
                      Close <span>×</span>
                    </button>
                  </article>
                )}
              </section>
            )}
            <div className="opportunity-list">
              {!isOldRegime && (
                <Mini
                  icon="✓"
                  colour="green"
                  title="Health insurance"
                  detail="Information found in your sample data"
                />
              )}
              <Mini
                icon={mismatch ? "!" : "✓"}
                colour={mismatch ? "red" : "green"}
                title={mismatch ? "AIS mismatch" : "TDS records"}
                detail={
                  mismatch
                    ? "Needs attention before filing"
                    : "Information matches"
                }
              />
            </div>
            <button
              className="button primary"
              onClick={() => setStage("readiness")}
            >
              Check my filing readiness <span>→</span>
            </button>
          </section>
        )}
        {stage === "readiness" && (
          <Readiness
            scenario={scenario}
            mismatch={mismatch}
            regime={regime}
            onAssistant={quickAnswer}
            onHome={() => setStage("home")}
          />
        )}
      </main>
      {stage !== "parsing" && (
        <Assistant
          onPrompt={quickAnswer}
          answer={assistant}
          question={assistantQuestion}
          open={assistantOpen}
          onToggle={() => setAssistantOpen(!assistantOpen)}
          onClose={() => setAssistantOpen(false)}
        />
      )}
      {tourStep >= 0 && (
        <Tour step={tourStep} onNext={nextTourStep} onClose={closeTour} />
      )}
    </div>
  );
}
function Mini({
  icon,
  colour,
  title,
  detail,
}: {
  icon: string;
  colour: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="mini-row">
      <span className={"mini-icon " + colour}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function TaxHistory({ scenarioId }: { scenarioId: ScenarioId }) {
  const history = taxPaidHistory[scenarioId];
  return (
    <section className="tax-history" aria-labelledby="tax-history-title">
      <div className="tax-history-copy">
        <div className="step-label">YOUR TAX HISTORY</div>
        <h2 id="tax-history-title">Last 3 years of tax paid</h2>
        <p>
          A simple view of the synthetic returns already filed in this demo.
        </p>
      </div>
      <div className="tax-history-list">
        {history.map((entry) => (
          <div className="tax-history-item" key={entry.year}>
            <div>
              <span>{entry.year}</span>
              <strong>{money.format(entry.paid)}</strong>
            </div>
            <small>✓ {entry.status}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
function Progress({ active }: { active: number }) {
  const labels = [
    "Start",
    "Documents",
    "Understand",
    "Check",
    "Opportunities",
    "Ready",
  ];
  return (
    <div className="progress" aria-label={"Progress: " + labels[active]}>
      <div className="progress-inner">
        {labels.map((label, index) => (
          <div
            className={
              index <= active ? "progress-step active" : "progress-step"
            }
            key={label}
          >
            <span>{index < active ? "✓" : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
function Assistant({
  onPrompt,
  answer,
  question,
  open,
  onToggle,
  onClose,
}: {
  onPrompt: (prompt: string) => void;
  answer: string | null;
  question: string | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const prompts = [
    "Why is my tax this high?",
    "Can I save tax?",
    "What is this mismatch?",
    "What should I do next?",
  ];
  return (
    <div className="assistant-float">
      {open && (
        <aside className="assistant-panel" aria-label="TaxPath Assistant">
          <div className="assistant-panel-head">
            <div className="assistant-title">
              <span>✦</span>
              <div>
                <strong>TaxPath Assistant</strong>
                <small>Answers based on this demo</small>
              </div>
            </div>
            <button
              onClick={onClose}
              className="assistant-close"
              aria-label="Close assistant"
            >
              ×
            </button>
          </div>
          <p>What would you like to understand?</p>
          <div className="prompt-list">
            {prompts.map((prompt) => (
              <button key={prompt} onClick={() => onPrompt(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <form
            className="assistant-compose"
            onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim()) return;
              onPrompt(query);
              setQuery("");
            }}
          >
            <label className="sr-only" htmlFor="assistant-question">
              Ask a question about this screen
            </label>
            <input
              id="assistant-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask if you’re stuck…"
              autoComplete="off"
            />
            <button type="submit" aria-label="Send question">
              Send
            </button>
          </form>
          {question && (
            <div className="assistant-question">You: {question}</div>
          )}
          {answer && (
            <div className="assistant-answer" role="status">
              {answer}
            </div>
          )}
        </aside>
      )}
      <button
        className="assistant-trigger"
        onClick={onToggle}
        aria-label={open ? "Close TaxPath Assistant" : "Open TaxPath Assistant"}
        aria-expanded={open}
      >
        <span>✦</span>
        <strong>Ask TaxPath</strong>
      </button>
    </div>
  );
}
function Tour({
  step,
  onNext,
  onClose,
}: {
  step: number;
  onNext: () => void;
  onClose: () => void;
}) {
  const slides = [
    {
      eyebrow: "WELCOME TO TAXPATH",
      title: "Your tax check starts before filing.",
      copy: "TaxPath is a synthetic, independent prototype that helps you understand your information, find things worth checking, and know what to do next.",
    },
    {
      eyebrow: "START WITH WHAT YOU HAVE",
      title: "Pick a document, not a tax form.",
      copy: "Choose a safe demo document. TaxPath explains what it understood, then asks only questions that could change your situation.",
    },
    {
      eyebrow: "YOUR PERSONAL GUIDE",
      title: "Ask why, at any point.",
      copy: "Use the floating TaxPath Assistant for a clear explanation of the current screen, a number, or the next best action.",
    },
    {
      eyebrow: "THE FINAL CHECK",
      title: "Readiness can mean: don’t file yet.",
      copy: "The check list shows what is verified and what needs attention. Review the highlighted item before you move on.",
    },
  ];
  const slide = slides[step];
  return (
    <div className="tour-backdrop" role="presentation">
      <section
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        <button
          className="tour-close"
          onClick={onClose}
          aria-label="Close walkthrough"
        >
          ×
        </button>
        <div className="tour-progress">
          {slides.map((_, index) => (
            <span className={index <= step ? "active" : ""} key={index} />
          ))}
        </div>
        <div className="tour-icon">
          {step === 0 ? "✦" : step === 1 ? "▤" : step === 2 ? "◌" : "✓"}
        </div>
        <div className="step-label">{slide.eyebrow}</div>
        <h2 id="tour-title">{slide.title}</h2>
        <p>{slide.copy}</p>
        <div className="tour-actions">
          <button className="tour-skip" onClick={onClose}>
            Skip for now
          </button>
          <button className="button primary" onClick={onNext}>
            {step === slides.length - 1 ? "Start exploring" : "Next"}{" "}
            <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
function Readiness({
  scenario,
  mismatch,
  regime,
  onAssistant,
  onHome,
}: {
  scenario: Scenario;
  mismatch: number;
  regime: TaxRegime;
  onAssistant: (prompt: string) => void;
  onHome: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [reviewUpdated, setReviewUpdated] = useState(false);
  const [reviewSource, setReviewSource] = useState<string | null>(null);
  const reviewComplete = reviewUpdated && scenario.status !== "ready";
  const effectiveStatus = reviewComplete ? "ready" : scenario.status;
  const stop = effectiveStatus === "stop";
  const ready = effectiveStatus === "ready";
  const title = reviewComplete
    ? "You’re ready to continue."
    : ready
      ? "You’re ready to move forward."
      : stop
        ? "Don’t file yet."
        : "You’re almost ready.";
  const subtext = reviewComplete
    ? "Your source choice is recorded in this demo. TaxPath has not filed anything for you."
    : ready
      ? "We checked the synthetic information you provided."
      : stop
        ? "We found information that may need attention before you file."
        : "One thing is worth checking first.";
  function reviewIssue() {
    setReviewOpen(true);
    setUpdateOpen(true);
    const targetId = mismatch ? "mismatch-details" : "bank-interest-review";
    window.setTimeout(
      () =>
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
  }
  return (
    <section className="page readiness-page">
      <div className={"readiness-hero " + effectiveStatus}>
        <img
          className="readiness-art"
          src={taxCheckIllustration}
          alt=""
          aria-hidden="true"
        />
        <div className="readiness-symbol">{ready ? "✓" : stop ? "!" : "○"}</div>
        <div className="step-label">
          {reviewComplete
            ? "REVIEW COMPLETE"
            : ready
              ? "READY"
              : stop
                ? "DON’T FILE YET"
                : "ALMOST READY"}
        </div>
        <h1>{title}</h1>
        <p>{subtext}</p>
        {!ready && (
          <button className="button dark-button" onClick={reviewIssue}>
            {stop ? "See what I found" : "Review it"} <span>→</span>
          </button>
        )}
      </div>
      <div className="check-section">
        <div>
          <div className="step-label">YOUR TAX CHECK</div>
          <h2>
            {reviewComplete
              ? "Your review is complete"
              : scenario.attention
                ? String(scenario.attention) +
                  " thing" +
                  (scenario.attention > 1 ? "s " : " ") +
                  (scenario.attention > 1 ? "need" : "needs") +
                  " your attention"
                : "Everything you shared has been checked"}
          </h2>
        </div>
        <div className="check-grid">
          <Check label="Income" value="Verified" state="good" />
          <Check
            label="TDS"
            value={
              mismatch ? (reviewUpdated ? "Reviewed" : "Review") : "Checked"
            }
            state={mismatch && !reviewUpdated ? "warn" : "good"}
          />
          <Check
            label="AIS"
            value={
              mismatch ? (reviewUpdated ? "Reviewed" : "Review") : "Checked"
            }
            state={mismatch && !reviewUpdated ? "bad" : "good"}
          />
          <Check label="Deductions" value="Checked" state="good" />
          <Check
            label="Other income"
            value={
              scenario.id === "meera"
                ? reviewUpdated
                  ? "Reviewed"
                  : "Needs review"
                : "Checked"
            }
            state={scenario.id === "meera" && !reviewUpdated ? "warn" : "good"}
          />
          <Check
            label="Regime"
            value={
              regime === "old" ? "Old regime selected" : "New regime selected"
            }
            state="good"
          />
        </div>
      </div>
      {scenario.status === "ready" && (
        <div className="empty-state" role="status">
          <span>✓</span>
          <div>
            <strong>No follow-ups right now</strong>
            <p>
              Everything in this synthetic scenario has been checked. You can
              return here after adding another document.
            </p>
          </div>
        </div>
      )}
      {mismatch > 0 && (
        <article id="mismatch-details" className="mismatch-card" tabIndex={-1}>
          <div className="mismatch-header">
            <span className={"status-dot " + (reviewComplete ? "good" : "bad")}>
              {reviewComplete ? "✓" : "!"}
            </span>
            <div>
              <h2>
                {reviewComplete
                  ? "TDS review is complete."
                  : "Something doesn’t match."}
              </h2>
              <p>
                {reviewComplete
                  ? "The " +
                    reviewSource +
                    " source is recorded for this demo. Confirm any official correction directly with the relevant source before filing."
                  : "These two records show different TDS amounts. Before filing, it’s worth checking which figure is correct."}
              </p>
            </div>
          </div>
          <div className="mismatch-numbers">
            <Data
              label="Form 16 TDS"
              value={money.format(scenario.form16Tds)}
            />
            <Data label="AIS TDS" value={money.format(scenario.aisTds)} />
            <div className="difference">
              <Data label="Difference" value={money.format(mismatch)} />
            </div>
          </div>
          <div className="what-next">
            <strong>What should I do?</strong>
            <ol>
              <li>Review Form 16 and AIS.</li>
              <li>Check employer TDS details.</li>
              <li>Verify or correct the record before you continue.</li>
            </ol>
          </div>
          {reviewOpen && (
            <div className="review-detail">
              <strong>What this means in this demo</strong>
              <p>
                The employer record shows ₹1,42,000 of TDS, while the AIS record
                shows ₹1,32,000. TaxPath cannot decide which source is correct,
                so it pauses the filing journey and asks you to verify it.
              </p>
              {!reviewUpdated && (
                <button
                  className="review-update"
                  onClick={() => setUpdateOpen(!updateOpen)}
                  aria-expanded={updateOpen}
                >
                  Update this record <span>→</span>
                </button>
              )}
              {updateOpen && !reviewUpdated && (
                <div className="review-update-panel">
                  <strong>Which confirmed amount should this demo use?</strong>
                  <p>
                    Choose only after checking the source documents. This
                    updates the demo status, not an official record.
                  </p>
                  <div className="review-options">
                    <button
                      onClick={() => {
                        setReviewSource("Form 16");
                        setReviewUpdated(true);
                      }}
                    >
                      Use Form 16: ₹1,42,000
                    </button>
                    <button
                      onClick={() => {
                        setReviewSource("AIS");
                        setReviewUpdated(true);
                      }}
                    >
                      Use AIS: ₹1,32,000
                    </button>
                  </div>
                </div>
              )}
              {reviewUpdated && (
                <p className="review-confirmation" role="status">
                  ✓ Review recorded using {reviewSource}. The TDS and AIS checks
                  are now marked as reviewed.
                </p>
              )}
            </div>
          )}
        </article>
      )}
      {scenario.id === "meera" && (
        <article
          id="bank-interest-review"
          className="mismatch-card amber-card"
          tabIndex={-1}
        >
          <div className="mismatch-header">
            <span className="status-dot warn">!</span>
            <div>
              <h2>Bank interest is worth a quick review.</h2>
              <p>
                Your synthetic AIS shows interest income that isn’t in the Form
                16 summary.
              </p>
            </div>
          </div>
          {reviewOpen && (
            <div className="review-detail">
              <strong>What to check</strong>
              <p>
                Look for the bank interest certificate or statement, then
                compare it with the ₹12,600 interest item in this demo AIS. Add
                or correct it only after you confirm the source record.
              </p>
              {!reviewUpdated && (
                <button
                  className="review-update"
                  onClick={() => setUpdateOpen(!updateOpen)}
                  aria-expanded={updateOpen}
                >
                  Update this item <span>→</span>
                </button>
              )}
              {updateOpen && !reviewUpdated && (
                <div className="review-update-panel">
                  <strong>Confirm the bank-interest entry</strong>
                  <p>
                    This synthetic demo records the item as reviewed after you
                    confirm it against the bank statement.
                  </p>
                  <button
                    className="review-done"
                    onClick={() => {
                      setReviewSource("bank interest");
                      setReviewUpdated(true);
                    }}
                  >
                    Mark ₹12,600 as reviewed
                  </button>
                </div>
              )}
              {reviewUpdated && (
                <p className="review-confirmation" role="status">
                  ✓ Interest review recorded in this demo.
                </p>
              )}
            </div>
          )}
        </article>
      )}
      <button className="back-home" onClick={onHome}>
        ← Return to demo home
      </button>
    </section>
  );
}
function Check({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: "good" | "warn" | "bad";
}) {
  return (
    <div className="check-item">
      <span className={"status-dot " + state}>
        {state === "good" ? "✓" : "!"}
      </span>
      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}
export default App;
