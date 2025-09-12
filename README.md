# Poge

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Poge is a fast and friendly database workbench for PostgreSQL, and the moments when you just need to peek at tables, run a couple of queries, and move on. Open a tab, connect, and get results quickly — no heavy tooling required.

## Links
- Website: https://poge.dev
- Issues: please include steps to reproduce

## What you get
- Simple, speedy UI for tables and SQL
- Query history, notes, and easy export/import
- Table/Schema viewers with sane defaults
- Local‑first by default: data lives on your machine
- Optional PIN lock so you can step away without worry

## One‑click deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fthe-not-boring%2Fpoge-pg&project-name=poge-pg&repository-name=poge-pg)

## Quick start on your machine

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

Tip: After deploying, manage any required environment variables in your Vercel project settings or your provider. Poge runs entirely in the browser, so no variables are needed by default. Any custom API routes you add will automatically use the environment variables you configure in Vercel or your provider.

## Configuration
This is a Next.js + Tailwind project. All user settings are stored client‑side in the browser (Local Storage). 
Poge includes built‑in export/import:
- Full data export/import uses an encrypted `.enc` file (encrypted JSON).
- Settings‑only export/import uses plain `.json`.

## Security & privacy
- Local‑first: credentials and preferences are stored in your browser, encrypted at rest
- PIN lock: quickly lock the UI when you step away
- No unsolicited telemetry
- You control where it runs: locally, on your own Vercel account, or anywhere else.

If you discover a security issue, please open a private report or contact the maintainers.

## Contributing
Pull requests are welcome. Keep changes small and focused, and prefer clear, straightforward code over cleverness. If you’re unsure, open an issue first and we’ll figure it out together.

## Roadmap (short and sweet)
- Smoother table editing flows
- More import/export formats
- Smarter connection helpers

## License
MIT — do what you like, be kind, and don’t remove credit.
