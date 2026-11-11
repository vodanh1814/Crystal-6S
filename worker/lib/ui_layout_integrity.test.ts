import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('UI Layout: index.css locks single-frame zero-scroll dashboard on laptop/PC/TV', () => {
  const cssPath = path.resolve('src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Must define theme-tv-canvas with overflow-y: auto for mobile
  assert.match(
    cssContent,
    /\.theme-tv-canvas\s*\{\s*overflow-y:\s*auto;/m,
    'Canvas must enable overflow-y: auto by default for responsive screen adaptability'
  );

  // Must lock overflow-y to hidden on desktop/laptop (>=1024w and >=500h) for single frame
  assert.match(
    cssContent,
    /@media\s*\([^)]*min-width:\s*1024px\)\s+and\s+\(min-height:\s*500px\)\s*\{\s*\.theme-tv-canvas\s*\{\s*overflow-y:\s*hidden;/m,
    'Canvas must lock overflow-y to hidden on screens >=1024x500 for zero-scroll single frame'
  );

  // Must support Full TV Mode / Fullscreen locking strictly to 100vh
  assert.match(
    cssContent,
    /\.full-tv-mode\s*\.theme-tv-canvas/,
    'Full TV Mode must lock canvas to 100vh for wall TV displays'
  );
});

test('UI Layout: Dashboard Continuous Improvement & Leaderboard use side-by-side 2-column Grid without text loss', () => {
  const dashboardPath = path.resolve('src/pages/Dashboard.tsx');
  const content = fs.readFileSync(dashboardPath, 'utf-8');

  // Must use side-by-side 2-column grid for Kaizen improvement tab to guarantee zero text loss and zero overlap
  assert.match(
    content,
    /grid\s+grid-cols-2\s+gap-1\.5\s+sm:gap-2\s+overflow-hidden/,
    'Kaizen card must use CSS grid-cols-2 with overflow-hidden for parallel columns'
  );

  // Must use equal 4-column span for Row 3 cards
  assert.match(
    content,
    /col-span-12\s+md:col-span-6\s+lg:col-span-4\s+min-h-\[170px\]/,
    'Row 3 cards must have balanced 4-column span'
  );

  // Top improvers and Stagnant areas must have shrink-0 items
  assert.match(
    content,
    /top_improvers_title[\s\S]*?shrink-0/,
    'Top improvers section must contain shrink-0 items'
  );
  assert.match(
    content,
    /stagnant_areas_title[\s\S]*?shrink-0/,
    'Stagnant areas section must contain shrink-0 items'
  );
});

test('UI Layout: Dashboard Area Cards use 5-column grid (3 rows) and preserve all 3 Tiers', () => {
  const dashboardPath = path.resolve('src/pages/Dashboard.tsx');
  const content = fs.readFileSync(dashboardPath, 'utf-8');

  // 15 areas must use lg:grid-cols-5 for exactly 3 rows
  assert.match(
    content,
    /lg:grid-cols-5/,
    'Area matrix must use 5 columns on desktop so 15 areas fit into exactly 3 rows'
  );

  // Tier 1 Header must have shrink-0
  assert.match(
    content,
    /Tier 1: Header[\s\S]*?shrink-0/,
    'Tier 1 Area Header must be shrink-0 protected'
  );

  // Tier 3 Footer (Open/Verify counts) must have shrink-0 so it is never clipped
  assert.match(
    content,
    /Tier 3: Action Telemetry Footer[\s\S]*?shrink-0/,
    'Tier 3 Action Telemetry Footer must be shrink-0 protected so Open/Verify counts are never lost'
  );

  // Urgent alarms must have shrink-0
  assert.match(
    content,
    /urgent_alarms[\s\S]*?shrink-0\s+rounded-lg\s+border/,
    'Urgent alarms must have shrink-0 to prevent vertical overlap'
  );
});

test('UI Layout: Left Sidebar preserves navigation scroll and footer protection', () => {
  const layoutPath = path.resolve('src/components/Layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf-8');

  // Desktop sidebar nav must have overflow-y-auto and min-h-0
  assert.match(
    content,
    /<nav\s+className="[^"]*overflow-y-auto\s+min-h-0[^"]*"/,
    'Sidebar nav must have overflow-y-auto min-h-0 so it never pushes or squashes footer buttons'
  );

  // Sidebar footer must have shrink-0
  assert.match(
    content,
    /Sidebar Footer[\s\S]*?shrink-0/,
    'Sidebar footer must have shrink-0 to prevent avatar/button distortion'
  );
});
