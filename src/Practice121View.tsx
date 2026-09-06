import { useEffect, useMemo, useState } from "react";
import { clearPractice121, createPractice121, readPractice121, recordPractice121Bust, recordPractice121Checkout, recordPractice121Score, scorePractice121, storePractice121, undoPractice121, type Practice121Game } from "./practice121";
import { saveSession } from "./data";
import { snapshotDartSet, tipTypeLabel, type DartSet } from "./dartSets";

const LIVES_KEY = "dartstat:practice121:startingLives";
const dartSetKey = (userId: string) => `dartstat:practice121:dartSet:${userId}`;
const notesKey = (userId: string) => `dartstat:practice121:notes:${userId}`;
function readLocal(key: string) { try { return localStorage.getItem(key) || ""; } catch { return ""; } }
function storeLocal(key: string, value: string) { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* Optional local metadata. */ } }

export function Practice121({ userId, dartSets, onExit, onSaved }: { userId: string; dartSets: DartSet[]; onExit: () => void; onSaved: () => Promise<void> }) {
  const [game, setGame] = useState<Practice121Game | null>(() => readPractice121(userId));
  const [dartSetId, setDartSetId] = useState(() => readLocal(dartSetKey(userId)));
  const [notes, setNotes] = useState(() => readLocal(notesKey(userId)));
  useEffect(() => { if (game) storePractice121(userId, game); }, [game, userId]);
  useEffect(() => storeLocal(dartSetKey(userId), dartSetId), [dartSetId, userId]);
  useEffect(() => storeLocal(notesKey(userId), notes), [notes, userId]);
  if (!game) return <Practice121Setup dartSets={dartSets} dartSetId={dartSetId} setDartSetId={setDartSetId} onCancel={onExit} onStart={setGame} />;
  return <Practice121Board game={game} setGame={setGame} userId={userId} dartSet={dartSets.find((item) => item.id === dartSetId)} notes={notes} setNotes={setNotes} onExit={onExit} onSaved={onSaved} />;
}

function Practice121Setup({ dartSets, dartSetId, setDartSetId, onCancel, onStart }: { dartSets: DartSet[]; dartSetId: string; setDartSetId: (id: string) => void; onCancel: () => void; onStart: (game: Practice121Game) => void }) {
  const [lives, setLives] = useState(() => { try { return localStorage.getItem(LIVES_KEY) || "3"; } catch { return "3"; } });
  const parsed = Number(lives);
  const valid = Number.isInteger(parsed) && parsed > 0 && parsed <= 99;
  function start() {
    if (!valid) return;
    try { localStorage.setItem(LIVES_KEY, String(parsed)); } catch { /* Preference is optional. */ }
    onStart(createPractice121(parsed));
  }
  return <section className="practice-setup practice121-setup"><button className="text-button back-button" onClick={onCancel}>← Practice</button><div className="setup-card"><p className="eyebrow">Checkout practice</p><h1>121</h1><p>Check out each target in nine darts. Fast finishes earn a life; failed attempts cost one.</p><fieldset className="x01-choice"><legend>Starting lives</legend>{[1, 3, 5].map((value) => <label className={parsed === value ? "selected" : ""} key={value}><input type="radio" checked={parsed === value} onChange={() => setLives(String(value))} />{value}</label>)}</fieldset><label>Custom lives <small>1–99</small><input type="number" inputMode="numeric" min="1" max="99" step="1" value={lives} onChange={(event) => setLives(event.target.value)} /></label><label>Darts used <small>Optional</small><select value={dartSetId} onChange={(event) => setDartSetId(event.target.value)}><option value="">No dart set selected</option>{dartSets.map((dartSet) => <option key={dartSet.id} value={dartSet.id}>{dartSet.name} · {dartSet.weightGrams}g · {tipTypeLabel(dartSet.tipType)}</option>)}</select></label>{!valid && <p className="notice" role="alert">Choose a whole number from 1 to 99.</p>}<div className="review-actions"><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button" disabled={!valid} onClick={start}>Start game</button></div></div></section>;
}

function Practice121Board({ game, setGame, userId, dartSet, notes, setNotes, onExit, onSaved }: { game: Practice121Game; setGame: (game: Practice121Game) => void; userId: string; dartSet?: DartSet; notes: string; setNotes: (notes: string) => void; onExit: () => void; onSaved: () => Promise<void> }) {
  const state = useMemo(() => scorePractice121(game), [game]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const last = game.visits[game.visits.length - 1];
  const result = last?.outcome === "checkout" ? `Checked out in ${(last.visit - 1) * 3 + last.dartsUsed}${last.visit === 1 ? " — +1 life" : ""} — Next: ${last.target + 1}` : last && last.visit === 3 ? `Not out — 1 life lost${state.status === "active" ? ` — Retry ${last.target}` : ""}` : "";
  const submitted = Number(draft || "0");

  function update(action: () => Practice121Game) {
    try { setGame(action()); setDraft(""); setError(""); setCheckoutOpen(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "That score could not be recorded."); }
  }
  function appendDigit(digit: number) { setDraft((value) => `${value}${digit}`.replace(/^0+(?=\d)/, "").slice(0, 3)); setError(""); }
  async function save() {
    setSaving(true); setError("");
    try {
      await saveSession(userId, { routineId: "practice-121", status: "completed", startedAt: new Date(game.startedAt), darts: [], visits: game.visits, startingLives: game.startingLives, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(dartSet ? { dartSetId: dartSet.id, dartSetSnapshot: snapshotDartSet(dartSet) } : {}) });
      clearPractice121(userId); storeLocal(dartSetKey(userId), ""); storeLocal(notesKey(userId), "");
      await onSaved();
    } catch { setError("This session could not be saved. The result is still available—please try again."); setSaving(false); }
  }

  if (state.status === "completed") return <section className="cricket-match-shell practice121-shell"><header className="cricket-match-header"><button className="icon-button" onClick={onExit} aria-label="Back to practice">←</button><div><p className="eyebrow">121 complete</p><h1>Session summary</h1></div><span /></header><section className="practice121-summary"><p className="eyebrow">Highest checkout completed</p><strong>{state.highestCheckoutCompleted ?? "—"}</strong><div><span>Starting lives <b>{game.startingLives}</b></span><span>Lives earned <b>{state.livesEarned}</b></span><span>Targets completed <b>{state.targetsCompleted}</b></span><span>Total darts <b>{state.totalDartsThrown}</b></span><span>Three-dart checkouts <b>{state.threeDartCheckouts}</b></span></div></section><SessionNotes notes={notes} setNotes={setNotes} />{error && <p className="notice" role="alert">{error}</p>}<div className="review-actions"><button className="button button-secondary" disabled={saving || !game.visits.length} onClick={() => setGame(undoPractice121(game))}>Undo last visit</button><button className="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save session"}</button></div></section>;

  return <section className="cricket-match-shell practice121-shell"><header className="cricket-match-header"><button className="icon-button" onClick={onExit} aria-label="Back to practice">←</button><div><p className="eyebrow">121 · Visit {state.visitNumber} of 3</p><h1>Checkout practice</h1></div><button className="text-button" onClick={() => { if (window.confirm("Abandon this 121 session?")) { clearPractice121(userId); setGame(createPractice121(game.startingLives)); } }}>Restart</button></header>{result && <p className="practice121-result" role="status">{result}</p>}<section className="practice121-scoreboard"><article><span>Target</span><strong>{state.currentTarget}</strong></article><article><span>Remaining</span><strong>{state.remainingScore}</strong></article><article><span>Lives</span><strong>{state.livesRemaining}</strong><small aria-label={`${state.livesRemaining} lives remaining`}>{"♥".repeat(Math.min(state.livesRemaining, 8))}{state.livesRemaining > 8 ? ` +${state.livesRemaining - 8}` : ""}</small></article></section><div className="practice121-meta"><span>Visit <strong>{state.visitNumber} of 3</strong></span><span>Darts used <strong>{(state.visitNumber - 1) * 3} of 9</strong></span><span>Highest <strong>{state.highestCheckoutCompleted ?? "—"}</strong></span></div><section className="x01-calculator"><header><div><strong>Enter visit score</strong><small>Use Checkout when the target is finished.</small></div></header><label className={`x01-total-display ${error ? "invalid" : ""}`}><span>Visit score</span><input value={draft} readOnly inputMode="numeric" placeholder="—" aria-invalid={Boolean(error)} /><small>{error || `${state.remainingScore} remaining`}</small></label><div className="x01-keypad">{[1,2,3,4,5,6,7,8,9].map((digit) => <button onClick={() => appendDigit(digit)} key={digit}>{digit}</button>)}<button className="key-function" onClick={() => { setDraft(""); setError(""); }}>Clear</button><button onClick={() => appendDigit(0)}>0</button><button className="key-function" aria-label="Backspace" onClick={() => setDraft((value) => value.slice(0, -1))}>⌫</button></div><div className="practice121-actions"><button className="button button-secondary x01-bust-button" onClick={() => update(() => recordPractice121Bust(game, submitted))}>Bust / No Score</button><button className="button button-secondary" onClick={() => setCheckoutOpen(true)}>Checkout</button><button className="button" onClick={() => update(() => recordPractice121Score(game, submitted))}>Record Score</button></div><button className="text-button x01-undo-turn" disabled={!game.visits.length} onClick={() => { setGame(undoPractice121(game)); setError(""); }}>Undo last visit</button></section>{checkoutOpen && <div className="practice121-dialog-backdrop" role="presentation"><section className="practice121-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-darts"><p className="eyebrow">Confirm checkout</p><h2 id="checkout-darts">How many darts in this visit?</h2><p>The entered score must equal {state.remainingScore}.</p><div>{([1,2,3] as const).map((darts) => <button className="button" key={darts} onClick={() => update(() => recordPractice121Checkout(game, submitted, darts))}>{darts} dart{darts > 1 ? "s" : ""}</button>)}</div><button className="text-button" onClick={() => setCheckoutOpen(false)}>Cancel</button></section></div>}</section>;
}

function SessionNotes({ notes, setNotes }: { notes: string; setNotes: (notes: string) => void }) {
  return <label className="session-notes"><span>Practice notes <small>Optional</small></span><textarea rows={3} value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="Grip, stance, release, adjustments, or anything worth remembering…" /><small>{notes.length} / 2000</small></label>;
}
