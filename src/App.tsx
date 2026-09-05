import { useEffect, useMemo, useState } from "react";
import { estimatedNpsImpact, money, tdsDifference } from "./lib/tax";

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
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("taxpath-theme") as Theme) || "light",
  );
  const [showWhy, setShowWhy] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [npsAnswer, setNpsAnswer] = useState<"yes" | "no" | "unsure" | null>(
    null,
  );
  const [assistant, setAssistant] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [tourStep, setTourStep] = useState(() =>
    localStorage.getItem("taxpath-tour-seen") ? -1 : 0,
  );
  const scenario = scenarios[scenarioId] ?? scenarios.priya;
  const impact = useMemo(() => estimatedNpsImpact(50_000), []);
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
    setStage("parsing");
    window.setTimeout(() => setStage("understood"), 1600);
  }
  function answerNps(answer: "yes" | "no" | "unsure") {
    setNpsAnswer(answer);
    window.setTimeout(() => setStage("opportunity"), 340);
  }
  function selectScenario(id: ScenarioId) {
    setScenarioId(id);
    setNpsAnswer(null);
    setAssistant(null);
    setAssistantOpen(false);
    setShowExplain(false);
    setStage("home");
  }
  function quickAnswer(prompt: string) {
    const answers: Record<string, string> = {
      "Why is my tax this high?":
        "Most of " +
        scenario.firstName +
        "'s tax comes from salary. We have not treated the NPS check as a confirmed saving yet.",
      "Can I save tax?":
        "There is one potential NPS benefit to verify. TaxPath will not promise it until the relevant conditions are checked.",
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
    setAssistant(answers[prompt]);
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
              {[
                ["▤", "Form 16", "Best place to start"],
                ["◫", "AIS", "Your reported income"],
                ["✓", "26AS", "Your TDS records"],
                ["▱", "Investment proof", "Savings & deductions"],
                ["⌂", "Home-loan certificate", "Interest & principal"],
                ["⋯", "Other document", "Salary slip, bank statement…"],
              ].map(([icon, title, detail], index) => (
                <button
                  className={"document-card " + (index === 0 ? "featured" : "")}
                  key={title}
                  onClick={
                    index === 0
                      ? beginParsing
                      : () =>
                          setAssistant(
                            "That document can be useful. For the strongest demo journey, start with the synthetic Form 16.",
                          )
                  }
                >
                  <span className="document-icon">{icon}</span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                  {index === 0 && (
                    <span className="recommended">Recommended</span>
                  )}
                </button>
              ))}
            </div>
            <button
              className="unknown-link"
              onClick={() =>
                setAssistant(
                  "That’s okay. That’s exactly why I’m here. Start with any document you recognise, or use the demo Form 16.",
                )
              }
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
              <div className="step-label">A POTENTIAL BENEFIT</div>
              <h1>Do you contribute to NPS?</h1>
              <p>
                National Pension System contributions can matter to your tax
                calculation in some situations.
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
              {npsAnswer === "no"
                ? "One thing is still worth checking."
                : "I found something worth checking."}
            </h1>
            <p className="intro">
              This is not a confirmed tax saving. It is a useful next question
              based on the information in this synthetic demo.
            </p>
            <article className="opportunity-card">
              <div className="opportunity-icon">✦</div>
              <div className="opportunity-content">
                <div className="tag positive">POTENTIAL BENEFIT</div>
                <h2>NPS contribution</h2>
                <p>
                  We found a possible contribution of ₹50,000 to check.
                  Depending on your selected regime and applicable conditions,
                  it may affect your calculation.
                </p>
              </div>
              <div className="impact">
                <span>Potential tax impact</span>
                <strong>{money.format(impact)}</strong>
                <small>Estimated, not confirmed</small>
              </div>
              <button
                className="explain-button"
                onClick={() => setShowExplain(!showExplain)}
              >
                Show me why <span>→</span>
              </button>
              {showExplain && (
                <div className="explain-panel">
                  <Data label="Possible NPS contribution" value="₹50,000" />
                  <span>↓</span>
                  <Data
                    label="Prototype estimate"
                    value="20% marginal rate + cess"
                  />
                  <span>↓</span>
                  <Data
                    label="Potential tax impact"
                    value={money.format(impact)}
                  />
                  <p>
                    This is a transparent illustration, not a filing
                    calculation. TaxPath needs to verify the relevant conditions
                    before treating it as a confirmed benefit.
                  </p>
                </div>
              )}
            </article>
            <div className="opportunity-list">
              <Mini
                icon="✓"
                colour="green"
                title="Health insurance"
                detail="Information found in your sample data"
              />
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
            onAssistant={quickAnswer}
            onHome={() => setStage("home")}
          />
        )}
      </main>
      {stage !== "parsing" && (
        <Assistant
          onPrompt={quickAnswer}
          answer={assistant}
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
  open,
  onToggle,
  onClose,
}: {
  onPrompt: (prompt: string) => void;
  answer: string | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
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
  onAssistant,
  onHome,
}: {
  scenario: Scenario;
  mismatch: number;
  onAssistant: (prompt: string) => void;
  onHome: () => void;
}) {
  const stop = scenario.status === "stop";
  const ready = scenario.status === "ready";
  const title = ready
    ? "You’re ready to move forward."
    : stop
      ? "Don’t file yet."
      : "You’re almost ready.";
  const subtext = ready
    ? "We checked the synthetic information you provided."
    : stop
      ? "We found information that may need attention before you file."
      : "One thing is worth checking first.";
  const [reviewOpen, setReviewOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [reviewUpdated, setReviewUpdated] = useState(false);
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
      <div className={"readiness-hero " + scenario.status}>
        <div className="readiness-symbol">{ready ? "✓" : stop ? "!" : "○"}</div>
        <div className="step-label">
          {ready ? "READY" : stop ? "DON’T FILE YET" : "ALMOST READY"}
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
            {scenario.attention
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
          <Check label="Regime" value="Compared" state="good" />
        </div>
      </div>
      {ready && (
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
            <span className="status-dot bad">!</span>
            <div>
              <h2>Something doesn’t match.</h2>
              <p>
                These two records show different TDS amounts. Before filing,
                it’s worth checking which figure is correct.
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
                    <button onClick={() => setReviewUpdated(true)}>
                      Use Form 16: ₹1,42,000
                    </button>
                    <button onClick={() => setReviewUpdated(true)}>
                      Use AIS: ₹1,32,000
                    </button>
                  </div>
                </div>
              )}
              {reviewUpdated && (
                <p className="review-confirmation" role="status">
                  ✓ Review recorded in this demo. The TDS and AIS checks are now
                  marked as reviewed.
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
                    onClick={() => setReviewUpdated(true)}
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
