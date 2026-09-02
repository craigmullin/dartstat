# DartStat: Two- or three-player ’01 scorer

Implementation handoff for Roger · September 2, 2026

## Why this change

Extend DartStat from practice tracking and Cricket scoring to casual countdown games with friends, using a familiar interface for two or three players and configurable entry/finish rules.

## Goal and feasibility

Add an ’01 scorer for two or three real people sharing a phone or tablet, with the same visual language and interaction patterns as the Cricket scorer. Each player counts down independently; the first valid finish wins.

This is a manageable feature, with moderate implementation effort concentrated in scoring correctness, undo, and recovery. The two rule selectors and third player are small additions when the scorer uses an ordered player array and a deterministic rules engine. No AI, external scoring service, or new account system is required.

This is a proposed specification, not a review of the repository. Inspect the current DartStat code first. Use the September 1 `DartStat-Cricket-Handoff.md` as the companion specification; reuse suitable existing components and conventions. If Cricket is still being built, coordinate shared controls without delaying either scorer for a large refactor.

## Requirements and proposed defaults

User requirements: support two or three players; visually resemble Cricket; independently choose open-in or double-in and open-out or double-out; default to **open-in / double-out**.

The remaining first-release choices below are proposed implementation defaults, ready to build without further product decisions.

| Setup field | Options | Initial default |
| --- | --- | --- |
| Starting score | 301, 501, 701 | 501 |
| Players | 2 or 3 local players | 2 |
| Starting rule | Open in / Double in | Open in |
| Finishing rule | Open out / Double out | Double out |
| Names | Editable guest names | Player 1 / Player 2 / Player 3 |
| First throw | Any selected player | Player 1 |

All players use the same starting score and rule selections. Treat the in/out selectors independently and support all four combinations. Do not change the defaults automatically when 301 is selected. A fresh game starts with the defaults; Rematch preserves the previous game's settings.

Use Add player / Remove player during setup, consistent with Cricket. Prefill the existing user's name if the app already supports it. Lock the roster, starting score, and rules after Start game. Changing these requires a new game.

First release includes setup, dart entry, automatic scoring, turn handoff, undo, history, refresh recovery, winner, and rematch. Defer bots, online play, teams, handicaps, custom starting scores, sets, multi-leg match tracking, checkout suggestions, and detailed averages/analytics. Keep these game results separate from practice statistics.

## Scoreboard and visual direction

Use DartStat's selected theme, typography, spacing, rounded controls, and active-player treatment. The scorer should feel like Cricket's sibling.

1. Compact header: “501” (or selected score), back navigation, overflow menu. Show a quiet rule summary such as “Open in · Double out.”
2. Two or three equal player panels across the top, in fixed order. Each shows the name and a very large remaining score. Show “Throwing” plus a visible border/accent for the active player; do not rely on color alone.
3. Under double-in, each player shows “Needs double” until opened, then “In.” Do not disable singles or trebles while waiting to open: those are legitimate thrown darts that must be recorded.
4. Below the player panels, show the active player's current visit: three dart slots, visit-start score, and credited points this visit. Remaining score updates after each dart.
5. Entry controls: Single / Double / Treble selector; a compact numeric target grid; Bull; Miss; Undo; prominent Next player.
6. Keep full turn history and new-game actions behind secondary controls.

Replace Cricket's seven target/mark rows with the ’01 entry grid. Cricket's /, X, and circled-X marks represent closure and do not apply here. Use numeric remaining scores and dart labels such as S20, D16, T19, BULL, DBULL, MISS.

Recommended phone grid: five columns × four rows, ordered 20–16, 15–11, 10–6, 5–1. Bull and Miss occupy a separate row. Target placement stays fixed throughout the game. Reuse Cricket's multiplier selector and Bull behavior. Numbers are entry targets, not cumulative scores or a turn-total keypad.

With three players, keep all three score panels visible without horizontal swiping and never rotate their positions. Truncate long names visually while retaining full accessible labels. On short screens allow vertical scrolling rather than shrinking touch targets below 44px. Respect bottom safe areas, enlarged text, landscape, tablet sizing, light/dark themes, and reduced motion.

## Dart entry and turn flow

Use dart-by-dart entry in the first release. A turn total alone cannot tell whether the player opened on a double or finished with one; per-dart entry also matches Cricket and gives precise undo.

1. Single is selected initially. Tap a number to record one dart using the selected multiplier. Reset to Single after every dart, including Miss and Bull.
2. Bull with Single records outer bull (25); Bull with Double records inner bull (50). With Treble selected, disable Bull and explain that treble bull is invalid. Use the same interaction as Cricket.
3. Miss records a zero-value thrown dart, including a bounce-out. Enter the actual segment hit, even if it was not the intended target.
4. Populate the next dart slot and update the preview immediately. Darts thrown before doubling in retain their real labels but display “Not in — 0 credited.”
5. After three darts, block additional entry and enable Next player. Do not switch automatically; allow correction first.
6. A bust ends the visit early: block further dart entry, restore the visit-start score, show “Bust — back to 32” (for example), and enable Next player immediately. Do not require fake Miss entries for unthrown darts.
7. Next player commits the visit and advances modulo player count. It is enabled only after three entered darts or a bust. A valid winning dart ends the game immediately instead.

The manual handoff and multiplier reset should match Cricket. Bust is the additional early-handoff condition unique to ’01. Disable repeated commit actions so rapid taps cannot skip a player.

## Scoring contract

Use conventional steel-tip split-bull values for every rule combination: numbers 1–20 × multiplier 1–3, outer bull 25, inner bull 50, Miss 0. Inner bull counts as a double for both entry and finishing; outer bull and trebles do not.

### Starting rule

**Open in:** Scoring begins with the first dart. Every scoring hit subtracts its full value.

**Double in:** Each player starts unopened. Before that player's first double, darts consume a slot but subtract nothing. A double 1–20 or inner bull opens the player and subtracts its full value immediately; subsequent darts score normally. Opening is independent for each player and is preserved into subsequent visits. Reset it on a new game/rematch.

### Finishing rule and bust

Evaluate after each credited dart, in order. Never evaluate only the sum of three darts.

| Outcome | Open out | Double out |
| --- | --- | --- |
| Remainder below 0 | Bust | Bust |
| Remainder exactly 1 | Legal; continue | Bust |
| Remainder exactly 0 on a double/inner bull | Win | Win |
| Remainder exactly 0 on a single/treble/outer bull | Win | Bust |
| Remainder above 1 | Continue | Continue |

A bust voids the entire visit's score, not just the last dart. Restore the remainder from the start of that visit; record credited visit points as 0. Keep the entered darts for history and correction. Unthrown darts remain empty. A Miss at remainder 1 under open-out is legal and does not win.

On a valid finish, stop immediately, even after dart one or two. Opponents do not receive equalizing turns. With three players, the first finisher wins and the game ends; do not continue to decide second place or rank the other players by remaining score.

For the supported starting scores (301/501/701), a player cannot both first double in and bust in that opening visit: at most three darts are available and even an ordinary visit cannot exceed 180. Custom low starting scores are outside this release. If added later, explicitly define whether a bust in the opening visit reverses opening status and add corresponding tests; do not silently inherit an arbitrary behavior.

## Undo, history, and recovery

- Undo removes the latest pending dart and replays the pending visit from its starting state. Restore remainder, opened status, bust state, and winner state together. Undoing the opening double must return the player to unopened when appropriate.
- Undo after a bust restores the state immediately before the busting dart, including the already-credited earlier darts. Undo after a win dismisses the result and resumes that player's visit.
- With no pending darts, use “Edit previous turn,” matching Cricket: reopen the latest committed visit with its entered darts and correct player active. A subsequent Undo removes its last dart. This also works for a one- or two-dart bust and across the player-order wrap.
- First-release history is read-only: visit number, player, darts, starting remainder, credited score, ending remainder, and Bust/Finish where relevant. A busted visit can show the hit values, but must never present them as credited points.
- Preserve Undo last dart on the winner panel until Rematch or New game starts. Rematch preserves names, score choice, rules, and roster order; clears all scoring/opening state; and advances the starting player by one position.
- Persist settings, ordered roster, starter, active player, committed visits, pending darts, and terminal state after each change, including undo and handoff. Reload restores the exact game, including a pending bust or result screen.
- Reuse the app's persistence approach. Local scoring must not wait for a network write. Do not promise offline cold-start support unless the existing app supports and tests it.
- Back navigation must preserve a resumable game. Confirm destructive abandonment/reset of an unfinished game.

## Implementation guidance

Use a separate ’01 rules engine with shared UI infrastructure where appropriate. Avoid forcing Cricket's marks model into a countdown scorer.

Suggested conceptual state: schema version; game type `x01`; starting score; in/out rules; ordered players with stable IDs; starting-player index; active-player index; committed visits; pending dart events; game status and winner ID. Derive each player's remainder and opened state deterministically, or validate any cached state against the event history.

Represent a dart by its actual segment and multiplier (or Miss), not points alone: S20 and D10 both score 20 but have different opening/finishing effects. Validate at the engine boundary: only 1–20 with multipliers 1–3, bull with 1–2, or Miss; never accept treble bull, a fourth dart, or input after bust/win.

At visit start, retain the state needed for rollback. Process every dart sequentially: validate → apply entry gate → calculate candidate remainder → evaluate bust/win → update state. Non-opening hits consume darts without changing the remainder. Commit only a complete or busted visit; winning state must also be persisted without requiring Next player.

Add focused automated tests for the scoring reducer, undo, and serialization/recovery. UI validation should cover touch layout, visible active player, rule labels, disabled controls, and shared Cricket styling. Announce player changes, busts, and wins accessibly; expose multiplier selection and full button labels such as “Record double 16.”

## Acceptance cases

S = single, D = double, T = treble. Unless a case says otherwise, the player is already in. Scores shown are that player's remaining score.

| Scenario | Expected result |
| --- | --- |
| Fresh setup | 2 players, 501, open-in, double-out |
| Select 301 | Starting score changes; chosen in/out rules stay unchanged |
| All four in/out combinations | Each selectable independently and saved correctly |
| 501 open-in: T20, S20, D20 | 120 credited; 381 remains |
| 301 double-in, unopened: S20, D20, T20 | First dart uncredited; open on dart 2; 100 credited; 201 remains |
| 301 double-in, unopened: T20, outer bull, Miss | 301 remains; still unopened; next player allowed |
| 301 double-in, unopened: inner bull | Opens and leaves 251 |
| Undo that opening inner bull | Returns to 301 and unopened |
| 40 double-out: D20 | Immediate win on dart 1 |
| 40 double-out: S20, S20 | Bust; restores 40; third dart blocked |
| 32 double-out: S20, S11 | Leaves 1; bust; restores 32 |
| Undo preceding bust's S11 | Restores pending S20, remainder 12, one dart entered |
| 32 open-out: S20, S15 | Overshoot; bust; restores 32 |
| 20 open-out: S19 | Leaves 1 legally |
| Then S1 | Wins on dart 2 |
| 60 open-out: T20 | Wins |
| 60 double-out: T20 | Bust; restores 60 |
| 50 double-out: inner bull | Wins |
| 25 double-out: outer bull | Bust; restores 25 |
| 25 open-out: outer bull | Wins |
| 170 double-out: T20, T20, inner bull | Wins on dart 3 |
| Three Miss entries | No score change; Next player enabled |
| Two ordinary nonterminal darts | Next player disabled |
| Bust on first dart | Next player enabled; remaining slots stay empty |
| Undo winning dart | Restores prior score, visit, and active game |
| A → B → C → A; edit previous visit | Reopens C's visit; subsequent Undo removes C's last dart |
| B wins in three-player game | Game ends immediately; A and C get no further turns |
| Reload mid-visit, after bust, or after win | Exact darts, rules, scores, opening state, and status restored |
| Rematch | Same settings/names; scores reset; opening state reset; next starter |
| Invalid segment, treble bull, fourth dart, post-bust/win input | Engine rejects without mutating game |

## Roger's first pass

Deliver setup → playable scoreboard → next player → undo → bust/win → rematch, with refresh recovery and shared Cricket styling. Demonstrate a two-player 501 open-in/double-out game and a three-player 301 double-in game, plus the focused rule tests above. Include screenshots at phone size with both rosters. Additional product decisions do not block this first pass.

## References and scope of authority

- Companion: `DartStat-Cricket-Handoff.md`, September 1, 2026; read for existing visual, turn-control, undo, and rematch conventions.
- [PDC Europe rules](https://www.pdc-europe.tv/wiki/rules/) — countdown play, double-out, bullseye qualification, and double-in format.
- [Darts501: ’01 game variations](https://darts501.com/dart-game-rules.html) — entry/finish variants and split-bull interpretation.
- [Dartshopper: 501 rules](https://www.dartshopper.com/blog/darts-rules-501/) — whole-visit bust reset and double-out bust conditions.

Rules checked September 2, 2026. UI, supported score presets, three-player first-finisher behavior, and release scope are product choices specified here; this is a casual local scorer, not a tournament-management implementation.

## Implementation record

- Status as of September 2, 2026: Implemented locally and ready for acceptance review.
- Implementation date: September 2, 2026.
- Implementation PR or commit: not yet created; link the implementation PR or commit here when available.
- Accepted deviations and rationale: none recorded. Competitive game recovery uses the existing UID-scoped browser-local persistence approach and remains separate from practice statistics.
- Validation: `npm test` passed 36 tests across 7 files, including 9 focused ’01 engine/recovery tests; `npm run lint` passed; `npm run build` passed. Vite reports its existing advisory that the main JavaScript chunk exceeds 500 kB.
