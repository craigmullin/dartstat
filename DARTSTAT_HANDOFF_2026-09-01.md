# DartStat handoff

Date: 2026-09-01  
Repository: `git@github.com:craigmullin/dartstat.git`  
Working branch: `develop`  
Firebase project: `dartstat-cmullin`  
Production URL: `https://dartstat.craigmullin.com`

## Read first

Before substantive work, read:

1. `AGENTS.md`
2. `PROJECT.md`
3. `NOW.md` (some entries are stale; see this handoff for the newer state)
4. This handoff

Preserve Firebase project `dartstat-cmullin`. Keep raw dart results as the source of truth, scope all user data to the authenticated Firebase UID, and run lint, tests, and the production build. Do not deploy or change production security rules without explicit authorization.

## Current repository state

- Local branch `develop` tracks `origin/develop` and was clean when this handoff was written.
- Feature commit: `1edda25 add first two routines`
- Auth-domain commit: `b6ba70b update auth base url`
- React 19, TypeScript, Vite, Firebase Authentication, Firestore, and Firebase Hosting.
- Google Authentication uses browser-local persistence.
- Local development always uses popup sign-in, including on narrow/mobile viewports, because redirecting from localhost through the production custom auth domain can lose Firebase's sessionStorage state.
- Firestore data is stored below `users/{uid}/practiceSessions/{sessionId}`.
- Checked-in rules allow a signed-in user to access only their own UID namespace.

## Implemented product experience

### Cricket MPR

The first playable routine is Cricket Practice:

- Targets: `20`, `19`, `18`, `17`, `16`, `15`, and Bull.
- Three darts per target; 21 darts total.
- Numbered targets accept 0–3 marks per dart.
- Bull accepts 0–2 marks per dart; treble Bull is invalid.
- Raw per-dart marks are stored.
- Total marks and MPR (`total marks / completed three-dart visits`) are derived.
- The UI provides automatic target progression, undo, final review, Firestore save, recent results, history detail, and Cricket lifetime/target statistics.

Domain logic and tests:

- `src/cricket.ts`
- `src/cricket.test.ts`

### JDC Challenge

The second playable routine contains 57 darts across 19 three-dart visits:

1. Three darts at each target from 10 through 15.
2. One intended dart at each double from D1 through D20, followed by double Bull.
3. Three darts at each target from 15 through 20.

Shanghai-section rules:

- Only the active wedge scores.
- Singles, doubles, and trebles receive their normal wedge score.
- A single, double, and treble in any order adds a 100-point Shanghai bonus.
- Example: `S10 + D10 + T10 = 60 + 100 = 160`.

Doubles-section rules:

- Only the intended double counts; accidental doubles score zero.
- A correct numbered double scores 50.
- The final dart scores 100 only for center/double Bull.
- Outer Bull and all other results score zero.

The UI provides section-aware scoring controls, progression, undo, review, section subtotals, total score, Firestore save, and mixed-routine history.

Domain logic and tests:

- `src/jdc.ts`
- `src/jdc.test.ts`

## Practice-session model

Persistence is implemented in `src/data.ts`.

Completed sessions use:

```ts
{
  routineId: "cricket-mpd" | "jdc-challenge",
  status: "completed",
  startedAt: Date,
  completedAt: serverTimestamp(),
  darts: PracticeDart[]
}
```

Cricket darts retain target, dart number, and marks. JDC darts retain section, intended target, visit, dart number, and actual result. Totals, MPR, Shanghai bonuses, and section scores are derived rather than treated as authoritative stored values. The legacy internal routine ID remains `cricket-mpd` for compatibility with existing stored sessions; it is not a user-facing metric label.

## Dart sets and equipment statistics

Authenticated users can maintain an optional private collection of dart sets under `users/{uid}/dartSets/{dartSetId}`. Each active set retains a name, color, weight in grams, and tip compatibility (`steel`, `soft`, or `both`). Sets are archived instead of deleted so historical references remain intact.

Before a routine begins, the user may select an active dart set or continue with no set recorded. New sessions optionally retain both `dartSetId` and a `dartSetSnapshot` containing the equipment details at the time of practice. Existing sessions without these fields remain compatible and are grouped as unspecified equipment.

The Stats page derives separate equipment comparisons for Cricket MPR and JDC Challenge score, including session count, averages, best results, and Cricket rounds. Equipment domain logic and tests are in `src/dartSets.ts` and `src/dartSets.test.ts`.

Both routine review screens include optional practice notes for grip, stance, release, adjustments, or other observations. Notes are retained while editing the last dart, saved with the completed session, and displayed in History detail.

History detail supports editing the dart set attached to an existing session. A session can be assigned to any active set, reassigned, or cleared without changing raw dart results or notes; equipment statistics refresh from the updated session record.

The main Stats page contains separate lifetime sections for Cricket MPR and JDC Challenge. JDC statistics include challenge count, average and best total score, plus average scores for Shanghai 10–15, Doubles 1–Bull, and Shanghai 15–20.

Playable routine cards on the Practice page show the best saved result for that routine: MPR for Cricket and total score for JDC. A routine without saved results displays `Best —`.

On mobile review screens, headings and result rows use compact spacing and the edit/save actions remain in a persistent two-button bar above the bottom navigation. This keeps saving available while long Cricket or JDC results and optional notes scroll.

Scoring actions use a single vertical stack with scoring hits first and `MISS` isolated at the bottom. Cricket and JDC action buttons show only their action labels, without redundant mark or point-value sublabels.

## Settings and themes

A Settings destination and device-local theme picker are complete. The selected theme is stored under local-storage key `dartstat-theme` and applied with `data-theme` on the document root.

Available themes:

1. Pink (original)
2. Orange
3. Green
4. Graphite
5. Electric Violet
6. Cobalt
7. Acid Lime
8. Pink Dark

Pink Dark uses the supplied design reference, including:

- Deep: `#3A0F24`
- 800: `#6B1641`
- 700: `#9E1F5C`
- Core: `#FF3D9A`
- 400: `#FF66B2`
- 200: `#FFB3D1`
- Dark light/surface token: `#2A0A18`

Theme definitions and tests:

- `src/themes.ts`
- `src/themes.test.ts`

Shared theme styling is in `src/styles.css`. Settings navigation exists in desktop and mobile navigation.

The period in every visible `DartStat.` wordmark uses the invariant CMDC orange `#FF9D00`, matching craigmullin.com. Themes must not override this brand punctuation color.

## Authentication and custom domain

Firebase config in `src/firebase.ts` now uses:

```ts
authDomain: "dartstat.craigmullin.com"
```

Known production configuration reported by the owner:

- Google provider enabled.
- OAuth audience is External and in production.
- Firebase authorized domains include:
  - `localhost`
  - `dartstat-cmullin.firebaseapp.com`
  - `dartstat-cmullin.web.app`
  - `dartstat.craigmullin.com`
- Custom-domain auth handler is reachable at `https://dartstat.craigmullin.com/__/auth/handler`.

Google OAuth web-client configuration should retain both redirect URIs:

```text
https://dartstat.craigmullin.com/__/auth/handler
https://dartstat-cmullin.firebaseapp.com/__/auth/handler
```

Authorized JavaScript origins should include:

```text
https://dartstat.craigmullin.com
https://dartstat-cmullin.firebaseapp.com
```

One external user encountered Google `Error 400: redirect_uri_mismatch` after the custom-domain change. If it persists, use the Google error page's details to compare the exact `redirect_uri` and `client_id` against the OAuth web client being edited. A persistent mismatch usually means the redirect URI was added to a different OAuth client. OAuth changes may take several minutes to propagate.

The current application collapses most Firebase sign-in failures into a generic message. A useful next improvement is to surface a safe, specific message for codes such as `auth/unauthorized-domain`, `auth/popup-blocked`, and redirect failures while logging the diagnostic code.

## Verification

The last complete verification after the routines and theme system was added:

- `npm run lint` passed.
- `npm test` passed: 12 tests across 4 files.
- `npm run build` passed.
- Vite reports a non-blocking warning that the main JavaScript chunk exceeds 500 kB after minification.

Run before handing off or deploying:

```bash
npm install
npm run lint
npm test
npm run build
```

If Firebase CLI is not installed globally, use:

```bash
npx --yes firebase-tools login
npx --yes firebase-tools use dartstat-cmullin
npx --yes firebase-tools deploy --only hosting
```

Do not deploy unless the owner explicitly authorizes it.

## Important follow-up work

1. Confirm Google sign-in works for an unrelated external Google account on both desktop and mobile.
2. Improve authentication error reporting so the Firebase error code is visible safely.
3. Update stale `NOW.md` statements after production authentication is confirmed.
4. Consider adding JDC-specific lifetime statistics; the current Stats page focuses on Cricket MPR.
5. Consider route/code splitting later to address the Vite bundle-size advisory.

## Key files

- `src/App.tsx` — application shell, navigation, both scoring flows, review, history, stats, and Settings.
- `src/styles.css` — responsive UI and all theme token mappings.
- `src/data.ts` — UID-scoped Firestore session persistence.
- `src/auth.ts` — popup-versus-redirect Google sign-in behavior.
- `src/firebase.ts` — Firebase project and custom auth-domain configuration.
- `src/cricket.ts` — Cricket MPR domain rules.
- `src/jdc.ts` — JDC Challenge domain rules.
- `src/themes.ts` — theme catalog and local persistence.
- `firestore.rules` — private UID-scoped Firestore rules.
