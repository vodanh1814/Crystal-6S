// Crystal 5S Audit — Multi-Company One-Click Automated Setup & Deploy App
// Run via: Khởi_Chạy_Crystal_5S.bat or Đưa_Lên_Cloudflare_Tự_Động.bat

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
  console.clear();
  console.log('\x1b[36m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║\x1b[0m   \x1b[1m\x1b[32mHỆ THỐNG AUDIT 5S — TRÌNH CÀI ĐẶT & TRIỂN KHAI TỰ ĐỘNG (1-CLICK)\x1b[0m  \x1b[36m║\x1b[0m');
  console.log('\x1b[36m║\x1b[0m   \x1b[90mHỗ trợ triển khai độc lập cho nhiều Công ty / Nhà máy khác nhau\x1b[0m    \x1b[36m║\x1b[0m');
  console.log('\x1b[36m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');
}

function step(msg) {
  console.log(`\n\x1b[33m▶ ${msg}\x1b[0m`);
}

function ok(msg) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function warn(msg) {
  console.log(`\x1b[35m⚠ ${msg}\x1b[0m`);
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
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'crystal';
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
    step('Đang cài đặt các thư viện cần thiết (npm install)...');
    run('npm install');
    ok('Đã cài đặt thư viện thành công.');
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

  console.log('\n\x1b[36m── Nhận diện thương hiệu (Tên hiển thị & Logo Công ty) ──\x1b[0m');
  const nameInput = await ask(
    `Nhập Tên Công ty / Nhà máy hiển thị trên giao diện (Bấm Enter để dùng "${defaultName}"): `
  );
  const companyName = nameInput.trim() || defaultName;

  const logoInput = await ask(
    `Nhập đường dẫn file Logo công ty (.png, .jpg, .svg) (Bấm Enter nếu chưa có): `
  );
  const companyLogo = readLogoAsDataUrl(logoInput);

  return { companyName, companyLogo };
}

function applyBrandingToD1(dbName, isRemote, { companyName, companyLogo }) {
  const flag = isRemote ? '--remote' : '--local';
  const safeName = companyName.replace(/'/g, "''");
  const safeLogo = (companyLogo || '').replace(/'/g, "''");
  const sql = `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('company_name', '${safeName}', CURRENT_TIMESTAMP), ('company_logo', '${safeLogo}', CURRENT_TIMESTAMP);`;
  const tmpSqlPath = path.join(ROOT, '.tmp_branding.sql');
  try {
    fs.writeFileSync(tmpSqlPath, sql, 'utf-8');
    run(`npx wrangler d1 execute ${dbName} ${flag} --file=.tmp_branding.sql`, { silent: true });
    ok(`Đã cấu hình nhận diện thương hiệu "${companyName}" vào Database D1.`);
  } catch (err) {
    warn(`Không thể nạp nhận diện thương hiệu vào D1: ${err.message}`);
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
  step('1/3. Tự động kiểm tra & cài đặt môi trường...');
  ensureLocalEnv();

  const branding = await promptCompanyBranding('CRYSTAL');

  const cliSeed = getCliArg('seed');
  const seedAns =
    cliSeed !== null
      ? cliSeed
      : await ask(
          '\nBạn có muốn nạp sẵn 16 Khu vực mẫu (KNI, GQC, WH, DYE...) không?\n  [1] Có (Mặc định)   [2] Không (Để Admin công ty tự tạo khu vực mới): '
        );

  step('2/3. Tự động khởi tạo Database D1 & nạp 24 tiêu chí 5S...');
  run(`npx wrangler d1 migrations apply ${cfg.dbName} --local`);
  if (seedAns !== '2') {
    run(`npx wrangler d1 execute ${cfg.dbName} --local --file=seed/sample_areas.sql`);
    ok('Đã nạp 24 tiêu chí 5S + 16 khu vực mẫu.');
  } else {
    ok('Đã nạp 24 tiêu chí 5S (Danh sách khu vực để trống cho Admin tự khai báo).');
  }
  applyBrandingToD1(cfg.dbName, false, branding);

  step('3/3. Đang khởi động hệ thống và tự động mở trình duyệt tại http://localhost:5173 ...');
  setTimeout(() => {
    try {
      execSync('start http://localhost:5173', { stdio: 'ignore', shell: 'cmd.exe' });
    } catch {}
  }, 3500);

  const child = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], {
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
  let companyInput = '';
  if (cliComp !== null) {
    companyInput = cliComp;
  } else {
    console.log('\x1b[36m── Cấu hình Tên Công ty / Nhà máy (Để tách riêng Web, Database & Kho ảnh) ──\x1b[0m');
    companyInput = await ask(
      `Nhập mã tên Công ty/Nhà máy (Bấm Enter để giữ mặc định "${currentCfg.workerName.replace(/-5s-audit$/, '')}"): `
    );
  }

  let workerName = currentCfg.workerName;
  let dbName = currentCfg.dbName;
  let bucketName = currentCfg.bucketName;
  let defaultDisplayName = 'CRYSTAL';

  if (companyInput) {
    const slug = slugify(companyInput);
    defaultDisplayName = companyInput.toUpperCase();
    workerName = `${slug}-5s-audit`;
    dbName = `${slug}-5s-db`;
    bucketName = `${slug}-5s-photos`;
    updateWranglerConfig({ workerName, dbName, bucketName });
    ok(`Đã cấu hình riêng cho công ty "${slug}":`);
    console.log(`   • Tên Web Worker : ${workerName}`);
    console.log(`   • Tên Database D1: ${dbName}`);
    console.log(`   • Tên Kho ảnh R2 : ${bucketName}`);
  } else {
    ok(`Sử dụng cấu hình hiện tại: ${workerName} (DB: ${dbName}, R2: ${bucketName})`);
  }

  const branding = await promptCompanyBranding(defaultDisplayName);

  const cliSeed = getCliArg('seed');
  const seedAns =
    cliSeed !== null
      ? cliSeed
      : await ask(
          '\nBạn có muốn nạp sẵn 16 Khu vực mẫu (KNI, GQC, WH, DYE...) lên Cloud không?\n  [1] Có (Mặc định)   [2] Không (Để Admin công ty mới tự tạo khu vực trên web): '
        );

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
    warn('Trình duyệt sẽ mở ra. Anh/chị chỉ cần bấm nút "Allow" để cấp quyền cho Cloudflare...');
    run('npx wrangler login');
    ok('Đăng nhập Cloudflare thành công!');
  }

  step(`3/7. Tự động khởi tạo & kết nối Database D1 (${dbName}) trên Cloudflare...`);
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

  step(`4/7. Tự động khởi tạo Kho lưu trữ hình ảnh R2 (${bucketName})...`);
  try {
    run(`npx wrangler r2 bucket create ${bucketName}`, { silent: true });
    ok(`Đã tạo kho ảnh R2: ${bucketName}.`);
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || '');
    if (msg.includes('already exists') || msg.includes('10004')) {
      ok(`Kho ảnh R2 (${bucketName}) đã tồn tại sẵn.`);
    } else {
      warn('Lưu ý: Nếu tài khoản Cloudflare của anh/chị chưa bật R2, hãy bấm Enable R2 trong Cloudflare Dashboard.');
    }
  }

  step('5/7. Tự động cài khóa bảo mật JWT_SECRET lên Cloudflare...');
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

  step('6/7. Tự động tạo bảng & nạp bộ tiêu chí 5S lên Cloudflare D1...');
  run(`npx wrangler d1 migrations apply ${dbName} --remote`);
  if (seedAns !== '2') {
    run(`npx wrangler d1 execute ${dbName} --remote --file=seed/sample_areas.sql`);
    ok('Đã đồng bộ 24 tiêu chí 5S + 16 khu vực mẫu lên đám mây.');
  } else {
    ok('Đã đồng bộ 24 tiêu chí 5S lên đám mây (Khu vực để trống cho Admin công ty mới tự tạo).');
  }
  applyBrandingToD1(dbName, true, branding);

  step('7/7. Đang đóng gói và xuất bản ứng dụng lên Internet (npm run deploy)...');
  const deployOut = run('npm run deploy', { silent: true });
  console.log(deployOut);

  const urlMatch = deployOut.match(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev/);
  console.log('\n\x1b[32m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[32m║          🎉 HOÀN TẤT CÀI ĐẶT & TRIỂN KHAI LÊN CLOUDFLARE!            ║\x1b[0m');
  console.log('\x1b[32m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m');
  if (urlMatch) {
    const liveUrl = urlMatch[0];
    console.log(`\n👉 Địa chỉ Web chính thức: \x1b[1m\x1b[36m${liveUrl}\x1b[0m`);
    console.log(`👉 Lần đầu truy cập, hãy vào \x1b[1m${liveUrl}/setup\x1b[0m để tạo tài khoản Admin đầu tiên!`);
    try {
      execSync(`start ${liveUrl}`, { stdio: 'ignore', shell: 'cmd.exe' });
    } catch {}
  }
  console.log('\nNhấn Enter để đóng cửa sổ...');
  await ask('');
  process.exit(0);
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

  console.log('Chọn chế độ tự động (chỉ cần gõ 1 hoặc 2 rồi nhấn Enter):\n');
  console.log('  \x1b[1m\x1b[32m[1]\x1b[0m Chạy ngay trên máy nội bộ / Mạng LAN nhà máy (Tự động cài đặt 100% + Mở trình duyệt)');
  console.log('  \x1b[1m\x1b[36m[2]\x1b[0m Tự động đưa lên Internet qua Cloudflare (Hỗ trợ đặt tên riêng cho từng Công ty)\n');

  const choice = await ask('Lựa chọn của bạn (Mặc định = 1): ');
  if (choice === '2') {
    await setupCloudflareMode();
  } else {
    await setupLocalMode();
  }
}

main();
