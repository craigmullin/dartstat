# DartStat: Calculator-style ’01 score entry

Implementation handoff for Roger · September 2, 2026

## Decision and why this change

Replace individual segment entry in new ’01 games with a numeric keypad for the total credited score of a turn. Craig wants fast scoring for casual games with friends. Players know what they threw and can be trusted to honor the chosen double-in/out rules. Requiring every segment and multiplier adds work without helping this use case.

Example: at 501, enter 60 and tap Next player; the player now has 441. At 20, throwing 15 followed by 10 is a bust: tap Bust and remain on 20. A blank Next player records a scoreless turn.

This handoff **supersedes the dart-by-dart entry, automatic double verification, per-dart undo, and per-dart storage requirements** in [the original ’01 handoff](DartStat-01-Scorer-Handoff.md). Keep that document as the original design record. All conflicting acceptance cases must be replaced by the cases here. Cricket retains its existing segment controls and scoring model.

## Repository context

Reviewed develop at commit `22d7e6d` (add _01 scorer function). The scorer is already implemented in `src/X01View.tsx`, with domain logic and local persistence in `src/x01.ts`, tests in `src/x01.test.ts`, and shared styling in `src/styles.css`. This task changes that scorer; it does not introduce a second game destination.

Reuse its setup, selected theme, two/three-player panels, fixed player order, history, result, and rematch. Retain 301/501/701 with initial 501, two players initially, independently selected in/out rules, and **open-in / double-out defaults**. Preserve existing UID-scoped storage and Firebase project configuration.

## Score-entry interface

Keep the large remaining scores and active-player highlight. Replace the segment grid, multiplier selector, Bull/Miss buttons, and three dart slots with one turn-total entry panel.

- Label: “Turn score”; initially blank, with a dash or blank placeholder distinguishable from an entered zero.
- Numeric keypad: rows 7/8/9, 4/5/6, 1/2/3, then Clear/0/Backspace. This is a score keypad, not an expression calculator: no plus, minus, decimal, or equals keys.
- Primary action: **Next player**.
- Secondary actions: **Bust** and **Undo last turn**. Keep Bust separate from Next player with enough spacing to avoid accidental taps.
- Keep the player's committed remainder unchanged while typing. A quiet preview can show “501 → 441”; only committing changes game state.
- A short helper reads “Enter the points that count. Leave blank for zero.” Keep the selected in/out rules visible in the header.
- No popups asking whether the player doubled in or finished on a double. No “Doubled in” toggle, dart-count prompt, or checkout confirmation.

Buttons need at least 44px touch targets. Keep all player scores visible on a phone, including three-player games, with full accessible names. Allow scrolling on short screens rather than shrinking the keypad. Use the current DartStat themes and typography. Desktop keyboard digits and Backspace should work; Enter commits only while the score-entry control has focus, and held-key repeats must not commit further turns.

## Exact button behavior

| Action | Behavior |
| --- | --- |
| Digit | Append to the draft turn total; normalize leading zeros; at most three digits |
| Backspace | Remove the last digit; removing the final digit returns to blank |
| Clear | Clear the draft only; do not alter scores, history, or active player |
| Next player with 0–180 entered | Commit the turn using the scoring contract below; clear the draft; advance once unless it wins |
| Next player with blank entry | Commit zero, record a scoreless turn, and advance once |
| Bust, with any draft or blank | Discard the draft, commit a bust with zero credited, preserve the turn-start remainder, clear entry, and advance once |
| Undo last turn | Remove the latest committed turn and restore its player, turn-start score, and game status; leave the score field blank for a corrected entry |

Bust is a one-tap commit and advance action, not a toggle requiring Next player afterward. It remains available even when the draft is invalid. Show a brief nonblocking “Craig busted — stays on 20” message and retain Bust in history. Blank Next player and Bust have the same arithmetic effect but distinct history labels.

Undo is disabled if no turns exist. To avoid silently discarding a draft intended for the current player, disable Undo while the draft contains digits; Clear makes Undo available. Explain this beside the disabled control or accessibly. Repeated Undo removes earlier committed turns, including across A → B → C → A wraparound. Do not reopen a three-dart visit or require a second undo click to change a score.

After each commit, prevent the same pointer gesture, key repeat, or rapid duplicate activation from also submitting a blank turn for the next player. New deliberate activations must still allow consecutive scoreless turns. Apply the guard equally to Bust and Next player; test it at the UI layer.

## Scoring contract: trust players, validate arithmetic

The submitted number is the **whole turn's credited score**, not the remaining score or a running list of darts. Edit or replace it before submitting; the app does not add successive entries together within a turn.

1. Accept whole integers from 0 through 180 only. Reject negative values, decimals, nonnumeric pasted text, and totals above 180 without changing the game. Do not silently clamp or truncate invalid pasted values.
2. Explicit Bust commits zero regardless of the draft. Preserve the original remainder.
3. For a normal entry, compute candidate remainder = turn-start remainder − submitted score.
4. If candidate is below zero, automatically commit a bust with zero credit and advance. Restore the turn-start remainder.
5. If double-out is selected and candidate is exactly 1, automatically commit a bust in the same way.
6. If candidate is exactly zero, accept the player's reported finish and declare the winner immediately, with no double verification. Store the winning turn in history. End the whole game, including with three players; no equalizing turns.
7. Otherwise subtract the submitted score and advance through the fixed player order.

Under open-out, leaving 1 is legal. Under double-out, a player who reaches zero without a valid double must report Bust themselves. The app cannot establish what segment was hit from a total and should not pretend otherwise.

Under double-in, the player enters zero until they have opened; on their opening turn they enter only the points from the opening double onward. Remove the old per-player “Needs double”/“In” state from the new UI and calculation. Retain the selected rule as a game setting/header reminder. Do not infer opening from a particular submitted total or require an opening confirmation.

Do not add dart-combination validation or a checkout table in this change. Range checking and remainder arithmetic are sufficient for this trust-based scorer. Do not synthesize individual darts from a total, or claim per-dart accuracy, double percentages, or checkout statistics from this data.

## History, correction, result, and recovery

- History shows player, turn number, start remainder, credited score, end remainder, and outcome (score, zero, bust, finish). For an automatic bust, optionally retain the submitted total as an attempted value; never display it as credited points.
- Winner panel provides **Undo last turn** and Rematch. Undo removes the winning turn, clears the winner, and restores that player's pre-turn remainder so the correct total can be entered.
- Rematch keeps names, rules, starting score, and player order, resets the game, and rotates the starting player as today.
- Save after draft edits, commits, undo, and rematch. Reload preserves draft, active player, all committed turns, scores, settings, and winner. Exiting and resuming must not discard the draft.
- Reuse the existing local storage strategy; do not introduce a network request per score. Keep competitive results separate from practice records.

## Data change and existing games

Introduce a versioned turn-total model, e.g. version 2 with `entryMode: "turn-total"`, ordered players, starting score, in/out rules, starter, committed turn events, and a draft string. Each committed event identifies the player, submitted total when applicable, and whether Bust was explicitly selected. Derive credited score, outcome, remainder, and winner with one deterministic reducer. Persist turn totals as the original input; they are the source of truth for this mode.

Do not reuse the version-1 `darts` array to store fake darts or silently interpret a total as a segment. Existing practice/Cricket records remain intact.

For saved version-1 ’01 games, use a small compatibility path: resume them with the existing segment scorer until completed or explicitly abandoned, retaining their raw history and pending darts. New games and rematches use version 2 and the calculator. This temporary compatibility path is not a mode picker for new games. Do not silently clear an unfinished saved game on upgrade. Keep existing version-1 tests for the compatibility path; add version-2 tests independently.

The repo's raw-dart guidance continues to apply where darts were recorded. This requested mode records only turn totals, so preserve those totals faithfully instead of inventing raw darts. Scope UI changes to ’01; reuse shared components without changing Cricket's behavior.

## Acceptance cases

| Scenario | Expected result |
| --- | --- |
| Fresh game | 501, two players, open-in/double-out; calculator controls |
| 501; enter 60; Next player | 441 remains; one turn committed; next player; blank entry |
| Blank Next player / explicit 0 | Remainder unchanged; zero turn recorded; advance once |
| Type 60; Clear | Draft blank; no score/history/player change |
| Type 60; Backspace | Draft becomes 6; no score change |
| 20; draft 15; Bust | Draft discarded; 20 remains; Bust recorded; advance once |
| 20; enter 25; Next player | Automatic bust; 20 remains; advance once |
| 2, double-out; enter 1 | Automatic bust; 2 remains |
| 2, double-out; blank Next player | Zero credited; 2 remains; no double prompt |
| 20, double-out; enter 20 | Win immediately on trust; no prompt |
| 20, open-out; enter 19 | 1 remains legally |
| 1, open-out; enter 1 | Win |
| 301, double-in; blank Next player | 301 remains; no opening prompt |
| 301, double-in; enter 100 after opening | 201 remains; no opening toggle |
| Enter 181, negative, decimal, or nonnumeric paste | Inline error; Next player disabled; no state change; Clear/Bust available |
| Undo score, zero, or bust | Latest turn removed; correct player and pre-turn remainder restored; blank entry |
| Undo with nonempty draft | Disabled until draft is cleared; no silent loss |
| Undo winning turn | Game resumes with winning player active at their turn-start score |
| A → B → C → A; Undo | C's last turn removed; C active; earlier turns preserved |
| Repeated activation from one gesture/held Enter | Only one turn committed; no accidental zero for the next player |
| Reload with draft / after bust / after win | Exact state restored |
| Resume version-1 game | Legacy darts and partial visit preserved in compatibility scorer |
| Rematch a version-1 game | Calculator mode, same names/settings, rotated starter |
| Cricket / practice smoke check | Existing segment interactions and records unchanged |

## Roger's first pass and completion record

Implement turn-total domain logic, calculator UI, undo, history, recovery, and legacy resume handling. Demo a normal score, blank skip, manual and automatic bust, trusted finish, undo after win, and three-player turn wrap. Run targeted scorer tests plus repo lint, tests, and build; manually check phone keypad layout and duplicate-submit behavior. No feature deployment is authorized by this handoff.

- Status: Implemented locally and ready for acceptance review.
- Implementation date: September 2, 2026.
- Implementation PR or commit: not yet created; link the implementation PR or commit here when available.
- Accepted deviations and rationale: none recorded. New games use version 2 turn totals; saved version-1 games retain the legacy dart-entry view and convert to calculator mode on rematch.
- Validation: `npm test` passed 47 tests across 9 files, including focused version-2 domain and UI duplicate-submit coverage; `npm run lint` passed; `npm run build` passed. Manual in-app-browser layout review could not be completed because the browser-control runtime failed to initialize. Vite retains its existing main-chunk size advisory.
