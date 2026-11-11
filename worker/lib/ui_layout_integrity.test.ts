import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('UI Layout: index.css ensures natural vertical scrolling on laptop/compact screens', () => {
  const cssPath = path.resolve('src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Must define theme-tv-canvas with overflow-y: auto
  assert.match(
    cssContent,
    /\.theme-tv-canvas\s*\{\s*overflow-y:\s*auto;/m,
    'Canvas must enable overflow-y: auto by default for responsive screen adaptability'
  );

  // Must only lock overflow-y to hidden when height is >= 880px (not 640px)
  assert.match(
    cssContent,
    /min-height:\s*880px/,
    'Fit media query must require at least 880px height to prevent crushing laptops'
  );

  // Must support Full TV Mode / Fullscreen locking strictly to 100vh
  assert.match(
    cssContent,
    /\.full-tv-mode\s*\.theme-tv-canvas/,
    'Full TV Mode must lock canvas to 100vh for wall TV displays'
  );
});

test('UI Layout: Dashboard Continuous Improvement & Leaderboard use non-overlapping Grid', () => {
  const dashboardPath = path.resolve('src/pages/Dashboard.tsx');
  const content = fs.readFileSync(dashboardPath, 'utf-8');

  // Must use grid grid-rows-2 for Kaizen improvement tab to guarantee zero overlapping
  assert.match(
    content,
    /grid\s+grid-rows-2\s+gap-1\.5\s+overflow-hidden/,
    'Kaizen card must use CSS grid-rows-2 with overflow-hidden to prevent overlapping'
  );

  // Top improvers and Stagnant areas must have overflow-hidden containers and shrink-0 items
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

test('UI Layout: Dashboard Area Cards preserve all 3 Tiers (no missing text/cut-offs)', () => {
  const dashboardPath = path.resolve('src/pages/Dashboard.tsx');
  const content = fs.readFileSync(dashboardPath, 'utf-8');

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
