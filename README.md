# Crystal 5S Audit — Hệ thống Đánh giá, Giám sát Andon & Cải tiến 5S Nhà Máy

**Phiên bản hiện tại: `v2.3.1`** · Xem lịch sử cập nhật chi tiết tại [CHANGELOG.md](./CHANGELOG.md).

Ứng dụng web & bộ cài đặt độc lập toàn diện hỗ trợ kiểm tra, chấm điểm, theo dõi tiến độ khắc phục lỗi hình ảnh 2K và hiển thị bảng điện tử **Smart Factory Andon TV** cho hoạt động 5S (*Sort – Set in order – Shine – Standardize – Sustain*) tại nhà máy. Hoạt động linh hoạt cả trên **Mạng nội bộ (Local LAN)** lẫn **Đám mây Cloudflare (Workers, D1 Database, R2 Object Storage)**.

---

## 1. Điểm nổi bật của phiên bản `v2.1.0`

### 🚀 Bộ cài đặt độc lập 1-File `Crystal_5S_Setup.exe` (All-in-One Single-Screen Installer)
- **Đồ họa Vector WPF sắc nét**: Tự động tương thích mọi độ phân giải màn hình Windows (100%, 125%, 150%, 2K, 4K), không bị vỡ hình hay nhòe chữ, đi kèm bộ biểu tượng **Crystal 5S** đa độ phân giải (`assets/crystal_5s.ico`).
- **Song ngữ (`🇻🇳 Tiếng Việt ⇄ 🇬🇧 English`) & Giao diện Sáng / Tối (`☀ Light / 🌙 Dark`)**: Chuyển đổi trực tiếp ngay trên thanh tiêu đề của bộ cài đặt `.exe`, màn hình khởi tạo `/setup` và màn hình đăng nhập `/login`.
- **Gói gọn toàn bộ cấu hình trong 1 màn hình duy nhất**:
  1. **Thương hiệu Công ty**: Nhập Tên Công ty / Nhà máy + Chọn file ảnh Logo (`.png`, `.jpg`, `.svg`, `.webp`) kèm ô xem trước (Live Preview).
  2. **Tài khoản Quản trị viên (Admin)**: Nhập Họ tên, Tài khoản (`admin`), Mật khẩu (`>= 6 ký tự`) — tự động khởi tạo vào Database D1 ngay trong quá trình cài.
  3. **Cấu hình Hệ thống & Đám mây**: Chọn thư mục cài đặt, Mã định danh Cloud (`Slug` tự động tạo tên riêng cho Worker / D1 / R2 khi triển khai cho công ty khác), Cổng mạng LAN (`Port`), Chỉ tiêu KPI 5S mặc định (`%`) và tùy chọn nạp sẵn **16 khu vực mẫu** hoặc **Để trống hoàn toàn**.
  4. **Nhật ký trực tiếp (Embedded Live Console Log)**: Theo dõi toàn bộ tiến trình cài đặt ngay trong cùng một cửa sổ ứng dụng.

### 📺 Màn hình TV Smart Factory Andon (`/` Mặc định Công khai)
- Truy cập trực tiếp vào `/` là hiển thị ngay bảng **Smart Factory Andon Dashboard** dành cho màn hình TV tại xưởng mà không bắt buộc đăng nhập (bấm biểu tượng người dùng góc phải trên cùng để đăng nhập khi cần thao tác).
- **Thiết kế vừa khít 100% khung hình TV (Zero Scroll)**: Hiển thị đồng thời 6 thẻ KPI tổng hợp, ma trận nhiệt 4×4 của 16 khu vực sản xuất, bảng cảnh báo lỗi quá hạn 7 ngày & lỗi lặp lại, biểu đồ xu hướng 12 tuần, phân bổ lỗi theo nhóm S1–S5 và bảng xếp hạng Top/Bottom khu vực.
- **Thanh bên thông minh 3 trạng thái (`Thu gọn` → `Ẩn thanh bên` → `Hiện thanh bên`)** kèm nút **Full TV** phóng toàn màn hình.

### 📋 Mô hình Kỳ Audit 5S Toàn Nhà Máy Theo Tuần (Plant-Wide Weekly Audit)
- Mỗi tuần ISO (Thứ Hai – Chủ Nhật) nhà máy có **1 kỳ Audit chung duy nhất** bao gồm toàn bộ các khu vực đang hoạt động:
  - Điểm khởi đầu của mỗi khu vực = `100%`.
  - Khi phát hiện lỗi thực địa (`S1.1` → `S5.1`), chọn **Khu vực + Tiêu chí + Mô tả + Ảnh chụp thực tế (Before)**, hệ thống tự động trừ điểm khu vực đó.
  - **Tự động phạt lũy tiến trong tháng**: Nếu cùng một `(Khu vực, Tiêu chí)` đã từng bị ghi nhận lỗi ở các kỳ Audit đã hoàn thành trước đó trong **cùng tháng** (dù lỗi tuần trước đã đóng hay chưa đóng), mức phạt tự động tăng thêm `+1 điểm` cho mỗi tuần lặp (`applied_penalty = base_penalty + (repeat_level - 1)`). Sang tháng mới, hệ số lặp tự động reset về `1`.
  - **Bảng nhập nhanh 3 mục đánh giá ngoài (`S5.2-BOD`, `S5.2-CUS`, `S5.3`)**: Chỉ cần nhập số lần vi phạm cho từng khu vực, không cần tải ảnh và không tính lũy tiến.

### 👥 Tách biệt hoàn toàn 4 Vai trò Người dùng
- Mỗi tài khoản chỉ giữ **1 vai trò duy nhất** (không kiêm nhiệm chồng chéo):
  - **`Admin` (Quản trị viên)**: Toàn quyền quản lý hệ thống, thương hiệu, người dùng, khu vực, bộ tiêu chí, chỉ tiêu KPI và nhập điểm lịch sử.
  - **`Auditor` (Đánh giá viên 5S)**: Thực hiện kiểm tra 5S, ghi nhận lỗi + ảnh `Before`, nghiệm thu & đóng lỗi sau khi khu vực đã khắc phục.
  - **`Area MNG` (Quản lý khu vực - `manager`)**: Nhận cảnh báo lỗi tại khu vực mình phụ trách, tải ảnh khắc phục (`After`) và gửi báo cáo hoàn thành.
  - **`Viewer` (Người xem)**: Xem bảng điện tử Dashboard, danh sách lỗi, thư viện ảnh và xuất báo cáo Excel.

### 🖼️ Kho ảnh 2K trên Cloudflare R2 & Thư viện Ảnh Khu vực
- Ảnh `Before` / `After` được xử lý tối ưu ở độ phân giải **2K (`2048px`, JPEG quality `0.85`)** sắc nét và lưu trữ trên Cloudflare R2 với `Cache-Control: public, max-age=31536000, immutable`.
- Trang **Lỗi ghi nhận (`/findings`)** và **Chi tiết kỳ Audit (`/audits/:id`)** có thanh chọn nhanh từng khu vực (`KNI`, `GQC`, `WH`, `DYE`...), chuyển đổi giữa chế độ **Danh sách kèm ảnh** và **Thư viện ảnh (Photo Gallery)** đối chiếu trực quan `TRƯỚC` – `SAU` kèm trình xem ảnh phóng to **Lightbox**.

### 📥 Nhập dữ liệu Điểm lịch sử theo tháng (`T1..T12`) & Xuất Báo cáo Excel
- Tại trang **Báo cáo (`/reports`) → Báo cáo tháng → 📥 Nhập điểm lịch sử**, Admin có thể nhập hoặc **copy-paste trực tiếp vùng dữ liệu từ file Excel** để cập nhật điểm 5S của các tháng trước trong năm (`T1` đến `T12`).
- Tự động kết hợp điểm lịch sử (cho các tháng chưa chạy phần mềm) với điểm tính tự động từ các kỳ Audit thực tế và xuất báo cáo ma trận ra file `.xlsx`.

---

## 2. Cách cài đặt & Sử dụng nhanh (Dành cho Người dùng / Triển khai Nhà máy)

### Cách 1: Chạy trực tiếp bằng file `Crystal_5S_Setup.exe` (Khuyên dùng)
1. Nhấp đúp mở file **`Crystal_5S_Setup.exe`**.
2. Chọn ngôn ngữ (`🇻🇳 Tiếng Việt` / `🇬🇧 English`) và giao diện (`🌙 Tối` / `☀ Sáng`).
3. Điền **Tên Công ty**, chọn **Logo công ty**, kiểm tra thông tin **Tài khoản Admin** (`admin` / `admin123`) và nhấn:
   - **▶ CÀI ĐẶT & CHẠY LOCAL (MẠNG LAN)**: Để tự động cài đặt và mở hệ thống ngay tại `http://localhost:5173`.
   - **☁ ĐƯA LÊN CLOUDFLARE (INTERNET)**: Để tự động khởi tạo Database D1, Kho ảnh R2 và xuất bản ra địa chỉ web `https://<mã-công-ty>-5s-audit.<subdomain>.workers.dev`.

### Cách 2: Chạy bằng dòng lệnh (Dành cho Lập trình viên)
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
| `npm run build` | Kiểm tra TypeScript và biên dịch bản Production (`dist/`) |
| `npm run build:exe` | Đóng gói lại toàn bộ mã nguồn + Icon vào file độc lập `Crystal_5S_Setup.exe` |
| `npm run setup:local` | Chạy trình cài đặt tự động chế độ Mạng LAN qua CLI |
| `npm run setup:cloud` | Chạy trình cài đặt & triển khai tự động lên Cloudflare qua CLI |
| `npm test` | Chạy bộ 18 Unit Tests kiểm증 công thức chấm điểm, lũy tiến, phân quyền & tuần ISO |
| `npm run typecheck` | Kiểm tra kiểu dữ liệu TypeScript trên toàn bộ Frontend (`src/`) và Backend (`worker/`) |

---

## 4. Quy tắc Quản lý Phiên bản (Versioning & Changelog)

Mỗi khi cập nhật tính năng hoặc sửa lỗi mới:
1. Nâng số phiên bản trong [`package.json`](./package.json) và [`scripts/build_exe.mjs`](./scripts/build_exe.mjs) theo chuẩn **Semantic Versioning (`MAJOR.MINOR.PATCH`)**.
2. Ghi nhận chi tiết các thay đổi vào [`CHANGELOG.md`](./CHANGELOG.md).
3. Chạy `npm run build:exe` để cập nhật lại file bộ cài đặt [`Crystal_5S_Setup.exe`](./Crystal_5S_Setup.exe).
4. Commit, gắn thẻ phiên bản (`git tag vX.Y.Z`) và đẩy lên GitHub (`git push origin main --tags`).
