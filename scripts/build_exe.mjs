// Crystal 5S Audit — Self-Contained Windows .EXE Builder (C# WinForms + Embedded Payload)
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
using System.Windows.Forms;

[assembly: AssemblyTitle("Crystal 5S Audit - Installer & Launcher")]
[assembly: AssemblyProduct("Crystal 5S Audit System")]
[assembly: AssemblyVersion("1.0.0.0")]

namespace Crystal5SInstaller
{
    public class MainForm : Form
    {
        private TextBox txtCompany;
        private TextBox txtLogo;
        private TextBox txtDir;
        private RadioButton rbSeedYes;
        private RadioButton rbSeedNo;
        private Button btnLocal;
        private Button btnCloud;
        private Label lblStatus;

        public MainForm()
        {
            this.Text = "Hệ Thống Audit 5S — Trình Cài Đặt & Triển Khai Tự Động (.EXE)";
            this.Size = new Size(580, 440);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(15, 23, 42);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);

            Label lblHeader = new Label()
            {
                Text = "CRYSTAL 5S AUDIT — BỘ CÀI ĐẶT ĐA CÔNG TY",
                Font = new Font("Segoe UI", 13F, FontStyle.Bold),
                ForeColor = Color.FromArgb(16, 185, 129),
                Location = new Point(24, 18),
                AutoSize = true
            };
            this.Controls.Add(lblHeader);

            Label lblSub = new Label()
            {
                Text = "Giải nén mã nguồn, gắn Tên & Logo công ty, khởi tạo D1/R2 và chạy tự động",
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184),
                Location = new Point(25, 44),
                AutoSize = true
            };
            this.Controls.Add(lblSub);

            // 1. Company Name
            Label lblComp = new Label() { Text = "1. Tên Công ty / Nhà máy hiển thị:", Location = new Point(25, 82), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            this.Controls.Add(lblComp);

            txtCompany = new TextBox() { Text = "CRYSTAL", Location = new Point(25, 105), Width = 510, BackColor = Color.FromArgb(30, 41, 59), ForeColor = Color.White, BorderStyle = BorderStyle.FixedSingle };
            this.Controls.Add(txtCompany);

            // 2. Company Logo
            Label lblLogo = new Label() { Text = "2. File ảnh Logo công ty (.png, .jpg, .svg - tùy chọn):", Location = new Point(25, 142), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            this.Controls.Add(lblLogo);

            txtLogo = new TextBox() { Text = "", Location = new Point(25, 165), Width = 410, BackColor = Color.FromArgb(30, 41, 59), ForeColor = Color.White, BorderStyle = BorderStyle.FixedSingle };
            this.Controls.Add(txtLogo);

            Button btnBrowseLogo = new Button() { Text = "Chọn ảnh...", Location = new Point(445, 163), Width = 90, Height = 26, BackColor = Color.FromArgb(51, 65, 85), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnBrowseLogo.Click += (s, e) => {
                OpenFileDialog ofd = new OpenFileDialog();
                ofd.Filter = "Image Files|*.png;*.jpg;*.jpeg;*.svg;*.webp";
                if (ofd.ShowDialog() == DialogResult.OK) txtLogo.Text = ofd.FileName;
            };
            this.Controls.Add(btnBrowseLogo);

            // 3. Install Directory
            Label lblDir = new Label() { Text = "3. Thư mục giải nén & cài đặt trên máy:", Location = new Point(25, 202), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            this.Controls.Add(lblDir);

            string defaultDir = File.Exists(Path.Combine(Application.StartupPath, "package.json"))
                ? Application.StartupPath
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Crystal-5S-Audit");

            txtDir = new TextBox() { Text = defaultDir, Location = new Point(25, 225), Width = 410, BackColor = Color.FromArgb(30, 41, 59), ForeColor = Color.White, BorderStyle = BorderStyle.FixedSingle };
            this.Controls.Add(txtDir);

            Button btnBrowseDir = new Button() { Text = "Chọn nơi lưu...", Location = new Point(445, 223), Width = 90, Height = 26, BackColor = Color.FromArgb(51, 65, 85), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnBrowseDir.Click += (s, e) => {
                FolderBrowserDialog fbd = new FolderBrowserDialog();
                fbd.SelectedPath = txtDir.Text;
                if (fbd.ShowDialog() == DialogResult.OK) txtDir.Text = fbd.SelectedPath;
            };
            this.Controls.Add(btnBrowseDir);

            // 4. Sample Areas option
            Label lblSeed = new Label() { Text = "4. Dữ liệu Khu vực ban đầu:", Location = new Point(25, 262), AutoSize = true, Font = new Font("Segoe UI", 9.5F, FontStyle.Bold) };
            this.Controls.Add(lblSeed);

            rbSeedYes = new RadioButton() { Text = "Nạp sẵn 16 khu vực mẫu (KNI, GQC, WH, DYE...)", Location = new Point(28, 285), AutoSize = true, Checked = true };
            rbSeedNo = new RadioButton() { Text = "Để trống (Admin tự tạo trên web)", Location = new Point(335, 285), AutoSize = true };
            this.Controls.Add(rbSeedYes);
            this.Controls.Add(rbSeedNo);

            // Action Buttons
            btnLocal = new Button()
            {
                Text = "▶ CÀI ĐẶT & CHẠY LOCAL (MẠNG LAN)",
                Location = new Point(25, 325),
                Width = 248,
                Height = 44,
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.FromArgb(2, 6, 23),
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnLocal.Click += (s, e) => RunSetup("local");
            this.Controls.Add(btnLocal);

            btnCloud = new Button()
            {
                Text = "☁ ĐƯA LÊN CLOUDFLARE (INTERNET)",
                Location = new Point(287, 325),
                Width = 248,
                Height = 44,
                BackColor = Color.FromArgb(37, 99, 235),
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnCloud.Click += (s, e) => RunSetup("cloud");
            this.Controls.Add(btnCloud);

            lblStatus = new Label()
            {
                Text = "Sẵn sàng. Chọn 1 trong 2 nút phía trên để bắt đầu.",
                Location = new Point(25, 378),
                AutoSize = true,
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular)
            };
            this.Controls.Add(lblStatus);
        }

        private void ExtractEmbeddedPayload(string targetDir)
        {
            if (!Directory.Exists(targetDir))
                Directory.CreateDirectory(targetDir);

            // If package.json already exists in targetDir and we are running right inside the repo, skip overwriting source files
            if (File.Exists(Path.Combine(targetDir, "package.json")) &&
                string.Equals(Path.GetFullPath(targetDir).TrimEnd('\\\\'), Path.GetFullPath(Application.StartupPath).TrimEnd('\\\\'), StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            string tempZip = Path.Combine(Path.GetTempPath(), "crystal5s_payload_" + Guid.NewGuid().ToString("N") + ".zip");
            using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
            {
                if (resStream == null)
                    throw new Exception("Không tìm thấy gói dữ liệu nhúng payload.zip!");
                using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                {
                    resStream.CopyTo(fs);
                }
            }

            // Extract safely overwriting files
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

                lblStatus.Text = "Đang giải nén bộ cài vào: " + targetDir + " ...";
                Application.DoEvents();

                ExtractEmbeddedPayload(targetDir);

                string args = string.Format("scripts\\\\auto_setup.mjs --{0} --company=\\"{1}\\" --seed={2} --logo=\\"{3}\\"",
                    mode,
                    company.Replace("\\"", ""),
                    seedFlag,
                    logoPath.Replace("\\"", ""));

                ProcessStartInfo psi = new ProcessStartInfo()
                {
                    FileName = "cmd.exe",
                    Arguments = "/k chcp 65001 >nul && title Crystal 5S Setup && node " + args,
                    WorkingDirectory = targetDir,
                    UseShellExecute = true
                };

                Process.Start(psi);
                lblStatus.Text = "✔ Đã khởi chạy cửa sổ cài đặt tự động!";
            }
            catch (Exception ex)
            {
                MessageBox.Show("Lỗi khi khởi chạy: " + ex.Message, "Crystal 5S Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
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
const compileCmd = `"${CSC}" /target:winexe /out:"${OUT_EXE}" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /resource:"${PAYLOAD_ZIP}",payload.zip "${CS_FILE}"`;
execSync(compileCmd, { stdio: 'inherit' });

console.log('3/3. Dọn dẹp thư mục tạm...');
fs.rmSync(BUILD_DIR, { recursive: true, force: true });

const stats = fs.statSync(OUT_EXE);
console.log(`\n✔ ĐÃ TẠO THÀNH CÔNG FILE EXE ĐỘC LẬP: ${OUT_EXE} (${(stats.size / 1024).toFixed(1)} KB)`);
