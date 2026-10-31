# Crystal 5S Audit — Technical Spec (source of truth for implementation)

Business plan (Vietnamese): see `C:\Users\Simon\.gemini\antigravity\brain\7ed779e6-e7a4-452d-8488-890f920998d5\implementation_plan.md`.
Original checklist: `Update_Checklist_5S_production.xlsx` (already converted to `migrations/0002_checklist_seed.sql`).

## 1. Stack & layout (single npm package at repo root `d:\Crystal-6S`)

- **One Cloudflare Worker** serves both the API (`/api/*`, Hono) and the React SPA (Workers Static Assets).
- Dev: `vite` + `@cloudflare/vite-plugin` (runs the worker in workerd with local D1/R2). Build: `tsc -b && vite build`. Deploy: `wrangler deploy`.
- Already installed deps: hono, react, react-dom, react-router (v7, import from `react-router`), recharts, lucide-react, xlsx (SheetJS, **lazy `import()` only, write-only**), vite, @vitejs/plugin-react, @cloudflare/vite-plugin, wrangler, typescript, tailwindcss v4 + @tailwindcss/vite, @cloudflare/workers-types, @types/node. Do NOT add other deps unless truly necessary (no i18n lib, no form lib, no image lib).

```
wrangler.jsonc        name "crystal-5s-audit", main "worker/index.ts", compatibility_date recent,
                      assets { not_found_handling: "single-page-application", run_worker_first: ["/api/*"] },
                      d1_databases [{ binding "DB", database_name "crystal5s-db", database_id placeholder, migrations_dir "migrations" }],
                      r2_buckets [{ binding "PHOTOS", bucket_name "crystal5s-photos" }]
.dev.vars             JWT_SECRET=dev-secret-change-me   (gitignored; .dev.vars.example committed)
vite.config.ts        plugins [react(), tailwindcss(), cloudflare()]
tsconfig.json         references -> tsconfig.app.json (src/, DOM libs) and tsconfig.worker.json (worker/, @cloudflare/workers-types, exclude *.test.ts)
index.html, src/      React app
worker/               index.ts, types.ts, lib/*.ts, routes/*.ts
migrations/           0001_init.sql, 0002_checklist_seed.sql  (DONE - do not change semantics)
seed/sample_areas.sql optional 16 sample areas + NA matrix (DONE)
README.md             Vietnamese: local dev, create D1/R2, secrets, migrations, deploy, first admin setup
.gitignore            node_modules, dist, .wrangler, .dev.vars
```

## 2. Domain rules (MUST be exact)

### Roles
- Global `users.role`: `admin` | `user` | `viewer`.
- Per-area permission `user_areas.role`: `auditor` | `manager` (Area MNG). One user can be auditor of some areas and manager of others.
- **admin** = auditor AND manager on every area + all admin screens.
- **viewer** = read-only (dashboard, reports, findings).
- Every logged-in user can READ dashboard/reports/findings of all areas. Write actions are checked per area.
- Area MNG only uploads improvement ("after") photos + note. Area MNG never scores.

### Weeks / months
- ISO week (Monday–Sunday). `week_start` = Monday (YYYY-MM-DD). `month` = YYYY-MM **of week_start**.
- "Today" is computed in Vietnam time (UTC+7).
- Exactly **one audit per area per ISO week** (DB unique). A new audit's week must be later than the latest existing audit of that area; audit_date cannot be in the future.

### Scoring (penalty unit = điểm = 1%)
- Each finding (lỗi) has `base_penalty` = checklist item penalty at creation time (snapshot), `repeat_level`, `applied_penalty`.
- `applied_penalty = escalating ? base_penalty + 1 * (repeat_level - 1) : base_penalty` (ESCALATION_STEP = 1 điểm). Items S5.2-BOD, S5.2-CUS, S5.3 have `escalating = 0`.
- Weekly score = `max(0, 100 - Σ applied_penalty of findings in that audit)`, round to 2 decimals. Stored on submit (`total_penalty`, `score`). Live preview while draft.
- Monthly score of an area = AVG of submitted audit scores whose `month` = that month (weeks without audit are ignored).
- Yearly target in `yearly_targets` (2026 = 95). If a year has no row, use the latest earlier year's target, else 95. Score ≥ target → green (pass), below → red.

### Finding lifecycle
- Status: `open` (waiting Area MNG) → `fixed` (MNG uploaded ≥1 after photo + note, waiting auditor) → `closed` (auditor verified). Auditor can **reject** a fixed finding → back to `open` (store reject_note). `carried` = not improved, continued in a later week's finding.
- `due_date` = audit_date + 7 days (for new and carried findings).
- Findings are visible to MNG/alarms only when their audit is `submitted`.

### Carry-over ("chưa cải thiện") — when auditor works on a DRAFT audit
- "Pending previous findings" = findings of the same area, status IN ('open','fixed'), belonging to a *submitted* audit other than this one.
- Auditor must decide each one before submitting:
  - **improved** (Đã cải thiện): old.status = 'closed', verified_by, closed_at, closed_in_audit_id = this audit.
  - **not_improved** (Chưa cải thiện): old.status = 'carried', closed_in_audit_id = this audit; INSERT new finding in this audit with same item_id + description, `prev_finding_id = old.id`, `repeat_level = (oldAudit.month == thisAudit.month) ? old.repeat_level + 1 : 1` (reset each month), base_penalty = current item penalty, applied per formula, status 'open', due = this audit_date + 7.
  - Undo is allowed while draft: delete the created finding (+ its photos), restore old: status = fixed_at ? 'fixed' : 'open', clear closed_in_audit_id/verified_by/closed_at.
- Deleting a draft audit also undoes all its carry decisions and deletes its photos from R2.
- Submit is blocked while pending previous findings remain.
- Admin can **reopen** a submitted audit back to draft only if it is the latest audit of that area.

### Alarm (7-day rule)
- For Area MNG: findings with status 'open' in areas they manage (admin: all). Show days remaining until due_date; overdue = today > due_date (red). Mark `repeat_level > 1` as "Chưa cải thiện / Not improved".
- For auditors: findings with status 'fixed' in areas they audit (to verify).
- Header bell shows the total count; dashboard shows the alarm list.

### Photos (R2)
- Client compresses before upload with canvas: max side 1600px, JPEG quality 0.75. Use `<input type="file" accept="image/*" capture="environment">` (also allow gallery).
- Upload: `POST /api/findings/:id/photos` multipart (`file`, `kind`=before|after). Max 5 MB, image/* only, max 6 photos per kind per finding. Key `f/{findingId}/{kind}/{uuid}.jpg`.
- `before`: allowed for auditor of the area while audit is draft. `after`: allowed for manager of the area while finding status is 'open' and audit submitted.
- Serve `GET /api/photos/:id` (auth required; `Cache-Control: private, max-age=31536000, immutable`). Delete `DELETE /api/photos/:id` (uploader or admin, same state rules).
- A carried finding shows the photos of its predecessors as history.

## 3. Auth & security
- Password hash: PBKDF2-SHA256, 100000 iterations (Workers max), 16-byte salt, format `pbkdf2$100000$<b64salt>$<b64hash>`, constant-time compare.
- Session: JWT HS256 (`hono/jwt` sign/verify, pass alg explicitly) in httpOnly cookie `s5_session`, Secure, SameSite=Lax, Path=/, 7 days. Payload `{sub, tv, exp}`; on each request load user from DB, reject if inactive or `token_version` mismatch (password reset / deactivate increments token_version).
- Use `hono/csrf` middleware on `/api/*`.
- First-run: `GET /api/auth/setup` → `{needsSetup}` (no users). `POST /api/auth/setup` creates the first admin only when users table is empty. No default passwords.
- Admin cannot demote/deactivate themselves.
- Always use parameterized D1 queries. Validate all inputs server-side. Errors as JSON `{error: string}` with proper status codes (400/401/403/404/409).
- Write to `activity_log` for create/submit/reopen/delete audit, carry decisions, fix/verify, user/area changes.

## 4. API (all JSON, prefix /api)
- auth: `GET/POST /auth/setup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` (user + area assignments), `POST /auth/password`, `PUT /auth/lang`
- users (admin): `GET /users`, `POST /users`, `PUT /users/:id`, `PUT /users/:id/areas` ({assignments:[{area_id, role}]})
- areas: `GET /areas` (all), `POST /areas`, `PUT /areas/:id` (admin; no hard delete, use active=0), `GET /areas/:id/na`, `PUT /areas/:id/na` ({item_ids}) admin
- checklist: `GET /checklist` (?all=1 for inactive, admin), `POST /checklist`, `PUT /checklist/:id` (admin; no hard delete)
- targets: `GET /targets`, `PUT /targets/:year` (admin)
- audits: `GET /audits?area_id&month&status`, `POST /audits` ({area_id, audit_date}), `GET /audits/:id` (audit, applicable items, findings+photos, pending previous findings+photos, permission flags, live score), `PUT /audits/:id` (note; audit_date only within same ISO week; draft), `DELETE /audits/:id` (draft), `POST /audits/:id/submit`, `POST /audits/:id/reopen` (admin), `POST /audits/:id/findings` ({item_id, description}; item must be active and not NA), `POST /audits/:id/carry` ({finding_id, decision}), `POST /audits/:id/carry/undo` ({finding_id})
- findings: `GET /findings?area_id&status&month&repeat=1&overdue=1`, `GET /findings/alarms`, `GET /findings/:id` (+photos +history chain), `PUT /findings/:id` (draft only), `DELETE /findings/:id` (draft only; if it is a carried finding → same as undo), `POST /findings/:id/fix` ({note}; needs ≥1 after photo), `POST /findings/:id/verify` ({action:'close'|'reject', note}), photos endpoints above
- reports: `GET /reports/weekly?month=YYYY-MM` (weeks of month × areas, scores, month avg, target), `GET /reports/monthly?year=YYYY` (areas × 12 months avg + overall), `GET /reports/dashboard` (target, current week per-area status/score, current month avg ranking, 12-week trend of average score, findings count & penalty by S group this month, counts open/overdue/not-improved/waiting-verify)

## 5. Frontend (React + Tailwind, mobile-first, bilingual)
- i18n: own tiny context with `vi` and `en` dictionaries (`src/i18n/vi.ts`, `en.ts`), toggle VI/EN in header, persisted to user (`PUT /auth/lang`) and localStorage. Checklist shows `content_vi`/`content_en` by language. ALL UI strings via dictionary.
- Pages: Setup (first admin), Login, Dashboard, Reports (tabs Weekly / Monthly, heatmap colors vs target, export Excel via lazy xlsx), Audits list (+ New audit: choose an area you audit, date default today), Audit detail (header with live score; section "Lỗi tuần trước chưa đóng" with Đã cải thiện / Chưa cải thiện buttons; checklist grouped S1–S5 hiding NA items, "+ Lỗi" per item → description + photos; finding cards with penalty & repeat badge; Submit), Findings list (filters), Finding detail (before/after side by side, history chain, MNG: upload after + note → "Đã khắc phục"; auditor: Verify close / Reject), Admin: Areas (CRUD + NA matrix checkboxes), Users (CRUD + per-area auditor/manager assignment, reset password), Checklist (edit text VI/EN, penalty, escalating, active, order), Targets (per year). Profile: change password.
- Layout: responsive sidebar on desktop, bottom nav or hamburger on mobile, bell with alarm count.
- Score color: ≥ target green, else red; show "Đạt/Pass" / "Không đạt/Fail".

## 6. Tests
- `worker/lib/week.ts` and `worker/lib/scoring.ts` are pure (no imports) and covered by `node:test` files (`*.test.ts`, run `npm test` = `node --test --experimental-strip-types worker/lib/*.test.ts`; test files import with `.ts` extension).
- Must pass: `npm run typecheck`, `npm test`, `npm run build`, and a local smoke test (apply migrations locally, start dev server, curl setup → login → create area/audit → finding → submit → report) in the same command.
