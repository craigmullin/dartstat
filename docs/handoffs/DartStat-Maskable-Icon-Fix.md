# DartStat maskable app icon

Date: September 2, 2026

## Request and decision

Craig reported that the Firefox/Android home-screen icon did not look like
SpikeStat's sister app. DartStat supplied only ordinary icons, with transparent
corners and a pre-rounded pink tile. SpikeStat also supplied a dedicated
maskable PNG. Add the equivalent manifest entry and a separate opaque,
full-background DartStat icon with padding for launcher masks.

Keep the ordinary 192/512 icons, favicon, Apple touch icon, and master artwork.
The new PNG is an imagegen adaptation of `public/icon-512.png`, exported at
512x512. Prompt intent: preserve the thick white D and upper-right bullseye;
extend the pink background to the square edges; keep the complete mark inside
the centered maskable safe circle. This is not a pixel-identical transformation.

## Acceptance and release

- Manifest contains a separate PNG entry with `purpose: "maskable"`.
- New asset is opaque, square, 512x512, with the complete mark inside the
  [40%-radius safe circle](https://www.w3.org/TR/appmanifest/#icon-masks).
- Production build contains the PNG and updated manifest.
- Run repository lint, tests, and build.
- After an authorized deployment, remove the old home-screen shortcut and
  add DartStat again using Firefox on the original Android device. Compare
  with SpikeStat for crop, background, and apparent size.

## Implementation record

- Implemented September 2, 2026 on `fix/maskable-app-icon`; PR targets `develop`.
- Validation: lint passed; all 36 tests passed; production build passed with
  the existing bundle-size advisory. PNG dimensions, opacity, and white-mark
  safe-circle containment verified. Conservative padding may make the mark
  appear smaller than SpikeStat's on some launchers; compare on the device.
- No application scoring, authentication, or Firebase configuration changed.
- Device verification remains pending; a missing maskable icon is a supported
  explanation, not a confirmed diagnosis of the particular launcher's behavior.
- Deployment requires explicit authorization under root `AGENTS.md`.
