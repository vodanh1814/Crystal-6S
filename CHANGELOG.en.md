# Changelog (English)

All notable changes to the **Crystal 5S Audit** system are documented in this file in compliance with [Semantic Versioning](https://semver.org/).

**Language: [🇬🇧 English](./CHANGELOG.en.md) · [🇻🇳 Tiếng Việt](./CHANGELOG.md)**  
**Author: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))

---

## [2.9.0] - 2026-11-09

### Added (Multi-Layout Dashboard Presentation System & Direct Toolbar Switcher)
- **Direct 3-Layout Switcher Buttons on Dashboard Toolbar (`/`)**:
  - Integrated 3 intuitive presentation layout switches directly on the Dashboard header:
    - **⊞ Sample 1: 3-Row Matrix (Classic Andon)**: Classic balanced layout with 6 KPI cards, 16-area matrix wall, 7-day alarms panel, 12-week trend line, and 5S group breakdown.
    - **☷ Sample 2: Workshop Zone Focus (`DashboardZoneFocus.tsx`)**: Executive command column (large Hero LED circular score gauge, S1-S5 bars, Top/Bottom leaderboard, hot alarms widget) combined with 4 workshop cluster groups (*Dyeing & Knitting, Finishing & Utility, Inspection & Logistics, Plant Office*) with cluster average scores and multi-line comparison trend chart.
    - **▦ Sample 3: 5S Heatmap & Action Feed (`DashboardHeatmapAction.tsx`)**: 16 areas $\times$ 5S pillars compliance heatmap matrix with color-coded severity tiles, combined with a 3-column operational action feed (*🚨 7-day overdue, ⚠️ week repeat violations, ✅ ready for auditor verification*).
  - Automatically persists layout selection to `localStorage` (`crystal_5s_dashboard_layout`) for instant switching without full page reload.
- **Dashboard Layout Studio in System Admin (`/admin/targets`)**:
  - Replaced the previous theme studio with a Dashboard Layout Studio, allowing Admins to preview schematics and save the plant-wide default dashboard layout via `PUT /api/settings` (`dashboard_layout`).
- **Backend 5S Matrix Aggregation (`GET /api/reports/dashboard`)**:
  - Aggregates area findings by `s_group` (`area_s_matrix`) and expands urgent alarms limit to 15 items for comprehensive operational feed rendering.

### Removed (Legacy System Themes Cleanup)
- Completely removed legacy whole-system themes (`crystal-glass` and `crystal-hybrid`), reverting to the clean industry-standard **Classic Emerald Andon** theme (`classic`).

---

## [2.8.1] - 2026-11-09

### Fixed & Improved (Adaptive Multi-Screen Responsiveness & 14" Laptop Text Dropping Fix)
- **Eliminated Text Dropping and Layout Squashing on 14" Laptops**:
  - Removed rigid height and overflow constraints (`lg:overflow-hidden`, `lg:min-h-0`) that previously forced card heights below 46px on 1366x768 screens or standard 125%/150% Windows scaling.
  - Introduced `.theme-tv-canvas` in `src/index.css`: Defaults to smooth vertical scrolling (`overflow-y: auto`) on compact viewports (< 860px height).
  - Automatically preserves strict 100vh zero-scroll locking (`overflow-y: hidden`) on large monitors / Smart TV walls (`@media (min-height: 860px) and (min-width: 1280px)`) and Fullscreen mode (`:fullscreen`).
- **Dashboard 3-Row Layout Optimization**:
  - **Row 1 (KPI Strip):** Increased minimum height (`min-h-[68px] sm:min-h-[72px]`), converted to `flex-nowrap`, applied `whitespace-nowrap` to scores and `shrink-0` to badges. Fixed awkward line wrap where "areas" or "KV" dropped below the numeric score.
  - **Row 2 (16-Area Wall & 7-Day Alarms Board):** Enforced `min-h-[380px]` row container and `min-h-[80px] sm:min-h-[84px]` per area card; Truncated area names safely (`max-w-[70%] truncate`); Prevented divider borders from cutting into Open/Verify counts; Streamlined 7-day alarms mini cards and finding descriptions.
  - **Row 3 (Trend, 5S Breakdown & Monthly Leaderboard):** Enforced `min-h-[220px]`; Rebalanced 5S breakdown column tracks to 4:4:4 with `whitespace-nowrap` preventing penalty tags `(-7pts)` from wrapping; Added `truncate min-w-0` and `shrink-0` to leaderboard entries.
- **Bilingual Localization Enhancements (i18n)**:
  - Shortened `'avg_remediation_time'` to `'TB xử lý'` (VI) / `'Avg Time'` (EN).
  - Shortened `'area_count_slash'` to `'/{n} KV'` (VI) / `'/{n}'` (EN).
  - Applied responsive truncation to application title on the top navbar (`src/components/Layout.tsx`).

---

## [2.8.0] - 2026-11-09

### Added & Improved (Edit 5S Finding Capability & Audit Detail Edit Controls)
- **Edit Button on Audit Finding Cards (`/audits/:id`)**:
  - Added an intuitive `Edit2` action button alongside the Delete button on finding cards in Section 2.
  - Allows Auditors/Admins to adjust finding details while an audit is in `draft` mode OR when an audit is `submitted` and the finding remains `open`. Prevents editing for fixed/closed findings.
- **Comprehensive Finding Edit Modal with Automated Scoring Recalculation**:
  - Supports re-assigning **Area** and **5S Checklist Item** (automatically excludes Not Applicable - NA criteria for the selected area).
  - Displays real-time **Live Escalation Preview** badge reflecting prior week repetition within the month.
  - Automatically recalculates `repeat_level`, `base_penalty`, `applied_penalty`, `prev_finding_id`, and triggers `recalculateAuditScores` to update area and plant weekly scores.
- **Flexible Before Photos Management**:
  - View existing Before photos with individual delete capability (with confirmation dialog).
  - Capture or upload new Before photos (up to 6 photos total) with client-side image compression.
  - Synchronized backend endpoints: `PUT /api/findings/:id`, `POST /api/findings/:id/photos`, and `DELETE /api/photos/:id`.
- **Bilingual Localization (VI / EN)**:
  - Added full translation keys across `vi.ts` and `en.ts` for modal actions and alerts.

---

## [2.7.0] - 2026-11-08

### Added & Changed (Admin Theme Studio & Crystal Glass / Crystal Hybrid UI Themes)
- **Admin Theme Studio (`/admin/targets`)**:
  - Preserves **Classic Andon (`classic`)** as the permanent system-wide default via D1 setting `ui_theme` (`migrations/0008_ui_theme_setting.sql`).
  - Enables Administrators to **Live Preview** and **Save & Apply System-Wide** across 3 themes: **Classic Andon (Default)**, **Crystal Glass Enterprise (Sample 2)**, and **Crystal Hybrid Adaptive (Sample 4)**.
  - Exposes normalized `ui_theme` on public `GET /api/settings` for Login/TV boards and enforces `isAdmin` validation (HTTP 400 on invalid theme) + `update_ui_theme` audit logging on `PUT /api/settings`.
- **Two Modern UI Themes with Independent Light / Dark Color Mode**:
  - **Crystal Glass Enterprise (`crystal-glass`)**: Frosted enterprise glassmorphism cards with crisp tabular typography (`Plus Jakarta Sans` & `JetBrains Mono`).
  - **Crystal Hybrid Adaptive (`crystal-hybrid`)**: Bento TV dashboard with signature 3-tier left status accents plus mobile bottom navigation bar (`< 768px`) for shop-floor use.
  - Pre-hydration FOUC prevention (`index.html`), Header/Login/Setup Light/Dark switcher, cross-tab `storage` synchronization, High Contrast (`forced-colors: active`), and complete Dark Mode workspace styling.
- **Sticky Matrix Tables, Accessibility & Yearly Target Parity**:
  - Added `.sticky-matrix-table` (`border-collapse: separate` with opaque sticky column-1 headers/cells) and keyboard-scrollable `tabIndex={0} role="region"` wrappers across Reports & Audit Detail tables.
  - Attached per-year `target` and `warning_target` rules to `GET /api/audits` so `/audits` list badges reflect 3-tier Red/Yellow/Green thresholds accurately.
  - Preserved author **Simon** attribution and 3-tier 5S scoring integrity across all themes and color modes.

---

## [2.6.0] - 2026-11-04

### Added & Improved (3-Tier Color Classification Red - Yellow - Green & Admin Warning Target Configuration)
- **Industrial-Standard 3-Tier Color Classification (Red - Yellow - Green)**:
  - 🔴 **Red (Fail)**: Score is below the warning threshold (`score < warning_target`, default `< 90.0%`).
  - 🟡 **Yellow (Warning)**: Score falls between warning threshold and target (`warning_target <= score < target`, default `90.0% <= score < 95.0%`).
  - 🟢 **Green (Pass)**: Score meets or exceeds target (`score >= target`, default `>= 95.0%`).
- **Admin Configuration for Warning Target (`warning_target`) by Year**:
  - Upgraded `yearly_targets` database table with `warning_target REAL NOT NULL DEFAULT 90`.
  - Admin Targets Management UI (`/admin/targets`) provides interactive 3-color rule indicators, editable Yellow Warning threshold inputs, and real-time color pill preview.
  - Strict validation: $0 \le \text{warning\_target} \le \text{target} \le 100$.
- **Plant-wide UI Alignment with 3-Tier Classification**:
  - **TV Andon Dashboard**: 16 area cards highlight with amber borders and badges when in warning status; 3-color summary counters (Green / Yellow / Red); Recharts 12-week trend chart with dual reference lines (green solid line for target, amber dashed line for warning target).
  - **Weekly & Monthly Reports (`/reports`)**: Matrix score cells and summary status columns display PASS / WARNING / FAIL.
  - **Audit Inspection Details (`/audits/:id`)**: Plant-wide score badges and 16-area score breakdown tables align with the 3 tiers.
  - **Full Bilingual Localization (VI / EN)**: Added complete set of localized labels and warning messages.

---

## [2.5.9] - 2026-11-04

### Added & Improved (Updated 150 2026 Historical Monthly Scores with 1-Decimal Precision & Seed Script)
- **Synchronized 150 Plant-wide Historical Monthly Scores for 2026**:
  - Updated all 15 manufacturing area scores across 10 months (Jan - Oct 2026) with authentic 1-decimal-place numbers (`89.5%`, `94.3%`, `81.5%`, `90.5%`, `98.5%`, etc.) directly from the plant's official Excel matrix.
  - Replaced legacy rounded integer scores across both remote Cloudflare D1 database (`cetvn-5s-db`) and local development SQLite.
  - Automatically recalculates plant-wide monthly averages, Top 2 and Bottom 2 area leaderboards on the TV Dashboard.
- **Added Seed & Data Generator Script**:
  - `seed/update_historical_scores_2026.sql`: Contains 150 structured SQL statements utilizing safe `ON CONFLICT DO UPDATE` semantics.
  - `scripts/generate_historical_sql.mjs`: Utility script to process and reproduce monthly matrix datasets.

---

## [2.5.8] - 2026-11-04

### Added & Improved (Standardized 1-Decimal-Place Score Formatting & Bilingual Separator Support)
- **Plant-wide Standardized 1-Decimal-Place Score Formatting (`formatScore`)**:
  - Integrated centralized formatting utilities in `src/lib/format.ts` (`formatScore`, `formatDelta`).
  - Standardized all score displays across the system (TV Dashboard KPIs, Top 2 / Bottom 2 leaderboards, 16-area factory matrix cards, remediation on-time/repeat rates, Recharts trend line tooltip, ScoreBadge, audit sheet breakdown table, and 52-week/12-month report matrix cells) to exactly 1 decimal digit (`95,3%`, `95,0%`, `100,0%`).
  - Automatic locale-sensitive decimal separators: comma `,` for Vietnamese (`95,3%`) and dot `.` for English (`95.3%`).
  - Safe boundary and fallback handling: gracefully renders `"-"` for `null`, `undefined`, or `NaN` values, preventing UI crashes.
- **Enhanced Weekly Score Delta Indicator (`formatDelta`)**:
  - Displays directional change with arrows and explicit sign: `▲ +1,5%` / `▼ -2,3%` (VI) and `▲ +1.5%` / `▼ -2.3%` (EN).
- **Dedicated Automated Verification Suite (`worker/lib/format.test.ts`)**:
  - Added unit test suite covering integer scores, floats, arithmetic rounding (`88.88` -> `88.9%`), 0%, 100%, and VI/EN locale options.

---

## [2.5.7] - 2026-11-02

### Added & Improved (Auto-Pass Cloudflare Token to GitHub Actions, Interactive Token Guides & 100% English Localization)
- **Zero-Manual-Secret Cloudflare Auto-Deploy from Web Settings**:
  - Administrators only need to enter their Cloudflare API Token and Account ID in Web Settings (`/admin/targets`). Credentials are encrypted with AES-GCM-256 into D1 Database.
  - When clicking "Auto-Update Now", the Cloudflare Worker automatically passes these credentials directly into GitHub Actions via `workflow_dispatch` inputs (`cf_token`, `cf_account_id`).
  - GitHub Actions workflow (`deploy.yml`) securely masks credentials with `::add-mask::`, executes tests, runs remote D1 migrations, and deploys to Cloudflare Workers without requiring manual GitHub Secrets setup.
- **Interactive Step-by-Step Guides for GitHub PAT & Cloudflare Tokens**:
  - Built-in accordion guides with direct links to GitHub Token Settings and Cloudflare Dashboard.
  - Configurable GitHub Repository (`owner/repo`) enabling independent factories and forks to deploy directly to their own repositories.
- **100% English Localization & Bilingual API Protocol**:
  - Completely audited and eliminated hardcoded Vietnamese across all views and components.
  - Automatic `Accept-Language: en` header from frontend client, enabling bilingual Worker API responses for errors and deployment logs.

---

## [2.5.6] - 2026-11-02

### Added & Improved (Multi-Factory Architecture, Automated Release Installer & Enhanced Update UX)
- **Multi-Factory Deployment & Architecture (Multi-Instance)**:
  - Added comprehensive factory deployment guides for both on-premise factory LANs (standalone Windows EXE / system service) and enterprise Cloudflare instances.
  - Added configurable `github_repo` support so forked factory repositories can trigger CI/CD workflows on their own organization repositories.
- **Enhanced System Update UX & Environment Differentiation**:
  - Clear separation between **On-Premise / LAN Server** (1-click zero-token Git sync) and **Cloudflare Workers** (clear 2-option guide: CLI `wrangler deploy` or GitHub Actions auto-deploy).
  - Prominent environment badge indicators: `Local / LAN` vs `Cloudflare Edge`.
  - Replaced ambiguous missing-token error on Cloudflare with an actionable 2-way deployment advisory directly on the update card.
- **Automated Windows Installer Release (`.github/workflows/release.yml`)**:
  - Integrated GitHub Actions workflow to automatically create GitHub Releases and attach `Crystal_5S_Setup.exe` whenever a release tag `v*` is pushed.
  - Enables factories worldwide to download and launch the system instantly without needing a Node.js development environment.
- **CI/CD Deploy Workflow Hardening (`.github/workflows/deploy.yml`)**:
  - Added automated pre-flight secret validation (`Verify Cloudflare Secrets`) providing clear error guidance if `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is missing.
  - Added non-interactive `--yes` confirmation flag to remote D1 database migrations (`wrangler d1 migrations apply ... --yes`).

---

## [2.5.5] - 2026-11-02

### Added & Improved (Interactive Month Filter, Protected Author Copyright & English Docs)
- **Interactive Month Filter on Factory Dashboard**:
  - Added on-demand month historical analysis via query parameter `?month=YYYY-MM`.
  - Automatically queries available months across submitted audits and Excel historical imports.
  - Dynamically updates the 16-Area Matrix, Top/Bottom leaderboards, monthly average KPI, pass/fail counts, and S1–S5 defect breakdown.
  - Features an instant "Back to Current Month" reset button and status indicators.
- **Protected Author Copyright & About App Modal**:
  - Created a dedicated **About App Modal** displaying software architecture, author attribution to **Simon**, and official GitHub links.
  - Integrated a protected, read-only **Copyright Card** in the Admin Settings (`/admin/targets`): allows factories to customize company branding while permanently preserving the author's intellectual property.
  - Direct GitHub contact link: [https://github.com/vodanh1814](https://github.com/vodanh1814).
  - Subtle copyright footer on login screen and sidebar.
- **Comprehensive English Documentation**:
  - Published full English documentation ([`README.en.md`](./README.en.md)) and English Changelog ([`CHANGELOG.en.md`](./CHANGELOG.en.md)).
  - Bilingual switcher links on all documentation files.

---

## [2.5.4] - 2026-11-02

### Added & Improved (Git Auto-Update for Public/Private Repos & Privacy Protection)
- **Seamless Support for Both Public & Private GitHub Repositories**:
  - Automatic zero-token update detection and download when repository is Public (via raw GitHub fallback), bypassing unauthenticated API rate limits.
  - Added an in-app GitHub Personal Access Token (PAT) management interface in Admin Settings with **AES-GCM-256** encryption for private repository deployments.
  - Informative warning notices and error banners for repository connectivity.
- **Self-Healing Git in Standalone Windows Installer (Auto-Git-Repair)**:
  - Automatically initializes Git and links the official remote origin if an extracted standalone instance lacks `.git`.
  - Excludes post-build and binary files (`Crystal_5S_Setup.exe`, `package-lock.json`) from dirty checks to prevent update lockouts.
  - Safe fast-forward fallback to `git reset --hard origin/main` in case of local branch divergences.
  - Resilient internal D1 database migration handling.
- **Privacy & Infrastructure Sanitization**:
  - Permanently untracked internal infrastructure files (`CLOUDFLARE_LIVE_URL.txt`) and added them to `.gitignore`.
  - Unified database naming conventions across all scripts and configurations.

---

## [2.5.3] - 2026-11-02

### Changed & Improved (Mobile & Tablet Layout Optimization)
- **Cross-Platform Responsive Layout (Mobile, Tablet & TV Wall)**:
  - Eliminated rigid flex ratios (`flex-[58]`, `flex-[42]`) on mobile screens, allowing natural vertical touch scrolling.
  - Removed double nested scroll containers for silky-smooth touch gestures on iPhone Safari & Android Chrome.
  - Optimized 16-Area Matrix cards into a legible 2-column mobile grid with clear 3-tier hierarchy (Area Name $\rightarrow$ Score $\rightarrow$ Pending/Fixed).
  - Fixed Recharts 12-week trend chart height collapse on mobile screens (`h-56` to `h-64`).
- **Header Bar Optimization for Narrow Screens**:
  - Automatically hides the TV full-screen button on mobile devices to preserve horizontal space for factory titles.
  - Standardized touch target dimensions ($\ge 32 \times 32$ px) for alarm bell and language switcher.

---

## [2.5.2] - 2026-11-02

### Changed & Improved (Clear Area Names on Factory Displays)
- **Replaced Abbreviated Codes with Full Operational Department Names (`area_name`)**:
  - Factory matrix cards and leaderboards now display full names (`Knitting`, `Dyeing`, `Setting`, `Warehouse`, `Batching`, `Greige QC`, `Final QC`, `Lab test`...) for instant recognition on shop-floor Smart TVs.
  - Hover tooltips combine department name and code: `${area.area_name} (${area.area_code})`.
  - Applied CSS overflow protection (`truncate`, `min-w-0`) to prevent layout wrapping on all resolutions.

---

## [2.5.1] - 2026-11-02

### Added (Historical Score Connectivity & Smart Dashboard Fallback)
- **Connected 150 Monthly Historical Scores to Public Dashboard**:
  - Integrated 2026 historical monthly scores into the public Andon TV dashboard.
  - Weekly audits take top priority; historical scores serve as automatic fallbacks when monthly evaluations are pending.
- **Smart Fallback for Early Month Periods**:
  - When entering a new month without completed audits, the dashboard automatically falls back to the most recent historical month (e.g. October 96.33%).

---

## [2.5.0] - 2026-11-02

### Added (Intelligent Excel Historical Import & Administration)
- **1-Click Excel Template Generation & Upload**:
  - Standardized `.xlsx` 12-month matrix templates generated dynamically based on active factory areas.
  - Flexible matrix parsing (months as rows or columns) with fuzzy name matching and percentage conversion.
  - Automated version synchronization across SPA frontend, backend worker, and Windows installer `Crystal_5S_Setup.exe`.
