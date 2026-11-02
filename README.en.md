# Crystal 5S Audit — Plant-wide 5S Inspection, Andon Monitoring & Continuous Improvement System

**Language: [🇬🇧 English](./README.en.md) · [🇻🇳 Tiếng Việt](./README.md)**  
**Current Version: `v2.5.7`** · See release history in [CHANGELOG.en.md](./CHANGELOG.en.md) / [CHANGELOG.md](./CHANGELOG.md).  
**Author: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))  
**Official Repository:** [https://github.com/vodanh1814/Crystal-6S](https://github.com/vodanh1814/Crystal-6S)

An enterprise-grade web application & standalone Windows installer engineered for manufacturing plants to audit, score, track 2K photo remediation, and display real-time **Smart Factory Andon TV dashboards** for 5S (*Sort – Set in order – Shine – Standardize – Sustain*). The system operates seamlessly both on **Local LAN** and **Cloudflare Serverless Edge (Workers, D1 SQLite Database, R2 Object Storage)**.

---

## 1. Highlights of Version `v2.5.5`

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
