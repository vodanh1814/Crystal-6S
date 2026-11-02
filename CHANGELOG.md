# Changelog

Mọi thay đổi quan trọng của hệ thống **Crystal 5S Audit** đều được ghi nhận tại tài liệu này theo chuẩn [Semantic Versioning](https://semver.org/).

---

## [2.5.0] - 2026-11-02

### Added (Tính năng Mới: Quản trị & Import Điểm Lịch sử Excel Thông minh)
- **Tải file mẫu Excel (.xlsx) Điểm Lịch sử theo Tháng**:
  - Tự động kết xuất template bảng tính ma trận chuẩn theo các khu vực thực tế đang hoạt động (`active = 1`).
  - Dòng là 12 Tháng (Tháng 1 đến Tháng 12 kèm tên viết tắt quốc tế Jan..Dec), Cột là mã và tên khu vực.
  - Tự động điền các điểm đã có trong cơ sở dữ liệu để Admin có thể tải về chỉnh sửa tiếp mà không bị mất dữ liệu.
- **Tải lên Trực tiếp File Excel (.xlsx / .xls) 1-Click**:
  - Tự động phân tích và nhận diện hướng ma trận: hỗ trợ cả ma trận Tháng theo dòng hoặc Tháng theo cột.
  - Thuật toán Fuzzy & Synonym Matching linh hoạt cho tên/mã khu vực sản xuất (Knitting ↔ KNI, Warehouse ↔ WH, Greige_PP ↔ BAT, QC-Final ↔ FQC, QC-Greige ↔ GQC, Dyeing ↔ DYE, Setting ↔ SET, VAP ↔ VAP, MTN ↔ MTN, Utility ↔ UTI, TSC ↔ TSC, FM/CFD ↔ FM/CFD, Lab dip ↔ L-DIP, ADM ↔ ADM...).
  - Tự động chuẩn hóa tỷ lệ điểm số: nhận diện số thập phân tỷ lệ ($0.9 \rightarrow 90.0$, $1 \rightarrow 100.0$), chuỗi phần trăm ($95.5\% \rightarrow 95.5$) và chuỗi số có dấu phẩy.
  - Tối ưu hiệu năng: Tách riêng SheetJS thành chunk nạp động (`lazy import`) ~423 KB, không làm tăng dung lượng bundle ban đầu của ứng dụng.
- **Lối tắt Quản trị Nhanh (Admin Quick Link)**:
  - Bổ sung khối "Cập nhật điểm lịch sử (.xlsx)" ngay trong trang Quản trị Mục tiêu (`/admin/targets`).
  - Hỗ trợ tham số URL `?tab=monthly&import=1` tự động chuyển tab Báo cáo tháng và mở ngay modal nhập liệu.

### Fixed (Sửa lỗi & Đồng bộ Phiên bản Toàn diện)
- **Đồng bộ hóa Version giữa Ứng dụng, Git và Bộ Cài EXE**:
  - Khắc phục lỗi hiển thị phiên bản cũ trong `src/version.ts`, đồng bộ toàn bộ hệ thống lên **`v2.5.0`**.
  - Tự động hóa `scripts/build_exe.mjs`: đọc trực tiếp `version` từ `package.json` để nhúng vào `AssemblyVersion` (`2.5.0.0`) và tiêu đề giao diện bộ cài độc lập `Crystal_5S_Setup.exe`, loại bỏ hoàn toàn tình trạng hardcode phiên bản.
- **Tái đóng gói Bộ cài đặt Windows Độc lập**:
  - Biên dịch và nhúng toàn bộ mã nguồn `v2.5.0` mới nhất vào file [`Crystal_5S_Setup.exe`](./Crystal_5S_Setup.exe).

---

## [2.4.3] - 2026-11-01

### Changed (Tối ưu hóa Tên miền Cloudflare & Quy trình Chuẩn)
- **Rút gọn Tên miền Cloudflare Worker thành `5s-audit` (Bỏ tiền tố công ty bị lặp)**:
  - Cập nhật tên Worker trong `wrangler.jsonc` thành `5s-audit` thay vì `crystal-5s-audit` hoặc `${slug}-5s-audit`.
  - Giúp URL xuất bản trên Cloudflare trở nên ngắn gọn, dễ nhớ: `https://5s-audit.<subdomain>.workers.dev` (ví dụ: `https://5s-audit.5scetvn.workers.dev`), loại bỏ sự trùng lặp tên công ty khi subdomain Cloudflare đã chứa tên nhà máy.
  - Vẫn giữ nguyên cơ chế định danh độc lập cho Database D1 (`${slug}-5s-db`) và Kho ảnh R2 (`${slug}-5s-photos`) trong `scripts/auto_setup.mjs`.
  - Đồng bộ fallback và preview URL trong `worker/routes/settings.ts` và `src/pages/AdminTargets.tsx`.
- **Thiết lập Quy trình Phát triển & Triển khai 6 Bước Tiêu chuẩn**:
  - Ban hành tài liệu quy tắc [GEMINI.md](./GEMINI.md) chuẩn hóa toàn bộ quy trình làm việc giữa Người dùng và Agent (Lên Plan ➔ Duyệt Plan ➔ Agent Triển khai ➔ Agent Review 0 lỗi ➔ Duyệt Git ➔ Agent Push & Release).

---

## [2.4.2] - 2026-11-01

### Fixed (Sửa lỗi & Tối ưu hóa Trải nghiệm Thiết lập Cloudflare)
- **Khắc phục lỗi trang tạo Subdomain Cloudflare không vào được (do Cloudflare khai tử route `/workers/onboarding`)**:
  - Chuyển hoàn toàn cơ chế tự động trích xuất và mở trang thiết lập Subdomain từ đường dẫn cũ sang trang chính thức của giao diện Cloudflare mới: `https://dash.cloudflare.com/<accountId>/workers-and-pages` (kèm đường dẫn cấu hình trực tiếp `https://dash.cloudflare.com/<accountId>/workers/subdomain` và universal link `https://dash.cloudflare.com/?to=/:account/workers-and-pages`).
  - Hiển thị hướng dẫn trực quan 4 bước chi tiết: Định vị chính xác mục **"Your subdomain"** ở cột bên phải giao diện Cloudflare Dashboard để người dùng bấm **"Set up"** (hoặc **"Change"**) và đặt tên subdomain mong muốn (ví dụ: `cetvn`).
  - Tăng thời gian chờ tự động trong môi trường GUI độc lập (`!process.stdin.isTTY`) lên 20 giây giúp người dùng thao tác lưu trên trình duyệt dễ dàng trước khi bộ cài tiếp tục tiến trình xuất bản.
  - Tái đóng gói toàn bộ mã nguồn vào ứng dụng độc lập [Crystal_5S_Setup.exe](./Crystal_5S_Setup.exe).

---
