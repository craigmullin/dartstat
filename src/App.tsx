import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { finishGoogleRedirect, signInWithGoogle } from "./auth";
import { CRICKET_TARGETS, createDart, formatMpd, marksPerDart, targetTotal, totalMarks, type CricketDart } from "./cricket";
import { JDC_PROMPTS, createJdcDart, hasShanghai, jdcSectionScore, jdcTotalScore, jdcVisitScore, type JdcDart, type JdcResult } from "./jdc";
import { loadSessions, saveSession, type StoredPracticeSession } from "./data";
import { auth } from "./firebase";
import { THEMES, readStoredTheme, storeTheme, type ThemeId } from "./themes";

type Page = "practice" | "history" | "stats" | "settings";
type PracticeView = "home" | "score" | "review";
type RoutineId = "cricket-mpd" | "jdc-challenge";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>("practice");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<StoredPracticeSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [practiceView, setPracticeView] = useState<PracticeView>("home");
  const [darts, setDarts] = useState<CricketDart[]>([]);
  const [jdcDarts, setJdcDarts] = useState<JdcDart[]>([]);
  const [routine, setRoutine] = useState<RoutineId>("cricket-mpd");
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme());
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  useEffect(() => {
    void finishGoogleRedirect().catch(() => setError("Google sign-in could not be completed. Please try again."));
    return onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setReady(true); });
  }, []);

  const refreshSessions = useCallback(async (uid: string) => {
    setSessionsLoading(true);
    try { setSessions(await loadSessions(uid)); }
    catch { setError("Your saved sessions could not be loaded. Please try again."); }
    finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { if (user) void refreshSessions(user.uid); }, [user, refreshSessions]);
  useEffect(() => { document.documentElement.dataset.theme = theme; storeTheme(theme); }, [theme]);

  function beginPractice(nextRoutine: RoutineId) { setError(""); setRoutine(nextRoutine); setDarts([]); setJdcDarts([]); setStartedAt(new Date()); setPracticeView("score"); }
  function leavePractice(nextPage: Page = "practice") {
    if (practiceView !== "home" && (darts.length || jdcDarts.length) && !window.confirm("Discard this unfinished practice session?")) return;
    setDarts([]); setJdcDarts([]); setStartedAt(null); setPracticeView("home"); setPage(nextPage);
  }
  function navigate(nextPage: Page) { if (practiceView !== "home") leavePractice(nextPage); else setPage(nextPage); }

  if (!ready) return <div className="loading">Opening DartStat…</div>;
  if (!user) return <PublicLanding error={error} setError={setError} />;

  return <div className="app-shell">
    <Header page={page} setPage={navigate} user={user} />
    <main className={practiceView !== "home" ? "content content-score" : "content"}>
      {error && <p className="notice app-notice" role="alert">{error}</p>}
      {page === "practice" && practiceView === "home" && <PracticeHome user={user} sessions={sessions} loading={sessionsLoading} onStart={beginPractice} onHistory={() => setPage("history")} />}
      {page === "practice" && practiceView === "score" && routine === "cricket-mpd" && <CricketScorer darts={darts} setDarts={setDarts} onCancel={() => leavePractice()} onReview={() => setPracticeView("review")} />}
      {page === "practice" && practiceView === "score" && routine === "jdc-challenge" && <JdcScorer darts={jdcDarts} setDarts={setJdcDarts} onCancel={() => leavePractice()} onReview={() => setPracticeView("review")} />}
      {page === "practice" && practiceView === "review" && routine === "cricket-mpd" && <SessionReview user={user} darts={darts} startedAt={startedAt!} onBack={() => { setDarts(darts.slice(0, -1)); setPracticeView("score"); }} onSaved={async () => { setDarts([]); setStartedAt(null); setPracticeView("home"); await refreshSessions(user.uid); }} setError={setError} />}
      {page === "practice" && practiceView === "review" && routine === "jdc-challenge" && <JdcReview user={user} darts={jdcDarts} startedAt={startedAt!} onBack={() => { setJdcDarts(jdcDarts.slice(0, -1)); setPracticeView("score"); }} onSaved={async () => { setJdcDarts([]); setStartedAt(null); setPracticeView("home"); await refreshSessions(user.uid); }} setError={setError} />}
      {page === "history" && <History sessions={sessions} loading={sessionsLoading} />}
      {page === "stats" && <Stats sessions={sessions} />}
      {page === "settings" && <Settings theme={theme} setTheme={setTheme} />}
    </main>
    <nav className="bottom-nav" aria-label="Mobile navigation">{(["practice", "history", "stats", "settings"] as Page[]).map((item) => <button className={page === item ? "active" : ""} key={item} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
  </div>;
}

function PublicLanding({ error, setError }: { error: string; setError: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true); setError("");
    try { await signInWithGoogle(); }
    catch (cause) { const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : ""; if (code !== "auth/popup-closed-by-user") setError("Google sign-in could not be opened. Please try again."); setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card"><p className="product-name">DartStat<span>.</span></p><h1>Practice with a purpose.</h1><p className="lead">Fast darts practice entry. Clear statistics. Your progress, throw by throw.</p>{error && <p className="notice" role="alert">{error}</p>}<button className="button google-button" disabled={busy} onClick={() => void login()}><span aria-hidden="true">G</span>{busy ? "Opening Google…" : "Continue with Google"}</button><p className="auth-note">DartStat uses Google only to identify your account. Your practice sessions stay private and are never visible to other players.</p><div className="auth-links"><a href="#privacy">Privacy</a><a href="https://github.com/craigmullin/dartstat" target="_blank" rel="noreferrer">GitHub</a></div><section className="sr-only" id="privacy"><h2>Privacy</h2><p>DartStat stores your account identifier and the practice sessions you choose to save.</p></section></section></main>;
}

function Header({ page, setPage, user }: { page: Page; setPage: (page: Page) => void; user: User }) {
  return <header className="app-header"><button className="brand brand-button" onClick={() => setPage("practice")}>DartStat<span>.</span></button><nav aria-label="Primary navigation">{(["practice", "history", "stats", "settings"] as Page[]).map((item) => <button className={page === item ? "active" : ""} key={item} onClick={() => setPage(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="account"><span>{user.displayName || user.email}</span><button onClick={() => void signOut(auth)}>Sign out</button></div></header>;
}

function PracticeHome({ user, sessions, loading, onStart, onHistory }: { user: User; sessions: StoredPracticeSession[]; loading: boolean; onStart: (routine: RoutineId) => void; onHistory: () => void }) {
  const routines = [
    { name: "Cricket Practice", id: "cricket-mpd" as const, meta: "21 darts · 7 targets", description: "Accuracy across the Cricket board" },
    { name: "JDC Challenge", id: "jdc-challenge" as const, meta: "57 darts · 3 sections", description: "Shanghai scoring and doubles accuracy" },
    { name: "Around the Clock" }, { name: "Doubles" }, { name: "Checkout Practice" }, { name: "Scoring Practice" },
  ];
  const weekStart = Date.now() - 7 * 86400000;
  const thisWeek = sessions.filter((session) => session.completedAt?.toMillis() >= weekStart).length;
  return <><header className="page-heading"><div><p className="eyebrow">Practice</p><h1>What do you want to work on?</h1><p>Welcome back, {user.displayName?.split(" ")[0] || "player"}. Choose a routine to start throwing.</p></div><aside><strong>{thisWeek}</strong><span>Sessions this week</span></aside></header><section className="routine-grid">{routines.map((item) => <button className="routine-card" key={item.name} disabled={!item.id} onClick={item.id ? () => onStart(item.id) : undefined}><span>{item.meta || "Coming later"}</span><strong>{item.name}</strong><small>{item.description || "Routine not yet available"}</small><b aria-hidden="true">→</b></button>)}</section><section className="recent"><div className="section-heading section-heading-row"><div><p className="eyebrow">Recent</p><h2>Your latest sessions</h2></div>{sessions.length > 0 && <button className="text-button" onClick={onHistory}>View all</button>}</div><SessionList sessions={sessions.slice(0, 3)} loading={loading} /></section></>;
}

function CricketScorer({ darts, setDarts, onCancel, onReview }: { darts: CricketDart[]; setDarts: (darts: CricketDart[]) => void; onCancel: () => void; onReview: () => void }) {
  const targetIndex = Math.min(Math.floor(darts.length / 3), CRICKET_TARGETS.length - 1);
  const target = CRICKET_TARGETS[targetIndex];
  const dartIndex = darts.length % 3;
  const visit = darts.filter((dart) => dart.target === target);
  function score(marks: number) { const next = [...darts, createDart(target, dartIndex, marks)]; setDarts(next); if (next.length === 21) onReview(); }
  return <section className="score-shell"><header className="score-header"><button className="icon-button" onClick={onCancel} aria-label="Close session">×</button><div><p className="eyebrow">Cricket MPD</p><p className="progress-copy">Target {targetIndex + 1} of 7</p></div><div className="score-running"><strong>{totalMarks(darts)}</strong><span>marks</span></div></header><div className="progress-track" aria-label={`${darts.length} of 21 darts entered`}><span style={{ width: `${(darts.length / 21) * 100}%` }} /></div><div className="target-display"><span>Throw at</span><strong>{target === "B" ? "BULL" : target}</strong><small>Dart {dartIndex + 1} of 3</small></div><div className="dart-slots" aria-label="Current visit">{[0, 1, 2].map((index) => <div className={index === dartIndex ? "current" : ""} key={index}><span>D{index + 1}</span><strong>{visit[index] ? markLabel(visit[index].marks) : "—"}</strong></div>)}</div><div className="mark-pad"><button onClick={() => score(0)}><strong>MISS</strong><span>0 marks</span></button><button onClick={() => score(1)}><strong>SINGLE</strong><span>1 mark</span></button><button onClick={() => score(2)}><strong>DOUBLE</strong><span>2 marks</span></button><button disabled={target === "B"} onClick={() => score(3)}><strong>TRIPLE</strong><span>{target === "B" ? "Not on Bull" : "3 marks"}</span></button></div><footer className="score-footer"><button className="text-button" disabled={!darts.length} onClick={() => setDarts(darts.slice(0, -1))}>← Undo last dart</button><span>MPD {formatMpd(marksPerDart(darts))}</span></footer></section>;
}

function JdcScorer({ darts, setDarts, onCancel, onReview }: { darts: JdcDart[]; setDarts: (darts: JdcDart[]) => void; onCancel: () => void; onReview: () => void }) {
  const prompt = JDC_PROMPTS[Math.min(darts.length, JDC_PROMPTS.length - 1)];
  const visitDarts = darts.filter((dart) => dart.visit === prompt.visit);
  const sectionName = prompt.section === "shanghai-low" ? "Shanghai · 10–15" : prompt.section === "doubles" ? "Doubles · 1–Bull" : "Shanghai · 15–20";
  function score(result: JdcResult) { const next = [...darts, createJdcDart(prompt, result)]; setDarts(next); if (next.length === JDC_PROMPTS.length) onReview(); }
  const buttons: { result: JdcResult; label: string; detail: string }[] = prompt.section === "doubles"
    ? [{ result: "miss", label: "MISS", detail: "0 points" }, { result: prompt.target === "B" ? "double-bull" : "double", label: prompt.target === "B" ? "DOUBLE BULL" : `DOUBLE ${prompt.target}`, detail: prompt.target === "B" ? "100 points" : "50 points" }]
    : [{ result: "miss", label: "MISS", detail: "0 points" }, { result: "single", label: "SINGLE", detail: `${prompt.target} points` }, { result: "double", label: "DOUBLE", detail: `${Number(prompt.target) * 2} points` }, { result: "triple", label: "TRIPLE", detail: `${Number(prompt.target) * 3} points` }];
  return <section className="score-shell"><header className="score-header"><button className="icon-button" onClick={onCancel} aria-label="Close session">×</button><div><p className="eyebrow">JDC Challenge</p><p className="progress-copy">{sectionName}</p></div><div className="score-running"><strong>{jdcTotalScore(darts)}</strong><span>points</span></div></header><div className="progress-track" aria-label={`${darts.length} of 57 darts entered`}><span style={{ width: `${(darts.length / 57) * 100}%` }} /></div><div className="target-display"><span>{prompt.section === "doubles" ? "One dart at" : "Three darts at"}</span><strong>{prompt.section === "doubles" ? prompt.target === "B" ? "DBULL" : `D${prompt.target}` : prompt.target}</strong><small>Visit {prompt.visit + 1} of 19 · Dart {prompt.dart} of 3</small></div><div className="dart-slots" aria-label="Current visit">{[0, 1, 2].map((index) => <div className={index === visitDarts.length ? "current" : ""} key={index}><span>D{index + 1}</span><strong>{visitDarts[index] ? jdcResultShort(visitDarts[index]) : "—"}</strong></div>)}</div><div className={`mark-pad ${buttons.length === 2 ? "two-buttons" : ""}`}>{buttons.map((button) => <button key={button.result} onClick={() => score(button.result)}><strong>{button.label}</strong><span>{button.detail}</span></button>)}</div><footer className="score-footer"><button className="text-button" disabled={!darts.length} onClick={() => setDarts(darts.slice(0, -1))}>← Undo last dart</button><span>{darts.length} / 57 darts</span></footer></section>;
}

function JdcReview({ user, darts, startedAt, onBack, onSaved, setError }: { user: User; darts: JdcDart[]; startedAt: Date; onBack: () => void; onSaved: () => Promise<void>; setError: (error: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); setError(""); try { await saveSession(user.uid, { routineId: "jdc-challenge", status: "completed", startedAt, darts }); await onSaved(); } catch { setError("This session could not be saved. Your result is still here—please try again."); setSaving(false); } }
  return <section className="review-shell"><header className="review-heading"><div><p className="eyebrow">JDC Challenge complete</p><h1>Challenge finished.</h1><p>Review all 19 visits before saving this result.</p></div><div className="result-mpd"><span>Total score</span><strong>{jdcTotalScore(darts)}</strong><small>57 darts</small></div></header><JdcTable darts={darts} /><div className="review-actions"><button className="button button-secondary" disabled={saving} onClick={onBack}>Edit last dart</button><button className="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save challenge"}</button></div></section>;
}

function JdcTable({ darts }: { darts: JdcDart[] }) {
  const sections = [
    { id: "shanghai-low" as const, label: "Shanghai · 10–15" },
    { id: "doubles" as const, label: "Doubles · 1–Bull" },
    { id: "shanghai-high" as const, label: "Shanghai · 15–20" },
  ];
  return <div className="jdc-review">{sections.map((section) => { const sectionDarts = darts.filter((dart) => dart.section === section.id); const visits = Array.from(new Set(sectionDarts.map((dart) => dart.visit))); return <section key={section.id}><header><div><h2>{section.label}</h2><small>{section.id === "doubles" ? "50 per double · 100 double Bull" : "100 bonus for Shanghai"}</small></div><strong>{jdcSectionScore(darts, section.id)}</strong></header><div className="visit-table">{visits.map((visit) => { const visitDarts = darts.filter((dart) => dart.visit === visit); const target = section.id === "doubles" ? visitDarts.map((dart) => dart.target === "B" ? "B" : `D${dart.target}`).join(" · ") : visitDarts[0]?.target; return <div className="visit-row jdc-row" key={visit}><strong>{target}</strong><span>{visitDarts.map(jdcResultShort).join(" · ")}{hasShanghai(visitDarts) ? " · +100" : ""}</span><strong>{jdcVisitScore(visitDarts)}</strong></div>; })}</div></section>; })}</div>;
}

function SessionReview({ user, darts, startedAt, onBack, onSaved, setError }: { user: User; darts: CricketDart[]; startedAt: Date; onBack: () => void; onSaved: () => Promise<void>; setError: (error: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); setError(""); try { await saveSession(user.uid, { routineId: "cricket-mpd", status: "completed", startedAt, darts }); await onSaved(); } catch { setError("This session could not be saved. Your result is still here—please try again."); setSaving(false); } }
  return <section className="review-shell"><header className="review-heading"><div><p className="eyebrow">Session complete</p><h1>Nice throwing.</h1><p>Review every dart before saving this result.</p></div><div className="result-mpd"><span>MPD</span><strong>{formatMpd(marksPerDart(darts))}</strong><small>{totalMarks(darts)} total marks</small></div></header><VisitTable darts={darts} /><div className="review-actions"><button className="button button-secondary" disabled={saving} onClick={onBack}>Edit last dart</button><button className="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save session"}</button></div></section>;
}

function VisitTable({ darts }: { darts: CricketDart[] }) {
  return <div className="visit-table"><div className="visit-row visit-head"><span>Target</span><span>Darts</span><span>Marks</span></div>{CRICKET_TARGETS.map((target) => { const visit = darts.filter((dart) => dart.target === target); return <div className="visit-row" key={target}><strong>{target === "B" ? "Bull" : target}</strong><span>{visit.map((dart) => markShort(dart.marks)).join(" · ") || "—"}</span><strong>{targetTotal(darts, target)}</strong></div>; })}</div>;
}

function History({ sessions, loading }: { sessions: StoredPracticeSession[]; loading: boolean }) {
  const [selected, setSelected] = useState<StoredPracticeSession | null>(null);
  if (selected) {
    const isJdc = selected.routineId === "jdc-challenge";
    const cricket = asCricketDarts(selected);
    const jdc = asJdcDarts(selected);
    return <section><button className="text-button back-button" onClick={() => setSelected(null)}>← All sessions</button><header className="review-heading compact"><div><p className="eyebrow">{isJdc ? "JDC Challenge" : "Cricket MPD"}</p><h1>{formatDate(selected.completedAt)}</h1></div><div className="result-mpd"><span>{isJdc ? "Total score" : "MPD"}</span><strong>{isJdc ? jdcTotalScore(jdc) : formatMpd(marksPerDart(cricket))}</strong><small>{isJdc ? "57 darts" : `${totalMarks(cricket)} total marks`}</small></div></header>{isJdc ? <JdcTable darts={jdc} /> : <VisitTable darts={cricket} />}</section>;
  }
  return <section><header className="page-heading"><div><p className="eyebrow">Your sessions</p><h1>History</h1><p>Every completed practice session, newest first.</p></div></header><SessionList sessions={sessions} loading={loading} onSelect={setSelected} /></section>;
}

function SessionList({ sessions, loading, onSelect }: { sessions: StoredPracticeSession[]; loading: boolean; onSelect?: (session: StoredPracticeSession) => void }) {
  if (loading) return <div className="empty-state"><strong>Loading sessions…</strong></div>;
  if (!sessions.length) return <div className="empty-state"><strong>No sessions yet</strong><p>Complete Cricket Practice and your first result will appear here.</p></div>;
  return <div className="session-list">{sessions.map((session) => { const isJdc = session.routineId === "jdc-challenge"; return <button key={session.id} onClick={() => onSelect?.(session)} disabled={!onSelect} className="session-card"><span><strong>{isJdc ? "JDC Challenge" : "Cricket MPD"}</strong><small>{formatDate(session.completedAt)}</small></span><span><strong>{isJdc ? jdcTotalScore(asJdcDarts(session)) : formatMpd(marksPerDart(asCricketDarts(session)))}</strong><small>{isJdc ? "Score" : "MPD"}</small></span><b aria-hidden="true">{onSelect ? "→" : ""}</b></button>; })}</div>;
}

function Stats({ sessions }: { sessions: StoredPracticeSession[] }) {
  const cricketSessions = useMemo(() => sessions.filter((session) => session.routineId === "cricket-mpd"), [sessions]);
  const darts = useMemo(() => cricketSessions.flatMap(asCricketDarts), [cricketSessions]);
  const best = cricketSessions.length ? Math.max(...cricketSessions.map((session) => marksPerDart(asCricketDarts(session)))) : 0;
  return <section><header className="page-heading"><div><p className="eyebrow">Your progress</p><h1>Stats</h1><p>Lifetime Cricket MPD performance from your saved dart results.</p></div></header><div className="stats-grid"><article><span>Lifetime MPD</span><strong>{formatMpd(marksPerDart(darts))}</strong></article><article><span>Best session</span><strong>{formatMpd(best)}</strong></article><article><span>Cricket sessions</span><strong>{cricketSessions.length}</strong></article></div>{cricketSessions.length > 0 && <section className="target-stats"><h2>Marks by target</h2>{CRICKET_TARGETS.map((target) => { const targetDarts = darts.filter((dart) => dart.target === target); return <div key={target}><strong>{target === "B" ? "Bull" : target}</strong><span><i style={{ width: `${(marksPerDart(targetDarts) / (target === "B" ? 2 : 3)) * 100}%` }} /></span><b>{formatMpd(marksPerDart(targetDarts))}</b></div>; })}</section>}</section>;
}

function Settings({ theme, setTheme }: { theme: ThemeId; setTheme: (theme: ThemeId) => void }) {
  return <section className="settings-page"><header className="page-heading"><div><p className="eyebrow">Personalize</p><h1>Settings</h1><p>Choose the colorway that feels best at the board. Your selection stays on this device.</p></div></header><fieldset className="theme-picker"><legend>Appearance</legend><p>Select a DartStat theme</p><div className="theme-grid">{THEMES.map((option) => <label className={theme === option.id ? "theme-option selected" : "theme-option"} key={option.id}><input type="radio" name="theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)} /><span className="theme-swatches" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span><span className="theme-copy"><strong>{option.name}</strong><small>{option.description}</small></span><b aria-hidden="true">{theme === option.id ? "✓" : ""}</b></label>)}</div></fieldset><section className="settings-note"><strong>Saved automatically</strong><p>Theme preferences are stored only in this browser and do not change your practice data.</p></section></section>;
}

function markLabel(marks: number) { return ["Miss", "Single", "Double", "Triple"][marks]; }
function markShort(marks: number) { return ["M", "S", "D", "T"][marks]; }
function jdcResultShort(dart: JdcDart) { return { miss: "M", single: "S", double: dart.section === "doubles" ? `D${dart.target}` : "D", triple: "T", "double-bull": "DB" }[dart.result]; }
function asCricketDarts(session: StoredPracticeSession) { return (session.darts || []).filter((dart): dart is CricketDart => "marks" in dart); }
function asJdcDarts(session: StoredPracticeSession) { return (session.darts || []).filter((dart): dart is JdcDart => "result" in dart); }
function formatDate(timestamp: StoredPracticeSession["completedAt"]) { return timestamp?.toDate ? timestamp.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Just now"; }
