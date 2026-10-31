import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { APP_VERSION, GITHUB_REPO, GITHUB_REPO_URL, compareSemver } from './src/version';

function runCmd(cmd: string, cwd = process.cwd()): string {
  return execSync(cmd, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    timeout: 120000,
  }).trim();
}

function readLocalPackageVersion(): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    return String(pkg.version || APP_VERSION).trim();
  } catch {
    return APP_VERSION;
  }
}

/**
 * Vite Server Plugin providing Admin-Only Git Version Check & One-Click Auto-Update
 * for Local / Factory LAN deployments.
 */
function crystalAutoUpdatePlugin(): Plugin {
  return {
    name: 'crystal-5s-auto-update',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (
          url !== '/api/settings/local-update-check' &&
          url !== '/api/settings/local-update-apply'
        ) {
          return next();
        }

        const sendJson = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        };

        // 1. Verify caller is authenticated Admin via /api/auth/me on the local server
        try {
          const host = req.headers.host || 'localhost:5173';
          const cookie = req.headers.cookie || '';
          const authRes = await fetch(`http://${host}/api/auth/me`, {
            headers: { cookie },
          });

          if (!authRes.ok) {
            return sendJson(401, {
              error: 'Unauthorized: Vui lòng đăng nhập tài khoản Admin để kiểm tra cập nhật.',
            });
          }

          const authData: any = await authRes.json();
          if (!authData?.user || authData.user.role !== 'admin') {
            return sendJson(403, {
              error: 'Forbidden: Chỉ Quản trị viên (Admin) mới có quyền cập nhật hệ thống.',
            });
          }
        } catch (err: any) {
          return sendJson(401, {
            error: 'Không thể xác thực quyền Admin: ' + (err.message || ''),
          });
        }

        // 2. Handle GET /api/settings/local-update-check
        if (url === '/api/settings/local-update-check' && req.method === 'GET') {
          const currentVersion = readLocalPackageVersion();
          let latestVersion = currentVersion;
          let currentCommit = '';
          let latestCommit = '';
          let changelog = '';

          try {
            const hasGit = fs.existsSync(path.join(process.cwd(), '.git'));
            if (hasGit) {
              try {
                runCmd('git fetch origin main --tags');
              } catch {}

              try {
                currentCommit = runCmd('git rev-parse --short HEAD');
              } catch {}
              try {
                latestCommit = runCmd('git rev-parse --short origin/main');
              } catch {}

              try {
                const remotePkgRaw = runCmd('git show origin/main:package.json');
                const remotePkg = JSON.parse(remotePkgRaw);
                if (remotePkg.version) {
                  latestVersion = String(remotePkg.version).trim();
                }
              } catch {}

              try {
                changelog = runCmd('git show origin/main:CHANGELOG.md').slice(0, 3500);
              } catch {}
            } else {
              // Fallback to GitHub CLI (`gh`) if installed
              try {
                const b64Pkg = runCmd(
                  `gh api repos/${GITHUB_REPO}/contents/package.json?ref=main --jq .content`
                );
                const remotePkg = JSON.parse(
                  Buffer.from(b64Pkg.replace(/\s/g, ''), 'base64').toString('utf-8')
                );
                if (remotePkg.version) {
                  latestVersion = String(remotePkg.version).trim();
                }
                const b64Chg = runCmd(
                  `gh api repos/${GITHUB_REPO}/contents/CHANGELOG.md?ref=main --jq .content`
                );
                changelog = Buffer.from(b64Chg.replace(/\s/g, ''), 'base64')
                  .toString('utf-8')
                  .slice(0, 3500);
              } catch {}
            }

            if (!changelog && fs.existsSync(path.join(process.cwd(), 'CHANGELOG.md'))) {
              changelog = fs
                .readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8')
                .slice(0, 3500);
            }

            const hasSemverUpdate = compareSemver(latestVersion, currentVersion) > 0;
            const hasCommitUpdate =
              Boolean(currentCommit && latestCommit && currentCommit !== latestCommit) &&
              compareSemver(latestVersion, currentVersion) >= 0;

            return sendJson(200, {
              current_version: currentVersion,
              latest_version: latestVersion,
              current_commit: currentCommit,
              latest_commit: latestCommit,
              has_update: hasSemverUpdate || hasCommitUpdate,
              changelog,
              repo: GITHUB_REPO,
              repo_url: GITHUB_REPO_URL,
              mode: 'local_git',
              checked_at: new Date().toISOString(),
            });
          } catch (err: any) {
            return sendJson(200, {
              current_version: currentVersion,
              latest_version: currentVersion,
              has_update: false,
              repo: GITHUB_REPO,
              repo_url: GITHUB_REPO_URL,
              mode: 'local_git',
              checked_at: new Date().toISOString(),
              error: err.message || 'Không thể kiểm tra Git remote',
            });
          }
        }

        // 3. Handle POST /api/settings/local-update-apply (Admin Only Auto-Update)
        if (url === '/api/settings/local-update-apply' && req.method === 'POST') {
          const previousVersion = readLocalPackageVersion();
          const logs: string[] = [];
          try {
            const root = process.cwd();
            if (!fs.existsSync(path.join(root, '.git'))) {
              logs.push('▶ Khởi tạo kết nối Git tới kho lưu trữ chính thức...');
              runCmd('git init');
              try {
                runCmd(`git remote add origin ${GITHUB_REPO_URL}.git`);
              } catch {}
            }

            logs.push(`▶ Đang tải bản cập nhật mới nhất từ GitHub (${GITHUB_REPO})...`);
            runCmd('git fetch origin main --tags');
            const pullOut = runCmd('git reset --hard origin/main');
            logs.push(`✔ Đã đồng bộ mã nguồn mới nhất: ${pullOut}`);

            logs.push('▶ Đang kiểm tra & cập nhật thư viện (npm install)...');
            runCmd('npm install');
            logs.push('✔ Đã đồng bộ thư viện hoàn tất.');

            // Apply any new D1 migrations locally while preserving existing data
            try {
              const wranglerRaw = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf-8');
              const dbMatch = wranglerRaw.match(/"database_name"\s*:\s*"([^"]+)"/);
              const dbName = dbMatch ? dbMatch[1] : 'crystal5s-db';
              logs.push(`▶ Đang cập nhật cấu trúc Database D1 (${dbName})...`);
              runCmd(`npx wrangler d1 migrations apply ${dbName} --local`);
              logs.push('✔ Database D1 đã được nâng cấp an toàn (giữ nguyên 100% dữ liệu).');
            } catch (dbErr: any) {
              logs.push(`⚠ Lưu ý Database migration: ${dbErr.message}`);
            }

            const newVersion = readLocalPackageVersion();
            logs.push(`🎉 Hoàn tất nâng cấp từ v${previousVersion} lên v${newVersion}!`);

            return sendJson(200, {
              ok: true,
              previous_version: previousVersion,
              new_version: newVersion,
              log: logs.join('\n'),
            });
          } catch (err: any) {
            logs.push(`❌ Lỗi khi cập nhật: ${err.message}`);
            return sendJson(500, {
              error: err.message || 'Auto-update failed',
              log: logs.join('\n'),
            });
          }
        }

        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [crystalAutoUpdatePlugin(), react(), tailwindcss(), cloudflare()],
  build: {
    outDir: 'dist',
  },
});
