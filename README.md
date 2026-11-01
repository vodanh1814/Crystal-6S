# Crystal 5S Audit — Hệ thống Đánh giá, Giám sát Andon & Cải tiến 5S Nhà Máy

**Phiên bản hiện tại: `v2.4.1`** · Xem lịch sử cập nhật chi tiết tại [CHANGELOG.md](./CHANGELOG.md).

Ứng dụng web & bộ cài đặt độc lập toàn diện hỗ trợ kiểm tra, chấm điểm, theo dõi tiến độ khắc phục lỗi hình ảnh 2K và hiển thị bảng điện tử **Smart Factory Andon TV** cho hoạt động 5S (*Sort – Set in order – Shine – Standardize – Sustain*) tại nhà máy. Hệ thống hoạt động linh hoạt cả trên **Mạng nội bộ (Local LAN)** lẫn **Đám mây Cloudflare (Workers, D1 Database, R2 Object Storage)**.

---

## 1. Điểm nổi bật của phiên bản `v2.4.1`

### 🛡️ Tự động hóa & Khôi phục Thiết lập Subdomain `workers.dev` cho Tài khoản Cloudflare Mới
- **Kênh Tương tác Tức thời (`Interactive stdin`)**:
  - Hỗ trợ nhập liệu bàn phím trực tiếp khi chạy `npm run deploy` trong trình cài đặt [scripts/auto_setup.mjs](file:///d:/Crystal-6S/scripts/auto_setup.mjs), cho phép người dùng trả lời và đặt tên Subdomain ngay trong cửa sổ dòng lệnh nếu Wrangler yêu cầu.
- **Cơ chế Tự Phục Hồi Thông Minh (Auto-Recovery)**:
  - Tự động phát hiện tài khoản Cloudflare mới chưa đăng ký tên miền phụ, tự động trích xuất và mở link thiết lập trong trình duyệt: `https://dash.cloudflare.com/<accountId>/workers/onboarding`.
  - Hướng dẫn tiếng Việt 3 bước rõ ràng và dừng chờ Enter để thử lại ngay lập tức mà không cần cài đặt lại từ đầu.
  - Hỗ trợ fallback thông minh khi chạy trong môi trường GUI độc lập ([Crystal_5S_Setup.exe](file:///d:/Crystal-6S/Crystal_5S_Setup.exe)), ngăn ngừa hoàn toàn tình trạng treo tiến trình.
- **Khắc phục Triệt để Lỗi `SQLITE_TOOBIG` trên Cloudflare D1**:
  - Tách riêng câu lệnh SQL khởi tạo `company_logo` và `company_name`.
  - Giới hạn ảnh logo nạp trực tiếp ban đầu qua CLI tối đa 35 KB, áp dụng chốt chặn an toàn độ dài chuỗi `< 45.000` ký tự (loại bỏ hoàn toàn nguy cơ vượt quá giới hạn 100.000 ký tự SQLite statement của Cloudflare D1).
  - Tự động kiểm soát câu lệnh sao lưu database `< 80.000` ký tự trong `generateDatabaseBackupSql()` để đảm bảo file SQL backup luôn an toàn khi import.

---

## 2. Điểm nổi bật của phiên bản `v2.4.0`

### ☁️ Theo dõi Hạ tầng Cloudflare & Hạn ngạch Free Tier Trọn đời (Admin Only)
- **Minh bạch hóa tài nguyên & Đảm bảo 0đ chi phí vận hành**:
  - Tích hợp mục Quản trị Hạ tầng Cloudflare trực quan tại `/admin/targets` dành riêng cho `Admin`.
  - **3 Thước đo Hạn ngạch Free Tier trực quan theo chuẩn Andon** (Xanh < 70%, Vàng 70-90%, Đỏ > 90%):
    1. **Workers API Requests**: Đo lường lượt gọi trong ngày so với mức **100.000 req/ngày** *(Reset 00:00 UTC, CPU 10ms)*.
    2. **Database D1 (SQLite)**: Đo dung lượng sử dụng so với **500 MB / Database** (kèm số dòng đọc `Reads ~X / 5.000.000` và ghi `Writes ~Y / 100.000` mỗi ngày).
    3. **Kho lưu trữ ảnh R2**: Đo dung lượng ảnh vi phạm so với **10 GB miễn phí trọn đời**, hiển thị số lượng ảnh đã lưu và **ước tính số ảnh vi phạm còn có thể lưu thêm (> 50.000 ảnh vi phạm hoàn toàn 0đ)**.
- **Thẻ thông tin Tài khoản & Tên miền**:
  - Hiển thị Masked Account ID (`cf-••••••••3f8a`), môi trường (Edge Network vs Local Emulation), liên kết Subdomain Worker mặc định (`*.workers.dev`), huy hiệu xanh **SSL/HTTPS Hoạt động** và Tên miền riêng nhà máy (`Custom Domain`).

---

### 📦 Di chuyển Dữ liệu Không mất mát khi Switch Tài khoản (Zero-Loss Migration)
- **Nút Tải bản sao lưu toàn bộ (SQL Dump)**:
  - Cho phép Admin tải về file `crystal5s_backup_YYYY-MM-DD.sql` bao gồm **100% cấu trúc và dữ liệu của cả 12 bảng** (Tài khoản người dùng, 24 tiêu chí, 16 khu vực, toàn bộ audits, lỗi vi phạm, ảnh Before/After và điểm KPI).
  - Tương thích hoàn hảo chuẩn transaction ACID của SQLite, sẵn sàng khôi phục vào bất kỳ Database D1 nào.
- **Quy trình Di chuyển Tự động 6 bước trong CLI Setup (`scripts/auto_setup.mjs`)**:
  - Bổ sung tùy chọn `[3] Di chuyển sang Tài khoản Cloudflare MỚI` (hoặc cờ `--migrate`) tự động export dữ liệu cũ, đăng nhập tài khoản Cloudflare mới, tạo Database D1 & R2 mới, nạp 100% dữ liệu cũ sang DB mới và xuất bản hệ thống.

---

### 🌐 Nhận diện Subdomain & Xem trước Tên miền mới khi Đổi Tài khoản
- **Xem trước URL mới ngay khi bấm "Kiểm tra kết nối"**:
  - Trong Modal cấu hình tài khoản Cloudflare, hệ thống tự động gọi API Cloudflare v4 để lấy chính xác Subdomain của tài khoản mới và hiển thị: `https://crystal-5s-audit.<subdomain-mới>.workers.dev`.
  - Tích hợp nút **"Sao chép link"** và mở tab mới để Admin kịp thời lưu lại link mới trước khi bấm xác nhận chuyển.
- **File Cứu hộ Offline (`CLOUDFLARE_LIVE_URL.txt`)**:
  - Tự động lưu thông tin URL mới nhất, ngày giờ, tên Worker và tên DB D1 vào file văn bản tại máy tính ngay khi triển khai.

---

## 3. Các tính năng nổi bật từ các phiên bản trước

### 🧹 Tích hợp Nút Xóa Dữ Liệu Demo & Dọn Dẹp Khởi Tạo (Admin Only)
- **Dọn dẹp sạch sẽ sau khi chạy thử nghiệm**:
  - Cho phép Quản trị viên (`Admin`) sau khi cài đặt và chạy thử nghiệm hệ thống có thể dọn dẹp sạch toàn bộ dữ liệu mẫu / thử nghiệm (`audits`, `audit_area_scores`, `findings`, `photos` kho R2, `historical_monthly_scores`, `activity_log`) để đưa hệ thống vào vận hành chính thức.
  - Cung cấp API `GET /api/settings/demo-stats` hiển thị thống kê dữ liệu thử nghiệm hiện có trong hệ thống và `POST /api/settings/clear-demo-data`.
- **Hộp thoại xác nhận an toàn hai lớp (`Modal`)**:
  - Liệt kê chi tiết những dữ liệu sẽ bị xóa; **bảo toàn 100% tài khoản người dùng, 24 tiêu chí 5S chuẩn, Logo & Tên công ty và Mục tiêu KPI**.
  - Tùy chọn xóa cả 16 khu vực sản xuất mẫu (nếu đã nạp lúc cài đặt) để Admin tự khai báo danh sách khu vực thực tế của công ty.
  - Yêu cầu nhập từ khóa xác thực (`XOA DEMO` / `CLEAR`) để mở khóa nút xóa, ngăn ngừa bấm nhầm.

---

### 📊 Dashboard & Báo cáo Hiệu quả Khắc phục (Remediation Effectiveness)
- **Theo dõi toàn diện 3 chỉ số khắc phục cốt lõi**:
  1. **Tỷ lệ đóng lỗi đúng hạn (`On-Time Closure Rate %`)**: Đo lường tỷ lệ các vấn đề 5S được xử lý và đóng trong thời hạn quy định (7 ngày), giúp đánh giá tính chủ động của các xưởng.
  2. **Thời gian khắc phục trung bình (`MTTR / Avg Remediation Time` — ngày)**: Thời gian trung bình từ lúc ghi nhận lỗi đến khi hoàn tất nghiệm thu và đóng lỗi.
  3. **Tỷ lệ lỗi tái diễn (`Recurrence / Repeat Rate %`) & Tỷ lệ giải quyết (`Resolution Rate %`)**: Đánh giá chiều sâu của biện pháp khắc phục, phát hiện các điểm nghẽn thường xuyên phát sinh lỗi lặp.
- **Tích hợp kép**:
  - Trực tiếp trên **Màn hình TV Andon Dashboard (`/`)**: Hiển thị dải nhãn 3 chỉ số tinh gọn ngay tại khung Cảnh báo 7 ngày.
  - Tab chuyên sâu **"Hiệu quả khắc phục"** tại trang **Báo cáo (`/reports`)**: Bảng thống kê chi tiết theo từng khu vực sản xuất (`Area Code`), phân loại trạng thái xử lý và hỗ trợ xuất báo cáo Excel (`Crystal_5S_Remediation_*.xlsx`).
- **Giao diện thẻ cảnh báo tối ưu cho TV**:
  - Dải nhãn 1 dòng gọn gàng, mã tiêu chí 5S rút gọn song ngữ (`S1.1` → `S5.3`, giữ tooltip nội dung đầy đủ).
  - Ngăn ngừa hoàn toàn hiện tượng tràn khung ngang hoặc cắt viền/chữ trên mọi tỷ lệ màn hình TV và thiết bị di động.

---

### 🔄 Quy trình Auto-Update 5 Bước An toàn & Hỗ trợ Cloudflare CI/CD
- **Nâng cấp an toàn tuyệt đối cho môi trường Local**:
  1. **Preflight Check**: Tự động kiểm tra trạng thái Git cục bộ; nếu phát hiện thay đổi mã nguồn chưa commit, hệ thống từ chối cập nhật (`409 Conflict`) nhằm ngăn ngừa mất mát mã nguồn.
  2. **Tự động Sao lưu (Auto-Backup)**: Tự động sao lưu toàn bộ mã nguồn và Database SQLite D1 cục bộ (`.wrangler/state/v3/d1`) vào thư mục `.backups/` trước khi kéo mã mới.
  3. **Đồng bộ mã nguồn (`git fetch` & checkout)**: Nhận bản phát hành chính thức từ GitHub repository mà không sử dụng các lệnh xóa nguy hiểm.
  4. **Kiểm tra di chuyển cấu trúc DB & Kiểu dữ liệu**: Xác minh nghiêm ngặt bảng `d1_migrations` và chạy kiểm tra kiểu dữ liệu TypeScript (`tsc -b`).
  5. **Tự động Rollback**: Nếu bất kỳ bước nào trong quy trình cập nhật gặp sự cố, hệ thống tự động hoàn nguyên về commit trước đó và phục hồi nguyên vẹn Database D1 từ bản sao lưu.
- **Hỗ trợ Cloudflare CI/CD Auto-Update**:
  - Tích hợp GitHub Actions workflow (`.github/workflows/deploy.yml`) và API quản trị `POST /api/settings/cloud-update-apply` cho phép kích hoạt cập nhật trên hạ tầng Cloudflare Workers & D1.

---

### 🛡️ Tăng cường Bảo mật Toàn diện & Phân tách TV Công khai
- **Chống tấn công dò mật khẩu (Brute-Force Rate Limiting)**:
  - Tự động ghi nhận số lần đăng nhập thất bại liên tiếp; khóa tạm thời tài khoản 15 phút sau 5 lần nhập sai mật khẩu (migration `0007_security_and_rate_limit.sql`).
- **Mã hóa AES-GCM-256 an toàn**:
  - Khóa truy cập GitHub (`github_token`) và các thông tin cấu hình nhạy cảm được mã hóa chuẩn công nghiệp bằng thuật toán **AES-GCM-256** trước khi ghi vào cơ sở dữ liệu (`app_settings`).
- **Bảo vệ API hình ảnh thực tế xưởng (`GET /api/photos/:id`)**:
  - Yêu cầu xác thực phiên đăng nhập trước khi tải ảnh hiện trường độ phân giải cao; ẩn stack trace và cause trong thông báo lỗi trả về cho client.
- **Phân tách chế độ TV công khai**:
  - Cho phép màn hình TV Andon tại xưởng truy cập không cần đăng nhập nhưng tự động ẩn các thông tin nội bộ nhạy cảm (như tên nhân sự, mô tả sự cố chi tiết) để đảm bảo quyền riêng tư.

---

### 👥 Phân định Quyền hạn Nghiệp vụ Chính xác
Hệ thống phân tách rõ ràng trách nhiệm của 4 vai trò, không chồng chéo quyền hạn:
- **`Auditor` (Đánh giá viên 5S Toàn nhà máy)**:
  - Hoạt động độc lập, không gắn cố định vào bất kỳ khu vực nào.
  - Có toàn quyền thực hiện đánh giá tuần, chấm điểm và nghiệm thu / đóng lỗi (`Verify & Close / Reject`) cho **toàn bộ 16 khu vực** trong toàn nhà máy.
- **`Area MNG` (`manager` — Quản lý Khu vực)**:
  - Được phân công phụ trách một hoặc nhiều khu vực cụ thể.
  - Chỉ có quyền tiếp nhận cảnh báo, tải ảnh khắc phục thực tế (`After`) và gửi báo cáo giải trình cho **đúng khu vực mình quản lý**.
- **`Admin` (Quản trị viên Hệ thống)**:
  - Cấu hình chỉ tiêu KPI, thương hiệu, danh mục tiêu chí, tài khoản người dùng, nhập điểm lịch sử và kích hoạt cập nhật hệ thống.
- **`Viewer` (Người xem)**:
  - Xem bảng điện tử TV Dashboard, danh mục lỗi, thư viện ảnh và xuất báo cáo.

---

### 📅 Chuẩn hóa Hiển thị Tên Tháng Quốc tế (`Jan, Feb, Mar...`)
- Toàn bộ nhãn tháng cũ (`M1..M12` hoặc `T1..T12`) đã được chuyển đổi đồng bộ sang tên tháng chuẩn quốc tế:
  `Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec`
- Áp dụng thống nhất trên:
  - Bảng Báo cáo tháng (`/reports`) và cửa sổ Nhập điểm lịch sử từ Excel.
  - File Excel xuất báo cáo năm (`Crystal_5S_Monthly_*.xlsx`).
  - Thẻ điểm trung bình tháng trên TV Dashboard và các nhãn kỳ Audit (`Oct 2026`, `Nov 2026`...).

---

### 🚀 Bộ cài đặt độc lập 1-File `Crystal_5S_Setup.exe` (WPF Vector UI)
- **Đồ họa Vector WPF sắc nét**: Tương thích hoàn hảo mọi độ phân giải màn hình Windows (100%, 125%, 150%, 2K, 4K), không nhòe chữ hay vỡ hạt, tích hợp bộ icon **Crystal 5S** đa kích thước (`assets/crystal_5s.ico`).
- **Song ngữ (`🇻🇳 Tiếng Việt ⇄ 🇬🇧 English`) & Giao diện Sáng / Tối (`☀ Light / 🌙 Dark`)**: Chuyển đổi trực tiếp ngay trên thanh tiêu đề của bộ cài đặt `.exe`, màn hình `/setup` và `/login`.
- **Gói gọn toàn bộ cấu hình trong 1 màn hình duy nhất**:
  1. **Thương hiệu**: Tên Công ty + Chọn ảnh Logo (Live Preview).
  2. **Tài khoản Admin đầu tiên**: Khởi tạo tự động vào Database D1 ngay trong quá trình cài.
  3. **Cấu hình Đám mây & Mạng LAN**: Thư mục cài đặt, Mã slug Cloud, Cổng mạng (`Port`), Chỉ tiêu KPI 5S mặc định (`%`), nạp 16 khu vực mẫu.
  4. **Nhật ký trực tiếp (Embedded Live Console Log)**: Theo dõi tiến trình cài đặt ngay trong cửa sổ.

---

### 📺 Màn hình TV Smart Factory Andon (`/` Mặc định Công khai)
- Truy cập trực tiếp tại `/` hiển thị ngay bảng **Smart Factory Andon Dashboard** cho TV xưởng mà không bắt buộc đăng nhập.
- **Thiết kế vừa khít 100% khung hình TV (Zero Scroll)**: 6 thẻ KPI tổng hợp, ma trận nhiệt 4×4 của 16 khu vực, bảng cảnh báo lỗi quá hạn 7 ngày & lỗi lặp, biểu đồ xu hướng 12 tuần, phân bổ lỗi theo nhóm S1–S5 và bảng xếp hạng Top/Bottom.
- **Thanh bên thông minh 3 trạng thái (`Thu gọn` → `Ẩn thanh bên` → `Hiện thanh bên`)** kèm nút **Full TV** toàn màn hình.

---

### 📋 Mô hình Kỳ Audit 5S Toàn Nhà Máy & Phạt Lũy Tiến Trong Tháng
- Mỗi tuần ISO (Thứ Hai – Chủ Nhật) nhà máy thực hiện **1 kỳ Audit chung duy nhất** bao gồm toàn bộ khu vực hoạt động:
  - Điểm khởi đầu của mỗi khu vực = `100%`.
  - Ghi nhận lỗi (`S1.1` → `S5.1`): Chọn **Khu vực + Tiêu chí + Mô tả + Ảnh chụp Before**, hệ thống tự động trừ điểm.
  - **Tự động phạt lũy tiến trong tháng**: Cùng một `(Khu vực, Tiêu chí)` bị lặp lỗi ở các kỳ Audit đã hoàn thành trước đó trong **cùng tháng**, mức phạt tự động tăng thêm `+1 điểm` cho mỗi tuần lặp (`applied_penalty = base_penalty + (repeat_level - 1)`). Sang tháng mới, hệ số lặp tự động reset về `1`.
  - **Bảng nhập nhanh 3 tiêu chí đánh giá ngoài (`S5.2-BOD`, `S5.2-CUS`, `S5.3`)**: Nhập số lần vi phạm trực tiếp cho từng khu vực, không cần ảnh và không tính lũy tiến.

---

### 🖼️ Kho ảnh 2K trên Cloudflare R2 & Thư viện Ảnh Khu vực
- Ảnh `Before` / `After` được tối ưu hóa độ phân giải **2K (`2048px`, JPEG quality `0.85`)** và lưu trữ trên Cloudflare R2 với `Cache-Control: public, max-age=31536000, immutable`.
- Trang **Lỗi ghi nhận (`/findings`)** và **Chi tiết kỳ Audit (`/audits/:id`)** cung cấp bộ lọc nhanh khu vực, chuyển đổi linh hoạt giữa chế độ danh sách và **Thư viện ảnh (Photo Gallery)** đối chiếu `TRƯỚC` – `SAU` kèm trình xem ảnh phóng to **Lightbox**.

---

## 2. Cách cài đặt & Sử dụng nhanh

### Cách 1: Chạy trực tiếp bằng file `Crystal_5S_Setup.exe` (Khuyên dùng)
1. Nhấp đúp mở file **`Crystal_5S_Setup.exe`**.
2. Chọn ngôn ngữ (`🇻🇳 Tiếng Việt` / `🇬🇧 English`) và giao diện (`🌙 Tối` / `☀ Sáng`).
3. Điền **Tên Công ty**, chọn **Logo công ty**, kiểm tra thông tin **Tài khoản Admin** (`admin` / `admin123`) và nhấn:
   - **▶ CÀI ĐẶT & CHẠY LOCAL (MẠNG LAN)**: Tự động cài đặt, đồng bộ database và mở hệ thống tại `http://localhost:5173`.
   - **☁ ĐƯA LÊN CLOUDFLARE (INTERNET)**: Tự động khởi tạo Database D1, Kho ảnh R2 và xuất bản ra địa chỉ web `https://<slug>-5s-audit.<subdomain>.workers.dev`.

### Cách 2: Chạy bằng dòng lệnh (Dành cho Lập trình viên & Kỹ thuật)
```powershell
# 1. Cài đặt thư viện
npm install

# 2. Khởi tạo Database D1 cục bộ & nạp 16 khu vực mẫu
npm run db:migrate:local
npm run db:sample:local

# 3. Chạy máy chủ phát triển (http://localhost:5173)
npm run dev
```

---

## 3. Các lệnh Quản trị & Đóng gói (Scripts)

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Khởi chạy máy chủ phát triển tại `http://localhost:5173` |
| `npm run build` | Kiểm tra TypeScript và biên dịch gói Production (`dist/`) |
| `npm run build:exe` | Đóng gói lại toàn bộ mã nguồn + Icon vào file độc lập `Crystal_5S_Setup.exe` |
| `npm run setup:local` | Chạy trình cài đặt tự động chế độ Mạng LAN qua CLI |
| `npm run setup:cloud` | Chạy trình cài đặt & triển khai tự động lên Cloudflare qua CLI |
| `npm test` | Chạy bộ 20 Unit Tests kiểm chứng tính điểm, lũy tiến, phân quyền, mã hóa bảo mật & tuần ISO |
| `npm run typecheck` | Kiểm tra kiểu dữ liệu TypeScript trên toàn bộ Frontend (`src/`) và Backend (`worker/`) |

---

## 4. Quy tắc Quản lý Phiên bản (Versioning & Changelog)

Mỗi khi cập nhật tính năng hoặc sửa lỗi mới:
1. Nâng số phiên bản trong [`package.json`](./package.json), [`src/version.ts`](./src/version.ts) và [`scripts/build_exe.mjs`](./scripts/build_exe.mjs) theo chuẩn **Semantic Versioning (`MAJOR.MINOR.PATCH`)**.
2. Ghi nhận chi tiết các thay đổi vào [`CHANGELOG.md`](./CHANGELOG.md).
3. Cập nhật tài liệu [`README.md`](./README.md) phản ánh các cải tiến mới.
4. Chạy `npm test && npm run build && npm run build:exe` để đóng gói lại [`Crystal_5S_Setup.exe`](./Crystal_5S_Setup.exe).
5. Commit, gắn thẻ phiên bản (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`) và đẩy lên GitHub (`git push origin main --tags`).
