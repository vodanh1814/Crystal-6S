# Crystal 5S Audit — Plant-wide 5S Inspection, Andon Monitoring & Continuous Improvement System

**Language: [🇬🇧 English](./README.en.md) · [🇻🇳 Tiếng Việt](./README.md)**  
**Current Version: `v2.11.9`** · See release history in [CHANGELOG.en.md](./CHANGELOG.en.md) / [CHANGELOG.md](./CHANGELOG.md).  
**Author: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))  
**Official Repository:** [https://github.com/vodanh1814/Crystal-6S](https://github.com/vodanh1814/Crystal-6S)

An enterprise-grade web application & standalone Windows installer engineered for manufacturing plants to audit, score, track 2K photo remediation, and display real-time **Smart Factory Andon TV dashboards** for 5S (*Sort – Set in order – Shine – Standardize – Sustain*). The system operates seamlessly both on **Local LAN** and **Cloudflare Serverless Edge (Workers, D1 SQLite Database, R2 Object Storage)**.

---

## 1. Highlights of Version `v2.11.9`

### 📈 High-Visibility Trend Telemetry, Default Andon Standardization & Responsive Auto-Fit Containers
- **High-Visibility Trend Arrow & Dynamic Mini Sparklines**: Expanded SVG canvas in [`AreaSparkline.tsx`](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaSparkline.tsx) to 56x20 px with `strokeWidth="1.8"`, `r="2.8"` dot, and dynamic auto-scaling. Bold arrows and telemetry (`▲ +2.5` / `▼ -1.0` / `➔ 0`) are immediately readable across the factory floor.
- **Removed Alternative Themes - Standardized on Default Factory Dark Andon**: Deprecated experimental layout branchings (`bento`, `hud`, `zone`) to establish the single canonical Factory Dark Andon board as the rock-solid default, streamlining Admin Settings.
- **Fluid Responsive Density Containers Across All Devices**: Full TV mode fits 100% without scrollbars (`lg:h-full lg:auto-rows-fr`); mobile and tablet views adapt dynamically with natural heights (`h-auto`, cards `min-h-[82px]`) and smooth scrolling without text overlap.

---

## 2. Highlights of Version `v2.11.8`

### 📱 Fluid Adaptive 3-Tier Layout for Density Auto-Fit & Historical Trend Inheritance
- **Fluid Adaptive 3-Tier Card Layout**: Restructured area cards into 3 compact rows (Area Name + Sparkline; Week & Month on single horizontal baseline; Status Badge + Open/Verify), completely eliminating card overlap.
- **Display Density Auto-Fit Containers**: Integrated `min-h-0`, `overflow-hidden`, and fluid spacing allowing containers to automatically adapt to screen resolution in Full TV mode.
- **Historical Monthly Scores Inheritance**: Backend seamlessly falls back to historical monthly scores for weeks without weekly audits, rendering complete 6-week sparklines and 12-week trajectories.

---

## 2. Highlights of Version `v2.11.7`

### 🛠️ Resolved 12-Week SQL Query Bug Causing Dashboard 500
- **Eliminated 500 API Error**: Corrected SQL queries to fetch area-specific 12-week scores via `audit_area_scores`, thoroughly resolving `no such column: area_id` on SQLite D1.
- **Restored System Health**: Restored 100% stable data loading for the Smart Factory Andon TV and web interface.

---

## 2. Highlights of Version `v2.11.6`

### 📈 6-Week Mini Sparkline Trend & Area 5S Performance Inspector Modal
- **Distinct Dual Telemetry Columns on Each Area Card**: Split each area card into two permanently labeled columns (`W46` - Pending/Score | `Nov` - Monthly Avg & MoM delta `▲+2.5pts`), eliminating ambiguity between weekly and monthly data.
- **Pure SVG 6-Week Mini Sparkline ([AreaSparkline.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaSparkline.tsx))**: Visualizes area historical performance curves with dynamic Green/Yellow/Red tiers, trend arrows (`↗`, `↘`, `➔`), and week hover tooltips.
- **Area Trend & 5S Pillars Inspector Modal ([AreaTrendModal.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaTrendModal.tsx))**: Click any area card to pop up in-depth telemetry without navigating away: Manager/Auditor metadata, 4 telemetry KPIs, 12-week Recharts LineChart, and S1-S5 5S pillar penalty breakdown.
- **High Performance & 0 Extra DB Overhead**: Reuses the consolidated 12-week backend trend query with 0 extra database roundtrips.

---

## 2. Highlights of Version `v2.11.5`

### 📊 Automatic Fallback to Latest Completed Week When Weekly Audit Is Pending
- **Smart Fallback Mechanism for Weekly Average KPI**: When the current week has not been completed, the system automatically displays the latest audited week's score and week label (`WEEKLY AVG W45` / `ĐIỂM TB TUẦN W45`).
- **Standard 3-Tier Semantic Score Coloring**: Fallback scores are rendered in large colored typography matching Green/Yellow/Red tiers, replacing the plain `Pending audit` text.
- **Intuitive Badges & Delta Notes**: Automatically shows **`[Latest Week]`** status badge and clear pending annotations on weekly delta **`▲ +0.3% (W46 pending)`**.
- **100% Cross-Layout Consistency**: Unified behavior across both Classic Matrix and Workshop Zone Focus views.

---

## 2. Highlights of Version `v2.11.4`

### 🏷️ Standardized Tab Toggle to "Improvement" & Terminology Unification
- **Standardized Tab Toggle Label**: Replaced hardcoded `Kaizen` with `{t('tab_improvement_btn')}`, cleanly rendering **`[Improvement]  [Top]`** (English) and **`[Cải thiện]  [Top]`** (Vietnamese), achieving 100% harmonization with the card header `5S CONTINUOUS IMPROVEMENT`.
- **Card-wide Semantic Consistency**: Updated Micro-Strip status pill (`Needs Improvement` / `Cần cải thiện`) and action-needed header (`STAGNANT / NEEDS IMPROVEMENT` / `Khu vực Chưa cải thiện`).
- **100% UI/UX & i18n Fidelity**: Zero hardcoded strings, preserving Simon's core authorship.

---

## 2. Highlights of Version `v2.11.3`

### 🔔 Dropdown Notification Center & Dashboard Accordion Alarm Cards
- **Header Dropdown Notification Center**: Converted the top navigation Bell button into an elegant popover dropdown, enabling users to read all urgent notifications and alarms without leaving the current view. Auto-closes on click-outside or `Escape`.
- **3 Fast-Filtering Tabs**:
  - `All`: Aggregates all plant alarms.
  - `Needs Fix`: Filters open overdue or upcoming findings for Area Managers.
  - `Awaiting Verify`: Filters resolved findings awaiting Auditor/Admin verification.
- **Dashboard Accordion Alarm Cards**: Cards in the `7-DAY ALARMS & REPEATED FINDINGS` panel can be expanded downwards to inspect full 5S criterion text, specific notes, area, and deadline.
- **100% Internationalization (i18n)**: All new UI strings fully localized in Vietnamese and English, 0 hardcoded text.

---

## 2. Highlights of Version `v2.11.2`

### 📊 Optimized Layout & Eliminated Empty Voids in 5S Breakdown & Kaizen
- **2-Tier Stacked Telemetry Rows for 5S Breakdown**: Replaced legacy thin rows with modern stacked telemetry cards: upper tier displays S-group label with semantic color dot and count/penalty badge (-X pts); lower tier houses a bold modern progress bar (`h-2.5 sm:h-3 rounded-full`) with smooth 500ms animation.
- **Telemetry Summary Footer Strip**: Added plant-wide penalty total (`Total Penalties: -X pts`) and highest violation driver (`Top Violation: S...`), perfectly filling card height and eradicating vertical voids in Full TV mode.
- **Kaizen Status Micro-Strip & Expanded List**:
  - Kaizen Tab: Added factory-wide summary pills (`▲ X Improved` | `▬ Y Stable` | `▼ Z Needs Kaizen`) and expanded view to **Top 3 Improvers** (`🚀`) and **Top 3 Needs Kaizen Areas** (`⚠️`).
  - Leaderboard Tab: Expanded to **Top 3 Leaders** (`🏆 1.`, `🥈 2.`, `🥉 3.`) and **Top 3 Action Needed Areas** (`⚠️`).
  - Refined card padding (`px-2.5 py-1.5 sm:py-2`), achieving harmonious balance with the adjacent 12-week trend graph.
- **Standardized Localization & Units**: Added complete set of i18n keys, unified `pts` (EN) and `đ` (VI), 0 hardcoded text.

---

## 2. Highlights of Version `v2.11.1`

### 📺 Fluid Auto-Fit Viewport Scaling in Full TV Mode
- **Zero Empty Black Gap at Screen Bottom**: Employs proportional Flexbox auto-fill (`flex-[1.25]` and `flex-1`), dynamically expanding the 16-area matrix wall, 7-day alarms panel, and trend graphs to fill 100% of large TV displays (1080p, 1440p, 4K).
- **Enlarged High-Visibility Telemetry & Cards**: Trend chart wrapper expands to `flex-1 min-h-[140px]`, and area cards stretch to `h-full flex flex-col justify-between`, optimizing long-distance readability across the factory shop floor.
- **Unified Across All 4 Layouts**: Classic Andon Matrix, Workshop Zone Focus, Bento Telemetry 2.0, and Industrial SCADA HUD all auto-scale flawlessly in fullscreen mode.
- **Protected 14" Laptop Experience**: Preserves sensible minimum heights and smooth vertical scrolling in standard windowed browser views.

---

## 2. Highlights of Version `v2.11.0`

### 🎨 4 Full-Fledged UI/UX Pro Max Dashboard Layouts
- **Layout 1: Classic Andon Matrix (`matrix`)**: Traditional 3-row layout, 16 plant areas, 7-day alarms, and 12-week trend curve.
- **Layout 2: Workshop Zone Focus (`zone`)**: Dual divisions for Production (10 areas) and Support (6 areas) with Hero gauge and 3-tab Command Bar.
- **Layout 3: Bento Telemetry 2.0 (`bento`)**: Modern 4x4 Bento grid architecture with handcrafted SVG 5S Star Radar chart and MoM Kaizen Spotlight.
- **Layout 4: Industrial SCADA HUD (`hud`)**: Cyberpunk tactical command center with high-contrast Cyan/Amber borders, central alarm core, and dual flanks.

### ⚙️ Centralized Exclusive Admin Layout Management (Layout Studio)
- **Zero Clutter on Main Dashboard**: Public layout switcher buttons removed from `Dashboard.tsx`.
- **Admin Layout Studio (`AdminTargets.tsx`)**: Exclusive control room for administrators to preview all 4 layouts and set the plant-wide default layout (`app_settings.dashboard_layout`).
- **Seamless Public Display Sync**: Visitors and shop-floor Andon TV screens automatically load the layout designated by the Admin.

### 📏 Plant-wide Point & Penalty Unit Standardization
- Complete consistency across the application: Vietnamese uses `đ` (`-1đ`, `(-7đ)`, `▲ +5.5đ`, `+1đ/tuần`), English uses `pts` (`-1 pt`, `(-7 pts)`, `▲ +5.5 pts`, `+1 pt/week`).

---

## 2. Highlights of Version `v2.10.2`

### 🔓 Guest Public Access to Area Findings Without Sign-In
- **Direct Findings Inspection from Dashboard**: Unauthenticated guests can click any area card on the Dashboard or Production/Support divisions to view the area's findings (`/findings?area_id=X`) without being redirected to `/login`.
- **Safe Public Read APIs**: `GET /api/areas` and `GET /api/photos/:id` allow public read access for viewing 5S before/after photos and Lightbox zoom, while mutation endpoints remain strictly authenticated.
- **Seamless Navigation & Guest Badging**: Top `← Back to Dashboard` button enables instant return; displays an elegant `Public Read-Only Mode` badge.

### 💻 Fluid Auto-Scaling Typography, Card Sizing & Web Mode Overflow Fix
- **Eliminated Overflow Bleed & Text Overlapping on 14" Laptops**:
  - Removed rigid height and overflow constraints (`lg:flex-[58]`, `lg:overflow-visible`), enabling smooth vertical scrolling (`overflow-y: auto`) in standard web browser windows.
  - Compacted 16 area card min-heights (`min-h-[56px] sm:min-h-[62px] lg:min-h-[66px]`) and 7-day alarms (`min-h-[46px] sm:min-h-[50px]`), aligning row heights and eliminating alarm bleed into Row 3.
  - Total dashboard height optimized to ~620px - 650px, fitting seamlessly on standard 14" laptop viewports (1366x768 or 1080p with 125%-150% display scaling) without scrolling.
  - Zero-scroll locking strictly retained for **Full TV Mode** (`:fullscreen`).

### 📈 Month-over-Month (MoM) Continuous Improvement & Kaizen Tracking
- **Comprehensive MoM Analytics**:
  - Automatically calculates current vs prior month average score deltas (`▲ +X.Xđ` / `▼ X.Xđ` / `▬ 0đ`) for all 16 plant areas.
  - Multi-year database query handles year boundaries smoothly (e.g. comparing January against the prior year's December).
  - Highlights **Top Improvers** (areas with highest Kaizen score surge) alongside **Stagnant Areas** (areas lagging below target or regressing).
  - Quick-switch **Kaizen / Leaderboard** toggle on both dashboard layouts.

### 🏭 Restructured Sample 2 Dashboard: 2 Operational Divisions (Production & Support)
- **Clear Factory Division Grouping**:
  - Reorganized all 16 areas into exactly two functional divisions: **Production** (10 workshops: Knitting, Dyeing, Batching, Setting, VAP, Greige QC, Final QC, Lab Dip, Lab Test, UNT) and **Support & Utilities** (6 areas: Warehouse, Maintenance, Utility, TSC, ADM, FM/CFD).
  - Division-specific metrics: Aggregate average score, MoM score delta, PASS/WARN/FAIL status count, and open/overdue finding tallies.
  - Command Bar featuring a 3-tab switcher: MoM Continuous Improvement, 5S Pillars Breakdown (S1-S5), and Top/Bottom Leaderboard.

### 🖥️ Streamlined 2-Layout Catalog & 14" Laptop Display Fix
- **Focused 2-Layout System (Heatmap Removed)**:
  - Removed Sample 3 Heatmap, streamlining the dashboard to the two best-performing layouts: **Sample 1 (3-Row Matrix)** and **Sample 2 (Workshop Zone Focus)** with instant toolbar switching.
- **Enhanced 14" Laptop Usability**:
  - Added `overflow-y-auto` to the TV canvas container for smooth vertical scrolling on 14" laptop screens (1366x768 or 125%/150% Windows scaling), permanently resolving 7-day alarm bleed into Row 3.

### ✏️ Edit 5S Finding Capability in Weekly Audits (`v2.8.0`)
- **Edit Action on Finding Cards (`/audits/:id`)**:
  - Allows Auditors and Admins to modify finding details even after initial submission (as long as the finding is `open`).
- **Full-Featured Edit Modal with Dynamic Recalculation**:
  - Re-select Area or 5S Criterion (with automatic NA filtering for the selected area).
  - Live Escalation Badge preview and automatic penalty / score recalculation across area and factory summaries.
  - Comprehensive Before Photo management: remove unwanted photos and add fresh evidence up to 6 photos total.

### ✨ Admin Theme Studio & Multi-Theme Engine (Classic Default · Crystal Glass · Crystal Hybrid - `v2.7.0`)
- **Administrator-Exclusive Theme Studio (`/admin/targets`)**:
  - Preserves **Classic Andon (`classic`)** as the permanent system-wide default via Cloudflare D1 `ui_theme`.
  - Administrators can **Live Preview** or **Save & Apply System-Wide** two modern themes: **Crystal Glass Enterprise (Sample 2)** and **Crystal Hybrid Adaptive (Sample 4)**.
- **Independent Light / Dark Mode & Pre-Hydration FOUC Prevention**:
  - Header/Login/Setup Light/Dark switcher works on both `crystal-glass` and `crystal-hybrid` with cross-tab `storage` synchronization and pre-hydration `<meta name="color-scheme">` syncing.
- **Shop-Floor Mobile UX & Sticky Matrix Tables**:
  - Adds a mobile bottom navigation bar in `crystal-hybrid`, opaque sticky-first-column matrix tables (`.sticky-matrix-table`), keyboard scrolling (`tabIndex={0}`), and 3-tier threshold consistency across all themes.

### 🎨 3-Tier Color Classification (Red - Yellow - Green) & Admin Warning Target Configuration (`v2.6.0`)
- **Industrial-Grade 3-Tier Color System**:
  - 🔴 **Red (Fail)**: Score $< \text{warning\_target}$ (default $< 90.0\%$).
  - 🟡 **Yellow (Warning)**: Score $\ge \text{warning\_target}$ and $< \text{target}$ (default $90.0\% \to < 95.0\%$).
  - 🟢 **Green (Pass)**: Score $\ge \text{target}$ (default $\ge 95.0\%$).
- **Admin Configuration for Warning Thresholds (`warning_target`)**:
  - Yearly Targets Management (`/admin/targets`) allows administrators to configure both Green Pass and Yellow Warning target thresholds.
  - Interactive live color preview and strict boundary validation.
- **Plant-wide UI Alignment**:
  - **TV Andon Dashboard**: 16 area cards with amber borders and tags; Recharts 12-week trend chart with dual reference lines.
  - **Weekly / Monthly Reports & Audit Sheets**: Full support for PASS / WARNING / FAIL classification.

### 🎯 Plant-wide Standardized 1-Decimal-Place Score Formatting (`v2.5.8`)
- **Consistent & Professional Score Precision**:
  - All scores across TV Dashboard, Top 2 / Bottom 2 rankings, 16 factory area cards, reports, ScoreBadge, and audit details are consistently displayed with 1 decimal digit (`95,3%`, `95,0%`, `100,0%`).
  - Locale-aware separators: Comma `,` for Vietnamese (`95,3%`), Dot `.` for English (`95.3%`).
  - Directional weekly score delta indicator (`formatDelta`) with arrow indicators: `▲ +1,5%` / `▼ -2,3%`.
  - Robust `src/lib/format.ts` utilities with graceful null/undefined/NaN fallback.

### 🚀 Zero-Manual-Secret Auto-Deploy & Standalone Windows Installer (`v2.5.7`)
- **Zero-Manual-Secret Cloudflare Auto-Deploy**: Automatically forwards Cloudflare API Token & Account ID from Web Settings to GitHub Actions workflows, streamlining CI/CD deployment without manual GitHub secrets.
- **Standalone Windows Installer (`Crystal_5S_Setup.exe`)**: Automatically built and published with GitHub Releases, enabling 1-click on-premise installation on factory local networks.

### 📅 Interactive Month Filter on Dashboard
- **On-Demand Month Historical Analysis**:
  - Added an intuitive month selector toolbar right on the main TV Dashboard (`?month=YYYY-MM`).
  - Seamlessly queries all periods across live weekly audits and historical Excel imports (`historical_monthly_scores`).
  - Automatically recalculates all KPI cards, 16-Area Matrix scores, Top/Bottom leaderboards, and 5S group defect distribution for the chosen month.
  - Features an instant "Back to Current Month" reset button and status indicators.

### 🔒 Protected Author Copyright & About App Modal
- **Attribution & Intellectual Property Protection**:
  - Created a dedicated **About App Modal** displaying software architecture, author attribution to **Simon**, and official GitHub links.
  - Integrated a protected, read-only **Copyright Card** in the Admin Settings (`/admin/targets`): allows factories to customize company name and logo while permanently preserving the author's intellectual property.
  - Direct GitHub contact link: [https://github.com/vodanh1814](https://github.com/vodanh1814).

### 🌐 Comprehensive English Documentation
- **Full International Support**:
  - Published complete English documentation ([`README.en.md`](./README.en.md)) and English Changelog ([`CHANGELOG.en.md`](./CHANGELOG.en.md)).
  - Bilingual switcher links on all documentation files.

---

## 🏭 Deployment & Auto-Update Guide for Your Factory

The system is designed with a **Multi-Factory (Multi-Instance)** architecture. Any organization can independently deploy their own instance using either of the following two methods while keeping data secure and updates seamless:

### 🏢 Option 1: On-Premise LAN / Local Server Deployment (Recommended for Factories)
> *Ideal for manufacturing plants seeking 100% data security within an isolated local network (intranet), with zero cloud dependencies.*

1. **Download Installer**:
   - Visit the [Releases](https://github.com/vodanh1814/Crystal-6S/releases) page on GitHub and download **`Crystal_5S_Setup.exe`**.
2. **Install & Launch**:
   - Run `Crystal_5S_Setup.exe` on a designated factory workstation or local server (supports Windows 10/11, Windows Server).
   - Select installation directory and click **"Install & Launch"**.
   - The installer automatically sets up Node.js, SQLite, and runs continuously in the background as a system service.
3. **Access Across the Factory**:
   - All desktop computers, smartphones, tablets, and Smart TV Wall screens connected to the factory Wi-Fi/LAN can access via the host IP (e.g. `http://192.168.1.100:5173`).
4. **1-Click Safe Auto-Update**:
   - Whenever author **Simon** publishes a new release on GitHub, an update banner appears in Admin Settings (`/admin/targets`): **"Auto-Update Now (vX.Y.Z) - 1 Click"**.
   - Simply click the button: the system automatically synchronizes the latest Git source code, updates dependencies, and applies database migrations safely — **preserving 100% of historical audit scores, findings, and photos**.

---

### ☁️ Option 2: Independent Cloudflare Deployment (100% Free Tier — Global Access)
> *Ideal for multi-site manufacturing enterprises or executives who require remote real-time access over the Internet.*

1. **Fork the Repository**:
   - Click the **Fork** button at the top-right of this repository to clone it into your own GitHub organization or account.
2. **Automated Setup via CLI**:
   ```bash
   git clone https://github.com/<your-org>/Crystal-6S.git
   cd Crystal-6S
   npm install
   npm run setup:cloud
   ```
   - The interactive wizard automatically provisions your free Cloudflare D1 Database and R2 Object Storage bucket, then deploys to Cloudflare Workers with zero infrastructure costs.
3. **Updating Your Cloudflare Instance**:
   - **Method A (Fastest — 15 seconds)**: Run `npx wrangler deploy` from your development terminal.
   - **Method B (1-Click via Web)**: Configure a GitHub PAT with `workflow` scope in Admin Settings and set GitHub Repository Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) to trigger automated CI/CD deployment via GitHub Actions.

---

## 2. Highlights of Version `v2.5.4`

### 🔄 Robust Git Auto-Update for Both Public & Private Repositories
- **Zero-Token Public Repository Sync**:
  - When the GitHub repository is set to Public, all client instances and standalone EXEs automatically check and apply updates via raw GitHub fallback without requiring tokens or hitting API rate limits.
- **Enterprise GitHub PAT Configuration UI**:
  - Built an in-app GitHub Personal Access Token (PAT) manager in Admin Settings with **AES-GCM-256** encryption for private repository deployments.
- **Self-Healing Git in Standalone EXE (Auto-Git-Repair)**:
  - If a Windows instance extracted from `Crystal_5S_Setup.exe` lacks `.git`, the system automatically initializes Git and links the official remote origin.
  - Automatically excludes binary and generated files (`Crystal_5S_Setup.exe`, `package-lock.json`) from dirty checks to prevent update lockouts.
- **Privacy & Infrastructure Sanitization**:
  - Permanently untracked internal infrastructure files (`CLOUDFLARE_LIVE_URL.txt`) and unified database naming conventions.

---

## 3. Highlights of Previous Versions (`v2.5.0` – `v2.5.3`)

- **v2.5.3 — Mobile & Tablet Responsive Optimization**:
  - Eliminated rigid flex ratios on mobile screens, allowing natural vertical touch scrolling.
  - Removed double nested scroll traps for silky-smooth gestures on iPhone Safari & Android Chrome.
  - 2-column mobile card layout with legible 3-tier hierarchy (Area Name $\rightarrow$ Large Score $\rightarrow$ Pending/Fixed).
- **v2.5.2 — Clear Area Names (`area_name`) on Factory Displays**:
  - Replaced abbreviated codes with full operational department names (`Knitting`, `Dyeing`, `Setting`, `Warehouse`, `Batching`, `Greige QC`, `Final QC`, `Lab test`...) across all cards, rankings, and alarms.
- **v2.5.1 — Smart Fallback for Early Month Dashboard**:
  - When a new month begins without completed weekly audits, the dashboard automatically retrieves the most recent historical month (e.g. October 96.33%) to prevent blank cards or missing trend lines.
- **v2.5.0 — Intelligent 1-Click Excel Historical Import**:
  - Download standardized `.xlsx` 12-month matrix templates and upload factory sheets with fuzzy area name matching and automated score percentage parsing.

---

## 4. Key Architectural Capabilities

### 📺 Smart Factory Andon TV Dashboard (`/` Public by Default)
- **Zero-Scroll 1080p Viewport Fit**: 6 summary KPI cards, 4×4 heatmap matrix of 16 manufacturing areas, 7-day overdue & repeat alarms, 12-week trend chart, S1–S5 breakdown, and Top/Bottom rankings.
- **Privacy Guard for Public Displays**: Automatically hides internal operator names and detailed incident descriptions when unauthenticated displays access the public TV route.

### 📋 Single Plant-wide Weekly Audit & Monthly Escalating Penalties
- ISO weekly audits (Mon–Sun) cover all active manufacturing areas:
  - Baseline score = `100%`.
  - Violations recorded with **Area + 5S Criterion + Description + Before 2K Photo**.
  - **Monthly Escalation**: Repeated violations in the same month incur an additional `+1 point` penalty per repeating week (`applied_penalty = base_penalty + repeat_level - 1`), resetting automatically at month boundary.

### 🖼️ 2K Photo Compression & Cloudflare R2 Storage
- Before / After photos are compressed to high-definition **2K (`2048px`, JPEG quality `0.85`)** and cached on Cloudflare R2.
- Interactive **Photo Gallery** with split-screen Before/After comparison and Lightbox zoom.

### ☁️ $0.00 Operating Cost on Cloudflare Free Tier
1. **Cloudflare Workers**: 100,000 requests/day free (sub-10ms edge execution).
2. **Cloudflare D1 Database**: 500 MB serverless SQLite database (~5M reads/day, 100K writes/day free).
3. **Cloudflare R2 Object Storage**: 10 GB free storage (holds >50,000 compressed 2K violation photos, sufficient for 3–5 years of plant operations at $0.00).

---

## 5. Quickstart & Installation

### Option 1: Standalone Windows Installer `Crystal_5S_Setup.exe` (Recommended)
1. Double-click **`Crystal_5S_Setup.exe`**.
2. Select language (`🇻🇳 Tiếng Việt` / `🇬🇧 English`) and theme (`🌙 Dark` / `☀ Light`).
3. Set your **Company Name**, upload your **Company Logo**, verify Admin credentials (`admin` / `admin123`), and click:
   - **▶ INSTALL & RUN LOCAL (LAN)**: Automatically configures local SQLite D1 and starts server at `http://localhost:5173`.
   - **☁ DEPLOY TO CLOUDFLARE**: Automatically creates serverless D1, R2, and deploys live to `https://5s-audit.<subdomain>.workers.dev`.

### Option 2: Command-Line Development
```powershell
# 1. Install dependencies
npm install

# 2. Initialize local D1 database & sample areas
npm run db:migrate:local
npm run db:sample:local

# 3. Start development server (http://localhost:5173)
npm run dev
```

---

## 6. Administrative Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start local development server at `http://localhost:5173` |
| `npm run build` | Typecheck TypeScript and compile production bundle (`dist/`) |
| `npm run build:exe` | Recompile standalone Windows installer `Crystal_5S_Setup.exe` |
| `npm run setup:local` | Run automated local LAN setup wizard via CLI |
| `npm run setup:cloud` | Run automated Cloudflare deployment wizard via CLI |
| `npm test` | Run automated test suite (26 unit tests covering scoring, escalation, auth, encryption) |
| `npm run typecheck` | Run full TypeScript type verification (`tsc -b`) |

---

## 7. License & Copyright

**Copyright © 2026 Simon. All rights reserved.**  
Designed, engineered, and maintained by **Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814)).

All intellectual property rights, database architecture, and application code are reserved. Enterprise users are granted rights to configure factory names and logos for internal manufacturing operations.
