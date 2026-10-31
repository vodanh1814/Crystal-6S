// Crystal 5S Audit — Self-Contained Windows .EXE Builder (C# WinForms + Embedded Payload)
// Features:
//  - Bilingual UI (Tiếng Việt / English toggle)
//  - Light / Dark Mode Theme toggle
//  - All-in-One Single-Screen Configuration (Branding + Logo Preview + Admin Account + KPI Target + Sample Areas + LAN Port + Cloud Slug + Live Embedded Console Log)

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CSC = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const BUILD_DIR = path.join(ROOT, '.exe_build');
const PAYLOAD_ZIP = path.join(BUILD_DIR, 'payload.zip');
const CS_FILE = path.join(BUILD_DIR, 'InstallerProgram.cs');
const OUT_EXE = path.join(ROOT, 'Crystal_5S_Setup.exe');

if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

console.log('1/3. Đang nén mã nguồn sạch thành gói nhúng (payload.zip)...');
const psZipCmd = `
  $exclude = @('node_modules', '.wrangler', 'dist', '.dev.vars', '.git', '.exe_build', 'Crystal_5S_Installer.zip', 'Crystal_5S_Setup.exe', '*.tsbuildinfo', 'cookies*.txt', '.tmp*');
  $files = Get-ChildItem -Path '${ROOT}' -Exclude $exclude;
  if (Test-Path '${PAYLOAD_ZIP}') { Remove-Item '${PAYLOAD_ZIP}' -Force };
  Compress-Archive -Path $files.FullName -DestinationPath '${PAYLOAD_ZIP}' -CompressionLevel Optimal -Force;
`;
execSync(`powershell -NoProfile -Command "${psZipCmd.replace(/\r?\n/g, ' ')}"`, { stdio: 'inherit' });

const csCode = `
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

[assembly: AssemblyTitle("Crystal 5S Audit - All-in-One Installer & Launcher")]
[assembly: AssemblyProduct("Crystal 5S Audit System")]
[assembly: AssemblyVersion("2.0.0.0")]

namespace Crystal5SInstaller
{
    public class MainForm : Form
    {
        private bool isDark = true;
        private string lang = "vi"; // "vi" or "en"
        private Process activeProcess = null;

        // Header controls
        private Panel pnlHeader;
        private Label lblHeader;
        private Label lblSub;
        private Button btnLang;
        private Button btnTheme;

        // Left Card (Branding + Admin)
        private Panel cardLeft;
        private Label lblSecBrand;
        private Label lblCompany;
        private TextBox txtCompany;
        private Label lblLogo;
        private TextBox txtLogo;
        private Button btnBrowseLogo;
        private PictureBox picLogo;

        private Label lblSecAdmin;
        private Label lblAdminName;
        private TextBox txtAdminName;
        private Label lblAdminUser;
        private TextBox txtAdminUser;
        private Label lblAdminPass;
        private TextBox txtAdminPass;
        private CheckBox chkShowPass;

        // Right Card (System & Deployment Config)
        private Panel cardRight;
        private Label lblSecSys;
        private Label lblDir;
        private TextBox txtDir;
        private Button btnBrowseDir;
        private Label lblSlug;
        private TextBox txtSlug;
        private Label lblPort;
        private TextBox txtPort;
        private Label lblTarget;
        private NumericUpDown numTarget;
        private Label lblSeed;
        private RadioButton rbSeedYes;
        private RadioButton rbSeedNo;

        // Bottom Action & Embedded Console
        private Button btnLocal;
        private Button btnCloud;
        private Button btnOpenWeb;
        private TextBox txtLog;
        private Label lblStatus;

        public MainForm()
        {
            this.Size = new Size(900, 610);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            BuildUI();
            ApplyLanguage();
            ApplyTheme();
        }

        private void BuildUI()
        {
            // ── HEADER BAR ──
            pnlHeader = new Panel() { Location = new Point(0, 0), Size = new Size(900, 64) };
            this.Controls.Add(pnlHeader);

            lblHeader = new Label()
            {
                Font = new Font("Segoe UI", 13.5F, FontStyle.Bold),
                Location = new Point(22, 10),
                AutoSize = true
            };
            pnlHeader.Controls.Add(lblHeader);

            lblSub = new Label()
            {
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                Location = new Point(24, 36),
                AutoSize = true
            };
            pnlHeader.Controls.Add(lblSub);

            btnLang = new Button()
            {
                Location = new Point(645, 16),
                Size = new Size(110, 32),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnLang.Click += (s, e) => {
                lang = (lang == "vi") ? "en" : "vi";
                ApplyLanguage();
            };
            pnlHeader.Controls.Add(btnLang);

            btnTheme = new Button()
            {
                Location = new Point(765, 16),
                Size = new Size(105, 32),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnTheme.Click += (s, e) => {
                isDark = !isDark;
                ApplyTheme();
                ApplyLanguage();
            };
            pnlHeader.Controls.Add(btnTheme);

            // ── LEFT CARD: BRANDING & ADMIN ACCOUNT ──
            cardLeft = new Panel() { Location = new Point(20, 74), Size = new Size(418, 296), BorderStyle = BorderStyle.FixedSingle };
            this.Controls.Add(cardLeft);

            lblSecBrand = new Label() { Location = new Point(14, 10), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            cardLeft.Controls.Add(lblSecBrand);

            lblCompany = new Label() { Location = new Point(14, 36), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardLeft.Controls.Add(lblCompany);

            txtCompany = new TextBox() { Text = "CRYSTAL", Location = new Point(14, 55), Width = 316, BorderStyle = BorderStyle.FixedSingle, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            txtCompany.TextChanged += (s, e) => {
                string slug = Regex.Replace(txtCompany.Text.ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
                if (string.IsNullOrEmpty(slug)) slug = "crystal";
                if (txtSlug != null) txtSlug.Text = slug;
            };
            cardLeft.Controls.Add(txtCompany);

            lblLogo = new Label() { Location = new Point(14, 86), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardLeft.Controls.Add(lblLogo);

            txtLogo = new TextBox() { Text = "", Location = new Point(14, 105), Width = 232, BorderStyle = BorderStyle.FixedSingle };
            cardLeft.Controls.Add(txtLogo);

            btnBrowseLogo = new Button() { Location = new Point(252, 103), Size = new Size(78, 25), FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Font = new Font("Segoe UI", 8F, FontStyle.Bold) };
            btnBrowseLogo.Click += (s, e) => {
                OpenFileDialog ofd = new OpenFileDialog();
                ofd.Filter = "Image Files|*.png;*.jpg;*.jpeg;*.svg;*.webp";
                if (ofd.ShowDialog() == DialogResult.OK)
                {
                    txtLogo.Text = ofd.FileName;
                    try { picLogo.Image = Image.FromFile(ofd.FileName); } catch { picLogo.Image = null; }
                }
            };
            cardLeft.Controls.Add(btnBrowseLogo);

            picLogo = new PictureBox()
            {
                Location = new Point(340, 52),
                Size = new Size(62, 76),
                BorderStyle = BorderStyle.FixedSingle,
                SizeMode = PictureBoxSizeMode.Zoom
            };
            cardLeft.Controls.Add(picLogo);

            // Admin Section inside Left Card
            lblSecAdmin = new Label() { Location = new Point(14, 144), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            cardLeft.Controls.Add(lblSecAdmin);

            lblAdminName = new Label() { Location = new Point(14, 170), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardLeft.Controls.Add(lblAdminName);

            txtAdminName = new TextBox() { Text = "System Administrator", Location = new Point(14, 189), Width = 388, BorderStyle = BorderStyle.FixedSingle };
            cardLeft.Controls.Add(txtAdminName);

            lblAdminUser = new Label() { Location = new Point(14, 222), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardLeft.Controls.Add(lblAdminUser);

            txtAdminUser = new TextBox() { Text = "admin", Location = new Point(14, 241), Width = 150, BorderStyle = BorderStyle.FixedSingle };
            cardLeft.Controls.Add(txtAdminUser);

            lblAdminPass = new Label() { Location = new Point(176, 222), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardLeft.Controls.Add(lblAdminPass);

            txtAdminPass = new TextBox() { Text = "admin123", Location = new Point(176, 241), Width = 158, BorderStyle = BorderStyle.FixedSingle, UseSystemPasswordChar = true };
            cardLeft.Controls.Add(txtAdminPass);

            chkShowPass = new CheckBox() { Location = new Point(340, 242), AutoSize = true, Font = new Font("Segoe UI", 8F) };
            chkShowPass.CheckedChanged += (s, e) => { txtAdminPass.UseSystemPasswordChar = !chkShowPass.Checked; };
            cardLeft.Controls.Add(chkShowPass);

            // ── RIGHT CARD: SYSTEM & DEPLOYMENT CONFIG ──
            cardRight = new Panel() { Location = new Point(450, 74), Size = new Size(420, 296), BorderStyle = BorderStyle.FixedSingle };
            this.Controls.Add(cardRight);

            lblSecSys = new Label() { Location = new Point(14, 10), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            cardRight.Controls.Add(lblSecSys);

            lblDir = new Label() { Location = new Point(14, 36), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardRight.Controls.Add(lblDir);

            string defaultDir = File.Exists(Path.Combine(Application.StartupPath, "package.json"))
                ? Application.StartupPath
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Crystal-5S-Audit");

            txtDir = new TextBox() { Text = defaultDir, Location = new Point(14, 55), Width = 304, BorderStyle = BorderStyle.FixedSingle };
            cardRight.Controls.Add(txtDir);

            btnBrowseDir = new Button() { Location = new Point(324, 53), Size = new Size(80, 25), FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Font = new Font("Segoe UI", 8F, FontStyle.Bold) };
            btnBrowseDir.Click += (s, e) => {
                FolderBrowserDialog fbd = new FolderBrowserDialog();
                fbd.SelectedPath = txtDir.Text;
                if (fbd.ShowDialog() == DialogResult.OK) txtDir.Text = fbd.SelectedPath;
            };
            cardRight.Controls.Add(btnBrowseDir);

            lblSlug = new Label() { Location = new Point(14, 88), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardRight.Controls.Add(lblSlug);

            txtSlug = new TextBox() { Text = "crystal", Location = new Point(14, 107), Width = 390, BorderStyle = BorderStyle.FixedSingle };
            cardRight.Controls.Add(txtSlug);

            lblPort = new Label() { Location = new Point(14, 142), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardRight.Controls.Add(lblPort);

            txtPort = new TextBox() { Text = "5173", Location = new Point(14, 161), Width = 180, BorderStyle = BorderStyle.FixedSingle };
            cardRight.Controls.Add(txtPort);

            lblTarget = new Label() { Location = new Point(214, 142), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardRight.Controls.Add(lblTarget);

            numTarget = new NumericUpDown() { Minimum = 50, Maximum = 100, Value = 90, Location = new Point(214, 161), Width = 190, BorderStyle = BorderStyle.FixedSingle };
            cardRight.Controls.Add(numTarget);

            lblSeed = new Label() { Location = new Point(14, 198), AutoSize = true, Font = new Font("Segoe UI", 8.5F, FontStyle.Bold) };
            cardRight.Controls.Add(lblSeed);

            rbSeedYes = new RadioButton() { Location = new Point(16, 220), AutoSize = true, Checked = true };
            rbSeedNo = new RadioButton() { Location = new Point(16, 246), AutoSize = true };
            cardRight.Controls.Add(rbSeedYes);
            cardRight.Controls.Add(rbSeedNo);

            // ── ACTION BUTTONS & SINGLE-SCREEN CONSOLE LOG ──
            btnLocal = new Button()
            {
                Location = new Point(20, 382),
                Size = new Size(340, 42),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnLocal.Click += (s, e) => RunSetup("local");
            this.Controls.Add(btnLocal);

            btnCloud = new Button()
            {
                Location = new Point(372, 382),
                Size = new Size(340, 42),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnCloud.Click += (s, e) => RunSetup("cloud");
            this.Controls.Add(btnCloud);

            btnOpenWeb = new Button()
            {
                Location = new Point(724, 382),
                Size = new Size(146, 42),
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnOpenWeb.Click += (s, e) => {
                string port = txtPort.Text.Trim();
                if (string.IsNullOrEmpty(port)) port = "5173";
                try { Process.Start("http://localhost:" + port); } catch { }
            };
            this.Controls.Add(btnOpenWeb);

            txtLog = new TextBox()
            {
                Location = new Point(20, 434),
                Size = new Size(850, 110),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BorderStyle = BorderStyle.FixedSingle,
                Font = new Font("Consolas", 8.5F, FontStyle.Regular)
            };
            this.Controls.Add(txtLog);

            lblStatus = new Label()
            {
                Location = new Point(20, 550),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular)
            };
            this.Controls.Add(lblStatus);
        }

        private void ApplyLanguage()
        {
            if (lang == "vi")
            {
                this.Text = "Hệ Thống Audit 5S — Trình Cài Đặt & Cấu Hình Toàn Diện (All-in-One .EXE)";
                lblHeader.Text = "CRYSTAL 5S AUDIT — BỘ CÀI ĐẶT & CẤU HÌNH 1 MÀN HÌNH";
                lblSub.Text = "Tự động giải nén, cấu hình Thương hiệu, tạo Admin, khởi tạo Database D1/R2 & chạy ngay";
                btnLang.Text = "🌐 VI / EN (VI)";
                btnTheme.Text = isDark ? "🌙 Tối (Dark)" : "☀ Sáng (Light)";

                lblSecBrand.Text = "1. THƯƠNG HIỆU CÔNG TY (BRANDING)";
                lblCompany.Text = "Tên Công ty / Nhà máy hiển thị:";
                lblLogo.Text = "File ảnh Logo (.png, .jpg, .svg):";
                btnBrowseLogo.Text = "Chọn ảnh...";

                lblSecAdmin.Text = "2. TÀI KHOẢN QUẢN TRỊ VIÊN (INITIAL ADMIN)";
                lblAdminName.Text = "Họ và tên Quản trị viên:";
                lblAdminUser.Text = "Tên đăng nhập Admin:";
                lblAdminPass.Text = "Mật khẩu (>= 6 ký tự):";
                chkShowPass.Text = "Hiện";

                lblSecSys.Text = "3. CẤU HÌNH HỆ THỐNG & TRIỂN KHAI (SYSTEM)";
                lblDir.Text = "Thư mục giải nén & cài đặt trên máy:";
                btnBrowseDir.Text = "Chọn nơi lưu";
                lblSlug.Text = "Mã định danh Cloud (Dùng tạo tên Web / D1 / R2 riêng):";
                lblPort.Text = "Cổng chạy mạng LAN (Port):";
                lblTarget.Text = "Chỉ tiêu KPI 5S mặc định (%):";
                lblSeed.Text = "Khởi tạo dữ liệu Khu vực sản xuất ban đầu:";
                rbSeedYes.Text = "✔ Nạp sẵn 16 khu vực mẫu (KNI, GQC, WH, DYE...)";
                rbSeedNo.Text = "✕ Để trống hoàn toàn (Admin tự tạo khu vực mới)";

                btnLocal.Text = "▶ CÀI ĐẶT & CHẠY LOCAL (MẠNG LAN)";
                btnCloud.Text = "☁ ĐƯA LÊN CLOUDFLARE (INTERNET)";
                btnOpenWeb.Text = "🌐 Mở Web LAN";
                lblStatus.Text = "Sẵn sàng. Toàn bộ cấu hình đã gom gọn trong 1 màn hình duy nhất.";
                if (string.IsNullOrEmpty(txtLog.Text))
                {
                    txtLog.Text = "[Hệ thống sẵn sàng] Điền thông tin Công ty, Tài khoản Admin và bấm 1 trong 2 nút phía trên để bắt đầu..." + Environment.NewLine;
                }
            }
            else
            {
                this.Text = "5S Audit System — All-in-One Single-Screen Installer & Configurator (.EXE)";
                lblHeader.Text = "CRYSTAL 5S AUDIT — ALL-IN-ONE SYSTEM INSTALLER";
                lblSub.Text = "Extract payload, configure Company Branding, create Admin user, provision D1/R2 & launch";
                btnLang.Text = "🌐 VI / EN (EN)";
                btnTheme.Text = isDark ? "🌙 Dark Mode" : "☀ Light Mode";

                lblSecBrand.Text = "1. COMPANY BRANDING & LOGO";
                lblCompany.Text = "Company / Factory Display Name:";
                lblLogo.Text = "Company Logo Image (.png, .jpg, .svg):";
                btnBrowseLogo.Text = "Browse...";

                lblSecAdmin.Text = "2. INITIAL ADMINISTRATOR ACCOUNT";
                lblAdminName.Text = "Administrator Full Name:";
                lblAdminUser.Text = "Admin Username:";
                lblAdminPass.Text = "Password (min 6 chars):";
                chkShowPass.Text = "Show";

                lblSecSys.Text = "3. SYSTEM & DEPLOYMENT CONFIGURATION";
                lblDir.Text = "Local Extraction & Installation Directory:";
                btnBrowseDir.Text = "Browse...";
                lblSlug.Text = "Cloud Project Slug (Names Worker / D1 / R2):";
                lblPort.Text = "Local LAN Server Port:";
                lblTarget.Text = "Default 5S KPI Target (%):";
                lblSeed.Text = "Initial Factory Areas Data:";
                rbSeedYes.Text = "✔ Seed 16 sample areas (KNI, GQC, WH, DYE...)";
                rbSeedNo.Text = "✕ Start empty (Admin creates custom areas)";

                btnLocal.Text = "▶ INSTALL & RUN LOCAL (LAN SERVER)";
                btnCloud.Text = "☁ DEPLOY TO CLOUDFLARE (INTERNET)";
                btnOpenWeb.Text = "🌐 Open Web";
                lblStatus.Text = "Ready. All settings are consolidated into this single screen.";
                if (txtLog.Text.StartsWith("[Hệ thống"))
                {
                    txtLog.Text = "[System Ready] Configure Company Branding, Admin Account & click a button above to start..." + Environment.NewLine;
                }
            }
        }

        private void ApplyTheme()
        {
            Color bgForm = isDark ? Color.FromArgb(15, 23, 42) : Color.FromArgb(241, 245, 249);
            Color bgHeader = isDark ? Color.FromArgb(2, 6, 23) : Color.FromArgb(255, 255, 255);
            Color bgCard = isDark ? Color.FromArgb(30, 41, 59) : Color.FromArgb(255, 255, 255);
            Color bgInput = isDark ? Color.FromArgb(15, 23, 42) : Color.FromArgb(248, 250, 252);
            Color fgMain = isDark ? Color.FromArgb(248, 250, 252) : Color.FromArgb(15, 23, 42);
            Color fgSub = isDark ? Color.FromArgb(148, 163, 184) : Color.FromArgb(100, 116, 139);
            Color accent = Color.FromArgb(16, 185, 129);
            Color btnSecBg = isDark ? Color.FromArgb(51, 65, 85) : Color.FromArgb(226, 232, 240);

            this.BackColor = bgForm;
            this.ForeColor = fgMain;

            pnlHeader.BackColor = bgHeader;
            lblHeader.ForeColor = accent;
            lblSub.ForeColor = fgSub;

            btnLang.BackColor = btnSecBg;
            btnLang.ForeColor = fgMain;
            btnLang.FlatAppearance.BorderColor = fgSub;

            btnTheme.BackColor = btnSecBg;
            btnTheme.ForeColor = isDark ? Color.FromArgb(251, 191, 36) : Color.FromArgb(30, 41, 59);
            btnTheme.FlatAppearance.BorderColor = fgSub;

            cardLeft.BackColor = bgCard;
            cardRight.BackColor = bgCard;

            lblSecBrand.ForeColor = accent;
            lblSecAdmin.ForeColor = accent;
            lblSecSys.ForeColor = accent;

            Label[] labels = new Label[] { lblCompany, lblLogo, lblAdminName, lblAdminUser, lblAdminPass, lblDir, lblSlug, lblPort, lblTarget, lblSeed };
            foreach (Label lb in labels) lb.ForeColor = fgMain;

            chkShowPass.ForeColor = fgSub;
            rbSeedYes.ForeColor = fgMain;
            rbSeedNo.ForeColor = fgMain;

            TextBox[] inputs = new TextBox[] { txtCompany, txtLogo, txtAdminName, txtAdminUser, txtAdminPass, txtDir, txtSlug, txtPort };
            foreach (TextBox tb in inputs)
            {
                tb.BackColor = bgInput;
                tb.ForeColor = fgMain;
            }
            numTarget.BackColor = bgInput;
            numTarget.ForeColor = fgMain;
            picLogo.BackColor = bgInput;

            btnBrowseLogo.BackColor = btnSecBg;
            btnBrowseLogo.ForeColor = fgMain;
            btnBrowseDir.BackColor = btnSecBg;
            btnBrowseDir.ForeColor = fgMain;

            btnLocal.BackColor = Color.FromArgb(16, 185, 129);
            btnLocal.ForeColor = Color.FromArgb(2, 6, 23);
            btnLocal.FlatAppearance.BorderSize = 0;

            btnCloud.BackColor = Color.FromArgb(37, 99, 235);
            btnCloud.ForeColor = Color.White;
            btnCloud.FlatAppearance.BorderSize = 0;

            btnOpenWeb.BackColor = btnSecBg;
            btnOpenWeb.ForeColor = fgMain;

            txtLog.BackColor = isDark ? Color.FromArgb(2, 6, 23) : Color.FromArgb(15, 23, 42);
            txtLog.ForeColor = Color.FromArgb(52, 211, 153);
            lblStatus.ForeColor = fgSub;
        }

        private void AppendLog(string line)
        {
            if (string.IsNullOrEmpty(line)) return;
            if (this.InvokeRequired)
            {
                this.BeginInvoke(new Action<string>(AppendLog), line);
                return;
            }
            // Strip ANSI color escape sequences
            string clean = Regex.Replace(line, @"\\x1B\\[[0-9;]*[a-zA-Z]", "");
            txtLog.AppendText(clean + Environment.NewLine);
        }

        private void ExtractEmbeddedPayload(string targetDir)
        {
            if (!Directory.Exists(targetDir))
                Directory.CreateDirectory(targetDir);

            if (File.Exists(Path.Combine(targetDir, "package.json")) &&
                string.Equals(Path.GetFullPath(targetDir).TrimEnd('\\\\'), Path.GetFullPath(Application.StartupPath).TrimEnd('\\\\'), StringComparison.OrdinalIgnoreCase))
            {
                AppendLog(lang == "vi"
                    ? "✔ Đang chạy trực tiếp tại thư mục mã nguồn gốc."
                    : "✔ Running directly inside source repository.");
                return;
            }

            AppendLog((lang == "vi" ? "▶ Đang giải nén mã nguồn vào: " : "▶ Extracting package payload to: ") + targetDir);
            string tempZip = Path.Combine(Path.GetTempPath(), "crystal5s_payload_" + Guid.NewGuid().ToString("N") + ".zip");
            using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
            {
                if (resStream == null)
                    throw new Exception("Missing embedded resource payload.zip!");
                using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                {
                    resStream.CopyTo(fs);
                }
            }

            using (ZipArchive archive = ZipFile.OpenRead(tempZip))
            {
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    string fullPath = Path.Combine(targetDir, entry.FullName);
                    string dir = Path.GetDirectoryName(fullPath);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                        Directory.CreateDirectory(dir);
                    if (!string.IsNullOrEmpty(entry.Name))
                        entry.ExtractToFile(fullPath, true);
                }
            }

            try { File.Delete(tempZip); } catch { }
            AppendLog(lang == "vi" ? "✔ Giải nén hoàn tất!" : "✔ Payload extracted successfully!");
        }

        private void RunSetup(string mode)
        {
            try
            {
                string targetDir = txtDir.Text.Trim();
                string company = txtCompany.Text.Trim();
                if (string.IsNullOrEmpty(company)) company = "CRYSTAL";
                string logoPath = txtLogo.Text.Trim();
                string seedFlag = rbSeedYes.Checked ? "1" : "2";
                string adminName = txtAdminName.Text.Trim();
                string adminUser = txtAdminUser.Text.Trim();
                string adminPass = txtAdminPass.Text;
                string slug = txtSlug.Text.Trim();
                string port = txtPort.Text.Trim();
                if (string.IsNullOrEmpty(port)) port = "5173";
                string targetScore = numTarget.Value.ToString();

                if (!string.IsNullOrEmpty(adminPass) && adminPass.Length < 6)
                {
                    MessageBox.Show(
                        lang == "vi" ? "Mật khẩu Admin phải từ 6 ký tự trở lên!" : "Admin password must be at least 6 characters!",
                        "Crystal 5S Setup",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);
                    return;
                }

                txtLog.Clear();
                ExtractEmbeddedPayload(targetDir);

                string args = string.Format(
                    "scripts\\\\auto_setup.mjs --{0} --company=\\"{1}\\" --seed={2} --logo=\\"{3}\\" --admin-user=\\"{4}\\" --admin-pass=\\"{5}\\" --admin-name=\\"{6}\\" --target={7} --port={8} --slug=\\"{9}\\" --lang={10}",
                    mode,
                    company.Replace("\\"", ""),
                    seedFlag,
                    logoPath.Replace("\\"", ""),
                    adminUser.Replace("\\"", ""),
                    adminPass.Replace("\\"", ""),
                    adminName.Replace("\\"", ""),
                    targetScore,
                    port,
                    slug.Replace("\\"", ""),
                    lang
                );

                if (mode == "local")
                {
                    // Stream live output right inside txtLog on the same 1 screen!
                    if (activeProcess != null && !activeProcess.HasExited)
                    {
                        try { activeProcess.Kill(); } catch { }
                    }

                    ProcessStartInfo psi = new ProcessStartInfo()
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c chcp 65001 >nul && node " + args,
                        WorkingDirectory = targetDir,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        StandardOutputEncoding = Encoding.UTF8,
                        StandardErrorEncoding = Encoding.UTF8
                    };

                    activeProcess = new Process();
                    activeProcess.StartInfo = psi;
                    activeProcess.OutputDataReceived += (s, ev) => { if (ev.Data != null) AppendLog(ev.Data); };
                    activeProcess.ErrorDataReceived += (s, ev) => { if (ev.Data != null) AppendLog(ev.Data); };
                    activeProcess.Start();
                    activeProcess.BeginOutputReadLine();
                    activeProcess.BeginErrorReadLine();

                    lblStatus.Text = lang == "vi"
                        ? "✔ Đang cài đặt & khởi chạy máy chủ ngay trong màn hình này..."
                        : "✔ Installing & running local server directly in this window...";
                }
                else
                {
                    // Cloud mode may open browser for OAuth wrangler login, stream output too
                    AppendLog(lang == "vi"
                        ? "☁ Đang khởi chạy tiến trình triển khai Cloudflare..."
                        : "☁ Starting Cloudflare deployment process...");

                    ProcessStartInfo psi = new ProcessStartInfo()
                    {
                        FileName = "cmd.exe",
                        Arguments = "/c chcp 65001 >nul && node " + args,
                        WorkingDirectory = targetDir,
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        StandardOutputEncoding = Encoding.UTF8,
                        StandardErrorEncoding = Encoding.UTF8
                    };

                    Process proc = new Process();
                    proc.StartInfo = psi;
                    proc.OutputDataReceived += (s, ev) => { if (ev.Data != null) AppendLog(ev.Data); };
                    proc.ErrorDataReceived += (s, ev) => { if (ev.Data != null) AppendLog(ev.Data); };
                    proc.Start();
                    proc.BeginOutputReadLine();
                    proc.BeginErrorReadLine();

                    lblStatus.Text = lang == "vi"
                        ? "☁ Đang tự động đưa hệ thống lên Cloudflare (xem nhật ký bên trên)..."
                        : "☁ Deploying to Cloudflare automatically (see live log above)...";
                }
            }
            catch (Exception ex)
            {
                AppendLog("❌ ERROR: " + ex.Message);
                MessageBox.Show(ex.Message, "Crystal 5S Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (activeProcess != null && !activeProcess.HasExited)
            {
                try { activeProcess.Kill(); } catch { }
            }
            base.OnFormClosing(e);
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
`;

fs.writeFileSync(CS_FILE, csCode, 'utf-8');

console.log('2/3. Đang biên dịch Crystal_5S_Setup.exe bằng trình biên dịch .NET (csc.exe)...');
try {
  execSync('powershell -NoProfile -Command "Stop-Process -Name Crystal_5S_Setup -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
} catch {}
const compileCmd = `"${CSC}" /target:winexe /out:"${OUT_EXE}" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /resource:"${PAYLOAD_ZIP}",payload.zip "${CS_FILE}"`;
execSync(compileCmd, { stdio: 'inherit' });

console.log('3/3. Dọn dẹp thư mục tạm...');
fs.rmSync(BUILD_DIR, { recursive: true, force: true });

const stats = fs.statSync(OUT_EXE);
console.log(`\n✔ ĐÃ TẠO THÀNH CÔNG FILE EXE ĐỘC LẬP: ${OUT_EXE} (${(stats.size / 1024).toFixed(1)} KB)`);
