# Changelog

Mọi thay đổi quan trọng của hệ thống **Crystal 5S Audit** đều được ghi nhận tại tài liệu này theo chuẩn [Semantic Versioning](https://semver.org/).

---

## [2.3.0] - 2026-11-01

### Added (Tính năng mới)
- **Dashboard & Báo cáo Hiệu quả Khắc phục (`Remediation Effectiveness`)**:
  - Bổ sung theo dõi 3 chỉ số cốt lõi trên cả màn hình **TV Andon Dashboard (`/`)** lẫn tab báo cáo chuyên sâu **"Hiệu quả khắc phục"** tại trang **Báo cáo (`/reports`)**:
    1. **Tỷ lệ đóng lỗi đúng hạn (`On-Time Closure Rate %`)**.
    2. **Thời gian khắc phục trung bình (`Avg Remediation Time / MTTR` — ngày)**.
    3. **Tỷ lệ lỗi tái diễn (`Recurrence / Repeat Rate %`)** và **Tỷ lệ hoàn tất xử lý (`Resolution Rate %`)**.
  - Bổ sung bảng phân tích chi tiết Hiệu quả khắc phục theo từng khu vực (`Area Code`) và hỗ trợ xuất file Excel (`Crystal_5S_Remediation_*.xlsx`).
- **Hỗ trợ Auto-Update cho môi trường Cloudflare (`POST /api/settings/cloud-update-apply` & GitHub Actions)**:
  - Bổ sung workflow CI/CD `.github/workflows/deploy.yml` và API kích hoạt triển khai tự động trên Cloudflare cho Admin.

### Changed & Fixed (An toàn Cập nhật, Đồng bộ DB & Bảo mật)
- **Đồng bộ 100% cấu trúc Database trong Setup (`worker/routes/auth.ts` & `scripts/auto_setup.mjs`)**:
  - Thay thế các truy vấn cũ (`audit_areas`, `area_targets`, `areas.target_score`) bằng đúng bảng chuẩn trong schema (`audit_area_scores`, `findings`, `yearly_targets`), đảm bảo cấu hình KPI và khởi tạo Admin ban đầu luôn thành công 100%.
- **Quy trình Auto-Update 5 bước an toàn (`vite.config.ts`)**:
  - Loại bỏ `git reset --hard`; bổ sung **Preflight Check** bảo vệ tuyệt đối các thay đổi mã nguồn cục bộ chưa commit (`409 Conflict`).
  - Tự động **Backup** cấu hình và toàn bộ Database SQLite D1 cục bộ (`.wrangler/state/v3/d1`) vào `.backups/` trước khi nâng cấp.
  - **Xác minh nghiêm ngặt bảng `d1_migrations`** và kiểm tra kiểu dữ liệu (`tsc -b`); tự động **Rollback** về commit cũ và khôi phục Database D1 nếu bất kỳ bước nào thất bại.
- **Tăng cường Bảo mật & Phân tách dữ liệu nội bộ**:
  - Ẩn hoàn toàn `stack` và `cause` trong phản hồi lỗi máy chủ (`worker/index.ts`).
  - Bổ sung giới hạn thử đăng nhập (**Brute-force Rate Limiting**: khóa tạm thời 15 phút sau 5 lần nhập sai mật khẩu liên tiếp) với migration `0007_security_and_rate_limit.sql`.
  - Mã hóa **AES-GCM-256** (`worker/lib/crypto.ts`) đối với `github_token` lưu trong `app_settings`.
  - Yêu cầu xác thực đăng nhập đối với API tải ảnh thực tế tại xưởng (`GET /api/photos/:id`) và ẩn mô tả lỗi nội bộ / tên cá nhân khi xem Dashboard ở chế độ TV công khai chưa đăng nhập.

---

## [2.2.2] - 2026-11-01

### Changed (Cải thiện hiển thị tên tháng)
- **Đổi ký hiệu tháng `M1..M12` / `T1..T12` sang tên tháng chuẩn quốc tế (`Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec`)**:
  - Cập nhật tiêu đề cột bảng Báo cáo theo tháng (`/reports`), cửa sổ Nhập điểm lịch sử từ Excel, file xuất Excel báo cáo năm (`Crystal_5S_Monthly_*.xlsx`), thẻ điểm trung bình tháng trên bảng điều hành TV Andon (`/`) và nhãn tháng trên danh sách / chi tiết kỳ Audit (`Oct 2026`, `Nov 2026`,...).

---

## [2.2.1] - 2026-10-31

### Changed (Thay đổi nghiệp vụ phân quyền)
- **Tách biệt phạm vi hoạt động của `Auditor` (Toàn nhà máy) và `Area MNG` (Theo từng khu vực)**:
  - **`Auditor` (Đánh giá viên 5S)**: Không thuộc riêng bất kỳ khu vực nào; có quyền đi chấm điểm 5S tuần và kiểm tra / xác nhận đóng lỗi (`Verify & Close / Reject`) cho **toàn bộ tất cả các khu vực trong nhà máy** mà không cần gán từng khu vực.
  - **`Area MNG` (`manager` — Quản lý khu vực)**: Chỉ được gán phụ trách khu vực cụ thể của mình và **chỉ có quyền tải ảnh `After` / gửi báo cáo khắc phục cho đúng khu vực đó**.

---

## [2.2.0] - 2026-10-31

### Added (Tính năng mới)
- **Hiển thị Phiên bản Hệ thống (`v2.2.0`) trên toàn bộ giao diện**:
  - Gắn nhãn phiên bản `v2.2.0` trực quan tại Thanh bên (Sidebar), Thanh tiêu đề trên cùng (Top Header Bar), trang Đăng nhập (`/login`), trang Khởi tạo (`/setup`), trang Quản trị (`/admin/targets`) và bộ cài `Crystal_5S_Setup.exe` để dễ dàng nhận diện phiên bản đang chạy tại từng khu vực / nhà máy.
- **Tự động Kiểm tra & Cập nhật Phiên bản mới từ Git (Git Auto-Update — Chỉ dành cho Admin)**:
  - Chỉ tài khoản Quản trị viên (`Admin`) mới có quyền kiểm tra và thực thi cập nhật tự động (các vai trò `Auditor`, `Area MNG`, `Viewer` bị chặn hoàn toàn ở cả giao diện lẫn tầng API `403 Forbidden`).
  - Tự động kiểm tra ngầm phiên bản mới trên GitHub (`vodanh1814/Crystal-6S`) và hiển thị nút cảnh báo nổi bật **`⬆ Có bản mới vX.Y.Z`** trên thanh Header cho Admin.
  - Trang **Quản trị → Chỉ tiêu & Thương hiệu (`/admin/targets`)** bổ sung bảng **Phiên bản & Cập nhật Hệ thống (Git Auto-Update)** cho phép Admin bấm 1 nút để tự động kéo mã nguồn mới từ Git (`git fetch` & `reset`), cập nhật thư viện (`npm install`), nâng cấp Database D1 an toàn (giữ nguyên 100% dữ liệu) và tự động tải lại ứng dụng.

---

## [2.1.0] - 2026-10-31

### Added (Tính năng mới)
- **Bộ cài đặt độc lập `Crystal_5S_Setup.exe` (WPF Vector UI v2.1)**:
  - Chuyển sang nền tảng đồ họa **WPF Vector (`PresentationFramework`)** chống vỡ hình / nhòe chữ 100% trên mọi màn hình độ phân giải cao (High-DPI 125%, 150%, 2K, 4K).
  - Bổ sung chuyển đổi **Song ngữ tức thì (`🇻🇳 Tiếng Việt ⇄ 🇬🇧 English`)** và **Chế độ Sáng / Tối (`☀ Light / 🌙 Dark Theme`)** ngay trên thanh tiêu đề của bộ cài `.exe`, trang `/setup` và `/login`.
  - Gom **100% cấu hình vào 1 màn hình duy nhất**: Thương hiệu Công ty, Chọn ảnh Logo + Ô xem trước (Live Preview), Tạo sẵn Tài khoản Admin đầu tiên, Thư mục cài đặt, Mã định danh Cloud (`Slug`), Cổng LAN (`Port`), Chỉ tiêu KPI 5S mặc định (`%`), Tùy chọn nạp 16 khu vực mẫu và Khung nhật ký trực tiếp (Embedded Live Console Log).
- **Biểu tượng ứng dụng đa độ phân giải (`assets/crystal_5s.ico` & `public/favicon.svg`)**:
  - Thiết kế bộ icon lục giác **Crystal 5S** chuẩn đa kích thước (`16px`, `32px`, `48px`, `64px`, `128px`, `256px` PNG-compressed) nhúng trực tiếp vào file `.exe`, thanh tiêu đề cửa sổ và trình duyệt web.

### Fixed (Sửa lỗi & Cải thiện UI)
- Đồng bộ độ tương phản cao trên toàn bộ ứng dụng web (`Layout.tsx`, `Modal.tsx`, `Login.tsx`, `Setup.tsx`): tách biệt nền tối Andon (`bg-slate-950`) cho màn hình TV Dashboard (`/`) và nền sáng sắc nét (`bg-slate-50 text-slate-900`) cho các trang nghiệp vụ & hộp thoại Modal.
- Thêm cơ chế tự động fallback (`onError`) cho toàn bộ hình ảnh Logo công ty, tự động hiển thị huy hiệu `5S` chuẩn nếu đường dẫn ảnh bị lỗi.

---

## [2.0.0] - 2026-10-31

### Added (Tính năng mới)
- **Màn hình TV Smart Factory Andon (`/`) công khai**:
  - Truy cập thẳng màn hình Dashboard TV mà không cần đăng nhập; bố cục vừa khít 100% màn hình TV (không cuộn dọc/ngang), 3 chế độ thanh bên (`Thu gọn`, `Ẩn thanh bên`, `Hiện thanh bên`) và chế độ **Full TV**.
- **Mô hình Kỳ Audit 5S Toàn Nhà Máy Theo Tuần**:
  - Mỗi tuần ISO có **1 kỳ Audit chung cho toàn bộ nhà máy** bao gồm tất cả khu vực đang hoạt động (16 khu vực).
  - Tự động tính phạt lũy tiến trong cùng tháng (`repeat_level = 1 + số tuần trước trong tháng đã vi phạm cùng tiêu chí tại khu vực đó`), tự động reset về mức 1 khi sang tháng mới.
  - Bảng nhập nhanh số lần vi phạm cho 3 tiêu chí đánh giá ngoài (`S5.2-BOD`, `S5.2-CUS`, `S5.3`) không cần đính kèm ảnh.
- **Tách biệt hoàn toàn 4 Vai trò (`Admin`, `Auditor`, `Area MNG`, `Viewer`)**:
  - Đảm bảo 1 tài khoản chỉ giữ 1 vai trò độc lập (`Auditor` và `Area MNG` không kiêm nhiệm chung trên cùng 1 tài khoản).
- **Thư viện ảnh 2K sắc nét trên Cloudflare R2 & Lightbox toàn màn hình**:
  - Nâng độ phân giải ảnh tải lên R2 lên chuẩn **2K (`2048px`, JPEG quality `0.85`)** kèm bộ nhớ đệm `Cache-Control: public, max-age=31536000, immutable`.
  - Bổ sung thanh lọc nhanh theo từng khu vực tại `/findings`, chế độ xem **Thư viện ảnh (Photo Gallery)** đối chiếu `TRƯỚC (BEFORE)` / `SAU (AFTER)` và trình xem ảnh phóng to **Lightbox**.
- **Nhập dữ liệu điểm lịch sử theo tháng (`T1..T12`)**:
  - Cho phép Admin nhập hoặc copy-paste trực tiếp bảng điểm các tháng từ Excel vào mục **Báo cáo (`/reports`) → 📥 Nhập điểm lịch sử**.
- **Nhận diện thương hiệu đa công ty (`company_name` & `company_logo`)**:
  - Cho phép cấu hình Tên Công ty và Logo Công ty cho từng nhà máy độc lập.

---

## [1.0.0] - 2026-10-30

### Added
- Khởi tạo kiến trúc nền tảng **Crystal 5S Audit** trên Cloudflare Workers (Hono REST API + React 19 SPA + Tailwind CSS v4 + Cloudflare D1 + Cloudflare R2).
- Bộ 24 tiêu chí kiểm tra 5S song ngữ Việt – Anh (`S1.1` đến `S5.3`) và 16 khu vực sản xuất mẫu (`KNI`, `GQC`, `WH`, `BAT`, `DYE`, `L-DIP`, `UNT`, `SET`, `VAP`, `FQC`, `L-TES`, `MTN`, `UTI`, `TSC`, `ADM`, `FM/CFD`).
