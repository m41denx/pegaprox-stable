# Manual smoke checklist (web UI)

Run the Flask server, then either:

- **Production-like:** `cd web && pnpm install && pnpm build`, open `https://<host>:<port>/` (or http). Flask must serve `web/dist/` (see `pegaprox/api/settings.py`).
- **Dev:** `cd web && pnpm dev` with API proxied to the backend (`vite.config.ts` `server.proxy` → `127.0.0.1:5000`).

Checks:

1. **Login** — Local user signs in; invalid password shows an error; optional TOTP step appears when required.
2. **Session** — Reload page while logged in; still authenticated (`GET /api/auth/check`).
3. **Logout** — Sign out clears session and returns to login.
4. **Clusters** — After login, cluster list loads from `GET /api/clusters` and selection persists (localStorage).
5. **Theme** — Theme buttons change accent; logged-in users persist via `PUT /api/user/preferences`.
6. **OIDC** — With OIDC enabled: “Sign in with SSO” requests authorize URL; callback on `/oidc/callback` exchanges code (full flow needs real IdP).
