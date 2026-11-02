# Changelog

Mọi thay đổi quan trọng của hệ thống **Crystal 5S Audit** đều được ghi nhận tại tài liệu này theo chuẩn [Semantic Versioning](https://semver.org/).

---

## [2.5.3] - 2026-11-02

### Changed & Improved (Tối ưu hóa Toàn diện Giao diện Di động & Cuộn Chạm Mượt mà)
- **Tối ưu hóa Bố cục Responsive Đa Nền tảng (Mobile, Tablet & TV Wall)**:
  - **Khử bỏ Tỷ lệ Flex Cứng trên Thiết bị Di động**: Chuyển đổi `flex-[58]` và `flex-[42]` thành `flex-none lg:flex-[58]` và `flex-none lg:flex-[42]`. Cho phép các khối nội dung trên màn hình nhỏ tự do mở rộng theo chiều cao thực tế thay vì bị ép nén vào một màn hình duy nhất.
  - **Loại bỏ Bẫy Cuộn Lồng nhau (Double Nested Scroll Containers)**: Tối ưu container trang thành 1 thanh cuộn duy nhất, giúp thao tác vuốt cuộn ngón tay trên điện thoại (iPhone Safari, Android Chrome) mượt mà, triệt tiêu hiện tượng khựng/lag cuộn chạm.
  - **Tối ưu Ma trận 16 Khu vực (Area Cards)**:
    - Hiển thị lưới 2 cột trên điện thoại (`grid-cols-2 sm:grid-cols-4`).
    - Thiết lập chiều cao chuẩn (`min-h-[88px] sm:min-h-[94px] lg:min-h-0`), chia 3 tầng thông tin mạch lạc: Tên khu vực + Huy hiệu Đạt/Chờ $\rightarrow$ Điểm số lớn + TB Tháng $\rightarrow$ Số lỗi tồn và đã sửa. Loại bỏ hoàn toàn lỗi chữ bị nén bẹp đè lên nhau.
  - **Khắc phục Biểu đồ Xu hướng 12 Tuần Recharts**: Đặt chiều cao hiển thị rõ ràng trên di động `h-56 sm:h-64 lg:h-full lg:flex-1` (224px - 256px), đảm bảo biểu đồ không bị sập chiều cao hay mất trục tọa độ trên màn hình điện thoại.
  - **Dải 6 Thẻ KPI & Bảng 5S**: Tối ưu padding, gap và wrap số liệu ngăn chặn tràn viền hoặc nhảy dòng số điểm.
- **Tối ưu Thanh Header trên Màn hình Hẹp**:
  - Tự động ẩn nút "Toàn màn hình TV" trên điện thoại (`hidden sm:flex`), tiết kiệm không gian ngang cho tên nhà máy và logo công ty.
  - Tối ưu giới hạn độ dài tiêu đề với `truncate max-w-[130px] sm:max-w-none`, không đè chèn lên các nút thao tác.
  - Chuẩn hóa vùng chạm cảm ứng ($\ge 32 \times 32$ px) cho nút chuông cảnh báo và đổi ngôn ngữ.
- **Bảo toàn 100% Trải nghiệm Smart TV Wall**: Giữ nguyên vẹn toàn bộ tỷ lệ hiển thị không cuộn chuột (`lg:overflow-hidden`, `lg:auto-rows-fr`) trên màn hình TV xưởng và máy tính để bàn.

---

## [2.5.2] - 2026-11-02

### Changed & Improved (Cải tiến Giao diện Dashboard Trực quan)
- **Hiển thị Tên Khu vực (`area_name`) thay vì Mã viết tắt (`area_code`) trên toàn bộ Dashboard**:
  - **Ma trận 16 Khu vực (16-Area Matrix Wall)**: Hiển thị tên đầy đủ của từng bộ phận sản xuất (Knitting, Dyeing, Setting, Warehouse, Batching, Greige QC, Final QC, Lab test, Utility, FM/CFD...) thay vì mã viết tắt khó nhớ, giúp công nhân và quản lý dễ dàng nhận biết ngay lập tức trên màn hình TV nhà máy.
  - Tích hợp tooltip hover `title` hiển thị kết hợp cả tên bộ phận và mã khu vực đầy đủ: `${area.area_name} (${area.area_code})`.
  - Bổ sung các class chống tràn văn bản CSS hiện đại (`truncate`, `min-w-0`) giúp tiêu đề không bị nhảy dòng hay phá vỡ bố cục trên mọi kích thước hiển thị.
  - **Bảng xếp hạng Top & Bottom (Leaderboard)**: Hiển thị tên bộ phận đầy đủ (🏆 1. Setting 98.0%, 🥈 2. Batching 97.0%...).
  - **Thẻ Cảnh báo Khẩn cấp & Dải KPI**: Hiển thị tên khu vực rõ ràng trên huy hiệu cảnh báo (Urgent Alarms) và danh sách khu vực quá hạn / lặp lại lỗi.

---

## [2.5.1] - 2026-11-02

### Added (Tính năng Mới: Kết nối Điểm Lịch sử & Smart Fallback Dashboard)
- **Hiển thị Toàn diện Điểm Nhập Lịch sử lên Màn hình Dashboard Nhà máy**:
  - Tích hợp 150 điểm lịch sử năm 2026 từ bảng `historical_monthly_scores` vào logic hiển thị của Dashboard TV công cộng.
  - Phân cấp ưu tiên thông minh: điểm audit tuần thực tế luôn được ưu tiên số 1; nếu chưa có kiểm tra thực tế trong tháng thì tự động lấy điểm lịch sử của khu vực (`historical`).
- **Cơ chế Fallback Thông minh (Smart Fallback for Early Month / Pending Week)**:
  - Khi bước sang đầu tháng mới (ví dụ Tuần W45 tháng 11/2026) chưa có kết quả audit và chưa có điểm tháng 11, hệ thống tự động tìm kiếm lùi về tháng gần nhất có dữ liệu (**Tháng 10/2026** với điểm trung bình **96.33%**).
  - **KPI 1 (Điểm TB Tuần)**: Hiển thị trạng thái `Chờ đánh giá` (badge `Chờ`), đồng thời hiển thị điểm số mốc gần nhất `T10: 96.33%`.
  - **KPI 2 (Điểm TB Tháng)**: Tiêu đề động `ĐIỂM TB THÁNG 10/2026`, badge cam nổi bật `Gần nhất` và nhãn phụ `Dữ liệu lịch sử`. Điểm số trung bình toàn nhà máy: `96.33%`.
  - **KPI 3 (Khu vực Đạt chuẩn)**: Tự động tính toán số khu vực đạt chuẩn ($\ge 95\%$) và dưới chuẩn của tháng gần nhất (11/15 khu vực đạt) kèm nhãn `T10 (Gần nhất)`.
  - **Ma trận 16 Khu vực (16-Area Matrix Wall)**: Tự động lấy điểm tháng gần nhất của từng khu vực để tô màu phân loại đạt chuẩn (xanh) / dưới chuẩn (đỏ) và hiển thị nhãn nguồn `Lịch sử`, loại bỏ hoàn toàn tình trạng để trống hoặc chữ "Chưa chấm".
  - **Bảng Xếp hạng (Leaderboard Top & Bottom)**: Xếp hạng top các khu vực dẫn đầu và khu vực cần cải thiện theo tháng gần nhất `XẾP HẠNG THÁNG 10/2026`.
  - **Biểu đồ Xu hướng 12 Tuần (Trend 12 Weeks)**: Các tuần chưa có audit tuần được tự động kết nối với điểm trung bình tháng lịch sử với cờ `source: 'historical'`, hỗ trợ `connectNulls` giúp đường xu hướng mượt mà, tooltip hiển thị rõ `96.33% (Lịch sử T10)`.

### Changed & Improved (Tối ưu hóa Hệ thống)
- **Nâng cấp Tốc độ & Độ ổn định của Bộ đóng gói EXE (`scripts/build_exe.mjs`)**:
  - Chuyển sang sử dụng `bsdtar` chuẩn của Windows để tạo gói nhúng mã nguồn trong 0.5 giây.
  - Khắc phục triệt để lỗi xung đột khóa file (`IOException: File is being used by another process`) của PowerShell cũ.
- **Bổ sung Khóa i18n Song ngữ**:
  - Thêm các khóa `latest_month_badge`, `historical_data_badge`, `waiting_audit_badge`, `display_month_short` đồng bộ trong `src/i18n/vi.ts` và `src/i18n/en.ts`.

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
