/**
 * Central application version & release metadata for Crystal 5S Audit.
 * Bump this version alongside package.json and CHANGELOG.md on every release.
 */
export const APP_VERSION = '2.3.2';
export const APP_RELEASE_DATE = '2026-11-01';
export const GITHUB_REPO = 'vodanh1814/Crystal-6S';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;

/**
 * Compares two SemVer strings (e.g. "2.2.0" vs "2.1.0").
 * Returns:
 *   1 if a > b
 *  -1 if a < b
 *   0 if a === b
 */
export function compareSemver(a: string, b: string): number {
  const cleanA = String(a || '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0];
  const cleanB = String(b || '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0];

  const partsA = cleanA.split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = cleanB.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < 3; i++) {
    const va = partsA[i] || 0;
    const vb = partsB[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}
