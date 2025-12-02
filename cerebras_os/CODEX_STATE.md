## Codex session notes (React-only stack)

- Working dirs:
  - New React/Vite monorepo: `cerebrasv2` (frontend + Node/Express backend).
  - Legacy Blazor app remains in `cerebras_os` for reference but is no longer part of the active build.

- Backend (Node / Express, under `cerebrasv2/server`):
  - `server/index.ts` spins up the single `/api/desktop` endpoint plus `/health`.
  - AI access is abstracted via `server/providers/` (OpenRouter + Cerebras GLM 4.6 implementations). Pick via `DESKTOP_AI_PROVIDER` env.
  - `server/sessionManager.ts` and `server/backgroundContextLoop.ts` keep per-session widget/context data and run the persistent AI background loop for live tiles.
  - Run with `npm run dev:server` (or `npm run dev` for both client+server). Build via `npm run build` which now includes `tsconfig.server.json`.
  - Requires `.env` with either `OPENROUTER_API_KEY` or `CEREBRAS_API_KEY` depending on provider (see `cerebrasv2/.env.example`). Optional `DESKTOP_API_PORT` (default 4000).

- Frontend (React/Vite in `cerebrasv2/src`):
  - App shell lives in `App.tsx` with desktop layout components under `src/components/`.
  - `src/services/aiClient.ts` hits `/api/desktop`; Vite dev server proxies `/api` → Node backend (configurable via `VITE_API_BASE`/`DESKTOP_API_ORIGIN`).
  - Context hook (`hooks/usePersistentContext.ts`) keeps per-session state and feeds commands.

- Dev workflow:
  1. Copy `.env.example` → `.env` and add the relevant API key(s) plus set `DESKTOP_AI_PROVIDER`.
  2. `npm install` (already done once).
  3. `npm run dev` to start both Vite (5173) and the backend API (4000). Frontend will proxy `/api/*` to the backend automatically.
