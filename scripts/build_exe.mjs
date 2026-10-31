// Crystal 5S Audit — Self-Contained Windows .EXE Builder (WPF Vector UI + Multi-Res .ICO + Embedded Payload)
// Features:
//  - Multi-resolution Windows Application Icon (assets/crystal_5s.ico: 16, 32, 48, 64, 128, 256px PNG frames)
//  - Hardware-accelerated WPF Vector UI (100% DPI-aware, zero pixelation/blurriness, zero text overlap)
//  - Bilingual UI (Tiếng Việt / English toggle)
//  - Light / Dark Mode Theme toggle
//  - All-in-One Single-Screen Configuration + Live Embedded Console Log

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CSC = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const WPF_DIR = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\WPF';
const BUILD_DIR = path.join(ROOT, '.exe_build');
const ASSETS_DIR = path.join(ROOT, 'assets');
const ICO_PATH = path.join(ASSETS_DIR, 'crystal_5s.ico');
const PAYLOAD_ZIP = path.join(BUILD_DIR, 'payload.zip');
const ICON_GEN_CS = path.join(BUILD_DIR, 'IconGen.cs');
const ICON_GEN_EXE = path.join(BUILD_DIR, 'IconGen.exe');
const CS_FILE = path.join(BUILD_DIR, 'InstallerProgram.cs');
const OUT_EXE = path.join(ROOT, 'Crystal_5S_Setup.exe');

if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// ── STEP 1: Generate Multi-Resolution Crystal 5S Icon (assets/crystal_5s.ico) ──
console.log('1/4. Đang tạo biểu tượng ứng dụng độ phân giải cao (assets/crystal_5s.ico)...');
const iconGenCode = `\uFEFF
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;

class IconGen
{
    static byte[] RenderPngFrame(int size)
    {
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.Clear(Color.Transparent);

            float pad = size * 0.05f;
            float box = size - pad * 2f;
            float radius = size * 0.24f;

            // Outer dark slate squircle shadow/border
            using (GraphicsPath outerPath = RoundedRect(new RectangleF(pad, pad, box, box), radius))
            using (SolidBrush darkBrush = new SolidBrush(Color.FromArgb(255, 15, 23, 42)))
            {
                g.FillPath(darkBrush, outerPath);
            }

            // Inner emerald-to-cyan gradient squircle
            float inPad = size * 0.09f;
            float inBox = size - inPad * 2f;
            float inRad = size * 0.20f;
            using (GraphicsPath innerPath = RoundedRect(new RectangleF(inPad, inPad, inBox, inBox), inRad))
            using (LinearGradientBrush grad = new LinearGradientBrush(
                new PointF(0, 0),
                new PointF(size, size),
                Color.FromArgb(255, 16, 185, 129),
                Color.FromArgb(255, 2, 132, 199)))
            {
                g.FillPath(grad, innerPath);
            }

            // Crystal hexagon facet overlay
            PointF[] hex = new PointF[]
            {
                new PointF(size * 0.50f, size * 0.14f),
                new PointF(size * 0.82f, size * 0.30f),
                new PointF(size * 0.82f, size * 0.70f),
                new PointF(size * 0.50f, size * 0.86f),
                new PointF(size * 0.18f, size * 0.70f),
                new PointF(size * 0.18f, size * 0.30f)
            };
            using (LinearGradientBrush facetBrush = new LinearGradientBrush(
                new PointF(0, 0),
                new PointF(size, size),
                Color.FromArgb(75, 255, 255, 255),
                Color.FromArgb(10, 255, 255, 255)))
            using (Pen facetPen = new Pen(Color.FromArgb(115, 167, 243, 208), Math.Max(1f, size * 0.02f)))
            {
                g.FillPolygon(facetBrush, hex);
                g.DrawPolygon(facetPen, hex);
            }

            // Bold "5S" typography centered
            using (Font font = new Font("Segoe UI", size * 0.34f, FontStyle.Bold, GraphicsUnit.Pixel))
            using (StringFormat sf = new StringFormat() { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                // Subtle drop shadow
                using (SolidBrush shadow = new SolidBrush(Color.FromArgb(90, 0, 0, 0)))
                {
                    g.DrawString("5S", font, shadow, new RectangleF(0, size * 0.03f, size, size), sf);
                }
                using (SolidBrush white = new SolidBrush(Color.White))
                {
                    g.DrawString("5S", font, white, new RectangleF(0, size * 0.01f, size, size), sf);
                }
            }

            using (MemoryStream ms = new MemoryStream())
            {
                bmp.Save(ms, ImageFormat.Png);
                return ms.ToArray();
            }
        }
    }

    static GraphicsPath RoundedRect(RectangleF bounds, float radius)
    {
        float d = radius * 2f;
        GraphicsPath path = new GraphicsPath();
        path.AddArc(bounds.X, bounds.Y, d, d, 180, 90);
        path.AddArc(bounds.Right - d, bounds.Y, d, d, 270, 90);
        path.AddArc(bounds.Right - d, bounds.Bottom - d, d, d, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    static void Main(string[] args)
    {
        int[] sizes = new int[] { 16, 32, 48, 64, 128, 256 };
        List<byte[]> frames = new List<byte[]>();
        foreach (int s in sizes) frames.Add(RenderPngFrame(s));

        using (FileStream fs = new FileStream(args[0], FileMode.Create, FileAccess.Write))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            // ICONDIR header
            bw.Write((ushort)0);
            bw.Write((ushort)1);
            bw.Write((ushort)sizes.Length);

            int offset = 6 + (16 * sizes.Length);
            for (int i = 0; i < sizes.Length; i++)
            {
                int s = sizes[i];
                byte[] data = frames[i];
                bw.Write((byte)(s >= 256 ? 0 : s));
                bw.Write((byte)(s >= 256 ? 0 : s));
                bw.Write((byte)0);
                bw.Write((byte)0);
                bw.Write((ushort)1);
                bw.Write((ushort)32);
                bw.Write((uint)data.Length);
                bw.Write((uint)offset);
                offset += data.Length;
            }
            for (int i = 0; i < frames.Count; i++)
            {
                bw.Write(frames[i]);
            }
        }
    }
}
`;
fs.writeFileSync(ICON_GEN_CS, iconGenCode, 'utf-8');
execSync(`"${CSC}" /nologo /out:"${ICON_GEN_EXE}" /r:System.dll /r:System.Drawing.dll "${ICON_GEN_CS}"`, { stdio: 'inherit' });
execSync(`"${ICON_GEN_EXE}" "${ICO_PATH}"`, { stdio: 'inherit' });

// ── STEP 2: Create Clean Source Archive (payload.zip) ──
console.log('2/4. Đang nén mã nguồn sạch thành gói nhúng (payload.zip)...');
const psZipCmd = `
  $exclude = @('node_modules', '.wrangler', 'dist', '.dev.vars', '.git', '.exe_build', 'Crystal_5S_Installer.zip', 'Crystal_5S_Setup.exe', '*.tsbuildinfo', 'cookies*.txt', '.tmp*');
  $files = Get-ChildItem -Path '${ROOT}' -Exclude $exclude;
  if (Test-Path '${PAYLOAD_ZIP}') { Remove-Item '${PAYLOAD_ZIP}' -Force };
  Compress-Archive -Path $files.FullName -DestinationPath '${PAYLOAD_ZIP}' -CompressionLevel Optimal -Force;
`;
execSync(`powershell -NoProfile -Command "${psZipCmd.replace(/\r?\n/g, ' ')}"`, { stdio: 'inherit' });

// ── STEP 3: Write WPF Vector-Crisp Installer Program (UTF-8 with BOM!) ──
const csCode = `\uFEFF
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using WinForms = System.Windows.Forms;

[assembly: AssemblyTitle("Crystal 5S Audit — All-in-One Installer & Configurator")]
[assembly: AssemblyProduct("Crystal 5S Audit System")]
[assembly: AssemblyVersion("2.2.0.0")]

namespace Crystal5SInstaller
{
    public class InstallerWindow : Window
    {
        private bool isDark = true;
        private string lang = "vi";
        private Process activeProcess = null;

        // UI Elements for Dynamic Theme & Language Switching
        private Grid rootGrid;
        private Border headerBorder;
        private TextBlock lblTitle;
        private TextBlock lblSubtitle;
        private Button btnLang;
        private Button btnTheme;

        private Border cardLeft;
        private TextBlock lblSecBrand;
        private TextBlock lblCompany;
        private TextBox txtCompany;
        private TextBlock lblLogo;
        private TextBox txtLogo;
        private Button btnBrowseLogo;
        private Border logoPreviewBorder;
        private Image imgLogoPreview;
        private TextBlock lblLogoPlaceholder;

        private TextBlock lblSecAdmin;
        private TextBlock lblAdminName;
        private TextBox txtAdminName;
        private TextBlock lblAdminUser;
        private TextBox txtAdminUser;
        private TextBlock lblAdminPass;
        private TextBox txtAdminPass;

        private Border cardRight;
        private TextBlock lblSecSys;
        private TextBlock lblDir;
        private TextBox txtDir;
        private Button btnBrowseDir;
        private TextBlock lblSlug;
        private TextBox txtSlug;
        private TextBlock lblPort;
        private TextBox txtPort;
        private TextBlock lblTarget;
        private TextBox txtTarget;
        private TextBlock lblSeed;
        private RadioButton rbSeedYes;
        private RadioButton rbSeedNo;

        private Button btnLocal;
        private Button btnCloud;
        private Button btnOpenWeb;

        private Border logBorder;
        private TextBox txtLog;
        private TextBlock lblStatus;

        public InstallerWindow()
        {
            this.Width = 940;
            this.Height = 640;
            this.MinWidth = 880;
            this.MinHeight = 600;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.FontFamily = new FontFamily("Segoe UI");
            this.UseLayoutRounding = true;
            this.SnapsToDevicePixels = true;
            RenderOptions.SetBitmapScalingMode(this, BitmapScalingMode.HighQuality);
            TextOptions.SetTextFormattingMode(this, TextFormattingMode.Display);
            TextOptions.SetTextRenderingMode(this, TextRenderingMode.ClearType);

            // Load embedded icon for window title bar & default logo preview
            try
            {
                using (Stream iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.ico"))
                {
                    if (iconStream != null)
                    {
                        MemoryStream ms = new MemoryStream();
                        iconStream.CopyTo(ms);
                        ms.Position = 0;
                        this.Icon = BitmapFrame.Create(ms);
                    }
                }
            }
            catch { }

            BuildLayout();
            LoadDefaultLogoPreview();
            ApplyLanguage();
            ApplyTheme();
        }

        private void BuildLayout()
        {
            rootGrid = new Grid();
            rootGrid.RowDefinitions.Add(new RowDefinition() { Height = GridLength.Auto }); // 0: Header
            rootGrid.RowDefinitions.Add(new RowDefinition() { Height = GridLength.Auto }); // 1: 2-Column Config Cards
            rootGrid.RowDefinitions.Add(new RowDefinition() { Height = GridLength.Auto }); // 2: Action Buttons
            rootGrid.RowDefinitions.Add(new RowDefinition() { Height = new GridLength(1, GridUnitType.Star) }); // 3: Live Console Log
            rootGrid.RowDefinitions.Add(new RowDefinition() { Height = GridLength.Auto }); // 4: Footer Status
            this.Content = rootGrid;

            // ── ROW 0: HEADER BAR ──
            headerBorder = new Border()
            {
                Padding = new Thickness(22, 14, 22, 14),
                BorderThickness = new Thickness(0, 0, 0, 1)
            };
            Grid headerGrid = new Grid();
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            headerGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });
            headerBorder.Child = headerGrid;

            // Brand Badge Icon in Header
            Border badgeBorder = new Border()
            {
                Width = 42,
                Height = 42,
                CornerRadius = new CornerRadius(10),
                Margin = new Thickness(0, 0, 14, 0),
                Background = new LinearGradientBrush(
                    Color.FromRgb(16, 185, 129),
                    Color.FromRgb(2, 132, 199),
                    new Point(0, 0),
                    new Point(1, 1))
            };
            TextBlock badgeText = new TextBlock()
            {
                Text = "5S",
                Foreground = Brushes.White,
                FontWeight = FontWeights.Black,
                FontSize = 18,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            badgeBorder.Child = badgeText;
            Grid.SetColumn(badgeBorder, 0);
            headerGrid.Children.Add(badgeBorder);

            StackPanel titleStack = new StackPanel() { VerticalAlignment = VerticalAlignment.Center };
            lblTitle = new TextBlock() { FontSize = 16, FontWeight = FontWeights.Bold };
            lblSubtitle = new TextBlock() { FontSize = 11.5, Margin = new Thickness(0, 2, 0, 0) };
            titleStack.Children.Add(lblTitle);
            titleStack.Children.Add(lblSubtitle);
            Grid.SetColumn(titleStack, 1);
            headerGrid.Children.Add(titleStack);

            StackPanel topBtns = new StackPanel()
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };
            btnLang = CreatePillButton();
            btnLang.Margin = new Thickness(0, 0, 8, 0);
            btnLang.Click += (s, e) => { lang = (lang == "vi") ? "en" : "vi"; ApplyLanguage(); };

            btnTheme = CreatePillButton();
            btnTheme.Click += (s, e) => { isDark = !isDark; ApplyTheme(); ApplyLanguage(); };

            topBtns.Children.Add(btnLang);
            topBtns.Children.Add(btnTheme);
            Grid.SetColumn(topBtns, 2);
            headerGrid.Children.Add(topBtns);

            Grid.SetRow(headerBorder, 0);
            rootGrid.Children.Add(headerBorder);

            // ── ROW 1: TWO-COLUMN CONFIGURATION CARDS ──
            Grid cardsGrid = new Grid() { Margin = new Thickness(20, 14, 20, 10) };
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(16) });
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            // LEFT CARD: Company Branding & Initial Admin Account
            cardLeft = new Border()
            {
                CornerRadius = new CornerRadius(12),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(16, 14, 16, 14)
            };
            StackPanel leftStack = new StackPanel();
            cardLeft.Child = leftStack;

            lblSecBrand = new TextBlock() { FontSize = 12, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 0, 0, 8) };
            leftStack.Children.Add(lblSecBrand);

            // Brand Grid: Left = Company Name + Logo File, Right = Live Logo Preview Box
            Grid brandGrid = new Grid();
            brandGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            brandGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(12) });
            brandGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(76) });

            StackPanel brandFields = new StackPanel();
            lblCompany = CreateFieldLabel();
            txtCompany = CreateInputBox("CRYSTAL");
            txtCompany.FontWeight = FontWeights.Bold;
            txtCompany.TextChanged += (s, e) => {
                string slug = Regex.Replace((txtCompany.Text ?? "").ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
                if (string.IsNullOrEmpty(slug)) slug = "crystal";
                if (txtSlug != null) txtSlug.Text = slug;
            };
            brandFields.Children.Add(lblCompany);
            brandFields.Children.Add(txtCompany);

            lblLogo = CreateFieldLabel();
            lblLogo.Margin = new Thickness(0, 8, 0, 4);
            brandFields.Children.Add(lblLogo);

            Grid logoRow = new Grid();
            logoRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            logoRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(6) });
            logoRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });

            txtLogo = CreateInputBox("");
            Grid.SetColumn(txtLogo, 0);
            logoRow.Children.Add(txtLogo);

            btnBrowseLogo = CreateSmallButton();
            btnBrowseLogo.Click += (s, e) => BrowseLogoFile();
            Grid.SetColumn(btnBrowseLogo, 2);
            logoRow.Children.Add(btnBrowseLogo);
            brandFields.Children.Add(logoRow);

            Grid.SetColumn(brandFields, 0);
            brandGrid.Children.Add(brandFields);

            // Logo Preview Box
            logoPreviewBorder = new Border()
            {
                Width = 76,
                Height = 76,
                CornerRadius = new CornerRadius(10),
                BorderThickness = new Thickness(1),
                VerticalAlignment = VerticalAlignment.Bottom,
                Padding = new Thickness(4)
            };
            Grid previewInner = new Grid();
            lblLogoPlaceholder = new TextBlock()
            {
                Text = "LOGO",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            imgLogoPreview = new Image() { Stretch = Stretch.Uniform };
            previewInner.Children.Add(lblLogoPlaceholder);
            previewInner.Children.Add(imgLogoPreview);
            logoPreviewBorder.Child = previewInner;
            Grid.SetColumn(logoPreviewBorder, 2);
            brandGrid.Children.Add(logoPreviewBorder);

            leftStack.Children.Add(brandGrid);

            // Divider + Section 2: Initial Admin Account
            lblSecAdmin = new TextBlock() { FontSize = 12, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 14, 0, 8) };
            leftStack.Children.Add(lblSecAdmin);

            lblAdminName = CreateFieldLabel();
            txtAdminName = CreateInputBox("System Administrator");
            leftStack.Children.Add(lblAdminName);
            leftStack.Children.Add(txtAdminName);

            Grid adminCredGrid = new Grid() { Margin = new Thickness(0, 8, 0, 0) };
            adminCredGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            adminCredGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(10) });
            adminCredGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            StackPanel userCol = new StackPanel();
            lblAdminUser = CreateFieldLabel();
            txtAdminUser = CreateInputBox("admin");
            userCol.Children.Add(lblAdminUser);
            userCol.Children.Add(txtAdminUser);
            Grid.SetColumn(userCol, 0);
            adminCredGrid.Children.Add(userCol);

            StackPanel passCol = new StackPanel();
            lblAdminPass = CreateFieldLabel();
            txtAdminPass = CreateInputBox("admin123");
            passCol.Children.Add(lblAdminPass);
            passCol.Children.Add(txtAdminPass);
            Grid.SetColumn(passCol, 2);
            adminCredGrid.Children.Add(passCol);

            leftStack.Children.Add(adminCredGrid);

            Grid.SetColumn(cardLeft, 0);
            cardsGrid.Children.Add(cardLeft);

            // RIGHT CARD: System & Deployment Configuration
            cardRight = new Border()
            {
                CornerRadius = new CornerRadius(12),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(16, 14, 16, 14)
            };
            StackPanel rightStack = new StackPanel();
            cardRight.Child = rightStack;

            lblSecSys = new TextBlock() { FontSize = 12, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 0, 0, 8) };
            rightStack.Children.Add(lblSecSys);

            lblDir = CreateFieldLabel();
            rightStack.Children.Add(lblDir);

            string defaultDir = File.Exists(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "package.json"))
                ? AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\\\')
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Crystal-5S-Audit");

            Grid dirRow = new Grid();
            dirRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            dirRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(6) });
            dirRow.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });

            txtDir = CreateInputBox(defaultDir);
            Grid.SetColumn(txtDir, 0);
            dirRow.Children.Add(txtDir);

            btnBrowseDir = CreateSmallButton();
            btnBrowseDir.Click += (s, e) => {
                WinForms.FolderBrowserDialog fbd = new WinForms.FolderBrowserDialog();
                fbd.SelectedPath = txtDir.Text;
                if (fbd.ShowDialog() == WinForms.DialogResult.OK) txtDir.Text = fbd.SelectedPath;
            };
            Grid.SetColumn(btnBrowseDir, 2);
            dirRow.Children.Add(btnBrowseDir);
            rightStack.Children.Add(dirRow);

            lblSlug = CreateFieldLabel();
            lblSlug.Margin = new Thickness(0, 8, 0, 4);
            txtSlug = CreateInputBox("crystal");
            rightStack.Children.Add(lblSlug);
            rightStack.Children.Add(txtSlug);

            Grid portTargetGrid = new Grid() { Margin = new Thickness(0, 8, 0, 0) };
            portTargetGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            portTargetGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(10) });
            portTargetGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            StackPanel portCol = new StackPanel();
            lblPort = CreateFieldLabel();
            txtPort = CreateInputBox("5173");
            portCol.Children.Add(lblPort);
            portCol.Children.Add(txtPort);
            Grid.SetColumn(portCol, 0);
            portTargetGrid.Children.Add(portCol);

            StackPanel targetCol = new StackPanel();
            lblTarget = CreateFieldLabel();
            txtTarget = CreateInputBox("90");
            targetCol.Children.Add(lblTarget);
            targetCol.Children.Add(txtTarget);
            Grid.SetColumn(targetCol, 2);
            portTargetGrid.Children.Add(targetCol);

            rightStack.Children.Add(portTargetGrid);

            lblSeed = CreateFieldLabel();
            lblSeed.Margin = new Thickness(0, 12, 0, 6);
            rightStack.Children.Add(lblSeed);

            rbSeedYes = new RadioButton() { IsChecked = true, FontSize = 12, Margin = new Thickness(0, 2, 0, 5), Cursor = Cursors.Hand };
            rbSeedNo = new RadioButton() { IsChecked = false, FontSize = 12, Margin = new Thickness(0, 2, 0, 2), Cursor = Cursors.Hand };
            rightStack.Children.Add(rbSeedYes);
            rightStack.Children.Add(rbSeedNo);

            Grid.SetColumn(cardRight, 2);
            cardsGrid.Children.Add(cardRight);

            Grid.SetRow(cardsGrid, 1);
            rootGrid.Children.Add(cardsGrid);

            // ── ROW 2: ACTION BUTTONS BAR ──
            Grid actionGrid = new Grid() { Margin = new Thickness(20, 2, 20, 10) };
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(2, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(12) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(2, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(12) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });

            btnLocal = CreatePrimaryActionButton(Color.FromRgb(16, 185, 129), Color.FromRgb(2, 6, 23));
            btnLocal.Click += (s, e) => RunSetup("local");
            Grid.SetColumn(btnLocal, 0);
            actionGrid.Children.Add(btnLocal);

            btnCloud = CreatePrimaryActionButton(Color.FromRgb(37, 99, 235), Colors.White);
            btnCloud.Click += (s, e) => RunSetup("cloud");
            Grid.SetColumn(btnCloud, 2);
            actionGrid.Children.Add(btnCloud);

            btnOpenWeb = CreatePrimaryActionButton(Color.FromRgb(51, 65, 85), Colors.White);
            btnOpenWeb.Click += (s, e) => {
                string p = (txtPort.Text ?? "5173").Trim();
                if (string.IsNullOrEmpty(p)) p = "5173";
                try { Process.Start("http://localhost:" + p); } catch { }
            };
            Grid.SetColumn(btnOpenWeb, 4);
            actionGrid.Children.Add(btnOpenWeb);

            Grid.SetRow(actionGrid, 2);
            rootGrid.Children.Add(actionGrid);

            // ── ROW 3: EMBEDDED LIVE CONSOLE LOG ──
            logBorder = new Border()
            {
                Margin = new Thickness(20, 0, 20, 8),
                CornerRadius = new CornerRadius(10),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(8)
            };
            txtLog = new TextBox()
            {
                IsReadOnly = true,
                TextWrapping = TextWrapping.Wrap,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                BorderThickness = new Thickness(0),
                Background = Brushes.Transparent,
                FontFamily = new FontFamily("Segoe UI"),
                FontSize = 12
            };
            logBorder.Child = txtLog;
            Grid.SetRow(logBorder, 3);
            rootGrid.Children.Add(logBorder);

            // ── ROW 4: STATUS FOOTER ──
            lblStatus = new TextBlock()
            {
                Margin = new Thickness(22, 0, 22, 10),
                FontSize = 11.5
            };
            Grid.SetRow(lblStatus, 4);
            rootGrid.Children.Add(lblStatus);
        }

        private TextBlock CreateFieldLabel()
        {
            return new TextBlock()
            {
                FontSize = 11.5,
                FontWeight = FontWeights.SemiBold,
                Margin = new Thickness(0, 0, 0, 4)
            };
        }

        private TextBox CreateInputBox(string initialText)
        {
            return new TextBox()
            {
                Text = initialText,
                FontSize = 12.5,
                Padding = new Thickness(8, 5, 8, 5),
                BorderThickness = new Thickness(1),
                VerticalContentAlignment = VerticalAlignment.Center
            };
        }

        private Button CreateSmallButton()
        {
            return new Button()
            {
                Padding = new Thickness(10, 5, 10, 5),
                FontSize = 11.5,
                FontWeight = FontWeights.SemiBold,
                BorderThickness = new Thickness(1),
                Cursor = Cursors.Hand
            };
        }

        private Button CreatePillButton()
        {
            return new Button()
            {
                Padding = new Thickness(12, 6, 12, 6),
                FontSize = 11.5,
                FontWeight = FontWeights.Bold,
                BorderThickness = new Thickness(1),
                Cursor = Cursors.Hand
            };
        }

        private Button CreatePrimaryActionButton(Color bg, Color fg)
        {
            return new Button()
            {
                Height = 42,
                FontSize = 12.5,
                FontWeight = FontWeights.Bold,
                Background = new SolidColorBrush(bg),
                Foreground = new SolidColorBrush(fg),
                BorderThickness = new Thickness(0),
                Cursor = Cursors.Hand
            };
        }

        private void LoadDefaultLogoPreview()
        {
            try
            {
                using (Stream iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.ico"))
                {
                    if (iconStream != null)
                    {
                        MemoryStream ms = new MemoryStream();
                        iconStream.CopyTo(ms);
                        ms.Position = 0;
                        BitmapDecoder dec = BitmapDecoder.Create(ms, BitmapCreateOptions.PreservePixelFormat, BitmapCacheOption.OnLoad);
                        BitmapFrame best = dec.Frames[0];
                        foreach (BitmapFrame f in dec.Frames)
                        {
                            if (f.PixelWidth > best.PixelWidth) best = f;
                        }
                        imgLogoPreview.Source = best;
                        lblLogoPlaceholder.Visibility = Visibility.Collapsed;
                    }
                }
            }
            catch { }
        }

        private void BrowseLogoFile()
        {
            WinForms.OpenFileDialog ofd = new WinForms.OpenFileDialog();
            ofd.Filter = "Image Files (*.png;*.jpg;*.jpeg;*.svg;*.webp)|*.png;*.jpg;*.jpeg;*.svg;*.webp";
            if (ofd.ShowDialog() == WinForms.DialogResult.OK)
            {
                txtLogo.Text = ofd.FileName;
                try
                {
                    BitmapImage bmi = new BitmapImage();
                    bmi.BeginInit();
                    bmi.CacheOption = BitmapCacheOption.OnLoad;
                    bmi.UriSource = new Uri(ofd.FileName);
                    bmi.EndInit();
                    imgLogoPreview.Source = bmi;
                    lblLogoPlaceholder.Visibility = Visibility.Collapsed;
                }
                catch
                {
                    imgLogoPreview.Source = null;
                    lblLogoPlaceholder.Visibility = Visibility.Visible;
                }
            }
        }

        public void SetModeForTest(string newLang, bool darkTheme)
        {
            this.lang = newLang;
            this.isDark = darkTheme;
            ApplyTheme();
            ApplyLanguage();
        }

        private void ApplyLanguage()
        {
            if (lang == "vi")
            {
                this.Title = "Crystal 5S Audit v2.2.0 — Trình Cài Đặt & Cấu Hình Toàn Diện (All-in-One Setup)";
                lblTitle.Text = "CRYSTAL 5S AUDIT v2.2.0 — BỘ CÀI ĐẶT & CẤU HÌNH 1 MÀN HÌNH";
                lblSubtitle.Text = "Tự động giải nén, gắn Thương hiệu & Logo, khởi tạo Admin, Database D1/R2 và chạy ngay";
                btnLang.Content = "🇻🇳 Tiếng Việt  ⇄  EN";
                btnTheme.Content = isDark ? "🌙 Giao diện Tối" : "☀ Giao diện Sáng";

                lblSecBrand.Text = "1. THƯƠNG HIỆU CÔNG TY & LOGO (COMPANY BRANDING)";
                lblCompany.Text = "Tên Công ty / Nhà máy hiển thị:";
                lblLogo.Text = "File ảnh Logo (.png, .jpg, .svg - tùy chọn):";
                btnBrowseLogo.Content = "Chọn ảnh...";

                lblSecAdmin.Text = "2. TÀI KHOẢN QUẢN TRỊ VIÊN (INITIAL ADMIN)";
                lblAdminName.Text = "Họ và tên Quản trị viên:";
                lblAdminUser.Text = "Tài khoản đăng nhập:";
                lblAdminPass.Text = "Mật khẩu (>= 6 ký tự):";

                lblSecSys.Text = "3. CẤU HÌNH HỆ THỐNG & TRIỂN KHAI (SYSTEM & CLOUD)";
                lblDir.Text = "Thư mục giải nén & cài đặt trên máy:";
                btnBrowseDir.Content = "Chọn thư mục...";
                lblSlug.Text = "Mã định danh Cloud (Tự động đặt tên Worker / D1 / R2 riêng):";
                lblPort.Text = "Cổng chạy mạng LAN (Port):";
                lblTarget.Text = "Chỉ tiêu KPI 5S mặc định (%):";
                lblSeed.Text = "Khởi tạo dữ liệu Khu vực sản xuất ban đầu:";
                rbSeedYes.Content = "✔ Nạp sẵn 16 khu vực mẫu (KNI, GQC, WH, DYE...)";
                rbSeedNo.Content = "✕ Để trống hoàn toàn (Admin tự khai báo khu vực mới)";

                btnLocal.Content = "▶ CÀI ĐẶT & CHẠY LOCAL (MẠNG LAN)";
                btnCloud.Content = "☁ ĐƯA LÊN CLOUDFLARE (INTERNET)";
                btnOpenWeb.Content = "🌐 Mở Web LAN";
                lblStatus.Text = "✔ Sẵn sàng. Toàn bộ cấu hình Công ty, Admin & Hệ thống nằm gọn trong 1 màn hình.";

                if (string.IsNullOrEmpty(txtLog.Text) || txtLog.Text.StartsWith("[System Ready]"))
                {
                    txtLog.Text = "[Hệ thống sẵn sàng] Nhập Tên Công ty, Logo, Tài khoản Admin và nhấn 1 trong 2 nút phía trên để bắt đầu..." + Environment.NewLine;
                }
            }
            else
            {
                this.Title = "Crystal 5S Audit v2.2.0 — All-in-One Single-Screen Installer & Configurator";
                lblTitle.Text = "CRYSTAL 5S AUDIT v2.2.0 — ALL-IN-ONE SYSTEM INSTALLER";
                lblSubtitle.Text = "Automatically extract payload, apply Company Branding, create Admin user, provision D1/R2 & launch";
                btnLang.Content = "🇬🇧 English  ⇄  VI";
                btnTheme.Content = isDark ? "🌙 Dark Theme" : "☀ Light Theme";

                lblSecBrand.Text = "1. COMPANY BRANDING & LOGO";
                lblCompany.Text = "Company / Factory Display Name:";
                lblLogo.Text = "Company Logo File (.png, .jpg, .svg - optional):";
                btnBrowseLogo.Content = "Browse...";

                lblSecAdmin.Text = "2. INITIAL ADMINISTRATOR ACCOUNT";
                lblAdminName.Text = "Administrator Full Name:";
                lblAdminUser.Text = "Admin Username:";
                lblAdminPass.Text = "Admin Password (min 6 chars):";

                lblSecSys.Text = "3. SYSTEM & CLOUDFLARE CONFIGURATION";
                lblDir.Text = "Local Extraction & Installation Directory:";
                btnBrowseDir.Content = "Browse...";
                lblSlug.Text = "Cloud Project Slug (Names Worker / D1 / R2):";
                lblPort.Text = "Local LAN Server Port:";
                lblTarget.Text = "Default 5S KPI Target (%):";
                lblSeed.Text = "Initial Production Areas Data:";
                rbSeedYes.Content = "✔ Seed 16 sample areas (KNI, GQC, WH, DYE...)";
                rbSeedNo.Content = "✕ Start empty (Admin creates custom areas)";

                btnLocal.Content = "▶ INSTALL & RUN LOCAL (LAN SERVER)";
                btnCloud.Content = "☁ DEPLOY TO CLOUDFLARE (INTERNET)";
                btnOpenWeb.Content = "🌐 Open Web";
                lblStatus.Text = "✔ Ready. All Company, Admin & System settings are consolidated into this single screen.";

                if (string.IsNullOrEmpty(txtLog.Text) || txtLog.Text.StartsWith("[Hệ thống"))
                {
                    txtLog.Text = "[System Ready] Fill in Company Branding, Admin Account & click one of the buttons above to start..." + Environment.NewLine;
                }
            }
        }

        private void ApplyTheme()
        {
            Brush bgWindow = new SolidColorBrush(isDark ? Color.FromRgb(15, 23, 42) : Color.FromRgb(241, 245, 249));
            Brush bgHeader = new SolidColorBrush(isDark ? Color.FromRgb(2, 6, 23) : Color.FromRgb(255, 255, 255));
            Brush bgCard = new SolidColorBrush(isDark ? Color.FromRgb(30, 41, 59) : Color.FromRgb(255, 255, 255));
            Brush borderCard = new SolidColorBrush(isDark ? Color.FromRgb(51, 65, 85) : Color.FromRgb(203, 213, 225));
            Brush bgInput = new SolidColorBrush(isDark ? Color.FromRgb(15, 23, 42) : Color.FromRgb(248, 250, 252));
            Brush fgPrimary = new SolidColorBrush(isDark ? Color.FromRgb(248, 250, 252) : Color.FromRgb(15, 23, 42));
            Brush fgSecondary = new SolidColorBrush(isDark ? Color.FromRgb(148, 163, 184) : Color.FromRgb(100, 116, 139));
            Brush accent = new SolidColorBrush(isDark ? Color.FromRgb(16, 185, 129) : Color.FromRgb(5, 150, 105));
            Brush bgSecondaryBtn = new SolidColorBrush(isDark ? Color.FromRgb(51, 65, 85) : Color.FromRgb(226, 232, 240));

            this.Background = bgWindow;
            rootGrid.Background = bgWindow;

            headerBorder.Background = bgHeader;
            headerBorder.BorderBrush = borderCard;
            lblTitle.Foreground = accent;
            lblSubtitle.Foreground = fgSecondary;

            btnLang.Background = bgSecondaryBtn;
            btnLang.Foreground = fgPrimary;
            btnLang.BorderBrush = borderCard;

            btnTheme.Background = bgSecondaryBtn;
            btnTheme.Foreground = isDark
                ? new SolidColorBrush(Color.FromRgb(251, 191, 36))
                : new SolidColorBrush(Color.FromRgb(30, 41, 59));
            btnTheme.BorderBrush = borderCard;

            cardLeft.Background = bgCard;
            cardLeft.BorderBrush = borderCard;
            cardRight.Background = bgCard;
            cardRight.BorderBrush = borderCard;

            lblSecBrand.Foreground = accent;
            lblSecAdmin.Foreground = accent;
            lblSecSys.Foreground = accent;

            TextBlock[] labels = new TextBlock[]
            {
                lblCompany, lblLogo, lblAdminName, lblAdminUser, lblAdminPass,
                lblDir, lblSlug, lblPort, lblTarget, lblSeed
            };
            foreach (TextBlock tb in labels) tb.Foreground = fgPrimary;

            TextBox[] inputs = new TextBox[]
            {
                txtCompany, txtLogo, txtAdminName, txtAdminUser, txtAdminPass,
                txtDir, txtSlug, txtPort, txtTarget
            };
            foreach (TextBox box in inputs)
            {
                box.Background = bgInput;
                box.Foreground = fgPrimary;
                box.BorderBrush = borderCard;
                box.CaretBrush = fgPrimary;
            }

            logoPreviewBorder.Background = bgInput;
            logoPreviewBorder.BorderBrush = borderCard;
            lblLogoPlaceholder.Foreground = fgSecondary;

            btnBrowseLogo.Background = bgSecondaryBtn;
            btnBrowseLogo.Foreground = fgPrimary;
            btnBrowseLogo.BorderBrush = borderCard;

            btnBrowseDir.Background = bgSecondaryBtn;
            btnBrowseDir.Foreground = fgPrimary;
            btnBrowseDir.BorderBrush = borderCard;

            rbSeedYes.Foreground = fgPrimary;
            rbSeedNo.Foreground = fgPrimary;

            btnOpenWeb.Background = bgSecondaryBtn;
            btnOpenWeb.Foreground = fgPrimary;

            logBorder.Background = new SolidColorBrush(Color.FromRgb(2, 6, 23));
            logBorder.BorderBrush = borderCard;
            txtLog.Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153));

            lblStatus.Foreground = fgSecondary;
        }

        private void AppendLog(string line)
        {
            if (string.IsNullOrEmpty(line)) return;
            if (!this.Dispatcher.CheckAccess())
            {
                this.Dispatcher.BeginInvoke(new Action<string>(AppendLog), line);
                return;
            }
            string clean = Regex.Replace(line, @"\\x1B\\[[0-9;]*[a-zA-Z]", "");
            txtLog.AppendText(clean + Environment.NewLine);
            txtLog.ScrollToEnd();
        }

        private void ExtractEmbeddedPayload(string targetDir)
        {
            if (!Directory.Exists(targetDir))
                Directory.CreateDirectory(targetDir);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\\\');
            if (File.Exists(Path.Combine(targetDir, "package.json")) &&
                string.Equals(Path.GetFullPath(targetDir).TrimEnd('\\\\'), Path.GetFullPath(baseDir).TrimEnd('\\\\'), StringComparison.OrdinalIgnoreCase))
            {
                AppendLog(lang == "vi"
                    ? "✔ Đang chạy trực tiếp tại thư mục mã nguồn gốc."
                    : "✔ Running directly inside the source repository.");
                return;
            }

            AppendLog((lang == "vi" ? "▶ Đang giải nén bộ cài vào: " : "▶ Extracting package payload to: ") + targetDir);
            string tempZip = Path.Combine(Path.GetTempPath(), "crystal5s_payload_" + Guid.NewGuid().ToString("N") + ".zip");
            using (Stream resStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
            {
                if (resStream == null)
                    throw new Exception("Missing embedded payload.zip resource!");
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
                string targetDir = (txtDir.Text ?? "").Trim();
                string company = (txtCompany.Text ?? "").Trim();
                if (string.IsNullOrEmpty(company)) company = "CRYSTAL";
                string logoPath = (txtLogo.Text ?? "").Trim();
                string seedFlag = (rbSeedYes.IsChecked == true) ? "1" : "2";
                string adminName = (txtAdminName.Text ?? "System Administrator").Trim();
                string adminUser = (txtAdminUser.Text ?? "admin").Trim();
                string adminPass = txtAdminPass.Text ?? "";
                string slug = (txtSlug.Text ?? "crystal").Trim();
                string port = (txtPort.Text ?? "5173").Trim();
                if (string.IsNullOrEmpty(port)) port = "5173";
                string targetScore = (txtTarget.Text ?? "90").Trim();

                if (!string.IsNullOrEmpty(adminPass) && adminPass.Length < 6)
                {
                    MessageBox.Show(
                        lang == "vi" ? "Mật khẩu Admin phải từ 6 ký tự trở lên!" : "Admin password must be at least 6 characters!",
                        "Crystal 5S Setup",
                        MessageBoxButton.OK,
                        MessageBoxImage.Warning);
                    return;
                }

                txtLog.Clear();
                ExtractEmbeddedPayload(targetDir);

                if (activeProcess != null && !activeProcess.HasExited)
                {
                    try { activeProcess.Kill(); } catch { }
                }

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

                lblStatus.Text = (mode == "local")
                    ? (lang == "vi" ? "▶ Đang cài đặt & khởi chạy máy chủ LAN ngay trong cửa sổ này..." : "▶ Installing & starting local LAN server in this window...")
                    : (lang == "vi" ? "☁ Đang tự động triển khai lên Cloudflare (theo dõi nhật ký bên trên)..." : "☁ Deploying to Cloudflare automatically (see live log above)...");
            }
            catch (Exception ex)
            {
                AppendLog("❌ ERROR: " + ex.Message);
                MessageBox.Show(ex.Message, "Crystal 5S Setup", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            if (activeProcess != null && !activeProcess.HasExited)
            {
                try { activeProcess.Kill(); } catch { }
            }
            base.OnClosed(e);
        }

        public void SaveRenderedScreenshot(string outPath)
        {
            this.UpdateLayout();
            int w = (int)this.ActualWidth;
            int h = (int)this.ActualHeight;
            if (w <= 0) w = 940;
            if (h <= 0) h = 640;

            RenderTargetBitmap rtb = new RenderTargetBitmap(w, h, 96, 96, PixelFormats.Pbgra32);
            rtb.Render(rootGrid);
            PngBitmapEncoder enc = new PngBitmapEncoder();
            enc.Frames.Add(BitmapFrame.Create(rtb));
            using (FileStream fs = new FileStream(outPath, FileMode.Create, FileAccess.Write))
            {
                enc.Save(fs);
            }
        }

        [STAThread]
        public static void Main(string[] args)
        {
            Application app = new Application();
            InstallerWindow win = new InstallerWindow();

            if (args != null && args.Length >= 2 && args[0] == "--capture-screenshots")
            {
                string outDir = args[1];
                win.Show();
                win.SetModeForTest("vi", true);
                win.SaveRenderedScreenshot(Path.Combine(outDir, "installer_dark_vi.png"));
                win.SetModeForTest("en", false);
                win.SaveRenderedScreenshot(Path.Combine(outDir, "installer_light_en.png"));
                win.Close();
                return;
            }

            app.Run(win);
        }
    }
}
`;

fs.writeFileSync(CS_FILE, csCode, 'utf-8');

console.log('3/4. Đang biên dịch Crystal_5S_Setup.exe (WPF Vector UI + Icon đại diện)...');
try {
  execSync('powershell -NoProfile -Command "Stop-Process -Name Crystal_5S_Setup -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
} catch {}

const compileCmd = [
  `"${CSC}"`,
  `/nologo`,
  `/target:winexe`,
  `/out:"${OUT_EXE}"`,
  `/win32icon:"${ICO_PATH}"`,
  `/r:System.dll`,
  `/r:System.Core.dll`,
  `/r:System.Xaml.dll`,
  `/r:System.Drawing.dll`,
  `/r:System.Windows.Forms.dll`,
  `/r:System.IO.Compression.dll`,
  `/r:System.IO.Compression.FileSystem.dll`,
  `/r:"${WPF_DIR}\\WindowsBase.dll"`,
  `/r:"${WPF_DIR}\\PresentationCore.dll"`,
  `/r:"${WPF_DIR}\\PresentationFramework.dll"`,
  `/resource:"${PAYLOAD_ZIP}",payload.zip`,
  `/resource:"${ICO_PATH}",app.ico`,
  `"${CS_FILE}"`,
].join(' ');

execSync(compileCmd, { stdio: 'inherit' });

console.log('4/4. Dọn dẹp thư mục tạm...');
fs.rmSync(BUILD_DIR, { recursive: true, force: true });

const stats = fs.statSync(OUT_EXE);
console.log(`\n✔ ĐÃ TẠO THÀNH CÔNG FILE EXE ĐỘC LẬP: ${OUT_EXE} (${(stats.size / 1024).toFixed(1)} KB)`);
