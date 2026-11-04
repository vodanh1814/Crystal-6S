# Changelog (English)

All notable changes to the **Crystal 5S Audit** system are documented in this file in compliance with [Semantic Versioning](https://semver.org/).

**Language: [🇬🇧 English](./CHANGELOG.en.md) · [🇻🇳 Tiếng Việt](./CHANGELOG.md)**  
**Author: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))

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
