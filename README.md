# DartStat

DartStat is a mobile-first darts practice and statistics application. The first
complete routine is Cricket Practice.

## Local development

Requirements: Node.js 22+, npm 10+, and Firebase CLI 15+.

```bash
npm install
npm run dev
```

The checked-in Firebase web configuration connects to the dedicated
`dartstat-cmullin` project. Firebase web configuration is public; account data
is protected by Google Authentication and ownership-scoped Firestore rules.

## Commands

- `npm run dev` — local development
- `npm run lint` — static analysis
- `npm test` — unit tests
- `npm run build` — type-check and production build

Do not deploy without explicit authorization.
