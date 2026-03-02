# Poge PG: pgAdmin but in your browser 

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) [![Website: Poge](https://img.shields.io/badge/Website-Poge-blue?logo=google-chrome&logoColor=white)](https://poge.dev)

Poge is your quick database tool — for those moments when you just need to peek at tables, run a few queries, and get back to building awesome stuff. Skip the heavy tools (pgAdmin, DBeaver), skip the wait. Just open, connect, and you're off! 🚀. You can try demo on https://poge.dev.

**One click deploy on Vercel:**
</br>
<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdev-hari-prasad%2Fpoge&project-name=poge&repository-name=poge"><img src="https://vercel.com/button" alt="Deploy to vercel" height="32" /></a>

## What you get
Simple, speedy UI for tables and SQL with query history, notes, easy export/import and table schema viewers with a local‑first setup so data lives on your machine.

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
pnpm run dev (or npm run dev)
# then open http://localhost:3000
```

### 3) Connect a database
- Go to Databases → Add a server (host, port, database, user, password)
- Connect and start exploring or running queries


## Configuration
This is a Next.js + Tailwind project. All user settings are stored client‑side in the browser (Local Storage). 
Poge includes built‑in export/import:
- Full data export/import uses an encrypted `.enc` file (encrypted JSON).
- Settings‑only export/import uses plain `.json`.

## Security & privacy
If you discover a security issue, follow the reporting instructions in the [Security Policy](https://github.com/dev-hari-prasad/poge?tab=security-ov-file) to open a private report or contact the maintainers. 

## Contributing
Pull requests are welcome. Keep changes small and focused, and prefer clear, straightforward code over cleverness. If you’re unsure or want to report a bug/feature, please open an issue here on: [Github Issues](https://github.com/dev-hari-prasad/poge/issues)


## License
MIT — do what you like, be kind, and don’t remove credit.

---

<p align="center"><sub>Built by <a href="https://github.com/dev-hari-prasad/">Hari</a></sub></p>
