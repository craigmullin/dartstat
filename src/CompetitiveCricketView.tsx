import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CRICKET_TARGETS, type CricketTarget } from "./cricket";
import {
  advanceCompetitiveCricket,
  clearCompetitiveCricketGame,
  createCompetitiveCricketGame,
  readCompetitiveCricketGame,
  recordMatchDart,
  rematchCompetitiveCricket,
  scoreCompetitiveCricket,
  storeCompetitiveCricketGame,
  undoCompetitiveCricket,
  type CompetitiveCricketGame,
  type MatchDart,
} from "./competitiveCricket";

export function CompetitiveCricket({ userId, profileName, onExit }: { userId: string; profileName?: string | null; onExit: () => void }) {
  const [game, setGame] = useState<CompetitiveCricketGame | null>(() => readCompetitiveCricketGame(userId));
  const [playerCount, setPlayerCount] = useState<2 | 3>(2);
  const [names, setNames] = useState([profileName?.split(" ")[0] || "Player 1", "Player 2", "Player 3"]);
  const [startingPlayerIndex, setStartingPlayerIndex] = useState(0);

  useEffect(() => { if (game) storeCompetitiveCricketGame(userId, game); }, [game, userId]);

  function exit() {
    onExit();
  }

  if (!game) return <CricketMatchSetup playerCount={playerCount} setPlayerCount={setPlayerCount} names={names} setNames={setNames} startingPlayerIndex={startingPlayerIndex} setStartingPlayerIndex={setStartingPlayerIndex} onCancel={onExit} onStart={() => setGame(createCompetitiveCricketGame(names.slice(0, playerCount), startingPlayerIndex))} />;

  return <CricketMatchBoard game={game} setGame={setGame} onExit={exit} onNewGame={() => {
    if (!window.confirm("Abandon this game and choose new players?")) return;
    clearCompetitiveCricketGame(userId); setGame(null);
  }} />;
}

function CricketMatchSetup({ playerCount, setPlayerCount, names, setNames, startingPlayerIndex, setStartingPlayerIndex, onCancel, onStart }: {
  playerCount: 2 | 3; setPlayerCount: (count: 2 | 3) => void; names: string[]; setNames: (names: string[]) => void;
  startingPlayerIndex: number; setStartingPlayerIndex: (index: number) => void; onCancel: () => void; onStart: () => void;
}) {
  function updateName(index: number, name: string) { const next = [...names]; next[index] = name; setNames(next); }
  return <section className="practice-setup cricket-match-setup"><button className="text-button back-button" onClick={onCancel}>← Practice</button><div className="setup-card"><p className="eyebrow">Local game</p><h1>Play Cricket</h1><fieldset className="player-count"><legend>Players</legend><label><input type="radio" checked={playerCount === 2} onChange={() => { setPlayerCount(2); if (startingPlayerIndex > 1) setStartingPlayerIndex(0); }} /> Two</label><label><input type="radio" checked={playerCount === 3} onChange={() => setPlayerCount(3)} /> Three</label></fieldset><div className="player-name-fields">{names.slice(0, playerCount).map((name, index) => <label key={index}>Player {index + 1}<input value={name} maxLength={24} onChange={(event) => updateName(index, event.target.value)} /></label>)}</div><label>Throws first<select value={startingPlayerIndex} onChange={(event) => setStartingPlayerIndex(Number(event.target.value))}>{names.slice(0, playerCount).map((name, index) => <option value={index} key={index}>{name.trim() || `Player ${index + 1}`}</option>)}</select></label><div className="review-actions"><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button" onClick={onStart}>Start game</button></div></div></section>;
}

function CricketMatchBoard({ game, setGame, onExit, onNewGame }: { game: CompetitiveCricketGame; setGame: (game: CompetitiveCricketGame) => void; onExit: () => void; onNewGame: () => void }) {
  const [selectedTarget, setSelectedTarget] = useState<CricketTarget | null>(null);
  const score = useMemo(() => scoreCompetitiveCricket(game), [game]);
  const activePlayer = score.players[game.activePlayerIndex];
  const winner = score.players.find((player) => player.id === score.winnerId);
  const canEnter = game.pendingDarts.length < 3 && !winner;
  const columns = game.players.length + 1;
  const columnOrder: (number | "target")[] = game.players.length === 2 ? [0, "target", 1] : [0, "target", 1, 2];

  function record(target: CricketTarget | null, marks: MatchDart["marks"]) {
    setGame(recordMatchDart(game, { target, marks }));
    setSelectedTarget(null);
  }

  function undo() { setGame(undoCompetitiveCricket(game)); setSelectedTarget(null); }

  return <section className="cricket-match-shell">
    <header className="cricket-match-header"><button className="icon-button" onClick={onExit} aria-label="Back to practice">←</button><div><p className="eyebrow">Points Cricket</p><h1>Cricket</h1></div><button className="text-button" onClick={onNewGame}>New game</button></header>
    {winner && <section className="cricket-winner" role="status"><p className="eyebrow">Game complete</p><h2>{winner.name} wins!</h2><p>{winner.points} points</p><div><button className="button button-secondary" onClick={undo}>Undo last dart</button><button className="button" onClick={() => setGame(rematchCompetitiveCricket(game))}>Rematch</button></div></section>}
    <div className={`cricket-board cricket-board-${game.players.length}`} style={{ "--cricket-columns": columns } as CSSProperties}>
      {columnOrder.map((column) => column === "target"
        ? <div className="cricket-cell cricket-target-head" key="target"><span>Target</span></div>
        : <div className={`cricket-cell cricket-player-head ${column === game.activePlayerIndex ? "active" : ""}`} key={score.players[column].id}><span title={score.players[column].name}>{score.players[column].name}</span><strong>{score.players[column].points}</strong><small>{column === game.activePlayerIndex && !winner ? "Throwing" : ""}</small></div>)}
      {CRICKET_TARGETS.map((target) => {
        const rowClosed = score.players.every((player) => player.marks[target] >= 3);
        return <div className={`cricket-row ${rowClosed ? "closed" : ""}`} style={{ display: "contents" }} key={target}>
          {columnOrder.map((column, gridIndex) => {
            if (column === "target") return <div className="cricket-cell cricket-target-label" key="target"><strong>{target === "B" ? "BULL" : target}</strong>{rowClosed && <small>Closed</small>}</div>;
            const player = score.players[column];
            const isActive = column === game.activePlayerIndex;
            const label = `${player.name}, ${target === "B" ? "Bull" : target}: ${markDescription(player.marks[target])}`;
            return <div className={`cricket-cell cricket-mark-cell ${isActive ? "active" : ""} ${selectedTarget === target && isActive ? "selected" : ""}`} key={player.id}>
              <button type="button" className="cricket-mark-trigger" disabled={!isActive || !canEnter} aria-expanded={selectedTarget === target && isActive} aria-label={isActive && canEnter ? `${label}. Record a dart here.` : label} onClick={() => setSelectedTarget(selectedTarget === target ? null : target)}><CricketMark marks={player.marks[target]} /></button>
              {isActive && selectedTarget === target && canEnter && <div className={`cricket-cell-popover ${gridIndex === 0 ? "align-start" : gridIndex === columnOrder.length - 1 ? "align-end" : "align-center"}`} role="dialog" aria-label={`Record ${target === "B" ? "Bull" : target}`}>
                <button type="button" onClick={() => record(target, 1)} aria-label={`Record single ${target}`}><CricketMark marks={1} /><small>Single</small></button>
                <button type="button" onClick={() => record(target, 2)} aria-label={`Record double ${target}`}><CricketMark marks={2} /><small>Double</small></button>
                {target !== "B" && <button type="button" onClick={() => record(target, 3)} aria-label={`Record treble ${target}`}><CricketMark marks={3} /><small>Treble</small></button>}
              </div>}
            </div>;
          })}
        </div>;
      })}
    </div>
    <section className="cricket-turn-entry" aria-live="polite">
      <header><div><strong>{winner ? `${winner.name} won` : `${activePlayer.name} is throwing`}</strong><small>{winner ? "Undo is available for corrections" : `Dart ${Math.min(game.pendingDarts.length + 1, 3)} of 3`}</small></div>{game.turns.length > 0 && <span>Turn {Math.floor(game.turns.length / game.players.length) + 1}</span>}</header>
      <div className="cricket-dart-slots">{[0, 1, 2].map((index) => { const dart = game.pendingDarts[index]; const current = index === game.pendingDarts.length && !winner; return dart ? <div className="cricket-dart-slot filled" key={index}><span>D{index + 1}</span><strong>{formatMatchDart(dart)}</strong></div> : <button className={`cricket-dart-slot ${current ? "current" : ""}`} type="button" disabled={!current} onClick={() => record(null, 0)} aria-label={current ? `Record dart ${index + 1} as a miss` : `Dart ${index + 1} not entered`} key={index}><span>D{index + 1}</span><strong>—</strong>{current && <small>Miss</small>}</button>; })}</div>
      {!winner && <p className="cricket-entry-hint">{selectedTarget ? `Choose the mark made on ${selectedTarget === "B" ? "Bull" : selectedTarget}.` : `Tap a target in ${activePlayer.name}’s column, or tap the active — for a miss.`}</p>}
      {!winner && <div className="cricket-turn-actions"><button className="button button-secondary" disabled={!game.pendingDarts.length && !game.turns.length} onClick={undo}>{game.pendingDarts.length ? "Undo last dart" : "Edit previous turn"}</button><button className="button" disabled={game.pendingDarts.length !== 3} onClick={() => { setGame(advanceCompetitiveCricket(game)); setSelectedTarget(null); }}>Next player</button></div>}
      {game.turns.length > 0 && <details className="cricket-history"><summary>Turn history</summary><ol>{game.turns.map((turn, index) => <li key={index}><strong>{game.players.find((player) => player.id === turn.playerId)?.name}</strong><span>{turn.darts.map(formatMatchDart).join(" · ")}</span></li>)}</ol></details>}
    </section>
  </section>;
}

function CricketMark({ marks }: { marks: number }) {
  if (marks <= 0) return <span className="cricket-empty-mark" aria-hidden="true" />;
  return <svg className="cricket-mark" viewBox="0 0 40 40" aria-hidden="true">{marks >= 3 && <circle cx="20" cy="20" r="17" />}{marks === 1 ? <line x1="11" y1="30" x2="29" y2="10" /> : <><line x1="11" y1="30" x2="29" y2="10" /><line x1="11" y1="10" x2="29" y2="30" /></>}</svg>;
}

function markDescription(marks: number) { return marks <= 0 ? "no marks" : marks === 1 ? "one mark" : marks === 2 ? "two marks" : "closed"; }
function formatMatchDart(dart: MatchDart) { if (!dart.target || !dart.marks) return "MISS"; const target = dart.target === "B" ? "BULL" : dart.target; return dart.target === "B" ? (dart.marks === 2 ? "DBULL" : "BULL") : `${dart.marks === 1 ? "S" : dart.marks === 2 ? "D" : "T"}${target}`; }
