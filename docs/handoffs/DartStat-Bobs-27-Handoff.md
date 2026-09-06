# DartStat Handoff: Bob's 27 Practice Game

## Goal

Add **Bob's 27** as a DartStat doubles-practice routine. The player throws one
three-dart visit at every double from D1 through D20 and then Double Bull. The
routine should preserve the pressure of the classic elimination rule while
also offering a separate **Complete Practice** mode that always lets the player
finish the board and collect useful practice data.

## Why this belongs in DartStat

Bob's 27 complements the existing Cricket work and the planned 121 routine:

- Cricket Practice measures accuracy at ordered scoring targets.
- 121 practices setup shots and double-out routes.
- Bob's 27 isolates every finishing double under increasing score pressure.

The interaction is intentionally simple: after throwing three darts at the
displayed double, the player records how many hit the target using `0`, `1`,
`2`, or `3`.

## Standard target sequence

The sequence is fixed:

`D1, D2, D3, ... D20, Double Bull`

- Every target receives exactly one three-dart visit.
- Hits on any other segment do not count.
- A dart in the target's inner single, outer single, or treble is a miss.
- For the final target, only the inner bull counts; outer bull is a miss.

## Scoring

Every session starts at **27 points**.

For target `Dn`, the target value is `2 × n`. Double Bull has a target value of
`50`.

- **One hit:** add the target value once.
- **Two hits:** add the target value twice.
- **Three hits:** add the target value three times.
- **Zero hits:** subtract the target value once, not once per missed dart.

Examples:

| Visit | Result | Score change |
| --- | ---: | ---: |
| D1 | 2 hits | `+4` |
| D5 | 0 hits | `-10` |
| D12 | 1 hit | `+24` |
| D20 | 3 hits | `+120` |
| Double Bull | 0 hits | `-50` |

A perfect session scores **1,437**: the starting 27 plus three hits at every
double from D1 through D20 and three inner bulls.

## Game modes

The setup screen offers two clearly labeled modes.

### Classic

- Use the standard Bob's 27 scoring rules.
- If the running score falls below zero, the session ends immediately.
- The failed target is recorded before the session ends.
- A score of exactly zero would be allowed to continue, although the standard
  even-valued adjustments from a starting score of 27 make zero unreachable.
- Personal-best final scores for Classic are compared only with other completed
  or eliminated Classic sessions.

### Complete Practice

- Use exactly the same targets and scoring calculations.
- Negative scores are allowed.
- The player always continues through Double Bull unless the session is
  abandoned.
- The final score may be negative.
- Complete Practice records and personal bests remain separate from Classic so
  the forgiving mode cannot replace or distort a Classic best.

Mode names should appear in history and summaries. Do not describe Complete
Practice as an easier scoring system; only the elimination behavior changes.

## Setup screen

Show a small setup card:

- Game: **Bob's 27**
- Starting score: fixed at `27`
- Mode selector:
  - **Classic** — Game ends if your score falls below zero.
  - **Complete Practice** — Finish every double even if your score is negative.
- **Start Game**

Default to the player's most recently used Bob's 27 mode. Use **Classic** for a
first-time player.

## In-game interaction

The primary game view should show:

1. Current target, such as **Double 8** or **Double Bull**.
2. Running score.
3. Progress, such as `8 of 21`.
4. Four large hit-count buttons: **0**, **1**, **2**, **3**.

After a hit-count button is selected, show the calculated result before or as
the player confirms it:

- `2 hits × 16 = +32`
- `No hits = -16`

Provide:

- **Confirm / Next Double**
- **Undo** for at least the most recently confirmed visit
- **End Practice** as a secondary action with confirmation

Do not require segment-by-segment entry. The hit-count buttons are faster,
match DartStat's existing Cricket Practice interaction, and capture everything
needed for Bob's 27 scoring and statistics.

Use large mobile touch targets and do not communicate state through color alone.
Reuse DartStat navigation, typography, cards, themes, and responsive behavior.

## Round resolution

When a visit is confirmed:

1. Save the target number, target value, hit count, score change, and resulting
   running score as a raw round result.
2. If Classic mode produced a score below zero, mark the session eliminated and
   show the summary.
3. Otherwise advance to the next double.
4. After Double Bull, mark the session completed and show the summary.

Undo must restore the prior target, score, raw result list, hit totals, and
session status without recalculating from partially mutated aggregate fields.
Prefer deriving totals from the stored round results.

## Session summary

Show:

- mode;
- final score;
- result: **Completed**, **Eliminated at D#**, or **Abandoned**;
- highest target reached;
- doubles hit out of darts thrown;
- overall double accuracy;
- targets hit at least once;
- targets missed with all three darts;
- best target visit;
- optional comparison with the relevant mode's personal best.

For a Classic elimination, darts thrown equals three times the number of
recorded targets. For a completed session it is always 63 darts.

## History and lifetime statistics

Save every confirmed visit as raw source-of-truth data scoped to the
authenticated Firebase UID. A suggested session record includes:

- `gameType: "bobs27"`
- `mode: "classic" | "complete"`
- `startingScore: 27`
- `finalScore`
- `status: "completed" | "eliminated" | "abandoned"`
- `startedAt`
- `completedAt`
- `highestTargetReached`
- `totalHits`
- `dartsThrown`
- `rounds[]`

Suggested round result:

- `target` (`1–20` or `25` for bull, following existing DartStat conventions)
- `label`
- `targetValue`
- `hits` (`0–3`)
- `scoreBefore`
- `scoreChange`
- `scoreAfter`

Derive or store with validation:

- overall accuracy;
- accuracy by double;
- zero-hit rate by double;
- targets hit at least once;
- completion rate by mode;
- Classic elimination target distribution;
- personal-best final score separately for Classic and Complete Practice.

Abandoned sessions may appear in history as incomplete but must not update a
personal best. Classic eliminated sessions are valid finished results and may
update the Classic best.

## Suggested state model

- `mode`
- `score`
- `currentTargetIndex` (`0–20`)
- `selectedHits` (`0–3` or null)
- `rounds`
- `status` (`setup`, `active`, `completed`, `eliminated`, `abandoned`)
- `startedAt`

Score and aggregate statistics should be reproducible from `rounds` rather than
existing only as mutable counters.

## Acceptance criteria

- Every session starts at 27 and D1.
- Targets advance in order through D20 and Double Bull.
- The player records exactly one value from 0 through 3 for each target.
- Each hit adds the full numerical value of the target double.
- Zero hits subtracts the target double's value exactly once.
- Hits on unrelated segments do not count.
- Only inner bull counts on the Double Bull round.
- Classic ends immediately after a confirmed visit takes the score below zero.
- Complete Practice permits negative scores and continues through Double Bull.
- Completing Double Bull produces a completed session summary.
- A perfect session produces 1,437.
- Undo accurately restores the previous score, target, and statistics.
- Classic and Complete Practice histories and personal bests are distinguishable.
- Eliminated Classic sessions are valid completed results; abandoned sessions do
  not update personal bests.
- Refresh/reload safely restores an active game if the other practice routines
  support active-session persistence.
- Existing games, histories, and records remain unchanged.

## Edge cases and tests

- D1 with 0 hits changes 27 to 25.
- D1 with 3 hits changes 27 to 33.
- D12 with 2 hits adds 48, not 24.
- D20 with 0 hits subtracts 40 once, not 120.
- Double Bull with 3 hits adds 150.
- Outer bull does not count on the final round.
- Classic stops on the first negative resulting score and records that target.
- Complete Practice continues from a negative score.
- Undo after a zero-hit visit restores the deducted points.
- Undo after Classic elimination returns the session to active play.
- Repeated taps or double submission cannot record a target twice.
- A refreshed active session does not skip or duplicate a target.
- Abandoning from either mode is clearly distinguished from elimination.
- Perfect play returns 1,437 with 63 hits from 63 darts.

## Decisions and rationale

- **Include Double Bull:** completes the traditional 21-target routine and
  supports the recognized perfect score of 1,437.
- **Use 0/1/2/3 hit entry:** minimal input with no loss of required information.
- **Classic as the default:** preserves the pressure and recognized rules of
  Bob's 27.
- **Include Complete Practice:** beginners still receive a full-board doubles
  workout and complete statistics instead of repeatedly ending early.
- **Separate records by mode:** the modes measure different accomplishments.
- **Store raw visits:** makes scoring auditable and allows better per-double
  analysis later without changing the original record.

## Optional later enhancements—not required for MVP

- heatmap of accuracy by double;
- trend chart for Classic and Complete Practice scores;
- spoken target/result announcements;
- haptic or sound feedback;
- a replay-against-your-best comparison;
- custom starting score or target subsets, stored as separate variants rather
  than altering standard Bob's 27 records.

## Implementation outcome

Deliver Bob's 27 in the practice-game picker, implement both Classic and
Complete Practice modes, persist raw per-target results and summaries, keep
mode-specific records, and add focused unit and UI tests for scoring, target
progression, elimination, negative-score continuation, undo, persistence, and
completion. Do not deploy as part of this handoff unless separately authorized.
