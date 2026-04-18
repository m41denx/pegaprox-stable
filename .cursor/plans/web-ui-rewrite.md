# PegaProx web UI: React rewrite (revised — all work under `web/`)

## Constraint update (from product owner)

- All frontend work lives under **`web/`** as a **normal Node project**: `package.json`, lockfile, Vite, TypeScript sources, and a **compiled** output (no hand-maintained giant `index.html` bundle as the source of truth).
- **Package manager**: use **pnpm** in that folder (per original stack request); `package.json` is still the standard manifest (`pnpm` is not `npm`, but this is a proper package layout).
- **HTML/JS/CSS** consumed by Flask must be **emitted by the TypeScript/Vite build**, not authored as the primary app.

## Current state (brief)

- Legacy UI: ordered concat of **`web/src/*.js`** (~79k LOC) → `web/Dev/build.sh` → `web/index.html` / `web/index.html.original`.
- Flask: [`pegaprox/api/settings.py`](pegaprox/api/settings.py) serves `send_from_directory(WEB_DIR, 'index.html')` with `WEB_DIR = 'web'` ([`pegaprox/constants.py`](pegaprox/constants.py)).

## Target layout under `web/`

```text
web/
  package.json              # scripts: dev, build, lint, ...
  pnpm-lock.yaml
  vite.config.ts
  tsconfig.json
  components.json           # shadcn
  index.html                # Vite shell (minimal), references /src/main.tsx
  public/                   # favicon, any static files copied verbatim to dist
  src/                      # TypeScript + React (THE application source)
    main.tsx
    lib/api.ts              # axios instance, /api base, credentials
    ...
  legacy/                   # OPTIONAL first step: move current web/src/*.js here
                            # so `web/src/` is free for TS without losing reference
  Dev/build.sh              # replace or wrap: call `pnpm build` for production
```

**Name collision resolution:** today `web/src/` holds legacy `.js` modules. Before (or as part of) scaffolding, **move** those files to **`web/legacy/`** (same filenames, update [`web/Dev/build.sh`](web/Dev/build.sh) paths if the old pipeline must run briefly) so **`web/src/`** is exclusively the new TypeScript app—this matches a “normal” Vite project.

## Build output and Flask

- **Vite `build.outDir`**: e.g. **`web/dist`** (recommended; keeps repo root clean and avoids overwriting `web/images` / other deploy assets).
- **Flask** (small backend change): serve **`web/dist/index.html`** for **`/`** and **`/oidc/callback`**, and expose **`/assets/*`** from **`web/dist/assets/`** (Vite default hashed filenames).
- Keep **`/static/*`** and **`/images/*`** as today (noVNC, fonts, logos, xterm, etc. under repo `static/` and `web/images` or equivalent).

## Stack (unchanged intent)

| Layer | Choice |
|--------|--------|
| UI | Tailwind + **shadcn/ui**; themes = different **CSS variable** presets (base `--primary` etc.) |
| Data | **Jotai** + **Axios** (`withCredentials`, shared auth header logic matching current `getAuthHeaders`) |
| Icons | **lucide-react**; **react-icons** only if needed |
| Heavy deps | noVNC, xterm, Chart.js, marked/DOMPurify, jsPDF — npm packages where possible, or retain `/static` loaders until ported |

## Migration / sequencing

1. **Relocate** legacy `web/src/*.js` → `web/legacy/`; adjust concat build temporarily OR freeze legacy and stop shipping it once new shell exists.
2. **Scaffold** Vite+React+TS+Tailwind+shadcn in **`web/`** with pnpm.
3. **Theme + API client + auth/login** (parity with legacy auth/OIDC callback on `/oidc/callback`).
4. **Vertical feature ports** from `web/legacy/` into `web/src/` (dashboard shell, then modals, etc.).
5. **Release**: Dockerfile/README/`version.json` — ensure **`pnpm install && pnpm build`** runs so **`web/dist`** exists in artifacts; deprecate concat-first workflow.

## Testing

- Vitest under `web/` for atoms, axios layer, small utils; manual smoke against local Flask.

## Todos

- [ ] Move legacy concat sources from `web/src/*.js` to `web/legacy/`; free `web/src` for TS
- [ ] Add `web/package.json`, pnpm, Vite, React, TS, Tailwind, shadcn, jotai, axios, lucide-react, react-icons
- [ ] Vite build → `web/dist`; wire Flask to `dist` + `/assets`
- [ ] Theme system (CSS variables + persisted Jotai atom)
- [ ] Axios auth/session parity; login + OIDC
- [ ] Port features incrementally; retire `web/Dev/build.sh` production path when parity reached
- [ ] CI/docs: `pnpm build` in `web/`
