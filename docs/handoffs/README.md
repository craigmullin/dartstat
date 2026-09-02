# Enhancement handoffs

Keep enhancement intent, agreed behavior, and acceptance criteria in this directory so they travel with the code.

| Handoff | Purpose | Status at import, September 2, 2026 |
| --- | --- | --- |
| [Cricket scorer](DartStat-Cricket-Handoff.md) | Two- or three-player local Cricket | Original design record; implementation files exist, acceptance review not performed during import |
| [Original ’01 scorer](DartStat-01-Scorer-Handoff.md) | Original countdown scorer design | Implemented on develop; entry design superseded below |
| [Calculator-style ’01 entry](DartStat-01-Calculator-Entry-Handoff.md) | Trusted turn totals, Next player, Bust, and Undo | Implemented locally; ready for acceptance review |
| [Maskable app icon](DartStat-Maskable-Icon-Fix.md) | Match SpikeStat's launcher icon packaging | Implemented on fix/maskable-app-icon; deployment and device verification pending |

## Working agreement

1. Add a handoff before or alongside implementation. Include why the enhancement was requested, the desired behavior, and acceptance criteria.
2. Reference the handoff in the implementation PR. Record the actual change, validation, and significant decisions in that PR. If work is committed directly, put that information in the commit description and link the commit from the handoff.
3. Update the handoff's Implementation record with status, implementation date, PR or commit link, and any accepted deviations with their rationale. Preserve the original motivation.
4. Treat the repository copy as the maintained specification. Downloaded copies are snapshots and may become outdated.

The root [DartStat project handoff](../../DARTSTAT_HANDOFF_2026-09-01.md) describes broader application state. These feature handoffs complement that record. Importing a specification does not certify that all its acceptance cases pass or deploy any feature.
