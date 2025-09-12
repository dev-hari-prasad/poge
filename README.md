# Poge

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Poge is a fast, friendly database workbench for the moments you just need to peek at tables, run a couple queries, and move on. Open a tab, connect, and get results quickly — no heavy tooling required.

## What you get
- Simple, speedy UI for tables and SQL
- Query history, notes, and easy export/import
- Table/Schema viewers with sane defaults
- Local‑first by default: data lives on your machine
- Optional PIN lock so you can step away without worry

## Quick start

### 1) Clone and install
```bash
# with pnpm (recommended)
pnpm install

# or with npm
npm install

# or with yarn
yarn
```

### 2) Run it
```bash
pnpm dev
# then open http://localhost:3000
```

### 3) Connect a database
- Go to Databases → Add a server (host, port, database, user, password)
- Connect and start exploring or running queries

## One‑click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fpoge&project-name=poge&repository-name=poge)

Tip: After deploying, set any environment variables you add in Vercel Project Settings. Most of Poge runs entirely in the browser; any custom API routes you add will use your configured env vars.

## Configuration
This is a Next.js + Tailwind project. Most user settings are stored client‑side in the browser (Local Storage). If you add server‑side features, document your env vars here so others can self‑host easily.

## Security & privacy
- Local‑first: credentials and preferences are stored in your browser, encrypted at rest
- PIN lock: quickly lock the UI when you step away
- No unsolicited telemetry
- You control where it runs: locally, or on your own Vercel account

If you discover a security issue, please open a private report or contact the maintainers.

## Contributing
Pull requests are welcome. Keep changes small and focused, and prefer clear, straightforward code over cleverness. If you’re unsure, open an issue first and we’ll figure it out together.

## Roadmap (short and sweet)
- Smoother table editing flows
- More import/export formats
- Smarter connection helpers

## License
MIT — do what you like, be kind, and don’t remove credit.

## Links
- Website: https://poge.dev
- Deploy: Vercel one‑click button above
- Issues: please include steps to reproduce
