import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { writePreferences } from "@/lib/preferences";
import { Wordmark } from "@/components/Wordmark";
import { PointScan } from "@/components/scan/PointScan";
import { FunctionCut } from "@/components/landing/FunctionCut";
import { SAMPLE_FUNCTIONS, SAMPLE_EDGES, SAMPLE_CONFIDENCE, SAMPLE_SCAN, ALL_LAYERS, type Layers } from "@/components/landing/sample";
import "@/landing.css";
import { useT } from "@/i18n";

const REPO_URL = "https://github.com/QuangNguyen711/GraphFusionVulDetect";

const flagged = SAMPLE_FUNCTIONS.filter((f) => f.vulnerable).length;
const safe = SAMPLE_FUNCTIONS.length - flagged;

const LAYER_ROWS: { key: keyof Layers; name: string; note: string; count: number; unit: string }[] = [
  { key: "ground", name: "Contract source", note: "Every line the parser read", count: 1, unit: "file" },
  { key: "safe", name: "Safe functions", note: "Predicted not vulnerable", count: safe, unit: "fn" },
  { key: "edges", name: "Call edges", note: "Who calls whom", count: SAMPLE_EDGES.length, unit: "edges" },
  { key: "flagged", name: "Flagged functions", note: "Predicted vulnerable", count: flagged, unit: "fn" },
];

const DIFF: { sign: " " | "-" | "+"; code: string }[] = [
  { sign: "-", code: "function withdraw(uint256 amount) public {" },
  { sign: "+", code: "function withdraw(uint256 amount) public nonReentrant {" },
  { sign: " ", code: "    require(balances[msg.sender] >= amount);" },
  { sign: "+", code: "    balances[msg.sender] -= amount;" },
  { sign: " ", code: "    (bool ok, ) = msg.sender.call{value: amount}(\"\");" },
  { sign: " ", code: "    require(ok);" },
  { sign: "-", code: "    balances[msg.sender] -= amount;" },
  { sign: " ", code: "}" },
];

const LOG = [
  { file: "Vault.sol", at: "3 Nov, 09:40", via: "Upload", fns: "6", hits: "2", verdict: "Vulnerable, 91.2 %", found: "Re-entrancy, 2 functions", live: false },
  { file: "StakingPool.sol", at: "3 Nov, 08:05", via: "Upload", fns: "", hits: "", verdict: "Running", found: "", live: true },
  { file: "ExampleToken", at: "2 Nov, 16:12", via: "Token search", fns: "9", hits: "0", verdict: "Not flagged, 84.0 %", found: "None", live: false },
  { file: "Migrator.sol", at: "29 Oct, 10:12", via: "Upload", fns: "4", hits: "1", verdict: "Vulnerable, 76.5 %", found: "Unchecked call", live: false },
];

const WAYS = [
  { name: "Upload a file", line: "A Solidity file up to 10 MB becomes a project.", items: ["Drag and drop or browse", "Streams stage by stage"] },
  { name: "Search a token", line: "Name a token, pick its chain, get its source.", items: ["Name or symbol", "Same report as an upload"] },
  { name: "Reopen a project", line: "Every scan stays, ready to reopen.", items: ["Full analysis history", "RefactorBot on any finding"] },
];

const SignUp = () => {
  const { register, isLoading } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setError("");
    if (!name || !email || password.length < 6) {
      setError(t("Fill in all three fields. The password needs at least 6 characters."));
      return;
    }
    const ok = await register(name, email, password);
    if (ok) navigate("/analysis");
    else setError(t("That account could not be created. Check the email, or sign in if you already have one."));
  };

  return (
    <form className="lp-form" onSubmit={onSubmit} noValidate>
      <label className="lp-field">
        <span>{t("Name")}</span>
        <input name="name" autoComplete="name" required />
      </label>
      <label className="lp-field">
        <span>{t("Email")}</span>
        <input name="email" type="email" autoComplete="email" inputMode="email" required />
      </label>
      <label className="lp-field">
        <span>{t("Password")}</span>
        <input name="password" type="password" autoComplete="new-password" minLength={6} required aria-describedby="signup-help" />
      </label>
      <p id="signup-help" className={error ? "lp-help is-error" : "lp-help"} aria-live="polite">{error || t("At least 6 characters.")}</p>
      <button type="submit" className="lp-btn" disabled={isLoading} aria-busy={isLoading}>
        {isLoading ? t("Creating account…") : t("Create an account")}
      </button>
      <p className="lp-help">{t("Already have one?")} <Link to="/login" className="lp-link">{t("Sign in")}</Link></p>
    </form>
  );
};

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const t = useT();
  const [layers, setLayers] = useState<Layers>(ALL_LAYERS);

  return (
    <div className="lp">
      <a className="lp-skip" href="#main">Skip to content</a>

      <header className="lp-nav">
        <div className="shell lp-nav__bar">
          <Link to="/" className="lp-nav__home" aria-label={t("GraphFusion home")}>
            <Wordmark />
          </Link>
          <nav className="lp-nav__links" aria-label={t("Sections")}>
            <a href="#layers">{t("Layers")}</a>
            <a href="#cut">{t("Function cut")}</a>
            <a href="#log">{t("Scan log")}</a>
            <a href="#ways">{t("Ways in")}</a>
          </nav>
          <div className="lp-nav__actions">
            <div className="lp-lang" role="group" aria-label={t("Language")}>
              {(["en", "vi"] as const).map((code) => (
                <button key={code} type="button" lang={code} aria-pressed={t.language === code} onClick={() => writePreferences({ language: code })}>
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            {isAuthenticated ? (
              <Link to="/analysis" className="lp-btn lp-btn--line lp-btn--sm">{t("Open the app")}</Link>
            ) : (
              <>
                <Link to="/login" className="lp-link">{t("Sign in")}</Link>
                <a href="#start" className="lp-btn lp-btn--line lp-btn--sm">{t("Create an account")}</a>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        <section className="lp-hero" aria-labelledby="hero-head">
          <div className="shell lp-split lp-split--5-7">
            <div className="lp-hero__text land">
              <h1 id="hero-head">{t("Every contract, read function by function.")}</h1>
              <p className="lead lp-lead">{t("Turn a Solidity file into a call graph you can audit.")}</p>
              <div className="lp-actions">
                {isAuthenticated ? (
                  <Link to="/analysis" className="lp-btn">{t("Start an analysis")}</Link>
                ) : (
                  <a href="#start" className="lp-btn">{t("Create an account")}</a>
                )}
                <a href="#layers" className="lp-btn lp-btn--line">{t("Open the sample scan")}</a>
              </div>
              <dl className="lp-strip ticks" aria-label={t("Sample scan of Vault.sol")}>
                <div><dt>{t("Functions")}</dt><dd className="measured">{SAMPLE_FUNCTIONS.length}</dd></div>
                <div><dt>{t("Flagged")}</dt><dd className="measured">{flagged}</dd></div>
                <div><dt>{t("Call edges")}</dt><dd className="measured">{SAMPLE_EDGES.length}</dd></div>
                <div><dt>{t("Contract")}</dt><dd className="measured">{SAMPLE_CONFIDENCE}<span className="unit">&thinsp;%</span></dd></div>
              </dl>
            </div>
            <div className="lp-hero__visual land">
              <PointScan
                functions={SAMPLE_SCAN}
                edges={SAMPLE_EDGES}
                phase="done"
                replay
                size="lg"
                caption={t("Sample scan: Vault.sol")}
                label={t("Sample scan of Vault.sol drawn as points: six functions as blocks on a call graph, two of them flagged vulnerable")}
              />
            </div>
          </div>
        </section>

        <section id="layers" className="lp-section" aria-labelledby="layers-head">
          <div className="shell lp-split lp-split--5-7">
            <div className="lp-text">
              <h2 id="layers-head">{t("Hide what you are not auditing.")}</h2>
              <p className="lead lp-lead">{t("Every point belongs to a function, so each layer is one switch.")}</p>
              <ul className="lp-layers">
                {LAYER_ROWS.map((row) => (
                  <li key={row.key}>
                    <label className="lp-layer">
                      <span>
                        <span className="lp-layer__name">{t(row.name)}</span>
                        <span className="lp-layer__note">{t(row.note)}</span>
                      </span>
                      <span className="measured lp-layer__count">{row.count}<span className="unit">&thinsp;{t(row.unit)}</span></span>
                      <input
                        type="checkbox"
                        role="switch"
                        className={`lp-switch${row.key === "flagged" ? " lp-switch--found" : row.key === "safe" ? " lp-switch--safe" : ""}`}
                        checked={layers[row.key]}
                        onChange={(e) => setLayers((prev) => ({ ...prev, [row.key]: e.target.checked }))}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ticks lp-framed">
              <PointScan
                functions={SAMPLE_SCAN}
                edges={SAMPLE_EDGES}
                phase="done"
                replay
                layers={layers}
                callouts={0}
                caption={t("Sample contract, live, turning once every two minutes")}
                label={t("The same sample contract, showing only the layers switched on")}
              />
            </div>
          </div>
        </section>

        <section className="lp-band lp-section--s" aria-labelledby="checks-head">
          <div className="shell">
            <div className="lp-head">
              <h2 id="checks-head">{t("Judged twice, every time.")}</h2>
              <p className="lead lp-lead">{t("First the whole contract on its call graph, then each function on its own.")}</p>
            </div>
            <dl className="lp-figures">
              <div><dd className="reading">4</dd><dt>{t("Stages per scan, streamed as each one lands")}</dt></div>
              <div><dd className="reading">512</dd><dt>{t("Tokens read per function: the first 128 and the last 382")}</dt></div>
              <div><dd className="reading">3</dd><dt>{t("Graph networks studied: GCN, GraphSAGE and GAT")}</dt></div>
            </dl>
          </div>
        </section>

        <section id="cut" className="lp-section lp-section--l" aria-labelledby="cut-head">
          <div className="shell">
            <div className="lp-head">
              <h2 id="cut-head">{t("Cut anywhere. Read every function.")}</h2>
              <p className="lead lp-lead">{t("The plan and the readout share one graph: move the line and the code follows.")}</p>
            </div>
            <FunctionCut />
          </div>
        </section>

        <section id="refactor" className="lp-section" aria-labelledby="refactor-head">
          <div className="shell lp-split lp-split--7-5">
            <figure className="lp-figure">
              <div className="lp-diff ticks" role="group" aria-label={t("Suggested fix for Vault.withdraw")}>
                <p className="lp-diff__file code-text">Vault.sol</p>
                <pre className="code-text">
                  {DIFF.map((line, i) => (
                    <span key={i} className={`lp-diff__line lp-diff__line--${line.sign === "-" ? "minus" : line.sign === "+" ? "plus" : "same"}`}>
                      <span className="lp-diff__sign" aria-hidden="true">{line.sign}</span>
                      {line.code}
                    </span>
                  ))}
                </pre>
              </div>
              <figcaption className="lp-caption">{t("Sample suggestion from RefactorBot")}</figcaption>
            </figure>
            <div className="lp-text">
              <h2 id="refactor-head">{t("What changed after the fix.")}</h2>
              <p className="lead lp-lead">{t("RefactorBot suggests a rewrite for a flagged function, then validates it.")}</p>
              <ul className="lp-changes">
                <li><span className="lp-changes__name">{t("Balance update")}</span><span>{t("moved above the external call")}</span></li>
                <li><span className="lp-changes__name">nonReentrant</span><span>{t("added to the signature")}</span></li>
                <li><span className="lp-changes__name">{t("Everything else")}</span><span>{t("unchanged, 4 lines")}</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section id="log" className="lp-section lp-section--s" aria-labelledby="log-head">
          <div className="shell">
            <div className="lp-head">
              <h2 id="log-head">{t("Every scan kept, every finding named.")}</h2>
            </div>
            <div className="lp-table-wrap" tabIndex={0} aria-label={t("Sample scan history, scrolls sideways on small screens")}>
              <table className="lp-table">
                <caption className="lp-caption">{t("A sample history")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("Contract")}</th>
                    <th scope="col">{t("Scanned")}</th>
                    <th scope="col">{t("Source")}</th>
                    <th scope="col" className="num">{t("Functions")}</th>
                    <th scope="col" className="num">{t("Flagged")}</th>
                    <th scope="col">{t("Verdict")}</th>
                    <th scope="col">{t("What was found")}</th>
                  </tr>
                </thead>
                <tbody>
                  {LOG.map((row) => (
                    <tr key={row.file + row.at} className={row.live ? "is-live" : undefined}>
                      <th scope="row" className="code-text">{row.file}</th>
                      <td className="measured">{t(row.at)}</td>
                      <td>{t(row.via)}</td>
                      <td className="measured num">{row.fns}</td>
                      <td className={`measured num${row.hits && row.hits !== "0" ? " text-bad" : ""}`}>{row.hits}</td>
                      <td>{row.live ? <span className="lp-live" role="status">{t(row.verdict)}</span> : t(row.verdict)}</td>
                      <td>{row.found ? t(row.found) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="ways" className="lp-section" aria-labelledby="ways-head">
          <div className="shell">
            <div className="lp-head">
              <h2 id="ways-head">{t("Three ways in, one report.")}</h2>
            </div>
            <ul className="lp-tiers">
              {WAYS.map((way) => (
                <li key={way.name} className="lp-tier">
                  <h3>{t(way.name)}</h3>
                  <p className="lp-tier__line">{t(way.line)}</p>
                  <ul className="lp-tier__items">
                    {way.items.map((item) => <li key={item}>{t(item)}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="start" className="lp-band lp-section--l" aria-labelledby="start-head">
          <div className="shell lp-split lp-split--6-6">
            <div className="lp-text">
              <h2 id="start-head">{t("See your own contract in points.")}</h2>
              <p className="lead lp-lead">{t("Create an account and scan one file. The report streams in as each stage finishes.")}</p>
              <ul className="lp-badges">
                <li>{t(".sol files up to 10 MB")}</li>
                <li>{t("Or a token name and its chain")}</li>
              </ul>
            </div>
            {isAuthenticated ? (
              <div>
                <p className="lp-lead">{t("You are signed in.")}</p>
                <div className="lp-actions">
                  <Link to="/analysis" className="lp-btn">{t("Start an analysis")}</Link>
                </div>
              </div>
            ) : (
              <SignUp />
            )}
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="shell lp-foot__inner">
          <Wordmark />
          <nav className="lp-foot__links" aria-label={t("Footer")}>
            <a href="#layers" className="lp-link">{t("Layers")}</a>
            <a href="#cut" className="lp-link">{t("Function cut")}</a>
            <a href="#log" className="lp-link">{t("Scan log")}</a>
            <a href="#ways" className="lp-link">{t("Ways in")}</a>
            <Link to="/login" className="lp-link">{t("Sign in")}</Link>
          </nav>
          <p className="lp-foot__note">
            {t("The sample contract on this page is generated. GraphFusion is a research pipeline built on CodeBERT and graph neural networks; the source is on")}{" "}
            <a href={REPO_URL} className="lp-link" target="_blank" rel="noopener noreferrer">GitHub</a>.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
