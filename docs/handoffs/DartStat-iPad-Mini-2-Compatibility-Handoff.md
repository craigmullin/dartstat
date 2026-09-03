# DartStat: iPad mini 2 scoring compatibility

Implementation handoff for Roger · September 3, 2026

## Request and outcome

Craig wants to reuse his iPad mini 2 running iOS 12.5.8 as a wall-mounted DartStat scoreboard. Opening DartStat directly in Safari currently produces a blank page. Prior trouble with DartCounter's camera site is a separate issue; this request concerns DartStat and local game scoring, not video streaming.

Deliver a usable existing DartStat experience on this device: Google sign-in, two- and three-player Cricket, calculator-style ’01, Undo, game recovery, and readable touch controls. Prioritize portrait scoring, with functional landscape and Safari Add to Home Screen launch. Preserve modern-phone behavior and the existing design. Supporting every old browser is outside this request.

**Assessment:** there is a credible compatibility path, but support is not yet proven. The build and source contain incompatibilities worth fixing; the exact first failure on Craig's iPad has not been captured. Do not mark this complete solely because a build succeeds or a modern browser renders at iPad dimensions.

## Evidence reviewed

Repository baseline: `develop` at `d0646547d288141a859802a1a993a9bad4faa862`. Recheck current code before implementation. `NOW.md` is stale; use the source and newer handoffs for implemented features.

| Location | Finding and implication |
| --- | --- |
| `package.json`, `vite.config.ts` | Vite 7, React 19, Firebase 12; no explicit older-browser build target or legacy plugin. Vite 7 defaults to Safari 16.0. This is a strong candidate for startup failure, not device-confirmed diagnosis. |
| `index.html`, `src/main.tsx` | Empty root and a module entry; no visible pre-React fallback. A script parse/import failure can leave a blank page. |
| `src/x01Totals.ts`, `src/X01View.tsx`, `src/x01.ts`, `src/competitiveCricket.ts` | Runtime `.at(-1)` calls in scoring/undo paths. iOS 12 lacks this API; lowering a syntax target alone does not supply it. |
| `src/competitiveCricket.ts`, `src/jdc.ts`, `src/App.tsx` | `Object.fromEntries` and `flatMap` also warrant an audit against the actual iOS 12.5.8 engine. Do not assume every feature with a modern-looking name is absent. JDC prompt generation happens during module evaluation. |
| `src/styles.css` | Uses `color-mix()`, `min()/max()/clamp()`, flex `gap`, `:has()`, `inset`, and modern color notation. Missing support can break spacing, selected states, sizing, or backgrounds after startup is repaired. |
| `src/App.tsx`, `src/auth.ts`, `src/firebase.ts` | App requires Firebase authentication; iPad selects redirect sign-in. Firebase initializes eagerly; persistence setup is not awaited/caught. Theme storage is read during initial render. Investigate failures here if rendering still stops. |
| `src/competitiveCricket.ts`, `src/x01.ts`, `src/themes.ts` | Competitive games use UID-scoped localStorage; some reads and writes are unguarded. Preserve saved games and handle storage failures explicitly. |
| `public/site.webmanifest`, app entry, repository tree | Manifest and Apple touch icon exist, but no service-worker implementation/registration was found. Home-screen launch does not establish offline cold-start support. |

Sources: [Vite 7 browser targets](https://vite.dev/blog/announcing-vite7), [Array.at reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at), [Safari flex-gap release](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/). These findings describe the reviewed source, not proof that the deployed site is built from this exact commit.

## Roger's first pass

### 1. Establish the first startup failure

- Confirm the deployed URL/build and reproduce with a production build, not only Vite's development server. Record device, iOS version, first error, and failing asset or API.
- Use Safari remote Web Inspector with the actual iPad if a compatible Mac is available. If unavailable, add a small temporary diagnostic surface that works before the application bundle loads; show a safe error category/build identifier, never tokens or account data.
- Keep static, old-browser-safe loading/failure text visible until React successfully mounts. A React error boundary can handle later render failures, but cannot catch syntax failures before React loads. Offer a reload action without clearing saved games; avoid endless automatic reloads.

### 2. Make the production JavaScript executable

- Start with an explicit `build.target` covering Safari/iOS 12 (for example `safari12` and `ios12`), plus targeted runtime replacements/polyfills. Verify every emitted entry and imported dependency, including Firebase, is transformed appropriately. Changing only TypeScript's target is insufficient.
- For application `.at(-1)` calls, direct indexing (`items[items.length - 1]`) is a small solution; preserve empty-array behavior. Audit built dependencies as well as source. Load any required polyfills before modules that use them are evaluated, and bundle them with the app.
- If a separate compatibility bundle is needed, use a Vite-7-compatible `@vitejs/plugin-legacy` release and its required dependencies. Inspect that version's documentation and emitted HTML. Safari 12 supports modules, so do not assume a simple `nomodule` script will run there. Prove that the plugin's feature detection selects a working bundle, or explicitly target/polyfill the module bundle through the plugin's supported `modernTargets`/`modernPolyfills` configuration. Avoid conflicting target settings or blindly using today's newest plugin with Vite 7.
- Retain current React and Firebase versions initially. Firebase 12 moved to ES2020; transform its code and verify required browser APIs before considering a downgrade. Do not lower security settings to make an old client load.

References: [Vite legacy-plugin guidance](https://github.com/vitejs/vite/tree/main/packages/plugin-legacy), [Firebase 12.0 release notes](https://firebase.google.com/support/release-notes/js#version_1200_-_july_17_2025), [Firebase supported environments and polyfills](https://firebase.google.com/docs/web/environments-js-sdk). Browser-family support tables do not certify this exact device with this dependency set.

### 3. Repair layout and interaction fallbacks

- Provide ordinary widths/max-widths, fixed/rem-based font sizes and padding before enhanced `min()/max()/clamp()` declarations. Keep opaque themed backgrounds as fallbacks for mixed colors and blur effects.
- Supply compatible colors/shadows. When an unsupported expression lives inside a custom property, use a supported base token and an appropriate `@supports` override; a prior declaration alone may not survive invalid-at-computed-value behavior.
- Replace required `:has(input:checked)` styling with explicit state classes or compatible selectors. Retain a visible selection cue and focus styles without requiring modern selectors.
- Use grid or margins where flex-gap is essential. `@supports (gap: ...)` alone cannot distinguish old Safari's grid-gap support from flex-gap support. Supply physical positioning fallbacks where shorthand/logical properties are unsupported.
- Check scores, all seven Cricket targets, active-player indication, and primary controls at roughly 768×1024 CSS pixels and landscape, accounting for Safari chrome. Aim for no routine scrolling in portrait, but allow scrolling rather than hiding controls or shrinking touch targets below 44px.
- Verify the on-screen ’01 keypad works without summoning the software keyboard on each button press; player-name editing still needs normal text entry. One tap must cause one action. Test rapid taps and Undo after a win on the actual touchscreen.
- Keep all themes legible, especially Pink and Pink Dark, and retain the invariant orange brand period. Cosmetic simplification is acceptable; changing scoring behavior is not.

### 4. Verify authentication and persistence

- Exercise Google sign-in, redirect return, reload, sign-out, and sign-in again in Safari and the home-screen launch. Verify these separately; do not assume their login/storage state is shared.
- Preserve Firebase project `dartstat-cmullin`, the existing custom auth domain, and all UID boundaries. Surface initialization/auth/storage errors rather than leaving a blank screen or perpetual loading state. Await/catch persistence setup where needed.
- Reuse existing competitive storage keys and schemas, including legacy version-1 ’01 recovery. Preserve raw Cricket darts and version-2 ’01 turn totals; never synthesize darts from totals. Do not clear browser data or delete an unfinished game as a routine compatibility fix.
- If saving fails, keep the active in-memory score usable and clearly say reload recovery is unavailable. Never claim a failed write succeeded. Test normal storage recovery before acceptance; graceful failure is a contingency, not a substitute for it.
- Internet is required to initially load/sign in. During a loaded game, temporary network loss must not block local scoring. Do not promise reopening offline without separately implementing and verifying that capability.

## If full-app startup remains blocked

First isolate the failing dependency and consider lazy-loading non-scoring screens so they cannot break the scorer at startup. Record the precise blocker before proposing larger changes.

A small local-only scorer entry using the same Cricket/’01 rules and UI is a possible fallback if Firebase/Google cannot function reliably on iOS 12. It would need its own explicit device-local storage namespace and clear limits: no account history or cloud sync, no automatic migration of another account's games. Present that tradeoff to Craig before changing the current sign-in requirement. Do not fork scoring rules or silently turn the whole app into a guest app.

## Wall-mounted use

- After Safari works, verify Add to Home Screen and add the appropriate Apple standalone metadata if required; retain existing icons. Treat installation and sign-in as separate acceptance checks.
- Do not depend on Screen Wake Lock on iOS 12. Document the device's available Auto-Lock setting for keeping the display on during play; optional wake-lock support on newer devices must be feature-detected. Browser code cannot override iOS auto-lock reliably on this target.
- Test a 30-minute scoring session and a manual lock/unlock or background/resume cycle. If iOS reloads the page, offer recovery of the locally saved game after authentication is restored. Avoid unnecessary animation or constant background polling.

## Acceptance checklist

Run `npm run lint`, `npm test`, and `npm run build`. Add focused regression coverage for compatibility paths actually changed, especially undo and storage errors. Modern WebKit emulation, viewport changes, and user-agent spoofing are useful supplemental checks but do not reproduce iOS 12's engine.

| Check | Required result |
| --- | --- |
| Actual mini 2, iOS 12.5.8, production build | Visible app and successful sign-in; no startup exception or endless loading |
| Two-/three-player Cricket | Start, enter marks/Miss, score excess hits, advance, Undo, win and rematch correctly |
| Calculator ’01 | 501 → enter 60 → Next player gives 441; blank skip, Bust, automatic bust, trusted finish and Undo behave as existing handoff specifies |
| ’01 edge cases | Double-out: 2 minus 1 busts; 20 minus 20 wins; undo win restores 20; no duplicate turn from one activation |
| Recovery | Reload with draft, pending Cricket darts, after bust, and after win restores the correct game; existing version-1 ’01 remains resumable |
| Identity/storage | Same account resumes its game; another account cannot inherit it; storage failure produces a clear message without crashing |
| Layout | Portrait/landscape, both rosters, readable scores/marks, accessible controls and visible selections; Pink/Pink Dark checked |
| Home screen | Launch, sign-in return, close/reopen and recovery verified separately from Safari |
| Sustained use | 30 minutes scoring plus sleep/wake and brief network loss; no lost committed scores or blocked local input |
| Current browsers | Existing Android/desktop scoring, sign-in, themes and saved data still work |

For the first review, provide the compatibility commit, commands/results, bundle-size impact, an authorized device-test URL, and screenshots/video from Craig's iPad showing sign-in → Cricket → ’01 → reload recovery. If device access is unavailable, finish the code and automated checks and label device acceptance pending. This document authorizes planning only; deployment requires Craig's explicit authorization under `AGENTS.md`.

## Implementation record

- Status: First compatibility build deployed; actual-device validation pending.
- Handoff date: September 3, 2026.
- Implementation PR/commit: `ec1d1fa` (`support iOS 12 scoring devices`) on `develop`, September 3, 2026.
- Confirmed device root cause: Pending; source-level compatibility findings listed above.
- Baseline validation for this documentation change: lint passed; all 48 tests across 9 files passed; production build passed with the existing chunk-size advisory (main JS approximately 799 kB, 239 kB gzip). These modern-runtime checks do not establish iOS 12 compatibility.
- Validation of compatibility implementation: Explicit Safari 12 production target; `core-js` ES stable polyfills load before the application; known application `.at()` calls removed; old-WebKit selection, color, and positioning fallbacks added; pre-React loading/failure surface and Apple standalone metadata added. Lint passed, all 48 tests across 9 files passed, and the production build passed. Main application JavaScript is approximately 807 kB (240 kB gzip), plus a 223 kB (82 kB gzip) compatibility/bootstrap chunk. Firebase Hosting deployment to `dartstat-cmullin` completed September 3, 2026. Device acceptance remains pending.
- Accepted deviations: None. Record any agreed fallback and its limitations here.

Companions: [Cricket scorer](DartStat-Cricket-Handoff.md), [calculator-style ’01](DartStat-01-Calculator-Entry-Handoff.md), [project handoff](../../DARTSTAT_HANDOFF_2026-09-01.md).
