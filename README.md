# MiTRAA-Edu — Frontend

Role-based education portal (web + mobile-responsive), built with **Angular 21** (standalone components, zoneless change detection, signals + RxJS) against a **json-server fake API**.

## Quick start

```bash
npm install          # .npmrc sets legacy-peer-deps (works around an npm 10 peer-resolution bug)
npm run dev          # mock API on :3000 + Angular on http://localhost:4200 (proxied /api)
```

Or run them separately: `npm run mock:api` and `npm start`. Reset demo data any time with `npm run mock:seed`.

### Ports

| Server | Port | URL |
|---|---|---|
| Angular app (open this one) | **4200** | http://localhost:4200 |
| Fake API (json-server) | **3000** | http://localhost:3000/api |

The app proxies every `/api` call to port 3000 (see `proxy.conf.json`), so you only need to open the app.

### Demo accounts (password `Password@123`)

| User type | Login | OTP |
|---|---|---|
| Student | `student@mitraa.edu` | — |
| Teacher / Staff | `teacher@mitraa.edu` | — |
| Parent / Guardian (2 children) | `parent@mitraa.edu` | — |
| Principal / HOD | `principal@mitraa.edu` | `123456` |
| Management / Trustee | `trustee@mitraa.edu` | `123456` |
| Exam Controller (Phase 2) | `exam@mitraa.edu` | blocked until `phase2Enabled` |

Feature flags live in `mock-api/seed.js` → `config` (registration, OTP, MFA roles, payments, Phase 2, session timeout).

## Folder structure

```
mock-api/                 json-server host: auth, OTP, tenant/campus/class/relationship scoping,
                          permission checks, workflow rules, audit log (server.js) + seed data (seed.js)
src/
  assets/
    scss/                 _variables, _mixins, _tokens (light/dark/high-contrast, role colours),
                          _base, _components (buttons, forms, cards, tables…), _utilities
    images/               logo, hero illustration, empty state
  environments/
  app/
    core/                 app-wide singletons, no UI
      auth/               AuthService (signals), guards, idle/expiry session timeout
      http/               ApiService, interceptors (auth, loading, errors), error normalizer
      models/             typed domain + role + config models
      navigation/         role menus (from the flowchart), title strategy
      services/           config, context (selected child / campus), lookups, notifications,
                          preferences (theme, a11y, language), toasts, loading
      state/              loader() / action() — signal state over RxJS streams; safe storage
    shared/               reusable, stateless UI
      ui/                 icon, page-header, stat-card, data-table, bar-chart, tabs, load-state…
      directives/ pipes/ utils/
    layout/               public-layout (entry flow), shell (sidebar + topbar)
    features/
      auth/               landing → select role → login → OTP → (forgot password, register)
      dashboard/          role home
      common/             cross-role pages: notices, complaints, threads, PTM, profile, timetable,
                          approvals, performance, insight (reports), search, notifications, help
      student/ teacher/ parent/ principal/ management/ exam-controller/   (each lazy-loaded)
```

## Key patterns

- **Signals + RxJS.** `loader(params, fetch)` turns reactive params into a `switchMap`ed request and exposes `value / loading / error / empty` signals; changing params (e.g. switching child) cancels the old request and clears stale data. `action(fn)` wraps mutations with `pending/error` and blocks double submits.
- **Security in the UI** (the API re-checks everything): `authGuard`, `roleGuard`, `permissionGuard`, `phase2Guard`, `*appCan="'permission'"`, 401 → sign-out, idle timeout with warning, cross-tab logout, protected data cleared on logout/account change.
- **Performance.** Every page is a lazy chunk; OnPush everywhere; ~100 kB initial transfer in production.
- **Accessibility.** Keyboard-navigable tabs/menus, skip link, focus rings, labelled forms, text alternatives for every chart, theme / text size / contrast / reduced-motion options.
- **Data-driven report screens.** Analytics pages (principal, management, Phase 2) render `/api/insights/:id` through one `InsightPage` — tabs per flowchart sub-function, CSV export, print.

## Deploy to Netlify

`netlify.toml` is ready: Netlify builds the app (`npm run build` → `dist/mitraa-edu/browser`), serves the mock API as a
Netlify Function (`netlify/functions/api.js`) at the same `/api/*` URLs, and falls back to `index.html` for deep links.

**Option A — from GitHub (auto-deploys on every push):** push this repo, then in Netlify choose
*Add new site → Import an existing project → GitHub* and pick the repo. All settings come from `netlify.toml`.

**Option B — from this computer:**

```bash
npx netlify-cli login            # opens the browser once to authorize
npx netlify-cli deploy --build    # draft URL to check first
npx netlify-cli deploy --build --prod
```

> Demo limitation: the function keeps data in `/tmp`, so changes (submissions, payments…) reset when Netlify starts a
> fresh instance and aren't shared between instances. Replace it with a real backend before real use.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Mock API + dev server together |
| `npm run mock:api` / `mock:seed` | Run / reset the fake API |
| `npm run build` | Production build to `dist/` |
| `npm test` | Unit tests (Vitest) |
