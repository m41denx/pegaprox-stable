# Manual smoke checklist (web UI)

## Production-like (Flask serves `web/dist/`)

1. From repo root: `cd web && pnpm install && pnpm build`
2. Run PegaProx so `/` serves `web/dist/index.html` and `/assets/*` + `/legacy-app.js` + `/legacy-ui-shell.html` are reachable (same origin as `/api`).
3. Open `/` in the browser.

## Dev (`pnpm dev`)

1. Start the Flask API on port 5000 (Vite proxies `/api` to `127.0.0.1:5000`).
2. `cd web && pnpm dev` — open the printed URL.
3. The UI loads inside an **iframe** pointing at `/legacy-ui-shell.html` (full legacy app: login, dashboard, modals, VNC/xterm, charts, PDF, i18n).

## Checks

1. Login and session reload.
2. Cluster list, VM modals, node shell / VNC if used.
3. OIDC callback still hits `/oidc/callback` (top-level); the shell is the same as before, only the bundle is precompiled instead of Babel-in-browser.
