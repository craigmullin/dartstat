import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { finishGoogleRedirect, signInWithGoogle } from "./auth";
import { auth } from "./firebase";

type Page = "practice" | "history" | "stats";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>("practice");
  const [error, setError] = useState("");

  useEffect(() => {
    void finishGoogleRedirect().catch(() => setError("Google sign-in could not be completed. Please try again."));
    return onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setReady(true); });
  }, []);

  if (!ready) return <div className="loading">Opening DartStat…</div>;
  if (!user) return <PublicLanding error={error} setError={setError} />;

  return <div className="app-shell">
    <Header page={page} setPage={setPage} user={user} />
    <main className="content">
      {page === "practice" && <PracticeHome user={user} />}
      {page === "history" && <Placeholder eyebrow="Your sessions" title="History" body="Completed Cricket Practice sessions will appear here, private to this Google account." />}
      {page === "stats" && <Placeholder eyebrow="Your progress" title="Stats" body="Lifetime averages and target-by-target performance will be calculated from your saved dart results." />}
    </main>
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {(["practice", "history", "stats"] as Page[]).map((item) => <button className={page === item ? "active" : ""} key={item} onClick={() => setPage(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
    </nav>
  </div>;
}

function PublicLanding({ error, setError }: { error: string; setError: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true); setError("");
    try { await signInWithGoogle(); }
    catch (cause) {
      const code = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";
      if (code !== "auth/popup-closed-by-user") setError("Google sign-in could not be opened. Please try again.");
      setBusy(false);
    }
  }
  return <main className="auth-shell">
    <section className="auth-card">
      <p className="product-name">DartStat<span>.</span></p>
      <h1>Practice with a purpose.</h1>
      <p className="lead">Fast darts practice entry. Clear statistics. Your progress, throw by throw.</p>
      {error && <p className="notice" role="alert">{error}</p>}
      <button className="button google-button" disabled={busy} onClick={() => void login()}><span aria-hidden="true">G</span>{busy ? "Opening Google…" : "Continue with Google"}</button>
      <p className="auth-note">DartStat uses Google only to identify your account. Your practice sessions stay private and are never visible to other players.</p>
      <div className="auth-links"><a href="#privacy">Privacy</a><a href="https://github.com/craigmullin/dartstat" target="_blank" rel="noreferrer">GitHub</a></div>
      <section className="sr-only" id="privacy"><h2>Privacy</h2><p>DartStat stores your Google account identifier, basic profile information supplied during sign-in, and the practice sessions you choose to save. Practice data is not public, sold, or shared with other DartStat users.</p></section>
    </section>
  </main>;
}

function Header({ page, setPage, user }: { page: Page; setPage: (page: Page) => void; user: User }) {
  return <header className="app-header"><button className="brand brand-button" onClick={() => setPage("practice")}>DartStat<span>.</span></button><nav aria-label="Primary navigation">{(["practice", "history", "stats"] as Page[]).map((item) => <button className={page === item ? "active" : ""} key={item} onClick={() => setPage(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav><div className="account"><span>{user.displayName || user.email}</span><button onClick={() => void signOut(auth)}>Sign out</button></div></header>;
}

function PracticeHome({ user }: { user: User }) {
  const routines = ["Cricket Practice", "Around the Clock", "Doubles", "Checkout Practice", "Scoring Practice"];
  return <><header className="page-heading"><div><p className="eyebrow">Practice</p><h1>What do you want to work on?</h1><p>Welcome back, {user.displayName?.split(" ")[0] || "player"}. Choose a routine to start throwing.</p></div><aside><strong>0</strong><span>Sessions this week</span></aside></header><section className="routine-grid">{routines.map((routine, index) => <button className="routine-card" key={routine} disabled={index !== 0}><span>{index === 0 ? "21 darts · 7 targets" : "Coming later"}</span><strong>{routine}</strong><small>{index === 0 ? "Accuracy across the Cricket board" : "Routine not yet available"}</small><b aria-hidden="true">→</b></button>)}</section><section className="recent"><div className="section-heading"><div><p className="eyebrow">Recent</p><h2>Your latest sessions</h2></div></div><div className="empty-state"><strong>No sessions yet</strong><p>Complete Cricket Practice and your first result will appear here.</p></div></section></>;
}

function Placeholder({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <section className="placeholder"><p className="eyebrow">{eyebrow}</p><h1>{title}<span>.</span></h1><p>{body}</p></section>;
}
