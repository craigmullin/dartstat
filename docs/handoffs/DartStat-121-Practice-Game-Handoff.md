# DartStat Handoff: “121” Practice Game

## Goal

Add **121** as DartStat’s third practice game. The routine trains scoring, setup shots, checkout routes, and doubles under increasing pressure.

The player begins at 121 and tries to check out each target with a maximum of nine darts. Successful checkouts advance the target by one. Failed attempts cost a life. The session ends when no lives remain.

## Core rules

1. Before starting, the player chooses the number of starting lives.
2. The first target is **121**.
3. The player has up to **nine darts / three visits** to check out the target using standard double-out rules.
4. A checkout in **1–3 darts**:
   - advances the target by one;
   - awards one additional life.
5. A checkout in **4–9 darts**:
   - advances the target by one;
   - does not change the number of lives.
6. Failure to check out within nine darts:
   - removes one life;
   - keeps the same target for the next attempt.
7. When the player has no lives remaining, the session ends.
8. Earned lives may exceed the selected starting-life count. The starting value is not a maximum.

## Important scoring behavior

- Use normal 01 scoring and bust rules.
- The finishing dart must be a double or the inner bull.
- A bust ends the current three-dart visit and restores the remaining score to its value at the beginning of that visit.
- A checkout ends the attempt immediately; unused darts are not counted.
- A checkout with any of the first three darts earns the bonus life—not only a checkout using exactly three darts.
- A failed third visit consumes the ninth dart/visit and automatically resolves the attempt as a failure.

## Recommended entry flow

Reuse the calculator-style 01 score entry pattern already planned for DartStat rather than requiring individual segment entry.

For each visit, show:

- current target;
- remaining score;
- lives;
- visit number (`1 of 3`, `2 of 3`, or `3 of 3`);
- darts used in the current attempt (`0–9`);
- numeric visit-score keypad;
- **Record Score** action;
- **Checkout** action;
- **Bust / No Score** action.

Because aggregate visit-score entry cannot prove that the last dart was a legal double, DartStat should trust the player. When **Checkout** is tapped, ask how many darts were used in that visit (`1`, `2`, or `3`) so the app can calculate the total darts used and award the bonus life correctly.

### Suggested interaction examples

- Player checks out 121 on dart 3: target becomes 122 and lives increase by one.
- Player scores 81 in visit one, then checks out 40 with dart 2 of visit two: five darts used, target becomes 122, lives unchanged.
- Player fails after visit three: lose one life and retry 121.
- Player busts on visit two: remaining score resets to the start-of-visit value; the visit still counts as three darts unless the app records the actual dart count. For a simple first implementation, count a recorded bust as a completed three-dart visit.

## Setup screen

Add a small pre-game setup screen or card:

- Game: **121**
- Starting target: fixed at `121`
- Starting lives: selectable, default `3`
- Suggested quick choices: `1`, `3`, `5`, plus a custom positive integer
- **Start Game**

Persist the player’s most recently selected starting-life count for convenience, but do not change the default for a first-time player.

## In-game layout

The most prominent values should be:

1. **Target: 121**
2. **Remaining: 121**
3. **Lives: ♥ ♥ ♥** (also provide a numeric/text label for accessibility)

Secondary information:

- current visit;
- darts used;
- highest checkout this session;
- route suggestion only if DartStat already supports checkout suggestions; route guidance is not required for this enhancement.

After an attempt, briefly show a result state before resetting:

- `Checked out in 3 — +1 life — Next: 122`
- `Checked out in 7 — Next: 122`
- `Not out — 1 life lost — Retry 121`

## Session end and records

The primary record should be **Highest Checkout Completed**. This avoids counting a number merely because it was reached and attempted.

Example: if the player completes 128, advances to 129, and loses the final life without completing 129, the record is **128**.

End-of-session summary:

- highest checkout completed;
- starting lives;
- lives earned;
- targets completed;
- total darts thrown;
- three-dart checkouts;
- optional: checkout success rate by attempt.

Save the session to practice history and update the lifetime/personal-best record only after the session ends. An abandoned session should be stored as incomplete or excluded from personal-best calculations.

## State model

Suggested session state:

- `startingLives`
- `livesRemaining`
- `currentTarget`
- `remainingScore`
- `visitStartScore`
- `visitNumber` (`1–3`)
- `dartsUsedThisVisit` (`0–3`)
- `dartsUsedThisAttempt` (`0–9`)
- `highestCheckoutCompleted`
- `targetsCompleted`
- `livesEarned`
- `threeDartCheckouts`
- `status` (`active`, `completed`, `abandoned`)

## Acceptance criteria

- The player can choose a valid positive starting-life count.
- Every new session begins at 121.
- A legal checkout in 1–3 total darts adds one life and advances one target.
- A legal checkout in 4–9 total darts advances one target without changing lives.
- A failed nine-dart attempt removes exactly one life and retries the same target.
- Lives can rise above the initial selection.
- Reaching zero lives ends the session immediately.
- Busts restore the score to its visit-start value and consume the visit.
- The UI never permits more than nine darts in one target attempt.
- The personal best is the highest target successfully checked out.
- Refresh/reload does not silently corrupt an active session if active-session persistence is supported by the other routines.
- Existing practice games and their records remain unchanged.

## Edge cases to test

- Checkout on dart 1, 2, or 3 awards one life.
- Checkout on dart 4 does not award a life.
- Checkout on dart 9 advances normally.
- Miss/failure on the final life ends the game without starting another attempt.
- Bust on the ninth dart causes the attempt to fail.
- A player earns several lives above the starting amount.
- A player repeatedly fails the same target.
- Exact checkout from 50 using inner bull is accepted.
- Outer bull is not accepted as a finishing double.
- Invalid numeric scores and impossible remaining-score transitions are rejected where the existing 01 scorer already validates them.
- Leaving exactly 1 is treated as a bust under double-out rules.
- Abandoning and resuming behaves consistently with DartStat’s other practice routines.

## Decisions and rationale

- **Calculator-style visit totals:** faster and better suited to solo practice than tapping individual board segments.
- **Player confirms checkout and darts used:** preserves simple entry while supporting correct bonus-life logic.
- **Retry the same target after failure:** otherwise losing a life has little consequence and does not create the intended pressure.
- **No life cap:** a first-visit checkout must be able to reward the player even at the initial maximum.
- **Record completed checkout, not target reached:** measures demonstrated performance rather than an uncompleted attempt.

## Optional later enhancements—not required for MVP

- checkout route suggestions;
- selectable six-dart or nine-dart variants;
- safehouse/checkpoint rule variant;
- charts for highest checkout and checkout percentage over time;
- sound/haptic feedback for checkout, extra life, and lost life;
- practice streaks or daily challenges.

## Implementation outcome

Deliver the complete 121 routine, integrate it into the existing practice-game picker and history/stat model, add focused unit tests for state transitions and bust behavior, and add UI tests for setup, scoring, checkout confirmation, failure, and session completion.
