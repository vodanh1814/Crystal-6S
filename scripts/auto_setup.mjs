// Crystal 5S Audit — Multi-Company One-Click Automated Setup & Deploy App
// Supports full single-screen configuration from Crystal_5S_Setup.exe or CLI

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const WRANGLER_PATH = path.join(ROOT, 'wrangler.jsonc');
const DEV_VARS_PATH = path.join(ROOT, '.dev.vars');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));

function getCliArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).replace(/^['"]|['"]$/g, '').trim() : null;
}

function banner() {
  console.log('======================================================================');
  console.log('   CRYSTAL 5S AUDIT — AUTOMATED MULTI-COMPANY INSTALLER & DEPLOYER');
  console.log('======================================================================');
}

function step(msg) {
  console.log(`\n▶ ${msg}`);
}

function ok(msg) {
  console.log(`✔ ${msg}`);
}

function warn(msg) {
  console.log(`⚠ ${msg}`);
}

function run(cmd, options = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    stdio: options.silent ? 'pipe' : 'inherit',
    encoding: 'utf-8',
    ...options,
  });
}

function slugify(str) {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'crystal'
  );
}

/**
 * Generates PBKDF2-SHA256 hash compatible with worker/lib/crypto.ts:
 * Format: pbkdf2$100000$<b64salt>$<b64hash>
 */
function hashPasswordNode(password) {
  const iterations = 100000;
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2$${iterations}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

function readCurrentConfig() {
  const raw = fs.readFileSync(WRANGLER_PATH, 'utf-8');
  const nameMatch = raw.match(/"name"\s*:\s*"([^"]+)"/);
  const dbNameMatch = raw.match(/"database_name"\s*:\s*"([^"]+)"/);
  const bucketMatch = raw.match(/"bucket_name"\s*:\s*"([^"]+)"/);
  return {
    workerName: nameMatch ? nameMatch[1] : 'crystal-5s-audit',
    dbName: dbNameMatch ? dbNameMatch[1] : 'crystal5s-db',
    bucketName: bucketMatch ? bucketMatch[1] : 'crystal5s-photos',
  };
}

function updateWranglerConfig({ workerName, dbName, dbId, bucketName }) {
  let content = fs.readFileSync(WRANGLER_PATH, 'utf-8');
  if (workerName) {
    content = content.replace(/"name"\s*:\s*"[^"]*"/, `"name": "${workerName}"`);
  }
  if (dbName) {
    content = content.replace(/"database_name"\s*:\s*"[^"]*"/, `"database_name": "${dbName}"`);
  }
  if (dbId) {
    content = content.replace(/"database_id"\s*:\s*"[^"]*"/, `"database_id": "${dbId}"`);
  }
  if (bucketName) {
    content = content.replace(/"bucket_name"\s*:\s*"[^"]*"/, `"bucket_name": "${bucketName}"`);
  }
  fs.writeFileSync(WRANGLER_PATH, content, 'utf-8');
}

function ensureLocalEnv() {
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    step('Đang cài đặt thư viện (Installing dependencies via npm install)...');
    run('npm install');
    ok('Đã cài đặt thư viện thành công (Dependencies installed).');
  } else {
    ok('Thư viện (node_modules) đã sẵn sàng.');
  }

  if (!fs.existsSync(DEV_VARS_PATH)) {
    const secret = 's5-secret-' + crypto.randomBytes(24).toString('hex');
    fs.writeFileSync(DEV_VARS_PATH, `JWT_SECRET=${secret}\n`, 'utf-8');
    ok('Đã tự động tạo khóa bảo mật .dev.vars.');
  }
}

function readLogoAsDataUrl(filePath) {
  if (!filePath) return '';
  const trimmed = filePath.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) return '';
  const resolved = path.isAbsolute(trimmed) ? trimmed : path.join(ROOT, trimmed);
  if (!fs.existsSync(resolved)) {
    warn(`Không tìm thấy file ảnh logo tại: ${resolved}. Sẽ dùng logo mặc định.`);
    return '';
  }

  const stat = fs.statSync(resolved);
  // Cloudflare D1 has a hard SQLite statement limit of 100,000 characters.
  // Base64 expands by 33%, so an image > 35 KB exceeds 47,000 chars and risks SQLITE_TOOBIG.
  if (stat.size > 35 * 1024) {
    warn(`File ảnh logo (${(stat.size / 1024).toFixed(1)} KB) lớn hơn giới hạn nạp trực tiếp ban đầu của Cloudflare D1 (35 KB).`);
    console.log('   ℹ Hệ thống sẽ giữ logo mặc định trong lệnh cài đặt ban đầu.');
    console.log('   ℹ Bạn có thể tải Logo công ty lên trực tiếp tại trang Quản trị (Admin > Nhận diện thương hiệu), hệ thống Web sẽ tự động nén sắc nét.');
    return '';
  }

  const ext = path.extname(resolved).toLowerCase();
  let mime = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
  else if (ext === '.svg') mime = 'image/svg+xml';
  else if (ext === '.webp') mime = 'image/webp';
  else if (ext === '.png') mime = 'image/png';

  const buf = fs.readFileSync(resolved);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function promptCompanyBranding(defaultName = 'CRYSTAL') {
  const cliComp = getCliArg('company');
  const cliLogo = getCliArg('logo');
  if (cliComp !== null) {
    return {
      companyName: cliComp || defaultName,
      companyLogo: readLogoAsDataUrl(cliLogo || ''),
    };
  }

  console.log('\n── Nhận diện thương hiệu (Tên hiển thị & Logo Công ty) ──');
  const nameInput = await ask(
    `Nhập Tên Công ty / Nhà máy hiển thị trên giao diện (Enter = "${defaultName}"): `
  );
  const companyName = nameInput.trim() || defaultName;

  const logoInput = await ask(
    `Nhập đường dẫn file Logo công ty (.png, .jpg, .svg) (Enter nếu chưa có): `
  );
  const companyLogo = readLogoAsDataUrl(logoInput);

  return { companyName, companyLogo };
}

function applyAllInitialSettingsToD1(dbName, isRemote, config) {
  const {
    companyName,
    companyLogo,
    adminUser,
    adminPass,
    adminName,
    defaultTarget,
    lang,
  } = config;

  const flag = isRemote ? '--remote' : '--local';
  const safeName = (companyName || 'CRYSTAL').replace(/'/g, "''");
  const safeLogo = (companyLogo || '').replace(/'/g, "''");
  const targetNum = Math.min(100, Math.max(50, Number(defaultTarget) || 90));
  const currentYear = new Date().getUTCFullYear();

  const statements = [
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('company_name', '${safeName}', CURRENT_TIMESTAMP);`,
  ];

  // Separate statement for company_logo with strict size limit (< 45,000 chars)
  // to prevent Cloudflare D1 SQLITE_TOOBIG error
  if (safeLogo && safeLogo.length <= 45000) {
    statements.push(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('company_logo', '${safeLogo}', CURRENT_TIMESTAMP);`
    );
  } else if (safeLogo) {
    warn(`Chuỗi ảnh logo quá dài (${safeLogo.length} ký tự). Đã bỏ qua trong SQL ban đầu để tránh lỗi SQLITE_TOOBIG.`);
    console.log('   ℹ Vui lòng cập nhật logo trên Web Admin (hệ thống sẽ tự động nén sắc nét).');
  }

  statements.push(
    `UPDATE yearly_targets SET target = ${targetNum};`,
    `INSERT INTO yearly_targets (year, target) VALUES (${currentYear}, ${targetNum}) ON CONFLICT(year) DO UPDATE SET target = excluded.target;`
  );

  if (adminUser && adminPass && adminPass.length >= 6) {
    const safeUser = adminUser.trim().toLowerCase().replace(/'/g, "''");
    const safeFullName = (adminName || 'System Administrator').trim().replace(/'/g, "''");
    const safeLang = lang === 'en' ? 'en' : 'vi';
    const passHash = hashPasswordNode(adminPass).replace(/'/g, "''");
    statements.push(
      `INSERT INTO users (username, password_hash, full_name, role, lang, active, token_version)
       VALUES ('${safeUser}', '${passHash}', '${safeFullName}', 'admin', '${safeLang}', 1, 0)
       ON CONFLICT(username) DO UPDATE SET
         password_hash = excluded.password_hash,
         full_name = excluded.full_name,
         role = 'admin',
         active = 1;`
    );
  }

  const tmpSqlPath = path.join(ROOT, '.tmp_init_config.sql');
  try {
    fs.writeFileSync(tmpSqlPath, statements.join('\n'), 'utf-8');
    run(`npx wrangler d1 execute ${dbName} ${flag} --file=.tmp_init_config.sql`, { silent: true });
    ok(`Đã nạp cấu hình Công ty "${companyName}", KPI (${targetNum}%) và tài khoản Admin (${adminUser || 'admin'}) vào D1.`);
  } catch (err) {
    console.error(`❌ Lỗi khi nạp cấu hình khởi tạo vào D1 (${dbName}): ${err.message}`);
    throw err;
  } finally {
    if (fs.existsSync(tmpSqlPath)) {
      try {
        fs.unlinkSync(tmpSqlPath);
      } catch {}
    }
  }
}

async function setupLocalMode() {
  const cfg = readCurrentConfig();
  step('1/3. Kiểm tra & cài đặt môi trường (Checking & installing environment)...');
  ensureLocalEnv();

  const branding = await promptCompanyBranding('CRYSTAL');
  const cliSeed = getCliArg('seed');
  const seedAns =
    cliSeed !== null
      ? cliSeed
      : await ask(
          '\nNạp sẵn 16 Khu vực mẫu (KNI, GQC, WH, DYE...)? [1] Có (Mặc định) / [2] Không: '
        );

  const adminUser = getCliArg('admin-user') || 'admin';
  const adminPass = getCliArg('admin-pass') || '';
  const adminName = getCliArg('admin-name') || 'System Administrator';
  const defaultTarget = getCliArg('target') || '90';
  const port = getCliArg('port') || '5173';
  const lang = getCliArg('lang') || 'vi';

  step('2/3. Khởi tạo Database D1 & nạp 24 tiêu chí 5S (Initializing D1 & 24 criteria)...');
  run(`npx wrangler d1 migrations apply ${cfg.dbName} --local`);
  if (seedAns !== '2') {
    run(`npx wrangler d1 execute ${cfg.dbName} --local --file=seed/sample_areas.sql`);
    ok('Đã nạp 24 tiêu chí 5S + 16 khu vực mẫu.');
  } else {
    run(`npx wrangler d1 execute ${cfg.dbName} --local --command="DELETE FROM areas;"`, { silent: true });
    ok('Đã nạp 24 tiêu chí 5S (Danh sách khu vực để trống cho Admin tự khai báo).');
  }

  applyAllInitialSettingsToD1(cfg.dbName, false, {
    ...branding,
    adminUser,
    adminPass,
    adminName,
    defaultTarget,
    lang,
  });

  step(`3/3. Đang khởi động máy chủ tại http://localhost:${port} ...`);
  setTimeout(() => {
    try {
      execSync(`start http://localhost:${port}`, { stdio: 'ignore', shell: 'cmd.exe' });
    } catch {}
  }, 3000);

  const child = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(port)], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

async function setupCloudflareMode() {
  const currentCfg = readCurrentConfig();
  const cliComp = getCliArg('company');
  const cliSlug = getCliArg('slug');
  let companyInput = '';
  if (cliSlug !== null && cliSlug !== '') {
    companyInput = cliSlug;
  } else if (cliComp !== null) {
    companyInput = cliComp;
  } else {
    console.log('── Cấu hình Tên Công ty / Nhà máy (Để tách riêng Web, Database & Kho ảnh) ──');
    companyInput = await ask(
      `Nhập mã tên Công ty/Nhà máy (Enter = "${currentCfg.workerName.replace(/-5s-audit$/, '')}"): `
    );
  }

  let workerName = currentCfg.workerName;
  let dbName = currentCfg.dbName;
  let bucketName = currentCfg.bucketName;
  let defaultDisplayName = 'CRYSTAL';

  if (companyInput) {
    const slug = slugify(companyInput);
    defaultDisplayName = (cliComp || companyInput).toUpperCase();
    workerName = `${slug}-5s-audit`;
    dbName = `${slug}-5s-db`;
    bucketName = `${slug}-5s-photos`;
    updateWranglerConfig({ workerName, dbName, bucketName });
    ok(`Đã cấu hình định danh Cloudflare cho "${slug}":`);
    console.log(`   • Worker : ${workerName}`);
    console.log(`   • D1 DB  : ${dbName}`);
    console.log(`   • R2     : ${bucketName}`);
  } else {
    ok(`Sử dụng cấu hình hiện tại: ${workerName} (DB: ${dbName}, R2: ${bucketName})`);
  }

  const branding = await promptCompanyBranding(defaultDisplayName);

  const cliSeed = getCliArg('seed');
  const seedAns =
    cliSeed !== null
      ? cliSeed
      : await ask(
          '\nNạp sẵn 16 Khu vực mẫu lên Cloud? [1] Có (Mặc định) / [2] Không: '
        );

  const adminUser = getCliArg('admin-user') || 'admin';
  const adminPass = getCliArg('admin-pass') || '';
  const adminName = getCliArg('admin-name') || 'System Administrator';
  const defaultTarget = getCliArg('target') || '90';
  const lang = getCliArg('lang') || 'vi';

  step('1/7. Kiểm tra thư viện và môi trường...');
  ensureLocalEnv();

  step('2/7. Kiểm tra đăng nhập tài khoản Cloudflare...');
  let loggedIn = false;
  try {
    const who = run('npx wrangler whoami', { silent: true });
    if (who && !who.includes('not authenticated') && !who.includes('You are not authenticated')) {
      loggedIn = true;
      ok('Đã kết nối tài khoản Cloudflare.');
    }
  } catch {}

  if (!loggedIn) {
    warn('Trình duyệt sẽ mở ra. Hãy bấm "Allow" để cấp quyền cho Cloudflare...');
    run('npx wrangler login');
    ok('Đăng nhập Cloudflare thành công!');
  }

  step(`3/7. Khởi tạo & kết nối Database D1 (${dbName}) trên Cloudflare...`);
  let d1Id = null;
  try {
    const listJson = run('npx wrangler d1 list --json', { silent: true });
    const list = JSON.parse(listJson);
    const found = list.find((d) => d.name === dbName);
    if (found && found.uuid) {
      d1Id = found.uuid;
      ok(`Đã tìm thấy Database D1 có sẵn: ${dbName} (${d1Id})`);
    }
  } catch {}

  if (!d1Id) {
    try {
      const out = run(`npx wrangler d1 create ${dbName}`, { silent: true });
      const match = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (match) {
        d1Id = match[0];
        ok(`Đã tạo mới Database D1: ${dbName} (${d1Id})`);
      }
    } catch {
      try {
        const listJson = run('npx wrangler d1 list --json', { silent: true });
        const list = JSON.parse(listJson);
        const found = list.find((d) => d.name === dbName);
        if (found && found.uuid) d1Id = found.uuid;
      } catch {}
    }
  }

  if (d1Id) {
    updateWranglerConfig({ workerName, dbName, dbId: d1Id, bucketName });
    ok('Đã tự động cập nhật database_id vào wrangler.jsonc.');
  } else {
    warn('Không đọc được database_id tự động. Giữ nguyên cấu hình wrangler.jsonc hiện tại.');
  }

  step(`4/7. Khởi tạo Kho lưu trữ hình ảnh R2 (${bucketName})...`);
  try {
    run(`npx wrangler r2 bucket create ${bucketName}`, { silent: true });
    ok(`Đã tạo kho ảnh R2: ${bucketName}.`);
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || '');
    if (msg.includes('already exists') || msg.includes('10004')) {
      ok(`Kho ảnh R2 (${bucketName}) đã tồn tại sẵn.`);
    } else {
      warn('Lưu ý: Nếu tài khoản Cloudflare chưa bật R2, hãy bấm Enable R2 trong Cloudflare Dashboard.');
    }
  }

  step('5/7. Cài khóa bảo mật JWT_SECRET lên Cloudflare...');
  const jwtSecret = 's5-prod-' + crypto.randomBytes(24).toString('hex');
  try {
    execSync('npx wrangler secret put JWT_SECRET', {
      cwd: ROOT,
      input: jwtSecret,
      stdio: ['pipe', 'ignore', 'ignore'],
      encoding: 'utf-8',
    });
    ok('Đã cài đặt khóa bảo mật JWT_SECRET tự động.');
  } catch {
    warn('Đã bỏ qua bước cập nhật JWT_SECRET (có thể đã được cài đặt).');
  }

  step('6/7. Tạo bảng, nạp 24 tiêu chí 5S, thương hiệu & tài khoản Admin lên Cloudflare D1...');
  run(`npx wrangler d1 migrations apply ${dbName} --remote`);
  if (seedAns !== '2') {
    run(`npx wrangler d1 execute ${dbName} --remote --file=seed/sample_areas.sql`);
    ok('Đã đồng bộ 24 tiêu chí 5S + 16 khu vực mẫu lên đám mây.');
  } else {
    ok('Đã đồng bộ 24 tiêu chí 5S lên đám mây (Khu vực để trống cho Admin tự tạo).');
  }
  applyAllInitialSettingsToD1(dbName, true, {
    ...branding,
    adminUser,
    adminPass,
    adminName,
    defaultTarget,
    lang,
  });

  step('7/7. Đang đóng gói và xuất bản ứng dụng lên Internet (npm run deploy)...');
  const deploySuccess = await deployWorkerApp(workerName, dbName);
  rl.close();
  process.exit(deploySuccess ? 0 : 1);
}

/**
 * Deploys the application with full interactive TTY support and auto-recovery
 * for new Cloudflare accounts that need a workers.dev subdomain registered.
 */
async function deployWorkerApp(workerName, dbName) {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    let deployOut = '';
    let deployFailed = false;

    try {
      deployOut = await new Promise((resolve, reject) => {
        let combined = '';
        // Use inherit for stdin so user can answer Wrangler prompts if asked,
        // while piping stdout/stderr so we can display in real-time AND capture URL.
        const child = spawn('npm', ['run', 'deploy'], {
          cwd: ROOT,
          stdio: ['inherit', 'pipe', 'pipe'],
          shell: true,
        });

        child.stdout.on('data', (chunk) => {
          process.stdout.write(chunk);
          combined += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
          process.stderr.write(chunk);
          combined += chunk.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(combined);
          } else {
            const err = new Error(`Deploy process exited with code ${code}`);
            err.output = combined;
            reject(err);
          }
        });

        child.on('error', (err) => {
          err.output = combined;
          reject(err);
        });
      });
    } catch (err) {
      deployFailed = true;
      deployOut = err.output || err.message || '';
    }

    if (!deployFailed) {
      const urlMatch = deployOut.match(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev/);
      console.log('\n======================================================================');
      console.log('   🎉 HOÀN TẤT CÀI ĐẶT & TRIỂN KHAI LÊN CLOUDFLARE (DEPLOY COMPLETE)!');
      console.log('======================================================================');
      if (urlMatch) {
        const liveUrl = urlMatch[0];
        console.log(`\n👉 LIVE URL: ${liveUrl}`);
        saveLiveUrlToFile(liveUrl, workerName, dbName);
        try {
          execSync(`start ${liveUrl}`, { stdio: 'ignore', shell: 'cmd.exe' });
        } catch {}
      }
      return true;
    }

    // Check if error is due to missing workers.dev subdomain on new Cloudflare account
    const isSubdomainIssue =
      deployOut.includes('workers.dev subdomain') ||
      deployOut.includes('workers/onboarding') ||
      deployOut.includes('registration declined') ||
      deployOut.includes('routes workers dev');

    if (isSubdomainIssue && attempt < maxAttempts) {
      // Extract account ID if available from deploy output
      const accountMatch =
        deployOut.match(/dash\.cloudflare\.com\/([a-f0-9]{32})/i) ||
        deployOut.match(/dash\.cloudflare\.com\/([a-zA-Z0-9_-]+)/i) ||
        deployOut.match(/account id[:\s]+([a-f0-9]{32})/i);
      const accountId = accountMatch ? accountMatch[1] : '';

      // Cloudflare has deprecated the old /workers/onboarding URL in the new dashboard layout.
      // The current official Dashboard page is /workers-and-pages (with "Your subdomain" widget on the right sidebar)
      // and direct URL /workers/subdomain.
      const workingUrl = accountId
        ? `https://dash.cloudflare.com/${accountId}/workers-and-pages`
        : 'https://dash.cloudflare.com/?to=/:account/workers-and-pages';
      const directSubdomainUrl = accountId
        ? `https://dash.cloudflare.com/${accountId}/workers/subdomain`
        : '';

      console.log('\n======================================================================');
      warn('CHÚ Ý: Tài khoản Cloudflare của bạn là tài khoản mới và chưa kích hoạt Subdomain workers.dev!');
      console.log('   👉 Đây là bước bắt buộc 1 lần duy nhất cho mọi tài khoản Cloudflare mới.');
      console.log('   🌐 Đang mở trang Workers & Pages trên trình duyệt:');
      console.log(`      ${workingUrl}`);
      if (directSubdomainUrl) {
        console.log(`      (Hoặc link trực tiếp: ${directSubdomainUrl})`);
      }
      console.log('======================================================================');
      console.log('HƯỚNG DẪN KÍCH HOẠT NHANH (3 BƯỚC TRÊN DASHBOARD):');
      console.log(' 1. Trên trang Cloudflare Dashboard vừa mở, nhìn sang cột BÊN PHẢI.');
      console.log(' 2. Tại mục "Your subdomain", bấm nút "Set up" (hoặc "Change").');
      console.log(' 3. Nhập tên Subdomain mong muốn (ví dụ: tên công ty, viết thường không dấu, vd: "cetvn")');
      console.log('    rồi bấm nút "Set up" / "Save".');
      console.log(' 4. Sau khi hoàn tất lưu trên Cloudflare, quay lại màn hình này và nhấn Enter để tiếp tục xuất bản!\n');

      try {
        execSync(`start ${workingUrl}`, { stdio: 'ignore', shell: 'cmd.exe' });
      } catch {}

      if (!process.stdin.isTTY) {
        warn('Môi trường không có bàn phím tương tác (GUI). Đang tạm dừng 20 giây để bạn hoàn tất đặt Subdomain trên trình duyệt...');
        await new Promise((resolve) => setTimeout(resolve, 20000));
      } else {
        await ask('👉 Nhấn Enter sau khi bạn đã hoàn tất đặt Subdomain trên Cloudflare để xuất bản tiếp...');
      }
      step(`Thử lại quá trình xuất bản (Lần ${attempt + 1}/${maxAttempts})...`);
      continue;
    }

    // If it's another error or max attempts reached
    console.error('\n❌ Không thể xuất bản ứng dụng lên Cloudflare:');
    console.error(deployOut);
    return false;
  }
  return false;
}

function saveLiveUrlToFile(url, workerName, dbName) {
  const filePath = path.join(ROOT, 'CLOUDFLARE_LIVE_URL.txt');
  const content = [
    '======================================================================',
    '   CRYSTAL 5S AUDIT — THÔNG TIN TRANG WEB TRÊN CLOUDFLARE',
    '======================================================================',
    `ĐƯỜNG DẪN TRUY CẬP (LIVE URL): ${url}`,
    `Cập nhật lúc: ${new Date().toLocaleString('vi-VN')} (${new Date().toISOString()})`,
    `Tên Worker: ${workerName}`,
    `Database D1: ${dbName}`,
    '======================================================================',
    'Lưu ý: Bạn có thể lưu lại đường dẫn trên để chia sẻ cho các Giám sát viên',
    '(Auditors), Quản lý khu vực (Area MNG) và cài đặt trên Màn hình TV Andon.',
  ].join('\n');
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    ok(`Đã tự động lưu đường dẫn web vào file: CLOUDFLARE_LIVE_URL.txt`);
  } catch {}
}

async function migrateCloudflareAccountMode() {
  const cfg = readCurrentConfig();
  console.log('\n======================================================================');
  console.log('   DI CHUYỂN TOÀN BỘ DỮ LIỆU SANG TÀI KHOẢN CLOUDFLARE MỚI');
  console.log('======================================================================');
  console.log('Quy trình này sẽ:');
  console.log('1. Sao lưu 100% dữ liệu (Audits, Lỗi 5S, Người dùng, Tiêu chí...) từ DB cũ.');
  console.log('2. Đăng nhập vào Tài khoản Cloudflare MỚI.');
  console.log('3. Tự động tạo Database D1 & Kho ảnh R2 mới.');
  console.log('4. Nạp 100% dữ liệu cũ vào Database mới và xuất bản hệ thống.');
  console.log('5. Cập nhật và mở đường dẫn web mới.\n');

  const cliConfirm = getCliArg('confirm');
  const confirm = cliConfirm !== null ? cliConfirm : await ask('Bạn có muốn bắt đầu di chuyển ngay? [1] Có / [2] Hủy: ');
  if (confirm !== '1' && confirm !== 'yes') {
    console.log('Đã hủy thao tác di chuyển.');
    rl.close();
    process.exit(0);
  }

  step('1/6. Xuất bản sao lưu dữ liệu toàn diện (Exporting Backup)...');
  const backupFile = path.join(ROOT, 'migration_temp_backup.sql');
  let backupOk = false;
  try {
    run(`npx wrangler d1 export ${cfg.dbName} --remote --output=migration_temp_backup.sql`, { silent: true });
    if (fs.existsSync(backupFile) && fs.statSync(backupFile).size > 50) {
      backupOk = true;
      ok(`Đã xuất bản sao lưu D1 thành công (${(fs.statSync(backupFile).size / 1024).toFixed(1)} KB).`);
    }
  } catch {}

  if (!backupOk) {
    warn('Không thể export trực tiếp từ Cloudflare cũ. Đang thử lấy dữ liệu từ Local D1...');
    try {
      run(`npx wrangler d1 export ${cfg.dbName} --local --output=migration_temp_backup.sql`, { silent: true });
      if (fs.existsSync(backupFile) && fs.statSync(backupFile).size > 50) {
        backupOk = true;
        ok('Đã lấy dữ liệu sao lưu từ Local D1 thành công.');
      }
    } catch {}
  }

  step('2/6. Đăng nhập vào Tài khoản Cloudflare MỚI...');
  warn('Trình duyệt sẽ mở ra. Vui lòng đăng nhập vào TÀI KHOẢN MỚI và bấm "Allow"...');
  try {
    run('npx wrangler logout', { silent: true });
  } catch {}
  run('npx wrangler login');
  ok('Đã kết nối tài khoản Cloudflare mới thành công!');

  step(`3/6. Khởi tạo Database D1 (${cfg.dbName}) trên tài khoản mới...`);
  let newDbId = null;
  try {
    const out = run(`npx wrangler d1 create ${cfg.dbName}`, { silent: true });
    const match = out.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (match) newDbId = match[0];
  } catch {
    try {
      const listJson = run('npx wrangler d1 list --json', { silent: true });
      const list = JSON.parse(listJson);
      const found = list.find((d) => d.name === cfg.dbName);
      if (found && found.uuid) newDbId = found.uuid;
    } catch {}
  }

  if (newDbId) {
    updateWranglerConfig({ workerName: cfg.workerName, dbName: cfg.dbName, dbId: newDbId, bucketName: cfg.bucketName });
    ok(`Đã tạo Database D1 mới (${newDbId}) và cập nhật wrangler.jsonc.`);
  }

  step(`4/6. Khởi tạo Kho ảnh R2 (${cfg.bucketName}) trên tài khoản mới...`);
  try {
    run(`npx wrangler r2 bucket create ${cfg.bucketName}`, { silent: true });
    ok(`Đã tạo kho ảnh R2: ${cfg.bucketName}.`);
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || '');
    if (msg.includes('already exists') || msg.includes('10004')) {
      ok(`Kho ảnh R2 (${cfg.bucketName}) đã sẵn sàng.`);
    }
  }

  step('5/6. Khởi tạo cấu trúc bảng & Nạp 100% dữ liệu cũ vào tài khoản mới...');
  run(`npx wrangler d1 migrations apply ${cfg.dbName} --remote`);
  if (backupOk && fs.existsSync(backupFile)) {
    try {
      run(`npx wrangler d1 execute ${cfg.dbName} --remote --file=migration_temp_backup.sql`, { silent: true });
      ok('✔ ĐÃ NẠP 100% DỮ LIỆU CŨ SANG TÀI KHOẢN MỚI THÀNH CÔNG!');
    } catch (e) {
      warn(`Lưu ý nạp dữ liệu: ${e.message}.`);
    } finally {
      try { fs.unlinkSync(backupFile); } catch {}
    }
  } else {
    run(`npx wrangler d1 execute ${cfg.dbName} --remote --file=seed/sample_areas.sql`);
    ok('Đã nạp 24 tiêu chí 5S và dữ liệu ban đầu vào tài khoản mới.');
  }

  // Setup JWT_SECRET
  const jwtSecret = 's5-prod-' + crypto.randomBytes(24).toString('hex');
  try {
    execSync('npx wrangler secret put JWT_SECRET', {
      cwd: ROOT,
      input: jwtSecret,
      stdio: ['pipe', 'ignore', 'ignore'],
      encoding: 'utf-8',
    });
  } catch {}

  step('6/6. Đóng gói & Triển khai Worker lên tài khoản Cloudflare mới (npm run deploy)...');
  const deploySuccess = await deployWorkerApp(cfg.workerName, cfg.dbName);
  rl.close();
  process.exit(deploySuccess ? 0 : 1);
}

async function main() {
  const argMode = process.argv[2];
  banner();

  if (argMode === '--local') {
    await setupLocalMode();
    return;
  }
  if (argMode === '--cloud') {
    await setupCloudflareMode();
    return;
  }
  if (argMode === '--migrate') {
    await migrateCloudflareAccountMode();
    return;
  }

  console.log('Chọn chế độ tự động:\n');
  console.log(' [1] Chạy máy chủ Local (LAN nội bộ nhà máy)');
  console.log(' [2] Cài đặt & Triển khai lên Cloudflare Internet (0đ chi phí)');
  console.log(' [3] Di chuyển sang Tài khoản Cloudflare MỚI (Tự động đem 100% dữ liệu cũ qua)\n');
  const choice = await ask('Lựa chọn của bạn (Mặc định = 1): ');
  if (choice === '2') {
    await setupCloudflareMode();
  } else if (choice === '3') {
    await migrateCloudflareAccountMode();
  } else {
    await setupLocalMode();
  }
}

main();
