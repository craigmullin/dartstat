import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { finishGoogleRedirect, signInWithGoogle } from "./auth";
import { CRICKET_TARGETS, createDart, formatMpr, marksPerRound, targetTotal, totalMarks, type CricketDart } from "./cricket";
import { JDC_PROMPTS, createJdcDart, hasShanghai, jdcSectionScore, jdcTotalScore, jdcVisitScore, type JdcDart, type JdcResult } from "./jdc";
import { addDartSet, archiveDartSet, loadDartSets, loadSessions, saveSession, updateDartSet, updateSessionDartSet, type StoredPracticeSession } from "./data";
import { auth } from "./firebase";
import { THEMES, readStoredTheme, storeTheme, type ThemeId } from "./themes";
import { aggregateStatsByDartSet, snapshotDartSet, tipTypeLabel, validateDartSet, type DartSet, type DartSetValues } from "./dartSets";
import { CompetitiveCricket } from "./CompetitiveCricketView";
import { competitiveCricketStorageKey } from "./competitiveCricket";

type Page = "practice" | "darts" | "history" | "stats" | "settings";
type PracticeView = "home" | "setup" | "score" | "review" | "match";
type RoutineId = "cricket-mpd" | "jdc-challenge" | "cricket-match";
type NavigationState = { dartstat: true; page: Page; practiceView: PracticeView };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>("practice");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<StoredPracticeSession[]>([]);
  const [dartSets, setDartSets] = useState<DartSet[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [practiceView, setPracticeView] = useState<PracticeView>("home");
  const [darts, setDarts] = useState<CricketDart[]>([]);
  const [jdcDarts, setJdcDarts] = useState<JdcDart[]>([]);
  const [routine, setRoutine] = useState<RoutineId>("cricket-mpd");
  const [selectedDartSetId, setSelectedDartSetId] = useState("");
  const [practiceNotes, setPracticeNotes] = useState("");
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme());
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const navigationRef = useRef({ page, practiceView, darts, jdcDarts, userId: user?.uid });
  const skipPopConfirmation = useRef(false);
  const pendingPage = useRef<Page | null>(null);

  navigationRef.current = { page, practiceView, darts, jdcDarts, userId: user?.uid };

  useEffect(() => {
    void finishGoogleRedirect().catch(() => setError("Google sign-in could not be completed. Please try again."));
    return onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setReady(true); });
  }, []);

  const refreshSessions = useCallback(async (uid: string) => {
    setSessionsLoading(true);
    try { setSessions(await loadSessions(uid)); }
    catch { setError("Saved sessions could not be loaded. Please try again."); }
    finally { setSessionsLoading(false); }
  }, []);

  const refreshDartSets = useCallback(async (uid: string) => {
    try { setDartSets(await loadDartSets(uid)); }
    catch { setError("Dart sets could not be loaded. Please try again."); }
  }, []);

  useEffect(() => { if (user) void Promise.all([refreshSessions(user.uid), refreshDartSets(user.uid)]); }, [user, refreshSessions, refreshDartSets]);
  useEffect(() => { document.documentElement.dataset.theme = theme; storeTheme(theme); }, [theme]);

  useEffect(() => {
    const initial: NavigationState = { dartstat: true, page: "practice", practiceView: "home" };
    window.history.replaceState(initial, "");
    function handlePopState(event: PopStateEvent) {
      const current = navigationRef.current;
      const requested = isNavigationState(event.state) ? event.state : initial;
      const hasMatch = current.userId ? Boolean(localStorage.getItem(competitiveCricketStorageKey(current.userId))) : false;
      const leavingFlow = current.practiceView !== "home" && (requested.page !== "practice" || requested.practiceView === "home");
      const unfinished = leavingFlow && (current.darts.length > 0 || current.jdcDarts.length > 0 || (current.practiceView === "match" && hasMatch));
      if (!skipPopConfirmation.current && unfinished && !window.confirm(current.practiceView === "match" ? "Leave this game? It will remain saved on this device." : "Discard this unfinished practice session?")) {
        window.history.pushState({ dartstat: true, page: current.page, practiceView: current.practiceView } satisfies NavigationState, "");
        return;
      }
      skipPopConfirmation.current = false;
      const queuedPage = pendingPage.current;
      pendingPage.current = null;
      if (queuedPage) {
        setDarts([]); setJdcDarts([]); setPracticeNotes(""); setStartedAt(null);
        const next: NavigationState = { dartstat: true, page: queuedPage, practiceView: "home" };
        if (queuedPage === "practice") window.history.replaceState(next, ""); else window.history.pushState(next, "");
        setPage(queuedPage); setPracticeView("home");
      } else {
        if (leavingFlow) { setDarts([]); setJdcDarts([]); setPracticeNotes(""); setStartedAt(null); }
        else if (current.practiceView === "review" && requested.practiceView === "score") {
          setDarts(current.darts.slice(0, -1)); setJdcDarts(current.jdcDarts.slice(0, -1));
        }
        setPage(requested.page); setPracticeView(requested.practiceView);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function pushScreen(nextPage: Page, nextView: PracticeView) {
    window.history.pushState({ dartstat: true, page: nextPage, practiceView: nextView } satisfies NavigationState, "");
    setPage(nextPage); setPracticeView(nextView);
  }

  function leaveFlow(nextPage: Page, depth: number) {
    pendingPage.current = nextPage; skipPopConfirmation.current = true;
    setDarts([]); setJdcDarts([]); setPracticeNotes(""); setStartedAt(null);
    window.history.go(-depth);
  }

  function beginPractice(nextRoutine: RoutineId) { setError(""); setRoutine(nextRoutine); setDarts([]); setJdcDarts([]); setSelectedDartSetId(""); setPracticeNotes(""); setStartedAt(null); pushScreen("practice", nextRoutine === "cricket-match" ? "match" : "setup"); }
  function startPractice() { setStartedAt(new Date()); pushScreen("practice", "score"); }
  function leavePractice(nextPage: Page = "practice") {
    const hasMatch = user ? Boolean(localStorage.getItem(competitiveCricketStorageKey(user.uid))) : false;
    if (practiceView !== "home" && (darts.length || jdcDarts.length || (practiceView === "match" && hasMatch)) && !window.confirm(practiceView === "match" ? "Leave this game? It will remain saved on this device." : "Discard this unfinished practice session?")) return;
    const depth = practiceView === "review" ? 3 : practiceView === "score" ? 2 : 1;
    leaveFlow(nextPage, depth);
  }
  function navigate(nextPage: Page) { if (practiceView !== "home") leavePractice(nextPage); else pushScreen(nextPage, "home"); }

  if (!ready) return <div className="loading">Opening DartStat…</div>;
  if (!user) return <PublicLanding error={error} setError={setError} />;

  return <div className="app-shell">
    <Header page={page} setPage={navigate} user={user} />
    <main className={practiceView !== "home" ? "content content-score" : "content"}>
      {error && <p className="notice app-notice" role="alert">{error}</p>}
      {page === "practice" && practiceView === "home" && <PracticeHome user={user} sessions={sessions} loading={sessionsLoading} onStart={beginPractice} onHistory={() => setPage("history")} />}
      {page === "practice" && practiceView === "setup" && <PracticeSetup routine={routine} dartSets={dartSets} selectedDartSetId={selectedDartSetId} setSelectedDartSetId={setSelectedDartSetId} onCancel={() => leavePractice()} onStart={startPractice} onManage={() => leavePractice("darts")} />}
      {page === "practice" && practiceView === "score" && routine === "cricket-mpd" && <CricketScorer darts={darts} setDarts={setDarts} onCancel={() => leavePractice()} onReview={() => pushScreen("practice", "review")} />}
      {page === "practice" && practiceView === "score" && routine === "jdc-challenge" && <JdcScorer darts={jdcDarts} setDarts={setJdcDarts} onCancel={() => leavePractice()} onReview={() => pushScreen("practice", "review")} />}
      {page === "practice" && practiceView === "review" && routine === "cricket-mpd" && <SessionReview user={user} darts={darts} dartSet={dartSets.find((item) => item.id === selectedDartSetId)} notes={practiceNotes} setNotes={setPracticeNotes} startedAt={startedAt!} onBack={() => window.history.back()} onSaved={async () => { await refreshSessions(user.uid); leaveFlow("practice", 3); }} setError={setError} />}
      {page === "practice" && practiceView === "review" && routine === "jdc-challenge" && <JdcReview user={user} darts={jdcDarts} dartSet={dartSets.find((item) => item.id === selectedDartSetId)} notes={practiceNotes} setNotes={setPracticeNotes} startedAt={startedAt!} onBack={() => window.history.back()} onSaved={async () => { await refreshSessions(user.uid); leaveFlow("practice", 3); }} setError={setError} />}
      {page === "practice" && practiceView === "match" && <CompetitiveCricket userId={user.uid} profileName={user.displayName} onExit={() => leavePractice()} />}
      {page === "darts" && <DartSetsPage dartSets={dartSets} onSave={async (values, dartSetId) => { if (dartSetId) await updateDartSet(user.uid, dartSetId, values); else await addDartSet(user.uid, values); await refreshDartSets(user.uid); }} onArchive={async (dartSet) => { await archiveDartSet(user.uid, dartSet.id); await refreshDartSets(user.uid); }} />}
      {page === "history" && <History sessions={sessions} dartSets={dartSets} loading={sessionsLoading} onUpdateDartSet={async (session, dartSet) => { await updateSessionDartSet(user.uid, session.id, dartSet); await refreshSessions(user.uid); }} />}
      {page === "stats" && <Stats sessions={sessions} />}
      {page === "settings" && <Settings theme={theme} setTheme={setTheme} />}
    </main>
    <nav className="bottom-nav" aria-label="Mobile navigation">{(["practice", "darts", "history", "stats", "settings"] as Page[]).map((item) => <button className={page === item ? "active" : ""} key={item} onClick={() => navigate(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
  </div>;
}

function PublicLanding({ error, setError }: { error: string; setError: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true); setError("");
    try { await signInWithGoogle(); }
    catch (cause) { const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : ""; if (code !== "auth/popup-closed-by-user") setError("Google sign-in could not be opened. Please try again."); setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-card"><p className="product-name">DartStat<span>.</span></p><h1>Practice with a purpose.</h1><p className="lead">Fast darts practice entry. Clear statistics. Progress, throw by throw.</p>{error && <p className="notice" role="alert">{error}</p>}<button className="button google-button" disabled={busy} onClick={() => void login()}><span aria-hidden="true">G</span>{busy ? "Opening Google…" : "Continue with Google"}</button><p className="auth-note">DartStat uses Google only to identify your account. Your practice sessions stay private and are never visible to other players.</p><div className="auth-links"><a href="#privacy">Privacy</a><a href="https://github.com/craigmullin/dartstat" target="_blank" rel="noreferrer">GitHub</a></div><section className="sr-only" id="privacy"><h2>Privacy</h2><p>DartStat stores your account identifier and the practice sessions you choose to save.</p></section></section></main>;
}

function Header({ page, setPage, user }: { page: Page; setPage: (page: Page) => void; user: User }) {
  const firstName = user.displayName?.trim().split(/\s+/)[0] || user.email?.split("@")[0] || "Account";
  return <header className="app-header"><button className="brand brand-button" onClick={() => setPage("practice")}>DartStat<span>.</span></button><nav aria-label="Primary navigation">{(["practice", "darts", "history", "stats", "settings"] as Page[]).map((item) => <button className={page === item ? "active" : ""} key={item} onClick={() => setPage(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><details className="account-menu"><summary>{firstName}<span aria-hidden="true">⌄</span></summary><div><button onClick={() => void signOut(auth)}>Sign out</button></div></details></header>;
}

function PracticeSetup({ routine, dartSets, selectedDartSetId, setSelectedDartSetId, onCancel, onStart, onManage }: { routine: RoutineId; dartSets: DartSet[]; selectedDartSetId: string; setSelectedDartSetId: (id: string) => void; onCancel: () => void; onStart: () => void; onManage: () => void }) {
  return <section className="practice-setup"><button className="text-button back-button" onClick={onCancel}>← Practice</button><div className="setup-card"><p className="eyebrow">Ready to throw</p><h1>{routine === "cricket-mpd" ? "Cricket MPR" : "JDC Challenge"}</h1><label>Darts used <small>Optional</small><select value={selectedDartSetId} onChange={(event) => setSelectedDartSetId(event.target.value)}><option value="">No dart set selected</option>{dartSets.map((dartSet) => <option key={dartSet.id} value={dartSet.id}>{dartSet.name} · {dartSet.weightGrams}g · {tipTypeLabel(dartSet.tipType)}</option>)}</select></label>{dartSets.length === 0 && <p className="setup-help">No dart sets have been added yet. Continue without one or add a set first.</p>}<div className="review-actions"><button className="button button-secondary" onClick={onManage}>{dartSets.length ? "Manage my darts" : "Add a dart set"}</button><button className="button" onClick={onStart}>Start practice</button></div></div></section>;
}

function PracticeHome({ user, sessions, loading, onStart, onHistory }: { user: User; sessions: StoredPracticeSession[]; loading: boolean; onStart: (routine: RoutineId) => void; onHistory: () => void }) {
  const cricketResults = sessions.filter((session) => session.routineId === "cricket-mpd").map((session) => marksPerRound(asCricketDarts(session)));
  const jdcResults = sessions.filter((session) => session.routineId === "jdc-challenge").map((session) => jdcTotalScore(asJdcDarts(session)));
  const routines = [
    { name: "Play Cricket", id: "cricket-match" as const, meta: "2–3 players · Local game", description: "Keep score together on one device", best: "Scoreboard" },
    { name: "Cricket Practice", id: "cricket-mpd" as const, meta: "21 darts · 7 targets", description: "Accuracy across the Cricket board", best: cricketResults.length ? `${formatMpr(Math.max(...cricketResults))} MPR` : "—" },
    { name: "JDC Challenge", id: "jdc-challenge" as const, meta: "57 darts · 3 sections", description: "Shanghai scoring and doubles accuracy", best: jdcResults.length ? String(Math.max(...jdcResults)) : "—" },
    { name: "Around the Clock" }, { name: "Doubles" }, { name: "Checkout Practice" }, { name: "Scoring Practice" },
  ];
  const weekStart = Date.now() - 7 * 86400000;
  const thisWeek = sessions.filter((session) => session.completedAt?.toMillis() >= weekStart).length;
  return <><header className="page-heading"><div><h1>What do you want to work on?</h1><p>Welcome back, {user.displayName?.split(" ")[0] || "player"}. Choose a routine to start throwing.</p></div><aside><strong>{thisWeek}</strong><span>Sessions this week</span></aside></header><section className="routine-grid">{routines.map((item) => <button className="routine-card" key={item.name} disabled={!item.id} onClick={item.id ? () => onStart(item.id) : undefined}><span>{item.meta || "Coming later"}</span><strong>{item.name}</strong><small>{item.description || "Routine not yet available"}</small>{item.best && <em>Best <strong>{item.best}</strong></em>}<b aria-hidden="true">→</b></button>)}</section><section className="recent"><div className="section-heading section-heading-row"><h2>Recent sessions</h2>{sessions.length > 0 && <button className="text-button" onClick={onHistory}>View all</button>}</div><SessionList sessions={sessions.slice(0, 3)} loading={loading} /></section></>;
}

function CricketScorer({ darts, setDarts, onCancel, onReview }: { darts: CricketDart[]; setDarts: (darts: CricketDart[]) => void; onCancel: () => void; onReview: () => void }) {
  const targetIndex = Math.min(Math.floor(darts.length / 3), CRICKET_TARGETS.length - 1);
  const target = CRICKET_TARGETS[targetIndex];
  const dartIndex = darts.length % 3;
  const visit = darts.filter((dart) => dart.target === target);
  function score(marks: number) { const next = [...darts, createDart(target, dartIndex, marks)]; setDarts(next); if (next.length === 21) onReview(); }
  return <section className="score-shell"><header className="score-header"><button className="icon-button" onClick={onCancel} aria-label="Close session">×</button><div><p className="eyebrow">Cricket MPR</p><p className="progress-copy">Target {targetIndex + 1} of 7</p></div><div className="score-running"><strong>{totalMarks(darts)}</strong><span>marks</span></div></header><div className="progress-track" aria-label={`${darts.length} of 21 darts entered`}><span style={{ width: `${(darts.length / 21) * 100}%` }} /></div><div className="target-display"><span>Throw at</span><strong>{target === "B" ? "BULL" : target}</strong><small>Dart {dartIndex + 1} of 3</small></div><div className="dart-slots" aria-label="Current visit">{[0, 1, 2].map((index) => <div className={index === dartIndex ? "current" : ""} key={index}><span>D{index + 1}</span><strong>{visit[index] ? markLabel(visit[index].marks) : "—"}</strong></div>)}</div><div className="mark-pad"><button onClick={() => score(1)}><strong>SINGLE</strong></button><button onClick={() => score(2)}><strong>DOUBLE</strong></button><button disabled={target === "B"} onClick={() => score(3)}><strong>TREBLE</strong></button><button className="miss-button" onClick={() => score(0)}><strong>MISS</strong></button></div><footer className="score-footer"><button className="text-button" disabled={!darts.length} onClick={() => setDarts(darts.slice(0, -1))}>← Undo last dart</button><span>MPR {formatMpr(marksPerRound(darts))}</span></footer></section>;
}

function JdcScorer({ darts, setDarts, onCancel, onReview }: { darts: JdcDart[]; setDarts: (darts: JdcDart[]) => void; onCancel: () => void; onReview: () => void }) {
  const prompt = JDC_PROMPTS[Math.min(darts.length, JDC_PROMPTS.length - 1)];
  const visitDarts = darts.filter((dart) => dart.visit === prompt.visit);
  const sectionName = prompt.section === "shanghai-low" ? "Shanghai · 10–15" : prompt.section === "doubles" ? "Doubles · 1–Bull" : "Shanghai · 15–20";
  function score(result: JdcResult) { const next = [...darts, createJdcDart(prompt, result)]; setDarts(next); if (next.length === JDC_PROMPTS.length) onReview(); }
  const buttons: { result: JdcResult; label: string }[] = prompt.section === "doubles"
    ? [{ result: prompt.target === "B" ? "double-bull" : "double", label: prompt.target === "B" ? "DOUBLE BULL" : `DOUBLE ${prompt.target}` }, { result: "miss", label: "MISS" }]
    : [{ result: "single", label: "SINGLE" }, { result: "double", label: "DOUBLE" }, { result: "treble", label: "TREBLE" }, { result: "miss", label: "MISS" }];
  return <section className="score-shell"><header className="score-header"><button className="icon-button" onClick={onCancel} aria-label="Close session">×</button><div><p className="eyebrow">JDC Challenge</p><p className="progress-copy">{sectionName}</p></div><div className="score-running"><strong>{jdcTotalScore(darts)}</strong><span>points</span></div></header><div className="progress-track" aria-label={`${darts.length} of 57 darts entered`}><span style={{ width: `${(darts.length / 57) * 100}%` }} /></div><div className="target-display"><span>{prompt.section === "doubles" ? "One dart at" : "Three darts at"}</span><strong>{prompt.section === "doubles" ? prompt.target === "B" ? "DBULL" : `D${prompt.target}` : prompt.target}</strong><small>Visit {prompt.visit + 1} of 19 · Dart {prompt.dart} of 3</small></div><div className="dart-slots" aria-label="Current visit">{[0, 1, 2].map((index) => <div className={index === visitDarts.length ? "current" : ""} key={index}><span>D{index + 1}</span><strong>{visitDarts[index] ? jdcResultShort(visitDarts[index]) : "—"}</strong></div>)}</div><div className={`mark-pad ${buttons.length === 2 ? "two-buttons" : ""}`}>{buttons.map((button) => <button className={button.result === "miss" ? "miss-button" : ""} key={button.result} onClick={() => score(button.result)}><strong>{button.label}</strong></button>)}</div><footer className="score-footer"><button className="text-button" disabled={!darts.length} onClick={() => setDarts(darts.slice(0, -1))}>← Undo last dart</button><span>{darts.length} / 57 darts</span></footer></section>;
}

function JdcReview({ user, darts, dartSet, notes, setNotes, startedAt, onBack, onSaved, setError }: { user: User; darts: JdcDart[]; dartSet?: DartSet; notes: string; setNotes: (notes: string) => void; startedAt: Date; onBack: () => void; onSaved: () => Promise<void>; setError: (error: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); setError(""); try { await saveSession(user.uid, { routineId: "jdc-challenge", status: "completed", startedAt, darts, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(dartSet ? { dartSetId: dartSet.id, dartSetSnapshot: snapshotDartSet(dartSet) } : {}) }); await onSaved(); } catch { setError("This session could not be saved. The result is still available—please try again."); setSaving(false); } }
  return <section className="review-shell"><header className="review-heading"><div><p className="eyebrow">JDC Challenge complete</p><h1>Challenge finished.</h1><p>Review all 19 visits before saving this result.</p>{dartSet && <DartSetLine dartSet={dartSet} />}</div><div className="result-summary"><span>Total score</span><strong>{jdcTotalScore(darts)}</strong><small>57 darts</small></div></header><JdcTable darts={darts} /><SessionNotes notes={notes} setNotes={setNotes} /><div className="review-actions"><button className="button button-secondary" disabled={saving} onClick={onBack}>Edit last dart</button><button className="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save challenge"}</button></div></section>;
}

function JdcTable({ darts }: { darts: JdcDart[] }) {
  const sections = [
    { id: "shanghai-low" as const, label: "Shanghai · 10–15" },
    { id: "doubles" as const, label: "Doubles · 1–Bull" },
    { id: "shanghai-high" as const, label: "Shanghai · 15–20" },
  ];
  return <div className="jdc-review">{sections.map((section) => { const sectionDarts = darts.filter((dart) => dart.section === section.id); const visits = Array.from(new Set(sectionDarts.map((dart) => dart.visit))); return <section key={section.id}><header><div><h2>{section.label}</h2><small>{section.id === "doubles" ? "50 per double · 100 double Bull" : "100 bonus for Shanghai"}</small></div><strong>{jdcSectionScore(darts, section.id)}</strong></header><div className="visit-table">{visits.map((visit) => { const visitDarts = darts.filter((dart) => dart.visit === visit); const target = section.id === "doubles" ? visitDarts.map((dart) => dart.target === "B" ? "B" : `D${dart.target}`).join(" · ") : visitDarts[0]?.target; return <div className="visit-row jdc-row" key={visit}><strong>{target}</strong><span>{visitDarts.map(jdcResultShort).join(" · ")}{hasShanghai(visitDarts) ? " · +100" : ""}</span><strong>{jdcVisitScore(visitDarts)}</strong></div>; })}</div></section>; })}</div>;
}

function SessionReview({ user, darts, dartSet, notes, setNotes, startedAt, onBack, onSaved, setError }: { user: User; darts: CricketDart[]; dartSet?: DartSet; notes: string; setNotes: (notes: string) => void; startedAt: Date; onBack: () => void; onSaved: () => Promise<void>; setError: (error: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); setError(""); try { await saveSession(user.uid, { routineId: "cricket-mpd", status: "completed", startedAt, darts, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(dartSet ? { dartSetId: dartSet.id, dartSetSnapshot: snapshotDartSet(dartSet) } : {}) }); await onSaved(); } catch { setError("This session could not be saved. The result is still available—please try again."); setSaving(false); } }
  return <section className="review-shell"><header className="review-heading"><div><p className="eyebrow">Session complete</p><h1>Nice throwing.</h1><p>Review every dart before saving this result.</p>{dartSet && <DartSetLine dartSet={dartSet} />}</div><div className="result-summary"><span>MPR</span><strong>{formatMpr(marksPerRound(darts))}</strong><small>{totalMarks(darts)} total marks</small></div></header><VisitTable darts={darts} /><SessionNotes notes={notes} setNotes={setNotes} /><div className="review-actions"><button className="button button-secondary" disabled={saving} onClick={onBack}>Edit last dart</button><button className="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save session"}</button></div></section>;
}

function SessionNotes({ notes, setNotes }: { notes: string; setNotes: (notes: string) => void }) {
  return <label className="session-notes"><span>Practice notes <small>Optional</small></span><textarea rows={4} value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="Grip, stance, release, adjustments, or anything worth remembering…" /><small>{notes.length} / 2000</small></label>;
}

function DartSetLine({ dartSet }: { dartSet: DartSetValues }) {
  return <p className="dart-set-line"><i style={{ backgroundColor: dartSet.color }} />{dartSet.name} · {dartSet.weightGrams}g · {tipTypeLabel(dartSet.tipType)}</p>;
}

function VisitTable({ darts }: { darts: CricketDart[] }) {
  return <div className="visit-table"><div className="visit-row visit-head"><span>Target</span><span>Darts</span><span>Marks</span></div>{CRICKET_TARGETS.map((target) => { const visit = darts.filter((dart) => dart.target === target); return <div className="visit-row" key={target}><strong>{target === "B" ? "Bull" : target}</strong><span>{visit.map((dart) => markShort(dart.marks)).join(" · ") || "—"}</span><strong>{targetTotal(darts, target)}</strong></div>; })}</div>;
}

function History({ sessions, dartSets, loading, onUpdateDartSet }: { sessions: StoredPracticeSession[]; dartSets: DartSet[]; loading: boolean; onUpdateDartSet: (session: StoredPracticeSession, dartSet?: DartSet) => Promise<void> }) {
  const [selected, setSelected] = useState<StoredPracticeSession | null>(null);
  if (selected) {
    const isJdc = selected.routineId === "jdc-challenge";
    const cricket = asCricketDarts(selected);
    const jdc = asJdcDarts(selected);
    return <section><button className="text-button back-button" onClick={() => setSelected(null)}>← All sessions</button><header className="review-heading compact"><div><p className="eyebrow">{isJdc ? "JDC Challenge" : "Cricket MPR"}</p><h1>{formatDate(selected.completedAt)}</h1><HistoryDartSetEditor session={selected} dartSets={dartSets} onSave={async (dartSet) => { await onUpdateDartSet(selected, dartSet); setSelected({ ...selected, dartSetId: dartSet?.id, dartSetSnapshot: dartSet ? snapshotDartSet(dartSet) : undefined }); }} /></div><div className="result-summary"><span>{isJdc ? "Total score" : "MPR"}</span><strong>{isJdc ? jdcTotalScore(jdc) : formatMpr(marksPerRound(cricket))}</strong><small>{isJdc ? "57 darts" : `${totalMarks(cricket)} total marks`}</small></div></header>{selected.notes && <section className="saved-notes"><p className="eyebrow">Practice notes</p><p>{selected.notes}</p></section>}{isJdc ? <JdcTable darts={jdc} /> : <VisitTable darts={cricket} />}</section>;
  }
  return <section><header className="page-heading"><div><p className="eyebrow">Sessions</p><h1>History</h1><p>Every completed practice session, newest first.</p></div></header><SessionList sessions={sessions} loading={loading} onSelect={setSelected} /></section>;
}

function SessionList({ sessions, loading, onSelect }: { sessions: StoredPracticeSession[]; loading: boolean; onSelect?: (session: StoredPracticeSession) => void }) {
  if (loading) return <div className="empty-state"><strong>Loading sessions…</strong></div>;
  if (!sessions.length) return <div className="empty-state"><strong>No sessions yet</strong><p>Complete Cricket Practice and the first result will appear here.</p></div>;
  return <div className="session-list">{sessions.map((session) => { const isJdc = session.routineId === "jdc-challenge"; return <button key={session.id} onClick={() => onSelect?.(session)} disabled={!onSelect} className="session-card"><span><strong>{isJdc ? "JDC Challenge" : "Cricket MPR"}</strong><small>{formatDate(session.completedAt)}{session.dartSetSnapshot ? ` · ${session.dartSetSnapshot.name}` : ""}</small></span><span><strong>{isJdc ? jdcTotalScore(asJdcDarts(session)) : formatMpr(marksPerRound(asCricketDarts(session)))}</strong><small>{isJdc ? "Score" : "MPR"}</small></span><b aria-hidden="true">{onSelect ? "→" : ""}</b></button>; })}</div>;
}

function HistoryDartSetEditor({ session, dartSets, onSave }: { session: StoredPracticeSession; dartSets: DartSet[]; onSave: (dartSet?: DartSet) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState(session.dartSetId || "");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  async function save() {
    setSaving(true); setEditError("");
    try { await onSave(dartSets.find((dartSet) => dartSet.id === selection)); setEditing(false); }
    catch { setEditError("The dart set could not be updated. Please try again."); }
    finally { setSaving(false); }
  }
  if (!editing) return <div className="history-equipment">{session.dartSetSnapshot ? <DartSetLine dartSet={session.dartSetSnapshot} /> : <p className="dart-set-line unspecified">No dart set recorded</p>}<button className="text-button" onClick={() => { setSelection(session.dartSetId || ""); setEditing(true); }}>Edit darts</button></div>;
  return <div className="history-equipment-editor"><label>Darts used<select value={selection} disabled={saving} onChange={(event) => setSelection(event.target.value)}><option value="">No dart set recorded</option>{dartSets.map((dartSet) => <option key={dartSet.id} value={dartSet.id}>{dartSet.name} · {dartSet.weightGrams}g · {tipTypeLabel(dartSet.tipType)}</option>)}</select></label>{session.dartSetId && !dartSets.some((dartSet) => dartSet.id === session.dartSetId) && <p>The previously recorded set is archived. Choose an active set or clear the selection.</p>}{editError && <p className="notice" role="alert">{editError}</p>}<div><button className="text-button" disabled={saving} onClick={() => setEditing(false)}>Cancel</button><button className="text-button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save darts"}</button></div></div>;
}

function DartSetsPage({ dartSets, onSave, onArchive }: { dartSets: DartSet[]; onSave: (values: DartSetValues, dartSetId?: string) => Promise<void>; onArchive: (dartSet: DartSet) => Promise<void> }) {
  const [editing, setEditing] = useState<DartSet | null | "new">(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: DartSetValues = { name: String(form.get("name") || "").trim(), color: String(form.get("color") || "").trim(), weightGrams: Number(form.get("weight")), tipType: String(form.get("tipType")) as DartSetValues["tipType"] };
    const validation = validateDartSet(values);
    if (validation) { setFormError(validation); return; }
    setBusy(true); setFormError("");
    try { await onSave(values, editing === "new" ? undefined : editing?.id); setEditing(null); }
    catch { setFormError("This dart set could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="darts-page"><header className="page-heading"><div><h1>My darts</h1><p>Keep each set on hand and connect it to practice results.</p></div><button className="button" onClick={() => { setEditing("new"); setFormError(""); }}>Add dart set</button></header>{editing && <form className="dart-set-form" onSubmit={(event) => void submit(event)}><div className="section-heading-row"><div><p className="eyebrow">{editing === "new" ? "New set" : "Edit set"}</p><h2>{editing === "new" ? "Add a dart set" : editing.name}</h2></div><button type="button" className="icon-button" aria-label="Close form" onClick={() => setEditing(null)}>×</button></div><div className="dart-form-grid"><label>Name<input name="name" required defaultValue={editing === "new" ? "" : editing.name} placeholder="Black Widows" /></label><label>Color<input name="color" required defaultValue={editing === "new" ? "" : editing.color} placeholder="Black and silver" /></label><label>Weight <span>grams</span><input name="weight" type="number" required min="1" max="100" step="0.1" defaultValue={editing === "new" ? "" : editing.weightGrams} placeholder="24" /></label><label>Tip compatibility<select name="tipType" defaultValue={editing === "new" ? "steel" : editing.tipType}><option value="steel">Steel-tip</option><option value="soft">Soft-tip</option><option value="both">Both</option></select></label></div>{formError && <p className="notice" role="alert">{formError}</p>}<div className="review-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button><button className="button" disabled={busy}>{busy ? "Saving…" : "Save dart set"}</button></div></form>}{dartSets.length ? <div className="dart-set-grid">{dartSets.map((dartSet) => <article className="dart-set-card" key={dartSet.id}><span className="dart-color" style={{ backgroundColor: dartSet.color }} /><p className="eyebrow">{tipTypeLabel(dartSet.tipType)}</p><h2>{dartSet.name}</h2><p>{dartSet.color}</p><strong>{dartSet.weightGrams}g</strong><div><button className="text-button" onClick={() => { setEditing(dartSet); setFormError(""); }}>Edit</button><button className="text-button danger" onClick={() => { if (window.confirm(`Archive ${dartSet.name}? Existing practice history will be preserved.`)) void onArchive(dartSet); }}>Archive</button></div></article>)}</div> : !editing && <div className="empty-state"><strong>No dart sets yet</strong><p>Add the first set to compare practice performance by equipment.</p><button className="button" onClick={() => setEditing("new")}>Add a dart set</button></div>}</section>;
}

function Stats({ sessions }: { sessions: StoredPracticeSession[] }) {
  const cricketSessions = useMemo(() => sessions.filter((session) => session.routineId === "cricket-mpd"), [sessions]);
  const darts = useMemo(() => cricketSessions.flatMap(asCricketDarts), [cricketSessions]);
  const best = cricketSessions.length ? Math.max(...cricketSessions.map((session) => marksPerRound(asCricketDarts(session)))) : 0;
  const jdcSessions = useMemo(() => sessions.filter((session) => session.routineId === "jdc-challenge"), [sessions]);
  const jdcScores = useMemo(() => jdcSessions.map((session) => jdcTotalScore(asJdcDarts(session))), [jdcSessions]);
  const averageJdcScore = jdcScores.length ? jdcScores.reduce((sum, score) => sum + score, 0) / jdcScores.length : 0;
  const bestJdcScore = jdcScores.length ? Math.max(...jdcScores) : 0;
  const averageJdcSection = (section: "shanghai-low" | "doubles" | "shanghai-high") => jdcSessions.length
    ? jdcSessions.reduce((sum, session) => sum + jdcSectionScore(asJdcDarts(session), section), 0) / jdcSessions.length
    : 0;
  const equipmentStats = useMemo(() => aggregateStatsByDartSet(sessions), [sessions]);
  return <section><header className="page-heading"><div><h1>Stats</h1><p>Lifetime performance derived from saved dart results.</p></div></header><section className="routine-stats"><h2>Cricket MPR</h2><div className="stats-grid"><article><span>Lifetime MPR</span><strong>{formatMpr(marksPerRound(darts))}</strong></article><article><span>Best session</span><strong>{formatMpr(best)}</strong></article><article><span>Sessions</span><strong>{cricketSessions.length}</strong></article></div>{cricketSessions.length > 0 && <section className="target-stats"><h3>Marks by target</h3>{CRICKET_TARGETS.map((target) => { const targetDarts = darts.filter((dart) => dart.target === target); return <div key={target}><strong>{target === "B" ? "Bull" : target}</strong><span><i style={{ width: `${(marksPerRound(targetDarts) / (target === "B" ? 6 : 9)) * 100}%` }} /></span><b>{formatMpr(marksPerRound(targetDarts))}</b></div>; })}</section>}</section><section className="routine-stats"><h2>JDC Challenge</h2><div className="stats-grid"><article><span>Average score</span><strong>{averageJdcScore.toFixed(0)}</strong></article><article><span>Best challenge</span><strong>{bestJdcScore}</strong></article><article><span>Challenges</span><strong>{jdcSessions.length}</strong></article></div>{jdcSessions.length > 0 && <section className="jdc-section-stats"><h3>Average score by section</h3><div><article><span>Shanghai 10–15</span><strong>{averageJdcSection("shanghai-low").toFixed(0)}</strong></article><article><span>Doubles 1–Bull</span><strong>{averageJdcSection("doubles").toFixed(0)}</strong></article><article><span>Shanghai 15–20</span><strong>{averageJdcSection("shanghai-high").toFixed(0)}</strong></article></div></section>}</section>{equipmentStats.length > 0 && <section className="equipment-stats"><div className="section-heading"><h2>Performance by dart set</h2><p>Cricket MPR and JDC score are shown separately.</p></div><div className="equipment-stat-grid">{equipmentStats.map((item) => <article key={item.key}><header>{item.dartSet && <i style={{ backgroundColor: item.dartSet.color }} />}<div><strong>{item.dartSet?.name || "Unspecified darts"}</strong>{item.dartSet && <small>{item.dartSet.weightGrams}g · {tipTypeLabel(item.dartSet.tipType)}</small>}</div></header>{item.cricketSessions > 0 && <section><span>Cricket</span><dl><div><dt>Average MPR</dt><dd>{formatMpr(item.cricketAverageMpr)}</dd></div><div><dt>Best MPR</dt><dd>{formatMpr(item.cricketBestMpr)}</dd></div><div><dt>Sessions</dt><dd>{item.cricketSessions}</dd></div><div><dt>Rounds</dt><dd>{item.cricketRounds}</dd></div></dl></section>}{item.jdcSessions > 0 && <section><span>JDC Challenge</span><dl><div><dt>Average score</dt><dd>{item.jdcAverageScore.toFixed(0)}</dd></div><div><dt>Best score</dt><dd>{item.jdcBestScore}</dd></div><div><dt>Challenges</dt><dd>{item.jdcSessions}</dd></div></dl></section>}</article>)}</div></section>}</section>;
}

function Settings({ theme, setTheme }: { theme: ThemeId; setTheme: (theme: ThemeId) => void }) {
  return <section className="settings-page"><header className="page-heading"><div><p className="eyebrow">Personalize</p><h1>Settings</h1><p>Choose the colorway that feels best at the board. Saved on this device.</p></div></header><fieldset className="theme-picker"><legend>Appearance</legend><p>Select a DartStat theme</p><div className="theme-grid">{THEMES.map((option) => <label className={theme === option.id ? "theme-option selected" : "theme-option"} key={option.id}><input type="radio" name="theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)} /><span className="theme-swatches" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span><span className="theme-copy"><strong>{option.name}</strong><small>{option.description}</small></span><b aria-hidden="true">{theme === option.id ? "✓" : ""}</b></label>)}</div></fieldset><section className="settings-note"><strong>Saved automatically</strong><p>Theme preferences are stored only in this browser and do not change practice data.</p></section></section>;
}

function markLabel(marks: number) { return ["Miss", "Single", "Double", "Treble"][marks]; }
function markShort(marks: number) { return ["M", "S", "D", "T"][marks]; }
function jdcResultShort(dart: JdcDart) { return { miss: "M", single: "S", double: dart.section === "doubles" ? `D${dart.target}` : "D", treble: "T", triple: "T", "double-bull": "DB" }[dart.result]; }
function asCricketDarts(session: StoredPracticeSession) { return (session.darts || []).filter((dart): dart is CricketDart => "marks" in dart); }
function asJdcDarts(session: StoredPracticeSession) { return (session.darts || []).filter((dart): dart is JdcDart => "result" in dart); }
function formatDate(timestamp: StoredPracticeSession["completedAt"]) { return timestamp?.toDate ? timestamp.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Just now"; }
function isNavigationState(value: unknown): value is NavigationState { return Boolean(value && typeof value === "object" && "dartstat" in value && "page" in value && "practiceView" in value); }
