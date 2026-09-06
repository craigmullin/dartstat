import { useEffect, useMemo, useState } from "react";
import { abandonBobs27, bobs27TargetLabel, bobs27TargetValue, clearBobs27, createBobs27, readBobs27, recordBobs27Round, scoreBobs27, storeBobs27, undoBobs27, type Bobs27Game, type Bobs27Mode } from "./bobs27";
import { saveSession } from "./data";
import { snapshotDartSet, tipTypeLabel, type DartSet } from "./dartSets";

const MODE_KEY = "dartstat:bobs27:mode";
const dartSetKey = (userId: string) => `dartstat:bobs27:dartSet:${userId}`;
const notesKey = (userId: string) => `dartstat:bobs27:notes:${userId}`;
function readLocal(key: string) { try { return localStorage.getItem(key) || ""; } catch { return ""; } }
function storeLocal(key: string, value: string) { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* Optional local metadata. */ } }

export function Bobs27({ userId, dartSets, onExit, onSaved }: { userId: string; dartSets: DartSet[]; onExit: () => void; onSaved: () => Promise<void> }) {
  const [game, setGame] = useState<Bobs27Game | null>(() => readBobs27(userId));
  const [dartSetId, setDartSetId] = useState(() => readLocal(dartSetKey(userId)));
  const [notes, setNotes] = useState(() => readLocal(notesKey(userId)));
  useEffect(() => { if (game) storeBobs27(userId, game); }, [game, userId]);
  useEffect(() => storeLocal(dartSetKey(userId), dartSetId), [dartSetId, userId]);
  useEffect(() => storeLocal(notesKey(userId), notes), [notes, userId]);
  if (!game) return <Bobs27Setup dartSets={dartSets} dartSetId={dartSetId} setDartSetId={setDartSetId} onCancel={onExit} onStart={setGame} />;
  return <Bobs27Board game={game} setGame={setGame} userId={userId} dartSet={dartSets.find((item) => item.id === dartSetId)} notes={notes} setNotes={setNotes} onExit={onExit} onSaved={onSaved} />;
}

function Bobs27Setup({ dartSets, dartSetId, setDartSetId, onCancel, onStart }: { dartSets: DartSet[]; dartSetId: string; setDartSetId: (id: string) => void; onCancel: () => void; onStart: (game: Bobs27Game) => void }) {
  const [mode, setMode] = useState<Bobs27Mode>(() => { try { return localStorage.getItem(MODE_KEY) === "complete" ? "complete" : "classic"; } catch { return "classic"; } });
  function start() { try { localStorage.setItem(MODE_KEY, mode); } catch { /* Preference is optional. */ } onStart(createBobs27(mode)); }
  return <section className="practice-setup bobs27-setup"><button className="text-button back-button" onClick={onCancel}>← Practice</button><div className="setup-card"><p className="eyebrow">Doubles practice</p><h1>Bob’s 27</h1><p>Start at 27 and throw three darts at every double from D1 through Double Bull.</p><fieldset className="bobs27-mode"><legend>Mode</legend><label className={mode === "classic" ? "selected" : ""}><input type="radio" checked={mode === "classic"} onChange={() => setMode("classic")} /><span><strong>Classic</strong><small>Game ends if your score falls below zero.</small></span></label><label className={mode === "complete" ? "selected" : ""}><input type="radio" checked={mode === "complete"} onChange={() => setMode("complete")} /><span><strong>Complete Practice</strong><small>Finish every double even if your score is negative.</small></span></label></fieldset><label>Darts used <small>Optional</small><select value={dartSetId} onChange={(event) => setDartSetId(event.target.value)}><option value="">No dart set selected</option>{dartSets.map((dartSet) => <option key={dartSet.id} value={dartSet.id}>{dartSet.name} · {dartSet.weightGrams}g · {tipTypeLabel(dartSet.tipType)}</option>)}</select></label><div className="review-actions"><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button" onClick={start}>Start game</button></div></div></section>;
}

function Bobs27Board({ game, setGame, userId, dartSet, notes, setNotes, onExit, onSaved }: { game: Bobs27Game; setGame: (game: Bobs27Game) => void; userId: string; dartSet?: DartSet; notes: string; setNotes: (notes: string) => void; onExit: () => void; onSaved: () => Promise<void> }) {
  const score = useMemo(() => scoreBobs27(game), [game]);
  const [selectedHits, setSelectedHits] = useState<0 | 1 | 2 | 3 | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const targetValue = bobs27TargetValue(score.currentTarget);
  const change = selectedHits === null ? null : selectedHits === 0 ? -targetValue : selectedHits * targetValue;

  function confirmRound() {
    if (selectedHits === null) return;
    setGame(recordBobs27Round(game, selectedHits));
    setSelectedHits(null);
  }
  async function save(savedGame = game) {
    setSaving(true); setError("");
    try {
      await saveSession(userId, { routineId: "bobs-27", status: savedGame.status === "active" ? "abandoned" : savedGame.status, startedAt: new Date(savedGame.startedAt), darts: [], mode: savedGame.mode, rounds: savedGame.rounds, ...(notes.trim() ? { notes: notes.trim() } : {}), ...(dartSet ? { dartSetId: dartSet.id, dartSetSnapshot: snapshotDartSet(dartSet) } : {}) });
      clearBobs27(userId); storeLocal(dartSetKey(userId), ""); storeLocal(notesKey(userId), "");
      await onSaved();
    } catch { setError("This session could not be saved. The result is still available—please try again."); setSaving(false); }
  }
  function discard() { clearBobs27(userId); storeLocal(dartSetKey(userId), ""); storeLocal(notesKey(userId), ""); onExit(); }

  if (game.status !== "active") return <section className="cricket-match-shell bobs27-shell"><header className="cricket-match-header"><button className="icon-button" onClick={onExit} aria-label="Back to practice">←</button><div><p className="eyebrow">Bob’s 27 · {game.mode === "classic" ? "Classic" : "Complete Practice"}</p><h1>{game.status === "eliminated" ? "Eliminated" : "Session complete"}</h1></div><span /></header><Bobs27Summary game={game} /><SessionNotes notes={notes} setNotes={setNotes} />{error && <p className="notice" role="alert">{error}</p>}<div className="review-actions"><button className="button button-secondary" disabled={saving} onClick={() => setGame(undoBobs27(game))}>Undo last visit</button><button className="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save session"}</button></div></section>;

  return <section className="cricket-match-shell bobs27-shell"><header className="cricket-match-header"><button className="icon-button" onClick={() => setEndOpen(true)} aria-label="End practice">×</button><div><p className="eyebrow">Bob’s 27 · {game.mode === "classic" ? "Classic" : "Complete Practice"}</p><h1>{game.rounds.length + 1} of 21</h1></div><button className="text-button" onClick={() => setEndOpen(true)}>End practice</button></header><div className="progress-track" aria-label={`${game.rounds.length} of 21 doubles recorded`}><span style={{ width: `${(game.rounds.length / 21) * 100}%` }} /></div><section className="bobs27-scoreboard"><article><span>Throw at</span><strong>{score.currentTarget === 25 ? "BULL" : `D${score.currentTarget}`}</strong><small>{score.currentTarget === 25 ? "Inner bull only" : `Double ${score.currentTarget}`}</small></article><article><span>Running score</span><strong>{score.finalScore}</strong><small>{game.mode === "classic" ? "Below zero ends the game" : "Complete all 21 targets"}</small></article></section><section className="bobs27-entry"><p>How many darts hit {bobs27TargetLabel(score.currentTarget)}?</p><div className="bobs27-hit-buttons">{([0, 1, 2, 3] as const).map((hits) => <button className={selectedHits === hits ? "selected" : ""} aria-pressed={selectedHits === hits} onClick={() => setSelectedHits(hits)} key={hits}><strong>{hits}</strong><small>{hits === 1 ? "hit" : "hits"}</small></button>)}</div><p className="bobs27-preview" aria-live="polite">{selectedHits === null ? "Select the number of hits" : selectedHits === 0 ? `No hits = −${targetValue}` : `${selectedHits} hit${selectedHits > 1 ? "s" : ""} × ${targetValue} = +${change}`}</p><button className="button bobs27-confirm" disabled={selectedHits === null} onClick={confirmRound}>Confirm / Next Double</button><button className="text-button x01-undo-turn" disabled={!game.rounds.length || selectedHits !== null} onClick={() => setGame(undoBobs27(game))}>Undo last visit</button></section><details className="bobs27-notes"><summary>Practice notes</summary><SessionNotes notes={notes} setNotes={setNotes} /></details>{endOpen && <div className="practice121-dialog-backdrop"><section className="practice121-dialog" role="dialog" aria-modal="true" aria-labelledby="end-bobs27"><p className="eyebrow">End practice</p><h2 id="end-bobs27">Save this abandoned session?</h2><p>Confirmed visits can be kept in History, or discarded.</p><div className="bobs27-end-actions"><button className="button button-secondary" onClick={() => setEndOpen(false)}>Keep playing</button><button className="button button-secondary" onClick={discard}>Discard</button><button className="button" disabled={saving} onClick={() => void save(abandonBobs27(game))}>{saving ? "Saving…" : "Save"}</button></div>{error && <p className="notice" role="alert">{error}</p>}</section></div>}</section>;
}

function Bobs27Summary({ game }: { game: Bobs27Game }) {
  const score = scoreBobs27(game);
  return <section className="practice121-summary bobs27-summary"><p className="eyebrow">Final score</p><strong>{score.finalScore}</strong><p>{game.status === "eliminated" ? `Eliminated at ${score.highestTargetReached}` : game.status === "abandoned" ? "Abandoned" : "Completed"}</p><div><span>Mode <b>{game.mode === "classic" ? "Classic" : "Complete"}</b></span><span>Double accuracy <b>{(score.accuracy * 100).toFixed(1)}%</b></span><span>Doubles hit <b>{score.totalHits} / {score.dartsThrown}</b></span><span>Targets hit <b>{score.targetsHit}</b></span><span>Three-dart misses <b>{score.targetsMissed}</b></span><span>Highest reached <b>{score.highestTargetReached}</b></span></div></section>;
}

function SessionNotes({ notes, setNotes }: { notes: string; setNotes: (notes: string) => void }) {
  return <label className="session-notes"><span>Practice notes <small>Optional</small></span><textarea rows={3} value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="Grip, stance, release, adjustments, or anything worth remembering…" /><small>{notes.length} / 2000</small></label>;
}
