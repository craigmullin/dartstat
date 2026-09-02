import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { advanceX01, clearX01Game, createX01Game, dartValue, formatX01Dart, readX01Game, recordX01Dart, rematchX01, scoreX01, storeX01Game, undoX01, type X01Game, type X01InRule, type X01Multiplier, type X01OutRule } from "./x01";
import { appendX01Digit, commitX01Total, createX01TotalGame, parseTurnTotal, rematchX01Total, scoreX01Totals, setX01Draft, undoX01Total, type X01TotalGame } from "./x01Totals";

type StoredX01Game = X01Game | X01TotalGame;

export function X01Scorer({ userId, profileName, onExit }: { userId: string; profileName?: string | null; onExit: () => void }) {
  const [game, setGame] = useState<StoredX01Game | null>(() => readX01Game(userId));
  useEffect(() => { if (game) storeX01Game(userId, game); }, [game, userId]);
  if (!game) return <X01Setup profileName={profileName} onCancel={onExit} onStart={setGame} />;
  const common = { onExit, onNewGame: () => { if (!window.confirm("Abandon this game and choose new settings?")) return; clearX01Game(userId); setGame(null); } };
  if (game.version === 1) return <LegacyX01Board game={game} setGame={setGame} {...common} />;
  return <X01CalculatorBoard game={game} setGame={setGame} {...common} />;
}

function X01Setup({ profileName, onCancel, onStart }: { profileName?: string | null; onCancel: () => void; onStart: (game: X01TotalGame) => void }) {
  const [playerCount, setPlayerCount] = useState<2 | 3>(2);
  const [names, setNames] = useState([profileName?.split(" ")[0] || "Player 1", "Player 2", "Player 3"]);
  const [startingScore, setStartingScore] = useState<301 | 501 | 701>(501);
  const [inRule, setInRule] = useState<X01InRule>("open");
  const [outRule, setOutRule] = useState<X01OutRule>("double");
  const [starter, setStarter] = useState(0);
  const updateName = (index: number, name: string) => { const next = [...names]; next[index] = name; setNames(next); };
  return <section className="practice-setup cricket-match-setup"><button className="text-button back-button" onClick={onCancel}>← Practice</button><div className="setup-card"><p className="eyebrow">Local game</p><h1>Play ’01</h1>
    <fieldset className="x01-choice"><legend>Starting score</legend>{([301, 501, 701] as const).map((score) => <label key={score}><input type="radio" checked={startingScore === score} onChange={() => setStartingScore(score)} />{score}</label>)}</fieldset>
    <fieldset className="x01-choice"><legend>Starting rule</legend><label><input type="radio" checked={inRule === "open"} onChange={() => setInRule("open")} />Open in</label><label><input type="radio" checked={inRule === "double"} onChange={() => setInRule("double")} />Double in</label></fieldset>
    <fieldset className="x01-choice"><legend>Finishing rule</legend><label><input type="radio" checked={outRule === "open"} onChange={() => setOutRule("open")} />Open out</label><label><input type="radio" checked={outRule === "double"} onChange={() => setOutRule("double")} />Double out</label></fieldset>
    <fieldset className="player-count"><legend>Players</legend><label><input type="radio" checked={playerCount === 2} onChange={() => { setPlayerCount(2); if (starter > 1) setStarter(0); }} />Two</label><label><input type="radio" checked={playerCount === 3} onChange={() => setPlayerCount(3)} />Three</label></fieldset>
    <div className="player-name-fields">{names.slice(0, playerCount).map((name, index) => <label key={index}>Player {index + 1}<input value={name} maxLength={24} onChange={(event) => updateName(index, event.target.value)} /></label>)}</div>
    <label>Throws first<select value={starter} onChange={(event) => setStarter(Number(event.target.value))}>{names.slice(0, playerCount).map((name, index) => <option key={index} value={index}>{name.trim() || `Player ${index + 1}`}</option>)}</select></label>
    <div className="review-actions"><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button" onClick={() => onStart(createX01TotalGame({ names: names.slice(0, playerCount), startingScore, inRule, outRule, startingPlayerIndex: starter }))}>Start game</button></div>
  </div></section>;
}

export function X01CalculatorBoard({ game, setGame, onExit, onNewGame }: { game: X01TotalGame; setGame: (game: StoredX01Game) => void; onExit: () => void; onNewGame: () => void }) {
  const score = useMemo(() => scoreX01Totals(game), [game]);
  const active = score.players[game.activePlayerIndex];
  const winner = score.players.find((player) => player.id === score.winnerId);
  const parsed = parseTurnTotal(game.draft);
  const error = game.draft !== "" && parsed === null ? "Enter a whole score from 0 to 180." : "";
  const submitLock = useRef(false);
  const [announcement, setAnnouncement] = useState("");

  function guardedCommit(explicitBust: boolean) {
    if (submitLock.current || winner || (!explicitBust && parsed === null)) return;
    submitLock.current = true;
    const before = active.remainder;
    const next = commitX01Total(game, explicitBust);
    const last = scoreX01Totals(next).turns.at(-1)!;
    setAnnouncement(last.outcome === "bust" ? `${active.name} busted — stays on ${before}` : last.outcome === "finish" ? `${active.name} wins` : `${active.name} scored ${last.credited}`);
    setGame(next);
    requestAnimationFrame(() => { submitLock.current = false; });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (winner) return;
    if (/^\d$/.test(event.key)) { event.preventDefault(); setGame(appendX01Digit(game, Number(event.key))); }
    else if (event.key === "Backspace") { event.preventDefault(); setGame(setX01Draft(game, game.draft.slice(0, -1))); }
    else if (event.key === "Enter" && !event.repeat) { event.preventDefault(); guardedCommit(false); }
  }

  const preview = parsed !== null ? Math.max(0, active.remainder - parsed) : null;
  return <section className="cricket-match-shell x01-shell">
    <header className="cricket-match-header"><button className="icon-button" onClick={onExit} aria-label="Back to practice">←</button><div><p className="eyebrow">{game.inRule === "open" ? "Open in" : "Double in"} · {game.outRule === "open" ? "Open out" : "Double out"}</p><h1>{game.startingScore}</h1></div><button className="text-button" onClick={onNewGame}>New game</button></header>
    {winner && <section className="cricket-winner" role="status"><p className="eyebrow">Game complete</p><h2>{winner.name} wins!</h2><p>Finished {game.startingScore}</p><div><button className="button button-secondary" onClick={() => setGame(undoX01Total(game))}>Undo last turn</button><button className="button" onClick={() => setGame(rematchX01Total(game))}>Rematch</button></div></section>}
    <PlayerPanels game={game} remainders={score.players.map((player) => player.remainder)} winner={Boolean(winner)} />
    {!winner && <section className="x01-calculator" aria-label="Turn score calculator" onKeyDown={handleKeyDown} tabIndex={0}>
      <header><div><strong>{active.name} is throwing</strong><small>Enter the points that count. Leave blank for zero.</small></div><span>Turn {score.turns.filter((turn) => turn.playerId === active.id).length + 1}</span></header>
      <div className={`x01-total-display ${error ? "invalid" : ""}`}><span>Turn score</span><strong>{game.draft || "—"}</strong><small>{error || (game.draft !== "" && preview !== null ? `${active.remainder} → ${preview}` : "Score changes after Next player")}</small></div>
      <div className="x01-keypad">{[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => <button type="button" onClick={() => setGame(appendX01Digit(game, digit))} key={digit}>{digit}</button>)}<button type="button" className="key-function" onClick={() => setGame(setX01Draft(game, ""))}>Clear</button><button type="button" onClick={() => setGame(appendX01Digit(game, 0))}>0</button><button type="button" className="key-function" aria-label="Backspace" onClick={() => setGame(setX01Draft(game, game.draft.slice(0, -1)))}>⌫</button></div>
      <div className="x01-calculator-actions"><button className="button button-secondary x01-bust-button" onClick={() => guardedCommit(true)}>Bust</button><button className="button" disabled={Boolean(error)} onClick={() => guardedCommit(false)}>Next player</button></div>
      <button className="text-button x01-undo-turn" disabled={!game.turns.length || Boolean(game.draft)} title={game.draft ? "Clear the turn score before undoing." : undefined} onClick={() => setGame(undoX01Total(game))}>Undo last turn</button>
      {game.draft && <small className="x01-undo-help">Clear the score field to undo a committed turn.</small>}
    </section>}
    <span className="sr-only" aria-live="polite">{announcement}</span>
    {score.turns.length > 0 && <TurnHistory game={game} />}
  </section>;
}

function PlayerPanels({ game, remainders, winner }: { game: StoredX01Game; remainders: number[]; winner: boolean }) {
  return <div className={`x01-players x01-players-${game.players.length}`}>{game.players.map((player, index) => <article className={index === game.activePlayerIndex ? "active" : ""} key={player.id} aria-label={`${player.name}, ${remainders[index]} remaining${index === game.activePlayerIndex ? ", throwing" : ""}`}><span title={player.name}>{player.name}</span><strong>{remainders[index]}</strong><small>{index === game.activePlayerIndex && !winner ? "Throwing" : ""}</small></article>)}</div>;
}

function TurnHistory({ game }: { game: X01TotalGame }) {
  const turns = scoreX01Totals(game).turns;
  return <details className="cricket-history x01-history"><summary>Turn history</summary><ol>{turns.map((turn, index) => <li key={index}><strong>{game.players.find((player) => player.id === turn.playerId)?.name}</strong><span>{turn.startRemainder}→{turn.endRemainder} · {turn.outcome === "bust" ? `Bust${turn.submittedTotal !== undefined ? ` (${turn.submittedTotal} attempted)` : ""}` : turn.outcome === "finish" ? `${turn.credited} · Finish` : `${turn.credited} pts`}</span></li>)}</ol></details>;
}

function LegacyX01Board({ game, setGame, onExit, onNewGame }: { game: X01Game; setGame: (game: StoredX01Game) => void; onExit: () => void; onNewGame: () => void }) {
  const [multiplier, setMultiplier] = useState<X01Multiplier>(1);
  const score = useMemo(() => scoreX01(game), [game]);
  const active = score.players[game.activePlayerIndex];
  const winner = score.players.find((player) => player.id === score.winnerId);
  const locked = Boolean(winner || score.pending.bust || game.pendingDarts.length >= 3);
  const record = (dart: Parameters<typeof recordX01Dart>[1]) => { setGame(recordX01Dart(game, dart)); setMultiplier(1); };
  return <section className="cricket-match-shell x01-shell"><header className="cricket-match-header"><button className="icon-button" onClick={onExit} aria-label="Back to practice">←</button><div><p className="eyebrow">Legacy game · {game.inRule === "open" ? "Open in" : "Double in"} · {game.outRule === "open" ? "Open out" : "Double out"}</p><h1>{game.startingScore}</h1></div><button className="text-button" onClick={onNewGame}>New game</button></header>
    {winner && <section className="cricket-winner"><h2>{winner.name} wins!</h2><div><button className="button button-secondary" onClick={() => setGame(undoX01(game))}>Undo last dart</button><button className="button" onClick={() => setGame(rematchX01(game))}>Rematch with calculator</button></div></section>}
    <PlayerPanels game={game} remainders={score.players.map((player) => player.remainder)} winner={Boolean(winner)} />
    <section className="cricket-turn-entry"><header><div><strong>{active.name} is throwing</strong><small>{score.pending.bust ? `Bust — back to ${score.pending.startRemainder}` : `Legacy dart entry · ${score.pending.credited} credited`}</small></div></header>
      <div className="cricket-dart-slots">{[0, 1, 2].map((index) => { const dart = game.pendingDarts[index]; return <div className="cricket-dart-slot" key={index}><span>D{index + 1}</span><strong>{dart ? formatX01Dart(dart) : "—"}</strong>{dart && <small>{score.pending.creditedByDart[index] === 0 && dartValue(dart) > 0 ? "Not in · 0" : `${score.pending.creditedByDart[index] ?? 0} pts`}</small>}</div>; })}</div>
      {!winner && <><fieldset className="x01-multipliers"><legend>Multiplier</legend>{([1, 2, 3] as const).map((value) => <button type="button" aria-pressed={multiplier === value} className={multiplier === value ? "selected" : ""} onClick={() => setMultiplier(value)} disabled={locked} key={value}>{value === 1 ? "Single" : value === 2 ? "Double" : "Treble"}</button>)}</fieldset><div className="x01-number-grid">{Array.from({ length: 20 }, (_, index) => 20 - index).map((segment) => <button disabled={locked} onClick={() => record({ kind: "number", segment, multiplier })} key={segment}>{segment}</button>)}</div><div className="x01-specials"><button disabled={locked || multiplier === 3} onClick={() => record({ kind: "bull", multiplier: multiplier as 1 | 2 })}>Bull</button><button disabled={locked} onClick={() => record({ kind: "miss" })}>Miss</button></div><div className="cricket-turn-actions"><button className="button button-secondary" disabled={!game.pendingDarts.length && !game.visits.length} onClick={() => setGame(undoX01(game))}>{game.pendingDarts.length ? "Undo last dart" : "Edit previous turn"}</button><button className="button" disabled={!score.pending.bust && game.pendingDarts.length !== 3} onClick={() => setGame(advanceX01(game))}>Next player</button></div></>}
    </section>
  </section>;
}

// Kept exported through the legacy engine for compatibility tests and saved version-1 games.
export { createX01Game };
