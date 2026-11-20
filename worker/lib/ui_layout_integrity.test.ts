import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readProjectFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf-8');
}

test('CSS architecture provides 3-layer Sample A tokens, Bento surface utilities, and multi-aspect viewport rules', () => {
  const css = readProjectFile('src/index.css');

  // Layer 1 semantic tokens + dark/light adaptive support
  assert.match(css, /--app-bg:/);
  assert.match(css, /--app-surface:/);
  assert.match(css, /--app-surface-elevated:/);
  assert.match(css, /html\[data-color-mode="dark"\]/);
  assert.match(css, /html\[data-color-mode="light"\]/);

  // Layer 2 reusable surfaces, tabular mono KPI & container queries
  assert.match(css, /\.surface-card\s*\{/);
  assert.match(css, /\.surface-elevated\s*\{/);
  assert.match(css, /\.font-mono-kpi\s*\{/);
  assert.match(css, /\.cq-area-grid\s*\{/);
  assert.match(css, /\.cq-card\s*\{/);

  // Responsive multi-aspect-ratio TV & laptop single-frame scaling rules
  assert.match(css, /\.theme-tv-canvas/);
  assert.match(css, /\.full-tv-mode/);
  assert.match(css, /@media\s*\(min-width:\s*1024px\)\s*and\s*\(max-height:\s*840px\)/);
});

test('Layout shell expands inner screens full-width and keeps sidebar scroll + footer shrink-0 safe', () => {
  const layout = readProjectFile('src/components/Layout.tsx');

  // Full-screen expansion: no max-w-7xl constraining inner screens inside <main>
  assert.doesNotMatch(layout, /max-w-7xl\s+mx-auto/);
  assert.match(layout, /Bento Telemetry 2\.0/);

  // Scrollable navigation inside bounded flex column and fixed shrink-0 footer + mobile-safe dvh shell
  assert.match(layout, /h-dvh/);
  assert.match(layout, /overflow-y-auto\s+min-h-0/);
  assert.match(layout, /Sidebar Footer/);
  assert.match(layout, /shrink-0/);
});

test('Dashboard implements Sample A Bento Telemetry Pro 5-KPI strip, Hero Gauge, 5S Radar, SLA alarms & 15-Area Sparkline Matrix', () => {
  const dashboard = readProjectFile('src/pages/Dashboard.tsx');

  // Telemetry helper functions from Sample A
  assert.match(dashboard, /function renderBulletBar\(/);
  assert.match(dashboard, /function renderHeroGauge\(/);
  assert.match(dashboard, /function render5SRadar\(/);
  assert.match(dashboard, /function renderMiniSparkline\(/);

  // 5-card KPI Bento row + 12-col asymmetric workspace + 2-col mobile / 5-col desktop 15-area matrix
  assert.match(dashboard, /lg:grid-cols-5/);
  assert.match(dashboard, /grid-cols-2/);
  assert.match(dashboard, /lg:grid-rows-3/);
  assert.match(dashboard, /xl:col-span-4/);
  assert.match(dashboard, /xl:col-span-8/);
  assert.match(dashboard, /xl:flex-\[60\]/);
  assert.match(dashboard, /xl:flex-\[40\]/);
  assert.match(dashboard, /urgent_alarms/);
  assert.match(dashboard, /AreaChart/);
  assert.match(dashboard, /TOP IMPROVEMENT/);
  assert.doesNotMatch(dashboard, /KAIZEN/i);
  assert.match(dashboard, /area\.area_name \|\| area\.area_code/);
});

test('AuditDetail defaults to Split-Screen Audit Inspector workspace without max-w-7xl constraint', () => {
  const auditDetail = readProjectFile('src/pages/AuditDetail.tsx');

  assert.match(auditDetail, /useState<'split'\s*\|\s*'matrix'>\('split'\)/);
  assert.match(auditDetail, /lg:col-span-4/);
  assert.match(auditDetail, /lg:col-span-8/);
  assert.doesNotMatch(auditDetail, /max-w-7xl\s+mx-auto/);
});

test('FindingsList defaults to CAPA Visual Kanban with Before (2K) vs After photo comparison boxes', () => {
  const findingsList = readProjectFile('src/pages/FindingsList.tsx');

  assert.match(findingsList, /useState<'list'\s*\|\s*'gallery'\s*\|\s*'kanban'>\('kanban'\)/);
  assert.match(findingsList, /BEFORE \(2K\)|TRƯỚC \(2K\)/);
  assert.match(findingsList, /AFTER FIX|SAU KHẮC PHỤC/);
});

test('Reports provides Interactive Target Simulator Studio sliders driving heatmap classification', () => {
  const reports = readProjectFile('src/pages/Reports.tsx');

  assert.match(reports, /const \[simTarget,\s*setSimTarget\]/);
  assert.match(reports, /const \[simWarn,\s*setSimWarn\]/);
  assert.match(reports, /TARGET SIMULATOR STUDIO/);
  assert.match(reports, /type="range"/);
});

test('APP_VERSION in src/version.ts strictly matches version in package.json', () => {
  const pkg = JSON.parse(readProjectFile('package.json'));
  const versionTs = readProjectFile('src/version.ts');
  const match = versionTs.match(/export const APP_VERSION = ['"]([^'"]+)['"]/);

  assert.ok(match, 'APP_VERSION constant not found in src/version.ts');
  assert.equal(match?.[1], pkg.version);
});

test('Subagent configurations (Neon, Argon, Hydrogen) and GEMINI.md workflow rules are properly defined', () => {
  const subagents = [
    { name: 'neon', path: '.agents/agents/neon.md' },
    { name: 'argon', path: '.agents/agents/argon.md' },
    { name: 'hydrogen', path: '.agents/agents/hydrogen.md' },
  ];

  for (const { name, path: relPath } of subagents) {
    const absPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(absPath), `Missing subagent config: ${relPath}`);
    const content = fs.readFileSync(absPath, 'utf-8');
    assert.match(content, new RegExp(`^name:\\s*${name}$`, 'm'));
    assert.match(content, /^description:\s*.+$/m);
    assert.match(content, /^subagent:\s*true$/m);
    assert.match(content, /^tools:\s*\[.+\]$/m);
  }

  const geminiRules = readProjectFile('GEMINI.md');
  assert.match(geminiRules, /`Neon`.*Model chính cho lập trình, thiết kế kiến trúc, xử lý vấn đề phức tạp và review code/);
  assert.match(geminiRules, /`Argon`.*Model chuyên phân tích sâu, nghiên cứu, lập kế hoạch và review độc lập/);
  assert.match(geminiRules, /`Hydrogen`.*Model thực thi nhanh, viết code theo đặc tả, sửa lỗi nhỏ và chạy test/);
});
