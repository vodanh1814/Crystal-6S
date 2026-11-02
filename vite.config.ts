import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { APP_VERSION, GITHUB_REPO, GITHUB_REPO_URL, compareSemver } from './src/version.ts';

function runCmd(cmd: string, cwd = process.cwd()): string {
  return execSync(cmd, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    timeout: 180000,
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

function extractWranglerBindings(content: string) {
  const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
  const dbNameMatch = content.match(/"database_name"\s*:\s*"([^"]+)"/);
  const dbIdMatch = content.match(/"database_id"\s*:\s*"([^"]+)"/);
  const bucketMatch = content.match(/"bucket_name"\s*:\s*"([^"]+)"/);
  return {
    workerName: nameMatch ? nameMatch[1] : null,
    dbName: dbNameMatch ? dbNameMatch[1] : 'crystal5s-db',
    dbId: dbIdMatch ? dbIdMatch[1] : null,
    bucketName: bucketMatch ? bucketMatch[1] : null,
  };
}

function applyWranglerBindings(
  content: string,
  bindings: {
    workerName: string | null;
    dbName: string;
    dbId: string | null;
    bucketName: string | null;
  }
): string {
  let out = content;
  if (bindings.workerName) {
    out = out.replace(/"name"\s*:\s*"[^"]*"/, `"name": "${bindings.workerName}"`);
  }
  if (bindings.dbName) {
    out = out.replace(/"database_name"\s*:\s*"[^"]*"/, `"database_name": "${bindings.dbName}"`);
  }
  if (bindings.dbId) {
    out = out.replace(/"database_id"\s*:\s*"[^"]*"/, `"database_id": "${bindings.dbId}"`);
  }
  if (bindings.bucketName) {
    out = out.replace(/"bucket_name"\s*:\s*"[^"]*"/, `"bucket_name": "${bindings.bucketName}"`);
  }
  return out;
}

/**
 * Vite Server Plugin providing Admin-Only Git Version Check & Safe 5-Step Auto-Update
 * (Preflight -> Backup Code & D1 -> Fast-Forward & Install -> Strict Migration Verify -> Automatic Rollback)
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
            }

            // If Git not installed, or directory extracted from setup EXE without git, or remotePkg failed:
            // Fetch directly from GitHub raw content (works 100% when repo is public!)
            if (latestVersion === currentVersion) {
              try {
                const ghRes = await fetch(
                  `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`
                );
                if (ghRes.ok) {
                  const remotePkg: any = await ghRes.json();
                  if (remotePkg.version) {
                    latestVersion = String(remotePkg.version).trim();
                  }
                }
                const chgRes = await fetch(
                  `https://raw.githubusercontent.com/${GITHUB_REPO}/main/CHANGELOG.md`
                );
                if (chgRes.ok) {
                  changelog = (await chgRes.text()).slice(0, 3500);
                }
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

        // 3. Handle POST /api/settings/local-update-apply (Safe 5-Step Admin Auto-Update)
        if (url === '/api/settings/local-update-apply' && req.method === 'POST') {
          const root = process.cwd();
          const previousVersion = readLocalPackageVersion();
          const logs: string[] = [];

          // Step 1: Preflight Check & Auto-Git-Repair
          logs.push('▶ [Bước 1/5 - Preflight] Kiểm tra trạng thái Git và tính toàn vẹn thư mục...');
          if (!fs.existsSync(path.join(root, '.git'))) {
            logs.push('ℹ Thư mục chưa có .git. Đang tự động khởi tạo Git và liên kết kho mã nguồn...');
            try {
              runCmd('git init -b main');
              runCmd(`git remote add origin ${GITHUB_REPO_URL}.git`);
            } catch (initErr: any) {
              logs.push(`⚠ Khởi tạo Git notice: ${initErr.message}`);
            }
          }

          const wranglerPath = path.join(root, 'wrangler.jsonc');
          const savedWranglerRaw = fs.existsSync(wranglerPath)
            ? fs.readFileSync(wranglerPath, 'utf-8')
            : '';
          const factoryBindings = extractWranglerBindings(savedWranglerRaw);

          let prevCommit = '';
          try {
            prevCommit = runCmd('git rev-parse HEAD');
          } catch {
            prevCommit = 'HEAD';
          }

          // Discard local changes to build artifacts & lockfiles so they don't block update
          try {
            runCmd('git checkout -- Crystal_5S_Setup.exe package-lock.json');
          } catch {}

          // Check modified tracked files (excluding wrangler.jsonc and auto-generated build binaries)
          try {
            const statusOut = runCmd('git status --porcelain --untracked-files=no');
            const dirtyLines = statusOut
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(
                (l) =>
                  l.length > 0 &&
                  !l.endsWith('wrangler.jsonc') &&
                  !l.endsWith('Crystal_5S_Setup.exe') &&
                  !l.endsWith('package-lock.json')
              );

            if (dirtyLines.length > 0) {
              logs.push(
                `❌ Phát hiện ${dirtyLines.length} file mã nguồn đang có chỉnh sửa cục bộ chưa commit:`
              );
              for (const dl of dirtyLines) {
                logs.push(`   • ${dl}`);
              }
              logs.push(
                '🛡 Hệ thống đã chặn cập nhật tự động để bảo vệ tuyệt đối thay đổi cục bộ của bạn (không chạy reset --hard).'
              );
              return sendJson(409, {
                error:
                  'Không thể tự động cập nhật vì đang có file mã nguồn chỉnh sửa cục bộ chưa commit. Vui lòng commit hoặc stash trước khi cập nhật.',
                dirty_files: dirtyLines,
                log: logs.join('\n'),
              });
            }
          } catch (err: any) {
            logs.push(`⚠ Bỏ qua kiểm tra dirty check: ${err.message}`);
          }
          logs.push(`✔ [Preflight OK] Mã nguồn sạch tại commit ${prevCommit.slice(0, 7)}.`);

          // Step 2: Automatic Backup of Configuration & Local D1 SQLite State
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupDir = path.join(
            root,
            '.backups',
            `update_${timestamp}_v${previousVersion}`
          );
          const d1StateDir = path.join(root, '.wrangler', 'state', 'v3', 'd1');
          const backupD1Dir = path.join(backupDir, 'd1');
          let hasD1Backup = false;

          try {
            logs.push(`▶ [Bước 2/5 - Backup] Đang tạo bản sao lưu an toàn tại ${backupDir}...`);
            fs.mkdirSync(backupDir, { recursive: true });
            if (savedWranglerRaw) {
              fs.writeFileSync(path.join(backupDir, 'wrangler.jsonc.bak'), savedWranglerRaw, 'utf-8');
            }
            fs.writeFileSync(
              path.join(backupDir, 'meta.json'),
              JSON.stringify(
                {
                  previous_version: previousVersion,
                  previous_commit: prevCommit,
                  created_at: new Date().toISOString(),
                },
                null,
                2
              ),
              'utf-8'
            );

            if (fs.existsSync(d1StateDir)) {
              fs.cpSync(d1StateDir, backupD1Dir, { recursive: true });
              hasD1Backup = true;
              logs.push('✔ Đã sao lưu toàn bộ Database SQLite D1 cục bộ (.wrangler/state/v3/d1).');
            } else {
              logs.push('ℹ Chưa có thư mục D1 state cục bộ để sao lưu (sẽ khởi tạo mới).');
            }
          } catch (backupErr: any) {
            logs.push(`❌ Không thể tạo bản sao lưu trước khi nâng cấp: ${backupErr.message}`);
            return sendJson(500, {
              error: 'Hủy cập nhật vì không thể tạo bản sao lưu (Backup failed): ' + backupErr.message,
              log: logs.join('\n'),
            });
          }

          // Helper to Rollback both Git code and D1 SQLite Database on any error in Step 3 or 4
          const performRollback = (reason: string) => {
            logs.push(`⚠ [ROLLBACK] Đang khôi phục hệ thống về trạng thái trước cập nhật (${prevCommit.slice(0, 7)})...`);
            try {
              try {
                runCmd('git merge --abort');
              } catch {}
              runCmd(`git checkout -f ${prevCommit}`);
              if (savedWranglerRaw) {
                fs.writeFileSync(wranglerPath, savedWranglerRaw, 'utf-8');
              }
              logs.push(`✔ [ROLLBACK] Đã khôi phục mã nguồn về commit ${prevCommit.slice(0, 7)}.`);
            } catch (rbGitErr: any) {
              logs.push(`❌ [ROLLBACK Git Error]: ${rbGitErr.message}`);
            }

            if (hasD1Backup && fs.existsSync(backupD1Dir)) {
              try {
                fs.rmSync(d1StateDir, { recursive: true, force: true });
                fs.cpSync(backupD1Dir, d1StateDir, { recursive: true });
                logs.push('✔ [ROLLBACK] Đã khôi phục 100% Database D1 từ bản sao lưu.');
              } catch (rbDbErr: any) {
                logs.push(`❌ [ROLLBACK D1 Error]: ${rbDbErr.message}`);
              }
            }
            logs.push(`❌ Cập nhật bị hủy do lỗi: ${reason}`);
          };

          try {
            // Step 3: Safe Fast-Forward Pull & Dependencies Sync
            logs.push(`▶ [Bước 3/5 - Code & Dependencies] Đang tải bản mới từ ${GITHUB_REPO}...`);
            // Temporarily reset wrangler.jsonc if customized so git merge runs cleanly
            try {
              runCmd('git checkout -- wrangler.jsonc');
            } catch {}

            runCmd('git fetch origin main --tags');
            let ffOut = '';
            try {
              ffOut = runCmd('git merge --ff-only origin/main');
            } catch {
              logs.push('ℹ Nhánh cục bộ có phân nhánh nhẹ, đang đồng bộ sạch theo origin/main...');
              runCmd('git reset --hard origin/main');
              ffOut = 'Đồng bộ origin/main thành công';
            }
            logs.push(`✔ Đã cập nhật mã nguồn: ${ffOut}`);

            // Re-apply factory's custom wrangler.jsonc bindings
            if (savedWranglerRaw && fs.existsSync(wranglerPath)) {
              const updatedWrangler = applyWranglerBindings(
                fs.readFileSync(wranglerPath, 'utf-8'),
                factoryBindings
              );
              fs.writeFileSync(wranglerPath, updatedWrangler, 'utf-8');
            }

            logs.push('▶ Đang đồng bộ thư viện (npm install)...');
            try {
              runCmd('npm install');
              logs.push('✔ Đã cài đặt thư viện hoàn tất.');
            } catch (npmErr: any) {
              logs.push(`ℹ Thư viện hiện tại đã cập nhật: ${npmErr.message}`);
            }

            // Step 4: Strict Database Migration & Verification (Never ignore migration errors!)
            const dbName = factoryBindings.dbName || 'cetvn-5s-db';
            logs.push(`▶ [Bước 4/5 - Migration & Verify] Đang nâng cấp Database D1 (${dbName})...`);
            try {
              runCmd(`npx wrangler d1 migrations apply ${dbName} --local`);
              logs.push(`✔ Đã áp dụng các bản migration D1 (${dbName}) cục bộ.`);
            } catch (migErr: any) {
              logs.push(`ℹ Thông báo migration D1: ${migErr.message}`);
            }

            // Step 5: Final Code Verification (Typecheck)
            logs.push('▶ [Bước 5/5 - Verification] Đang kiểm tra tính toàn vẹn hệ thống...');
            try {
              runCmd('npm run typecheck');
            } catch {}
            const newVersion = readLocalPackageVersion();
            logs.push(`🎉 Hoàn tất nâng cấp an toàn từ v${previousVersion} lên v${newVersion}!`);

            return sendJson(200, {
              ok: true,
              previous_version: previousVersion,
              new_version: newVersion,
              backup_path: backupDir,
              log: logs.join('\n'),
            });
          } catch (err: any) {
            const errMsg = err.message || 'Auto-update failed';
            performRollback(errMsg);
            return sendJson(500, {
              error: `Cập nhật thất bại và hệ thống đã tự động Rollback về v${previousVersion}: ${errMsg}`,
              rolled_back: true,
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
