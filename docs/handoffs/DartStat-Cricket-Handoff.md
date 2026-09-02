# DartStat: Two- or three-player Cricket

Implementation handoff for Roger · September 1, 2026

## Why this change

Craig wanted a simple shared scoreboard for games with a friend at home or at a bar, using familiar Cricket marks and supporting an optional third player.

## Goal

Add a fast, attractive Cricket scoreboard for two or three real people sharing one phone or tablet at home or at a bar. Preserve the ease and personality of the existing DartStat app. The attached reference supplies the basic composition: two player scores at the top, a central target column, and each player's marks on the corresponding side.

This is a proposed implementation specification, not a review of the current code. Inspect the repository first and reuse its navigation, theme tokens, scoring utilities, persistence, and components where appropriate.

## First release

- Standard points Cricket, two or three local players, one game at a time.
- Targets: 20, 19, 18, 17, 16, 15, Bull, in that order.
- Player names, starting-player selection, dart entry, automatic scoring, undo, turn history, refresh recovery, result, and rematch.
- Guest names require no new accounts. Default to two players, with an optional Add player action for Player 3 before starting. Use Player 1 / Player 2 / Player 3 as fallback names, with existing profile name prefilled if convenient.
- Defer bots, online play, teams, cut-throat, match sets, rankings, and detailed analytics.

## Scoreboard and visual direction

Use the reference's structure, not its dated styling. Inherit the current DartStat palette, typography, corners, and spacing; respect the selected app theme rather than hardcoding a new one.

1. Compact header: Cricket, back navigation, overflow menu.
2. Two or three equal player headers: name and large points total. Clearly label the active player with “Your turn” or “Throwing,” a border, and an accent. Keep player columns in fixed order throughout the game.
3. Seven aligned rows: left player's mark, central tappable target, right player's mark. Bull is labeled “BULL.” Marks should be large, crisp, and readable across a table.
4. Entry area: Single / Double / Treble selector, three dart slots, Miss button, Undo, and a prominent Next player button.
5. History and new-game actions live behind secondary controls so the scoreboard stays uncluttered.

### Three-player layout

Retain the centered target column flanked by marks for two players. For three players, switch to a compact grid: Target | Player 1 | Player 2 | Player 3. Align each name and points header directly above its marks column. Keep all three players visible without horizontal swiping, and highlight the entire active player column subtly. Centralized multiplier and turn controls remain below the grid. The left target column remains the only target-entry control. Use short visible names when necessary with full names available accessibly. Do not rotate columns with turns.

### Mark notation

| Accumulated marks on a target | Display |
| --- | --- |
| 0 | Blank |
| 1 | / |
| 2 | X |
| 3 or more | Circled X |

The user approved an X inside an O for three marks. Use this traditional circled X consistently. Draw consistent marks with SVG or existing icon primitives, not font-dependent emoji. Their meaning is accumulated progress, not the multiplier of the most recent dart: a double following a single produces a circled X, and three separate singles also produce a circled X.

Keep the circled X visible when a player closes a target. If all players have closed it, mute the entire row and show a subtle closed-state cue without making it illegible. Distinguish targets the active player can score on with a restrained accent. Do not rely on color alone to communicate turn or closure.

### Responsive behavior

Prioritize a portrait phone. Aim to show all seven targets and the entry controls without scrolling on an ordinary modern phone; allow scrolling on short screens rather than shrinking touch targets below 44px or hiding controls. Respect bottom safe areas. Tablet layouts use extra space for larger marks and scores, not extra features. Test landscape, enlarged text, and light/dark themes.

## Entry flow

1. Select two or three players, names, and who throws first, then Start game. Lock the roster after starting; adding or removing a player requires a new game.
2. Single is selected by default. Tap a target to record one dart; select Double or Treble before tapping to record that multiplier. The multiplier resets to Single after each entry.
3. For Bull, Single means outer bull (one mark), Double means inner bull (two marks). Treble Bull is invalid: keep Bull visibly unavailable while Treble is selected and explain why accessibly.
4. Miss records one dart with zero marks, including non-Cricket numbers and bounce-outs. Hits on targets closed by all players can still be entered with their actual target and multiplier; they consume a dart but change neither marks nor points.
5. Show each entered dart in a slot, such as T20, D18, BULL, DBULL, or MISS. Update marks and scores immediately as a preview. Label the current turn and active player clearly.
6. After three darts, block further dart input and emphasize Next player. Do not automatically switch players: allow mistakes to be corrected first.
7. Next player commits the turn and advances through the fixed player order, wrapping after the last player. Enable only after three entries; players use Miss for non-scoring darts. The exception is a winning dart, which can end the game before three throws.

Example: T18, S18, S20 closes 18, scores 18 points if at least one opponent has not closed 18, and adds one mark on 20.

No direct mark cycling: blindly cycling / → X → circled X cannot represent extra scoring hits or physical dart counts correctly. Keep marks as scoreboard output and targets as entry controls. No confirmation dialog for routine dart entry.

## Scoring rules

Each player has independent marks on each target, capped at three for display and closure. Singles add one, doubles two, trebles three. Bull adds one or two and is worth 25 points per excess mark.

For each dart, using the state before that dart:

1. Fill the thrower's remaining marks up to three.
2. Any excess marks score only if at least one opponent has fewer than three marks on that target.
3. Points equal excess marks × target value (25 for Bull). Award these points once to the thrower, regardless of how many opponents remain open. Do not multiply points by opponent count or award them to opponents.
4. Once all players have three marks, nobody can score on that target.

A player wins immediately after a dart if they have closed all seven targets and their points are greater than or equal to every opponent's. Closing everything while behind does not win: they must keep scoring on a target at least one opponent has not closed. Equal points qualify; there is no extra tiebreaker.

Evaluate darts sequentially, including excess marks on the dart that closes a number. Stop accepting darts on a win. Show the winner, final points, and Rematch; preserve an Undo last dart action so an accidental winning entry can be corrected. Rematch keeps names, clears the game, and advances the starting player by one position in the fixed player order.

## Undo, history, and recovery

- Undo removes the latest pending dart first, restoring marks, points, and any winner state together.
- With no pending darts, Undo reopens the previous committed turn for correction, restores that player as active, and exposes its three entries. Another Undo removes its final dart. Label this boundary action clearly as “Edit previous turn.”
- Keep history read-only in the first release: player, turn number, darts, and points gained. Defer arbitrary historical editing.
- Persist the committed history and pending turn after each change. Reload restores names, active player, darts, scores, and game status exactly.
- Use the app's existing storage approach; ensure local play does not depend on a successful network request for every dart. Do not claim full offline cold-start support unless the existing app supports and tests it.
- Confirm abandoning or resetting an unfinished game. Back navigation must not silently erase it.

## Implementation guidance

Represent players as an ordered array with stable IDs, not separate home/away fields. Store an active-player index and starting-player index; advance modulo player count. Persistence must retain the roster and order.

Prefer a deterministic scoring function independent of UI. Store ordered dart events and turn boundaries; derive marks, points, and winner state from that history so undo and restore cannot diverge. Include a data/schema version and rules variant for saved games. Reuse existing history infrastructure if suitable; keep competitive Cricket results distinct from practice records.

Suggested UI responsibilities: setup, player header, target row, mark glyph, dart entry controls, turn history, and result panel. These are responsibilities, not mandatory filenames or a request to restructure the app.

Provide accessible labels such as “Craig, 20: two marks” and “Record treble 20.” Expose the multiplier's selected state and announce player switches and wins. Any mark or score animation should be brief and honor reduced-motion preferences.

## Acceptance cases

| Scenario | Expected result |
| --- | --- |
| Zero marks on 20; T20 | Three marks, circled X, zero points |
| Two marks on 20; T20; at least one opponent has fewer than three | Close 20 and add 40 points |
| Already closed 20; T20; at least one opponent has fewer than three | Add 60 points |
| Two marks on 20; T20; all opponents already closed | Close 20, zero points |
| All players closed 20; S20 | Dart consumed, no score or mark change |
| Two Bull marks; inner bull; at least one opponent has fewer than three | Close Bull and add 25 points |
| Player A has closed 20, B has closed 20, C has not; A hits T20 | A gains 60 points; the row remains live |
| Player A has closed 20, B and C have not; A hits T20 | A gains 60, not 120 points |
| A closes every target with 60 points; B has 50, C has 75 | No win; A still trails C |
| Three-player turn sequence | A → B → C → A; undo across the wrap restores C correctly |
| Reload a three-player game | All three players, their order, marks, scores, and pending turn are preserved |
| Treble selected | Bull cannot produce a three-mark dart |
| Three misses | No points; Next player works |
| All targets closed, but player trails | Game continues |
| Final target closes with points at least equal to every opponent | Win immediately, even on dart one or two |
| Undo scoring or winning dart | Correct prior marks, score, and game status restored |
| Reload during a partially entered turn | Exact game and pending darts restored |

Automate the scoring and undo cases because errors affect the match result. Manually verify phone/tablet layout, tap targets, turn handoff, recovery, and theme consistency.

## Recommended first pass

Build one polished, playable vertical slice: setup → scoreboard → enter darts → next player → undo → win/rematch, with local recovery. Demonstrate two- and three-player games, including excess-mark scoring, one opponent closed while another is open, turn wraparound, and a winning turn. Validate the scorer before adding visual polish; then review the screen in the existing DartStat theme with Craig. No additional feature decisions block this first pass; items above are proposed defaults for review.

## Reference

User-supplied scoreboard screenshot: 5554b310-bea9-4e3d-8673-b74b5363159c.png. Composition reference only; this document specifies the intended replacement controls.

Standard rules and traditional mark notation: https://en.wikipedia.org/wiki/Cricket_(darts)

## Implementation record

- Status as of September 2, 2026: Original design record; competitive Cricket code is present on develop. Full acceptance review against this handoff has not been performed.
- Implementation date: to be recorded by the implementer.
- Implementation PR or commit: to be linked by the implementer.
- Accepted deviations and rationale: record here when implementation differs from this specification.
- Validation: record acceptance results with the implementation PR or commit.
