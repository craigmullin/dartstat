import { useEffect, useMemo, useState } from "react";
import { advanceX01, clearX01Game, createX01Game, dartValue, formatX01Dart, readX01Game, recordX01Dart, rematchX01, scoreX01, storeX01Game, undoX01, type X01Game, type X01InRule, type X01Multiplier, type X01OutRule } from "./x01";

export function X01Scorer({ userId, profileName, onExit }: { userId: string; profileName?: string | null; onExit: () => void }) {
  const [game, setGame] = useState<X01Game | null>(() => readX01Game(userId));
  useEffect(() => { if (game) storeX01Game(userId, game); }, [game, userId]);
  if (!game) return <X01Setup profileName={profileName} onCancel={onExit} onStart={setGame} />;
  return <X01Board game={game} setGame={setGame} onExit={onExit} onNewGame={() => { if (!window.confirm("Abandon this game and choose new settings?")) return; clearX01Game(userId); setGame(null); }} />;
}

function X01Setup({ profileName, onCancel, onStart }: { profileName?: string | null; onCancel: () => void; onStart: (game: X01Game) => void }) {
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
    <div className="review-actions"><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button" onClick={() => onStart(createX01Game({ names: names.slice(0, playerCount), startingScore, inRule, outRule, startingPlayerIndex: starter }))}>Start game</button></div>
  </div></section>;
}

function X01Board({ game, setGame, onExit, onNewGame }: { game: X01Game; setGame: (game: X01Game) => void; onExit: () => void; onNewGame: () => void }) {
  const [multiplier, setMultiplier] = useState<X01Multiplier>(1);
  const score = useMemo(() => scoreX01(game), [game]);
  const active = score.players[game.activePlayerIndex];
  const winner = score.players.find((player) => player.id === score.winnerId);
  const locked = Boolean(winner || score.pending.bust || game.pendingDarts.length >= 3);
  const record = (dart: Parameters<typeof recordX01Dart>[1]) => { setGame(recordX01Dart(game, dart)); setMultiplier(1); };
  const undo = () => { setGame(undoX01(game)); setMultiplier(1); };
  return <section className="cricket-match-shell x01-shell">
    <header className="cricket-match-header"><button className="icon-button" onClick={onExit} aria-label="Back to practice">←</button><div><p className="eyebrow">{game.inRule === "open" ? "Open in" : "Double in"} · {game.outRule === "open" ? "Open out" : "Double out"}</p><h1>{game.startingScore}</h1></div><button className="text-button" onClick={onNewGame}>New game</button></header>
    {winner && <section className="cricket-winner" role="status"><p className="eyebrow">Game complete</p><h2>{winner.name} wins!</h2><p>Finished {game.startingScore}</p><div><button className="button button-secondary" onClick={undo}>Undo last dart</button><button className="button" onClick={() => setGame(rematchX01(game))}>Rematch</button></div></section>}
    <div className={`x01-players x01-players-${game.players.length}`}>{score.players.map((player, index) => <article className={index === game.activePlayerIndex ? "active" : ""} key={player.id} aria-label={`${player.name}, ${player.remainder} remaining${index === game.activePlayerIndex ? ", throwing" : ""}`}><span title={player.name}>{player.name}</span><strong>{player.remainder}</strong><small>{index === game.activePlayerIndex && !winner ? "Throwing" : game.inRule === "double" ? (player.opened ? "In" : "Needs double") : ""}</small></article>)}</div>
    <section className="cricket-turn-entry" aria-live="polite"><header><div><strong>{winner ? `${winner.name} won` : `${active.name} is throwing`}</strong><small>{score.pending.bust ? `Bust — back to ${score.pending.startRemainder}` : `Visit started at ${score.pending.startRemainder} · ${score.pending.credited} credited`}</small></div><span>Visit {game.visits.filter((visit) => visit.playerId === active.id).length + 1}</span></header>
      <div className="cricket-dart-slots">{[0, 1, 2].map((index) => { const dart = game.pendingDarts[index]; return <div className={`cricket-dart-slot ${dart ? "filled" : ""}`} key={index}><span>D{index + 1}</span><strong>{dart ? formatX01Dart(dart) : "—"}</strong>{dart && <small>{score.pending.creditedByDart[index] === 0 && dartValue(dart) > 0 ? "Not in · 0" : `${score.pending.creditedByDart[index] ?? 0} pts`}</small>}</div>; })}</div>
      {!winner && <><fieldset className="x01-multipliers"><legend>Multiplier</legend>{([1, 2, 3] as const).map((value) => <button type="button" aria-pressed={multiplier === value} className={multiplier === value ? "selected" : ""} onClick={() => setMultiplier(value)} disabled={locked} key={value}>{value === 1 ? "Single" : value === 2 ? "Double" : "Treble"}</button>)}</fieldset>
      <div className="x01-number-grid">{Array.from({ length: 20 }, (_, index) => 20 - index).map((segment) => <button type="button" disabled={locked} onClick={() => record({ kind: "number", segment, multiplier })} aria-label={`Record ${multiplier === 1 ? "single" : multiplier === 2 ? "double" : "treble"} ${segment}`} key={segment}>{segment}</button>)}</div>
      <div className="x01-specials"><button type="button" disabled={locked || multiplier === 3} title={multiplier === 3 ? "Treble bull is invalid" : undefined} onClick={() => record({ kind: "bull", multiplier: multiplier as 1 | 2 })}>{multiplier === 2 ? "Double bull" : "Bull"}</button><button type="button" disabled={locked} onClick={() => record({ kind: "miss" })}>Miss</button></div>
      <div className="cricket-turn-actions"><button className="button button-secondary" disabled={!game.pendingDarts.length && !game.visits.length} onClick={undo}>{game.pendingDarts.length ? "Undo last dart" : "Edit previous turn"}</button><button className="button" disabled={!score.pending.bust && game.pendingDarts.length !== 3} onClick={() => { setGame(advanceX01(game)); setMultiplier(1); }}>Next player</button></div></>}
      {game.visits.length > 0 && <details className="cricket-history"><summary>Turn history</summary><ol>{game.visits.map((visit, index) => { const before = scoreBeforeVisit(game, index); const result = scoreVisit(game, index); return <li key={index}><strong>{game.players.find((player) => player.id === visit.playerId)?.name}</strong><span>{visit.darts.map(formatX01Dart).join(" · ")} · {before}→{result.remainder} · {result.bust ? "Bust" : `${result.credited} pts`}</span></li>; })}</ol></details>}
    </section>
  </section>;
}

function scoreBeforeVisit(game: X01Game, index: number) {
  const partial = { ...game, visits: game.visits.slice(0, index), pendingDarts: [], activePlayerIndex: game.players.findIndex((player) => player.id === game.visits[index].playerId) };
  return scoreX01(partial).players[partial.activePlayerIndex].remainder;
}
function scoreVisit(game: X01Game, index: number) {
  const visit = game.visits[index];
  const partial = { ...game, visits: game.visits.slice(0, index), pendingDarts: visit.darts, activePlayerIndex: game.players.findIndex((player) => player.id === visit.playerId) };
  return scoreX01(partial).pending;
}
