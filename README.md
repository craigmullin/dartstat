# DartStat

DartStat is a mobile-first darts practice and statistics application. The first
complete routine is Cricket Practice.

## Enhancement planning

See [enhancement handoffs](docs/handoffs/README.md) for Cricket and ’01 scorer
requirements, their motivation, and the implementation-record workflow.

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
