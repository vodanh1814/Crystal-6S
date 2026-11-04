# Changelog

Mọi thay đổi quan trọng của hệ thống **Crystal 5S Audit** đều được ghi nhận tại tài liệu này theo chuẩn [Semantic Versioning](https://semver.org/).

**Ngôn ngữ: [🇻🇳 Tiếng Việt](./CHANGELOG.md) · [🇬🇧 English](./CHANGELOG.en.md)**  
**Tác giả: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))

---

## [2.5.8] - 2026-11-04

### Added & Improved (Chuẩn hóa Hiển thị Điểm số Có 1 Chữ số Thập phân & Tối ưu Giao diện Đa Ngôn ngữ)
- **Chuẩn hóa Hiển thị Điểm số Có 1 Chữ số Thập phân Toàn Hệ thống (`formatScore`)**:
  - Tích hợp bộ tiện ích định dạng điểm số tập trung `src/lib/format.ts` (`formatScore`, `formatDelta`).
  - Mọi vị trí hiển thị điểm số (TV Dashboard, bảng xếp hạng Top 2 / Bottom 2, thẻ 16 khu vực xưởng, tỷ lệ khắc phục đúng hạn/lặp lại, tooltip biểu đồ xu hướng Recharts, ScoreBadge, bảng điểm từng khu vực trong phiếu đánh giá, ô ma trận tuần/tháng trong Báo cáo) đều hiển thị nhất quán 1 chữ số thập phân (`95,3%`, `95,0%`, `100,0%`).
  - Tự động bản địa hóa dấu phân cách thập phân: Tiếng Việt hiển thị dấu phẩy `,` (ví dụ: `95,3%`), Tiếng Anh hiển thị dấu chấm `.` (ví dụ: `95.3%`).
  - Xử lý giá trị biên an toàn tuyệt đối: `null`, `undefined`, `NaN` fallback thành `"-"`, ngăn ngừa hoàn toàn crash giao diện.
- **Chuẩn hóa Hiển thị Biến động Điểm số Theo Tuần (`formatDelta`)**:
  - Hiển thị phần trăm tăng giảm điểm số kèm ký hiệu mũi tên trực quan: `▲ +1,5%` / `▼ -2,3%` (VI) hoặc `▲ +1.5%` / `▼ -2.3%` (EN).
- **Bộ Kiểm thử Tự động Chuyên biệt (`worker/lib/format.test.ts`)**:
  - Bổ sung test suite kiểm thử toàn diện mọi trường hợp biên: số nguyên, số thập phân, quy tắc làm tròn số học, giá trị 0, giá trị 100, định dạng đa ngôn ngữ.

---

## [2.5.7] - 2026-11-02

### Added & Improved (Tự động truyền Cloudflare Token vào GitHub Actions, Hướng dẫn Trực quan & Chuẩn hóa 100% Tiếng Anh)
- **Tự động hóa 100% Cloudflare Auto-Deploy từ Web Settings (Không cần tạo Secret trên GitHub)**:
  - Khi Admin nhập Cloudflare API Token và Account ID tại trang Cài đặt (`/admin/targets`), hệ thống mã hóa bảo mật chuẩn AES-GCM-256 vào Database D1.
  - Khi bấm *"Auto-Update Now"*, backend Cloudflare Worker tự động truyền trực tiếp Token & Account ID sang GitHub Actions qua dispatch inputs (`cf_token`, `cf_account_id`).
  - GitHub Actions Workflow (`deploy.yml`) tự động che dấu bảo mật (`::add-mask::`) chống lộ token trong log, chạy kiểm thử, migrate D1 và deploy trực tiếp về Cloudflare mà không yêu cầu người dùng phải tự cấu hình GitHub Repository Secrets.
- **Tích hợp Hướng dẫn Lấy Token Trực quan 1-Chạm (Interactive Guides)**:
  - Bổ sung nút bung hướng dẫn 4 bước tạo GitHub PAT kèm link trực tiếp (quyền `workflow` & `repo`).
  - Bổ sung nút bung hướng dẫn 4 bước lấy Cloudflare Account ID và tạo API Token với template *Edit Cloudflare Workers*.
  - Bổ sung trường tùy chỉnh GitHub Repository (`owner/repo`) cho phép các nhà máy độc lập liên kết kho mã nguồn riêng.
- **Chuẩn hóa Toàn diện Song ngữ Tiếng Anh (100% English Localization)**:
  - Rà soát và loại bỏ triệt để mọi chuỗi tiếng Việt hardcoded trên toàn bộ hệ thống (`AdminTargets`, `AdminUsers`, `Reports`, `Lightbox`, `AboutModal`, `Dashboard`, `AuditDetail`, `FindingsList`, `Profile`).
  - Tự động đính kèm header `Accept-Language: en` trong `api/client.ts` để Worker backend phản hồi toàn bộ thông báo lỗi và log deployment bằng tiếng Anh chuẩn mực khi người dùng chọn English.

---

## [2.5.6] - 2026-11-02

### Added & Improved (Hỗ trợ Kiến trúc Đa Nhà máy, Tự động Đính kèm File Cài đặt & Tối ưu Luồng Update)
- **Hỗ trợ Triển khai Đa Nhà máy (Multi-Factory Setup)**:
  - Thêm tài liệu hướng dẫn triển khai chuẩn hóa cho các nhà máy bên ngoài theo 2 phương án: Triển khai Mạng LAN nội bộ (Local EXE / Windows Service) và Triển khai Độc lập trên Cloudflare của doanh nghiệp.
  - Hỗ trợ biến cấu hình `github_repo` linh hoạt: Cho phép các nhà máy đã fork repo có thể kích hoạt CI/CD trên repo riêng của họ thay vì chỉ trỏ về upstream.
- **Tối ưu hóa Giao diện & Trải nghiệm Cập nhật Hệ thống (Update UI/UX)**:
  - Phân tách rõ ràng giao diện cập nhật giữa **Môi trường Local / Mạng LAN** (nút cập nhật 1-click không cần token) và **Nền tảng Cloudflare Workers** (hướng dẫn cụ thể 2 cách: lệnh `wrangler deploy` hoặc kích hoạt GitHub Actions).
  - Tự động hiển thị huy hiệu môi trường nhận diện: `Local / Mạng LAN` hoặc `Cloudflare Edge`.
  - Thay thế hoàn toàn lỗi đỏ khó hiểu khi thiếu token trên Cloudflare bằng bảng hướng dẫn 2 lựa chọn thông minh ngay trên banner cập nhật.
- **Tự động Phát hành Bộ cài đặt Windows EXE (`.github/workflows/release.yml`)**:
  - Tích hợp GitHub Actions tự động tạo GitHub Release và đính kèm sẵn file `Crystal_5S_Setup.exe` mỗi khi có tag phát hành mới `v*`.
  - Cho phép người dùng và các nhà máy tải trực tiếp file EXE về chạy ngay mà không cần cài đặt môi trường lập trình.
- **Tối ưu hóa CI/CD Deploy Workflow (`.github/workflows/deploy.yml`)**:
  - Bổ sung bước tiền kiểm tra bí mật (`Verify Cloudflare Secrets`) với thông báo lỗi tường minh nếu thiếu `CLOUDFLARE_API_TOKEN` hoặc `CLOUDFLARE_ACCOUNT_ID`.
  - Bổ sung cờ xác nhận tự động `--yes` cho lệnh áp dụng migrations D1 (`wrangler d1 migrations apply ... --yes`) chống treo trong môi trường phi tương tác.

---

## [2.5.5] - 2026-11-02

### Added & Improved (Lọc Đánh giá Theo Tháng, Khóa Bản quyền Tác giả Simon & Tài liệu Tiếng Anh)
- **Lọc & Xem Kết quả Đánh giá Theo Tháng trên TV Dashboard**:
  - Tích hợp thanh công cụ chọn tháng trực quan trên đầu màn hình Dashboard (`?month=YYYY-MM`).
  - Hỗ trợ quét và chọn tất cả các tháng đã có số liệu thực tế hoặc lịch sử Excel (`historical_monthly_scores`).
  - Tự động đồng bộ và tính toán lại toàn bộ: Điểm trung bình tháng, Xếp hạng Top/Bottom, Ma trận 16 khu vực, Phân bổ vi phạm nhóm S1–S5 và đường xu hướng 12 tuần kết nối mượt mà tới tháng được chọn.
  - Tích hợp nút bấm *"Quay về hiện tại"* 1-click cùng thông báo trạng thái rõ ràng.
- **Khóa Bản quyền Tác giả Simon & Modal About App**:
  - Tạo cửa sổ **About App Modal** hiển thị thông tin hệ thống, tác giả **Simon** và nút liên hệ trực tiếp trên GitHub ([https://github.com/vodanh1814](https://github.com/vodanh1814)).
  - Bổ sung khối **Bản quyền tác giả được bảo vệ** cố định (Read-Only Card) trong mục Quản trị (`/admin/targets`), ngăn ngừa việc can thiệp hoặc xóa bản quyền tác giả Simon khi doanh nghiệp tùy chỉnh Logo và Tên công ty.
  - Hiển thị dòng bản quyền tinh tế tại trang Đăng nhập và chân thanh bên Sidebar (`© 2026 Simon. All rights reserved.`).
- **Bổ sung Toàn diện Tài liệu Tiếng Anh (English Docs)**:
  - Xuất bản tài liệu hướng dẫn tiếng Anh chuẩn mực ([`README.en.md`](./README.en.md)) và nhật ký phiên bản tiếng Anh ([`CHANGELOG.en.md`](./CHANGELOG.en.md)).
  - Bổ sung liên kết chuyển đổi song ngữ ở đầu tất cả các file tài liệu.

---

## [2.5.4] - 2026-11-02

### Added & Improved (Tối ưu hóa Git Auto-Update & Bảo vệ Dữ liệu Riêng tư)
- **Hỗ trợ Toàn diện Cập nhật Tự động cho cả Kho GitHub Public & Private**:
  - Tự động nhận diện và nạp dữ liệu cập nhật không cần Token khi repo ở chế độ **Public** (qua raw GitHub fallback), chống nghẽn giới hạn API rate limit.
  - Tích hợp giao diện quản trị **Cấu hình GitHub Personal Access Token (PAT)** trong trang Quản trị: Hỗ trợ lưu token an toàn được mã hóa chuẩn **AES-GCM-256** vào cơ sở dữ liệu (`app_settings`), hỗ trợ gỡ bỏ token khi chuyển sang chế độ Public.
  - Bổ sung thông báo trạng thái vàng (`notice`) và cảnh báo lỗi đỏ (`error`) trực quan giúp Quản trị viên nắm bắt tức thời tình trạng kết nối tới GitHub repository.
- **Cơ chế Tự Sửa lỗi Git (Auto-Git-Repair) cho Bản Cài đặt Windows EXE**:
  - Tự động phát hiện trường hợp thư mục giải nén từ bộ cài đặt `.exe` chưa có thư mục `.git`, tự động khởi tạo `git init -b main` và gán remote repository chính thức.
  - Tự động loại trừ các file binary và phát sinh sau build (`Crystal_5S_Setup.exe`, `package-lock.json`) khỏi bộ kiểm tra `dirty check`, loại bỏ triệt để lỗi chặn cập nhật do thay đổi cục bộ.
  - Tích hợp cơ chế fallback an toàn: nếu lệnh fast-forward gặp phân nhánh, hệ thống tự động hoàn nguyên về bản phát hành chính thức (`git reset --hard origin/main`).
  - Nâng cấp lệnh di chuyển cấu trúc D1 migration an toàn, bọc try/catch chống sập tiến trình cập nhật.
- **Bảo mật & Loại bỏ Thông tin Cá nhân / Hạ tầng Nội bộ trên Git**:
  - Gỡ bỏ vĩnh viễn file theo dõi URL hạ tầng `CLOUDFLARE_LIVE_URL.txt` khỏi Git và đưa vào `.gitignore`.
  - Khử bỏ toàn bộ các đường dẫn tuyệt đối của máy dev trong tài liệu hướng dẫn và mã nguồn.
  - Đồng nhất tên cơ sở dữ liệu `cetvn-5s-db` xuyên suốt `package.json`, `wrangler.jsonc`, `vite.config.ts` và backend.

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
  - Giúp URL xuất bản trên Cloudflare trở nên ngắn gọn, dễ nhớ: `https://5s-audit.<subdomain>.workers.dev` (ví dụ: `https://5s-audit.<subdomain>.workers.dev`), loại bỏ sự trùng lặp tên công ty khi subdomain Cloudflare đã chứa tên nhà máy.
  - Vẫn giữ nguyên cơ chế định danh độc lập cho Database D1 (`${slug}-5s-db`) và Kho ảnh R2 (`${slug}-5s-photos`) trong `scripts/auto_setup.mjs`.
  - Đồng bộ fallback và preview URL trong `worker/routes/settings.ts` và `src/pages/AdminTargets.tsx`.
- **Thiết lập Quy trình Phát triển & Triển khai 6 Bước Tiêu chuẩn**:
  - Ban hành tài liệu quy tắc [GEMINI.md](./GEMINI.md) chuẩn hóa toàn bộ quy trình làm việc giữa Người dùng và Agent (Lên Plan ➔ Duyệt Plan ➔ Agent Triển khai ➔ Agent Review 0 lỗi ➔ Duyệt Git ➔ Agent Push & Release).

---

## [2.4.2] - 2026-11-01

### Fixed (Sửa lỗi & Tối ưu hóa Trải nghiệm Thiết lập Cloudflare)
- **Khắc phục lỗi trang tạo Subdomain Cloudflare không vào được (do Cloudflare khai tử route `/workers/onboarding`)**:
  - Chuyển hoàn toàn cơ chế tự động trích xuất và mở trang thiết lập Subdomain từ đường dẫn cũ sang trang chính thức của giao diện Cloudflare mới: `https://dash.cloudflare.com/<accountId>/workers-and-pages` (kèm đường dẫn cấu hình trực tiếp `https://dash.cloudflare.com/<accountId>/workers/subdomain` và universal link `https://dash.cloudflare.com/?to=/:account/workers-and-pages`).
  - Hiển thị hướng dẫn trực quan 4 bước chi tiết: Định vị chính xác mục **"Your subdomain"** ở cột bên phải giao diện Cloudflare Dashboard để người dùng bấm **"Set up"** (hoặc **"Change"**) và đặt tên subdomain mong muốn (ví dụ: `mycompany`).
  - Tăng thời gian chờ tự động trong môi trường GUI độc lập (`!process.stdin.isTTY`) lên 20 giây giúp người dùng thao tác lưu trên trình duyệt dễ dàng trước khi bộ cài tiếp tục tiến trình xuất bản.
  - Tái đóng gói toàn bộ mã nguồn vào ứng dụng độc lập [Crystal_5S_Setup.exe](./Crystal_5S_Setup.exe).

---
