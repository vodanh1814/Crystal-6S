# Changelog (English)

All notable changes to the **Crystal 5S Audit** system are documented in this file in compliance with [Semantic Versioning](https://semver.org/).

**Language: [🇬🇧 English](./CHANGELOG.en.md) · [🇻🇳 Tiếng Việt](./CHANGELOG.md)**  
**Author: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))

---

## [2.11.11] - 2026-11-11

### Changed & Improved (Streamlined Area Cards: Removed Trend Section, Optimized Weekly & Monthly Scores with Smart Fallback)
- **Removed Area Trend Telemetry (Simplified Area Telemetry)**:
  - Completely stripped out the trend arrows and mini sparkline curves from each individual area card on the Factory Andon status matrix.
  - Eliminated visual clutter and cramped layouts, restoring an uncluttered, spacious, and modern aesthetic.
- **Smart Metric Fallback for Weekly & Monthly Scores**:
  - **Weekly Score**:
    - When the current week audit is submitted: Displays the current week score (e.g. `W46: 94.0%`).
    - When the current week is pending: Automatically falls back to the **latest audited week** (e.g. `W45: 87.0%`), providing managers with immediate operational context instead of showing a blank or dry `PEND`.
  - **Monthly Score**:
    - When the current month has an average score: Displays the current month score (e.g. `Month 11: 87.0%` / `Nov: 87.0%`).
    - When transitioning into a new month without data: Seamlessly falls back to the **previous month's average score** (e.g. `Month 10: 89.2%` / `Oct: 89.2%`).
- **Symmetric Dual-Tile Layout with High-Contrast Typography**:
  - Structured the card telemetry body into two clean, symmetric dark glass tiles: Left Tile for `WEEK W{n}` and Right Tile for `MONTH {n}` with enlarged monospace numerals (`text-base sm:text-lg font-black font-mono`), ensuring immediate readability from distances across the plant floor.

---

## [2.11.10] - 2026-11-11

### Fixed & Improved (UI/UX Pro Max Architecture - Natural Fluid Density & Zero Overlap on Web Browsers)
- **Natural Fluid Density Architecture**:
  - Eliminated rigid `h-full` and `auto-rows-fr` constraints on desktop/laptop web browsers with browser chrome, tabs, bookmarks, and Windows taskbars.
  - Converted area cards and analytics panels to natural fluid dimensions (`h-auto min-h-[102px]` for area cards, `min-h-[220px]` for bottom charts), allowing the browser to cleanly engage smooth vertical scrolling (`overflow-y-auto`) whenever viewport height is tight, completely eliminating crushed cards and overlapping text.
- **Redesigned UI/UX Pro Max 3-Tier Bento Area Cards**:
  - **Tier 1 (Header)**: Prominent area title on left (`font-black text-sm text-white truncate max-w-[65%]`) and full rounded Status Pill Badge on right (`PASS`, `WARN`, `FAIL`, `W46 PEND`, or `🚨 Overdue`) with elegant divider (`pb-1.5 border-b border-slate-800/60`).
  - **Tier 2 (Telemetry Body)**: Balanced 2-column split:
    - *Left*: Current Week score (`W46: PEND` or `87.0%`) and Month Average score (`Nov: 87.0%`) in bold monospace.
    - *Right*: High-visibility Trend Pill (`bg-slate-950/80 border border-slate-700/60 rounded-lg px-2 py-1 shadow-xs`) with bold directional arrow & delta (`▲ +2.5` / `▼ -1.0` / `➔ 0`) and `58x22` px mini sparkline SVG curve.
  - **Tier 3 (Action Footer)**: Crisp bottom telemetry row with `border-t border-slate-800/80 pt-1.5 text-xs text-slate-400 font-mono`: Open findings count (`Open: {n}`) on left, Verification status or repeat count (`Verify: {n}` / `Repeat`) on right.
- **Enhanced Bottom Analytics Strip (Row 3)**:
  - Height of 12-week trend chart expanded (`min-h-[160px]`) within a spacious container (`min-h-[220px]`) ensuring the trend curve, reference targets (95% / 90%), and tooltips render comfortably.
  - Fluid grid layout: 1 column on Mobile (`col-span-12`), 2 columns on Tablet (`md:col-span-6`), 3 columns on Desktop (`lg:col-span-5 / 4 / 3`).

---

## [2.11.9] - 2026-11-11

### Added & Improved (High-Visibility Trend Telemetry, Default Andon Standardization & Responsive Auto-Fit Containers)
- **High-Visibility Trend Arrow & Dynamic Mini Sparklines**:
  - Expanded SVG canvas to `56x20` px with `strokeWidth="1.8"` and an enlarged `r="2.8"` latest score dot in [`AreaSparkline.tsx`](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaSparkline.tsx).
  - Implemented dynamic local auto-scaling (`scoreRange = Math.max(maxScore - minScore, 4)`), allowing subtle 1-3 point variations to form a vivid 8-12px curve rather than a flat line.
  - Prominent bold trend arrow & delta telemetry (`▲ +2.5` / `▼ -1.0` / `➔ 0`) rendered in high-contrast `text-xs sm:text-sm font-black font-mono` for effortless readability from across the factory floor.
- **Removed Alternative Themes - Standardized on Default Factory Dark Andon**:
  - Stripped out experimental layout branchings (`bento`, `hud`, `zone`) from [`Dashboard.tsx`](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/Dashboard.tsx).
  - Firmly established the single canonical **Standard Factory Dark Andon Board** as the permanent, rock-solid default.
  - Streamlined Admin Targets ([`AdminTargets.tsx`](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/AdminTargets.tsx)) to display an informative Andon active status card with a direct TV link.
- **Fluid Responsive Density Containers Across All Devices**:
  - **Large TV / Desktop Displays (`lg:` and up)**: Fluid 1-screen auto-fit with zero scrollbars (`lg:h-full lg:auto-rows-fr`, 4 columns x 4 rows).
  - **Mobile & Tablet Devices (`< lg`)**: Fluid natural height (`h-auto`) with silky vertical scrolling (`overflow-y-auto`). Card heights comfortably set to `h-auto min-h-[82px] p-2 sm:p-2.5`, eradicating any overlap or text clipping on mobile.

---

## [2.11.8] - 2026-11-11

### Added & Improved (Fluid Adaptive 3-Tier Layout for Density Auto-Fit & Historical Data Inheritance for Sparklines)
- **Fluid Adaptive 3-Tier Card Layout**:
  - **Tier 1 (Header)**: Area Name (left) + 6-Week Mini Sparkline with dynamic trend arrow `↗`/`↘`/`➔` (right). Moving sparkline to the header completely eliminates an unnecessary vertical row.
  - **Tier 2 (Dual Telemetry Baseline)**: Week & Month metrics aligned horizontally on a single baseline (`W46: PEND` | `Nov: 87.0% ▲+2.5`), eradicating vertical stacking.
  - **Tier 3 (Status & Action Footer)**: Status badge (`W46 Pend` / `Pass` / `Warn` / `Fail`) on the left; action telemetry (`Open: 0` · `Verify: 0`) on the right, integrated with a 2px ultra-slim progress bar.
- **Display Density Auto-Fit Container Tuning**:
  - Integrated `min-h-0`, `overflow-hidden`, fluid padding `p-1.5 sm:p-2`, and scaled gaps `gap-1 sm:gap-1.5` across both **Classic Matrix View** ([Dashboard.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/Dashboard.tsx)) and **Zone Focus View** ([DashboardZoneFocus.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/DashboardZoneFocus.tsx)).
  - Completely eradicated card overlap and text collision across all display modes (Full TV 1080p, 2K, Laptops, Mobile).
- **Historical Monthly Scores Inheritance for Area Trends**:
  - Backend automatically falls back to area monthly historical scores (`historical_monthly_scores`) when a week does not have an audited weekly session.
  - 6-Week Mini Sparkline draws a rich, continuous performance curve with week tooltips instead of a solitary dot.
  - Area Trend Inspector Modal ([AreaTrendModal.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaTrendModal.tsx)) displays a complete 12-week trajectory.

---

## [2.11.7] - 2026-11-11

### Fixed (Resolved 12-Week SQL Query Bug Causing API 500 Error)
- **Standardized Plant-wide and Area-level Score Querying**:
  - Properly segregated factory-wide weekly averages from table `audits` (`iso_year, iso_week, score`) and area-specific scores via `JOIN audit_area_scores aas ON aas.audit_id = a.id`.
  - Thoroughly eliminated SQLite runtime error `no such column: area_id` triggered by mistakenly querying `area_id` directly on `audits`.
  - Fully restored 100% healthy operation for [`GET /api/reports/dashboard`](https://5s-audit.cetvn.workers.dev/api/reports/dashboard) and the Smart Factory Andon TV dashboard.

---

## [2.11.6] - 2026-11-11

### Added & Improved (6-Week Mini Sparkline Trend & Area 5S Performance Inspector Modal)
- **Distinct Dual Telemetry Columns on Each Production Area Card**:
  - The middle section of each area card is partitioned into **two distinct labeled columns**:
    - **Left Column (Week)**: Permanently displays `W{w}` label with the submitted audit score or `Pending` if pending audit.
    - **Right Column (Month)**: Permanently displays `Month {m}` (e.g. `Nov`) with the monthly average and MoM delta (`▲+2.5pts`).
  - Top card badge: Displays `Pending W{w}` when weekly audit is not yet submitted, avoiding any confusion with completed audits.
- **Pure SVG 6-Week Mini Sparkline Performance Curve ([AreaSparkline.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaSparkline.tsx))**:
  - Visualizes the 6-week historical score trajectory for each individual area using ultra-lightweight inline SVG.
  - Dynamic 3-tier semantic coloring: Green (`≥95%`), Yellow (`≥90%`), Red (`<90%`).
  - Dynamic trend indicator: `↗` (Improving), `↘` (Declining), `➔` (Stable).
  - Hover tooltip displays week-by-week performance: `W41: 90% · W42: 92% · ...`
- **Area Trend & 5S Performance Inspector Modal ([AreaTrendModal.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaTrendModal.tsx))**:
  - Clicking any area card opens an in-depth analytics popup without navigating away or losing Andon TV context:
    - Header: Area name, area code, Area Manager, and designated Auditor.
    - 4 Telemetry KPIs: Week Score, Month Average (MoM), Week-over-Week delta (WoW), and Open/Overdue/Verify counts.
    - Expanded 12-week Recharts LineChart with Target (95%) and Warning (90%) reference lines.
    - Detailed 5S Pillars breakdown (S1 - S5) showing area-specific violation counts and penalty deductions.
    - Direct CTA button linking to area findings.
- **Backend Optimization & Symmetrical Internationalization**:
  - 12-week query unified across plant-wide and area-level data with **zero extra database queries**.
  - Added 18 symmetric translation keys across Vietnamese and English.

---

## [2.11.5] - 2026-11-10

### Added & Improved (Automatic Fallback to Latest Completed Week When Weekly Audit Is Pending)
- **Smart Fallback Mechanism for Weekly Average KPI Card (KPI 1)**:
  - When the current week has not been audited yet (`kpi.weekly_avg === null`), the system automatically inherits and displays the latest completed week's score and week label (`kpi.latest_completed_avg`, `kpi.latest_completed_week`).
  - Card header title automatically updates to reflect the active data: **`WEEKLY AVG {W_latest}`** (e.g. `WEEKLY AVG W45` instead of showing a blank/pending current week).
  - Status badge switches to **`[Latest Week]`** with a helpful tooltip referencing the pending audit week.
  - Score is displayed in large, bold font with full standard 3-tier semantic coloring: Green (`≥95%`), Yellow (`≥90%`), Red (`<90%`).
  - Weekly change delta is preserved with an informative pending audit note: **`▲ +0.3% (W{current} pending)`**.
- **Complete Synchronization Across All Dashboard Views**:
  - Fully synchronized on both **Classic Matrix View** ([Dashboard.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/Dashboard.tsx)) and **Zone Focus View** ([DashboardZoneFocus.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/DashboardZoneFocus.tsx)).
  - Added new multilingual translation keys: `latest_week_badge`, `pending_audit_week`, `vs_prev_week` across `en.ts` and `vi.ts`.

---

## [2.11.4] - 2026-11-10

### Fixed & Improved (Standardized Tab Button to "Improvement" & Eliminated Redundant "Kaizen" References)
- **Standardized Tab Toggle Label in 5S Continuous Improvement Card**:
  - Replaced hardcoded `Kaizen` tab button label with localized `{t('tab_improvement_btn')}`.
  - English interface now cleanly displays **`[Improvement]  [Top]`**, perfectly matching the card header `5S CONTINUOUS IMPROVEMENT`.
  - Vietnamese interface displays **`[Cải thiện]  [Top]`**.
- **Consistent Terminology Across the Entire Card**:
  - Updated Micro-Strip telemetry pill: `▼ {n} Needs Improvement` (EN) / `▼ {n} Cần cải thiện` (VI).
  - Updated action-needed section header: `⚠️ STAGNANT / NEEDS IMPROVEMENT` (EN) / `⚠️ Khu vực Chưa cải thiện` (VI).
  - Fully eliminated terminology discrepancies and hardcoded text.

---

## [2.11.3] - 2026-11-10

### Added & Improved (Dropdown Notification Center & Dashboard Accordion Alarm Cards)
- **Integrated Header Dropdown Notification Center (`NotificationDropdown.tsx`)**:
  - Replaced the simple Bell redirect link with an enterprise **Dropdown Notification Center (Popover)**.
  - Interactive popup: Click to toggle, auto-closes on outside click (`mousedown`) or `Escape` key.
  - Features **3 Fast-Filtering Tabs**:
    - **All**: Aggregates all active plant alarms and notifications.
    - **Needs Fix**: Filters open overdue and upcoming findings for Area Managers.
    - **Awaiting Verify**: Filters resolved findings awaiting Auditor/Admin verification.
  - Full Telemetry display: Status badges (Overdue X days, Due today, X days left, Awaiting verify), area code, criterion code, penalty deduction (-1 pt), violation description, and deadline.
  - Direct navigation: Clicking any notification immediately closes the menu and navigates to the finding detail page; footer links provide shortcuts to overdue-only findings and full findings inventory.
  - Automatic theme adaptation with backdrop-blur styling across both Dark and Light Chrome modes.
- **Accordion Drawer for Dashboard Alarm Cards**:
  - Cards in the `7-DAY ALARMS & REPEATED FINDINGS` widget on the Dashboard can now be clicked to **expand downwards (Accordion Drawer)**, displaying the complete 5S criterion, on-site observations (`description`), area, and deadline without navigating away.
  - Action buttons ("Update After →" / "Verify Close →") include event bubbling protection (`stopPropagation`), allowing instant navigation.
- **Full Internationalization (i18n)**:
  - Added 100% of new localization keys for Vietnamese and English, 0 hardcoded text.

---

## [2.11.2] - 2026-11-10

### Fixed & Improved (Eliminated Empty Voids in 5S Breakdown & Kaizen Continuous Improvement Cards)
- **Redesigned "FINDINGS & PENALTIES BY 5S" Card**:
  - Replaced legacy single-row items with modern **2-Tier Stacked Telemetry Rows**:
    - Upper Tier: S-group label with semantic color indicator dot (`S1 · Sort`, `S2 · Set in order`,...), right-aligned badge showing finding count and penalty points (-X pts).
    - Lower Tier: Full-width modern progress bar (`h-2.5 sm:h-3 rounded-full`) with smooth 500ms animation.
  - Added **Telemetry Summary Footer Strip**: Displays plant-wide monthly penalties (`Total Penalties: -X pts`) and highest violation driver (`Top Violation: S...`), eliminating vertical empty space.
- **Enhanced "5S CONTINUOUS IMPROVEMENT / LEADERBOARD" Card**:
  - **Kaizen View**:
    - Integrated **Kaizen Status Micro-Strip**: Quick summary pills showing factory-wide Kaizen status (`▲ X Improved` | `▬ Y Stable` | `▼ Z Needs Kaizen`).
    - Expanded display from 2 up to **Top 3 Improvers** (`🚀`) and **Top 3 Stagnant / Action Needed Areas** (`⚠️`), complete with month average and MoM delta.
  - **Leaderboard View**:
    - Expanded display up to **Top 3 Leaders** (`🏆 1.`, `🥈 2.`, `🥉 3.`) and **Top 3 Action Needed Areas** (`⚠️`).
    - Refined card padding (`px-2.5 py-1.5 sm:py-2`), matching height with the adjacent 12-week trend chart.
- **Standardized Localization & Units**:
  - Added new i18n keys: `total_penalty_month`, `top_violation_group`, `kaizen_stat_improved`, `kaizen_stat_stable`, `kaizen_stat_declined`, `top_leaders_title`, `bottom_lagging_title`.
  - Zero hardcoded text, unified points unit as `pts` (EN) and `đ` (VI).

---

## [2.11.1] - 2026-11-10

### Fixed & Improved (Fluid Auto-Fitting Viewport Scaling in Full TV Mode)
- **Eliminated Excessive Empty Bottom Gap in Full TV Mode**:
  - In fullscreen TV mode on large displays (1080p, 1440p, 4K), dashboard cards previously had fixed compact heights leaving up to 40% unused black space at the bottom.
  - Implemented smart **Flexbox Fluid Auto-Fit**: Row 2 (16-Area Matrix & 7-Day Alarms) automatically takes `flex-[1.25] min-h-[290px]`, Row 3 (12-Week Trend Line & 5S/Kaizen Analysis) takes `flex-1 min-h-[180px]`. Screen space is proportionally filled with zero empty gap at the bottom.
  - Recharts chart wrapper converted to `flex-1 min-h-[140px]`, automatically enlarging chart height and boosting visual clarity of the 12-week trend line.
  - All Area cards and 7-Day Alarm cards now stretch to `h-full flex flex-col justify-between`, distributing content evenly across vertical space.
- **Synchronized Across All 4 Dashboard Layouts**:
  - **Layout 1 (Classic Andon Matrix)**: Symmetrical expansion of the 16-area matrix wall and 7-day alarms panel.
  - **Layout 2 (Workshop Zone Focus)**: Both Production (`flex-[1.4]`) and Support (`flex-1`) divisions expand vertically to fill the screen.
  - **Layout 3 (Bento Telemetry 2.0)**: Bento 4x4 grid and Kaizen progress cards stretch evenly.
  - **Layout 4 (Industrial SCADA HUD)**: 3-flank control console and Telemetry Spline fill the entire viewport.
- **Preserved 14" Laptop Windowed Experience**:
  - Maintained safe `min-h-[...]` bounds and natural vertical scrolling (`overflow-y: auto`), preventing text overlap or clipping when running inside compact laptop browser windows.

---

## [2.11.0] - 2026-11-09

### Added & Improved (UI/UX Pro Max 4 Dashboard Layouts & Centralized Admin Layout Studio)
- **Integrated 2 New Approved Cutting-Edge Dashboard Layouts (4 Complete Layouts)**:
  - **Layout 3: Bento Telemetry 2.0 (`bento` - Multidimensional Bento Grid)**:
    - Sleek modern 4x4 Bento grid architecture with subtle border highlights (`rounded-2xl`).
    - Handcrafted SVG 5S Star Radar chart visualizing plant-wide health balance across S1-S5.
    - Micro progress indicators, MoM Kaizen Spotlight (Top Improvers vs Stagnant Areas), and a 12-week spline score trend.
  - **Layout 4: Industrial SCADA HUD (`hud` - Tactical Factory Cyberpunk)**:
    - High-contrast central control console featuring neon Cyan & Amber cyber accents.
    - Dual tactical flanks: Left flank grouping 10 core Production workshops; Right flank grouping 6 Support & Utility areas.
    - Real-time 7-day alarms command core with live On-Time Remediation analytics.
- **Centralized Layout Selection Exclusively in Admin Settings (Admin Layout Studio)**:
  - **Removed Public Switcher Buttons from Main Dashboard**: Completely removed layout switch buttons from `Dashboard.tsx` header for a clutter-free, production-ready Andon TV screen.
  - **Admin Layout Studio (`AdminTargets.tsx`)**: Exclusive control center for Admins to preview all 4 layouts via interactive CSS miniature cards and set the plant-wide default layout (`app_settings.dashboard_layout`).
  - **Automatic Public Sync**: Public visitors and shop-floor displays automatically load and render the layout configured by Admin via `/api/reports/dashboard`.
- **Plant-wide Point & Penalty Unit Standardization**:
  - Eliminated unit inconsistencies across the entire application.
  - **Vietnamese (`vi`)**: 100% standardized with `đ` (`-1đ`, `(-7đ)`, `▲ +5.5đ`, `▼ -1.0đ`, `+1đ/tuần`).
  - **English (`en`)**: 100% standardized with `pts` (`-1 pt`, `(-7 pts)`, `▲ +5.5 pts`, `▼ -1.0 pts`, `+1 pt/week`).

---

## [2.10.2] - 2026-11-09

### Added & Improved (Guest Public Access to Area Findings from Dashboard Without Sign-in)
- **Direct Area Findings Access for Guests Without Requiring Sign-In**:
  - **Dashboard Layouts 1 & 2 (`Dashboard.tsx` & `DashboardZoneFocus.tsx`)**:
    - Removed mandatory sign-in redirects (`is_authenticated ? ... : '/login'`). Clicking any area card in the 16-area status wall or Production & Support divisions directs guests straight to `/findings?area_id=X`.
    - 7-day alarm cards link directly to finding details at `/findings/:id`.
  - **Secure Public Read APIs (`areas.ts` & `photos.ts`)**:
    - `GET /api/areas`: Opened public read access so the Findings page can load active plant areas and quick filter pills. Write operations (`POST`, `PUT`) remain strictly protected by `authMiddleware` and admin permissions.
    - `GET /api/photos/:id`: Opened public read access for 5S evidence photos (before/after) and Lightbox zoom. Photo deletion (`DELETE`) remains strictly protected.
  - **Enhanced Navigation & Guest Indicators (`FindingsList.tsx` & `FindingDetail.tsx`)**:
    - Added a prominent `← Back to Dashboard` navigation button at the top of the Findings page.
    - Added a subtle `Public Read-Only Mode (No Sign-in Required)` status badge for unauthenticated guests.
    - Back button on finding details smartly routes back to the filtered area list (`/findings?area_id=X`).

---

## [2.10.1] - 2026-11-09

### Fixed & Improved (Fluid Auto-Scaling Typography, Card Sizing & Web Mode Overflow Fix)
- **Natural Web Scrolling & Static Lock Removal (`src/index.css`)**:
  - Removed rigid media query `@media (min-height: 860px) and (min-width: 1280px) { overflow-y: hidden; }` that prevented scrolling on 1080p laptop displays in standard windowed browser mode.
  - Set `.theme-tv-canvas` to `overflow-y: auto` by default; strictly locks to `overflow-y: hidden` only when entering Full TV Mode (`:fullscreen`, `:-webkit-full-screen`, `.full-tv-mode`).
- **Comprehensive Auto-Scaling & Layout Bleed Prevention (`Dashboard.tsx`)**:
  - Removed `lg:overflow-visible` and forced ratio constraints (`lg:flex-[58]`, `lg:flex-[42]`), transitioning to responsive fluid flow `overflow-y: auto overflow-x-hidden`.
  - **Row 1 (6 KPI Strip):** Adjusted height to `min-h-[56px] sm:min-h-[62px]`, numbers to `text-lg sm:text-xl font-mono`, padding `p-1.5 sm:px-2.5 sm:py-1.5`.
  - **Row 2 (16 Areas & 7-Day Alarms Board):**
    - 16 area cards: Optimized height `min-h-[56px] sm:min-h-[62px] lg:min-h-[66px]`, padding `px-2 py-1 sm:px-2.5 sm:py-1.5`, area name `truncate max-w-[68%] text-[11px] sm:text-xs`, score `text-sm sm:text-base lg:text-lg`. Total matrix height reduced from 420px to ~300px.
    - 7-day alarms panel: 3 alarm cards compacted to `min-h-[46px] sm:min-h-[50px]`, title line-clamped to 1 row. Height matches the 16-area wall exactly, permanently eliminating alarm bleed into Row 3.
  - **Row 3 (12-Week Trend Line & Kaizen Tracker):**
    - Trend chart height adjusted to `h-36 sm:h-40 lg:h-44 min-h-[140px]`. 5S breakdown and Kaizen/Leaderboard cards padded compactly `py-0.5 px-1.5`.
  - **Total Dashboard Height:** Compressed from ~820px to ~620px - 650px, fitting 100% on a 14" laptop screen in windowed web browser mode without clipping, and scrolling smoothly on smaller screens.
- **Synchronized Sample 2 (`DashboardZoneFocus.tsx`)**:
  - Scaled Hero circular gauge to `w-20 h-20 sm:w-22 sm:h-22` with synchronized responsive division cards.

---

## [2.10.0] - 2026-11-09

### Added (Month-over-Month Continuous Improvement & Kaizen Tracking)
- **Month-over-Month (MoM) Continuous Improvement Analytics Engine**:
  - **Backend (`worker/routes/reports.ts`)**:
    - Queries monthly averages and submitted audit data for current year, effective year, and prior year (`effectiveYear - 1`), ensuring seamless delta calculations during the January year-turn boundary (comparing Jan to previous year's Dec).
    - Computes area score deltas (`delta_prev_month` = current month average minus previous month average, rounded to 1 decimal place) across all 16 plant areas.
    - Classifies Kaizen trends into semantic statuses: `improved`, `declined`, `stagnant`, `stable`.
    - Returns structured `improvement_analysis` with **Top Improvers** (areas with highest positive score surge) and **Stagnant Areas** (areas below target or persistently lagging requiring Kaizen interventions).
  - **Frontend (`Dashboard.tsx` & `DashboardZoneFocus.tsx`)**:
    - Renders dynamic MoM delta badges on all area cards: `▲ +X.Xđ` (emerald for progress), `▼ X.Xđ` (rose for regression), `▬ 0đ` (muted for steady state).
    - Added an interactive **Kaizen / Leaderboard** toggle switch in Row 3 (Sample 1) and the Command Column (Sample 2), empowering leadership and plant managers to track continuous improvement momentum alongside static rankings.

### Changed & Refactored (Restructured Sample 2 Dashboard into 2 Divisions)
- **Sample 2 Dashboard Restructuring (`DashboardZoneFocus.tsx`)**:
  - Consolidated scattered workshop clusters into exactly **2 Standardized Plant Divisions**:
    - 🏭 **Production Division** (10 areas): Knitting, Dyeing, Batching, Setting, VAP, Greige QC, Final QC, Lab Dip, Lab Test, UNT.
    - 🛠️ **Support & Utilities Division** (6 areas): Warehouse, Maintenance (MTN), Utility, TSC, ADM, FM/CFD.
  - Each division features a dedicated summary header: Division average score, MoM score delta, PASS/WARN/FAIL status badges, and open/overdue finding tallies.
  - Upgraded left command column with a 3-tab switcher: **5S Continuous Improvement**, **5S Pillars Breakdown (S1-S5)**, and **Top/Bottom Leaderboard**.

### Removed (Streamlined Dashboard Presentation Catalog)
- **Completely Removed Sample 3 Heatmap (`DashboardHeatmapAction.tsx`)**:
  - Eliminated the heatmap component and all `heatmap` layout types across backend and frontend, refining the layout options to the two most effective formats: **Sample 1 (3-Row Matrix)** and **Sample 2 (Workshop Zone Focus)**.
  - Updated Plant Targets Admin page (`/admin/targets`) to a streamlined 2-column layout preview grid.

### Fixed (Screen Overflow & Clipping Prevention on 14" Laptops)
- **Resolved Overflow and Layout Clipping on Compact Screens**:
  - Added `overflow-y-auto` to `theme-tv-canvas` in `Layout.tsx`, enabling smooth vertical scrolling on 14" laptop displays (1366x768 or 125%/150% Windows scaling) and eliminating 7-day alarm bleed into Row 3.
  - Adjusted minimum card heights (`min-h-[58px]`) with text line clamping and `truncate min-w-0` to protect title and badge boundaries.

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
