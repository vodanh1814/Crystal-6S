# Changelog

Mọi thay đổi quan trọng của hệ thống **Crystal 5S Audit** đều được ghi nhận tại tài liệu này theo chuẩn [Semantic Versioning](https://semver.org/).

**Ngôn ngữ: [🇻🇳 Tiếng Việt](./CHANGELOG.md) · [🇬🇧 English](./CHANGELOG.en.md)**  
**Tác giả: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))

---

## [2.11.10] - 2026-11-11

### Fixed & Improved (Áp Dụng Kiến Trúc UI/UX Pro Max - Tự Động Co Giãn Container & Chống Chồng Đè 100% Trên Trình Duyệt Web)
- **Tự Động Co Giãn Container Theo Dòng Chảy Tự Nhiên (Natural Fluid Density Architecture)**:
  - Khắc phục triệt để lỗi ép cứng chiều cao `h-full` và `auto-rows-fr` trên màn hình trình duyệt laptop/desktop khi có thanh tiêu đề, tab, bookmarks và thanh tác vụ Windows.
  - Chuyển đổi toàn bộ thẻ khu vực và biểu đồ phân tích sang chiều cao co giãn tự nhiên (`h-auto min-h-[102px]` cho thẻ khu vực, `min-h-[220px]` cho cụm biểu đồ), cho phép trình duyệt tự động kích hoạt thanh cuộn mượt mà (`overflow-y-auto`) khi viewport không đủ diện tích, chấm dứt 100% hiện tượng các thẻ bị co rút và đè chữ lên nhau.
- **Tái Thiết Kế Thẻ Khu Vực Chuẩn UI/UX Pro Max 3 Tầng Bento**:
  - **Tầng 1 (Header)**: Tên khu vực nổi bật bên trái (`font-black text-sm text-white truncate max-w-[65%]`) và Thẻ trạng thái dạng Pill bo tròn đầy đủ bên phải (`PASS`, `WARN`, `FAIL`, `W46 PEND` hoặc `🚨 Overdue`) có đường kẻ phân cách tinh tế (`pb-1.5 border-b border-slate-800/60`).
  - **Tầng 2 (Telemetry Body)**: Chia đôi 2 cột cân xứng:
    - *Bên trái*: Điểm Tuần hiện tại (`W46: PEND` hoặc `87.0%`) và Điểm Trung Bình Tháng (`Nov: 87.0%`) hiển thị kiểu monospace in đậm nổi bật.
    - *Bên phải*: Khối Pill chỉ số xu hướng chất lượng cao (`bg-slate-950/80 border border-slate-700/60 rounded-lg px-2 py-1 shadow-xs`) gồm Mũi tên to rõ kèm độ biến động (`▲ +2.5` / `▼ -1.0` / `➔ 0`) và Mini Sparkline SVG kích thước `58x22` px.
  - **Tầng 3 (Action Footer)**: Đường viền phân cách `border-t border-slate-800/80 pt-1.5 text-xs text-slate-400 font-mono`: Số lượng lỗi mở (`Open: {n}`) bên trái, Tình trạng xác nhận hoặc lỗi lặp lại (`Verify: {n}` / `Repeat`) bên phải.
- **Cải Tiến Hàng 3 Phân Tích (Bottom Analytics Strip)**:
  - Nâng chiều cao biểu đồ xu hướng 12 tuần (`min-h-[160px]`) và vùng chứa (`min-h-[220px]`) giúp đường xu hướng, vạch tham chiếu 95% / 90% và chú giải dữ liệu hiển thị rõ ràng, không bị nén.
  - Cải tiến lưới hiển thị co giãn linh hoạt: 1 cột trên Mobile (`col-span-12`), 2 cột trên Tablet (`md:col-span-6`), 3 cột trên Desktop (`lg:col-span-5 / 4 / 3`).

---

## [2.11.9] - 2026-11-11

### Added & Improved (Mũi Tên & Trend To Rõ Ràng, Chuẩn Hóa Duy Nhất Theme Andon & Tự Điều Chỉnh Container Đa Thiết Bị)
- **Cải Tiến Mũi Tên & Biểu Đồ Mini Sparkline To Rõ Ràng (High-Visibility Trend Telemetry)**:
  - Nâng cấp kích thước SVG [`AreaSparkline.tsx`](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaSparkline.tsx) lên `56x20` px, độ dày nét vẽ `strokeWidth="1.8"`, chấm điểm cuối `r="2.8"` to rõ.
  - Thuật toán Dynamic Auto-Scale tự động co giãn theo biên độ điểm thực tế của từng khu vực (`scoreRange = Math.max(maxScore - minScore, 4)`), giúp mọi biến động tăng/giảm từ 1-3 điểm tạo nên đường lượn sóng rõ rệt (8-12px) thay vì bị bẹp phẳng.
  - Cụm mũi tên và độ lệch (`▲ +2.5` / `▼ -1.0` / `➔ 0`) hiển thị đậm nét (`text-xs sm:text-sm font-black font-mono`), màu sắc tương phản cao, dễ dàng nhận biết từ khoảng cách xa trên màn hình TV.
- **Loại Bỏ Các Theme Khác - Chuẩn Hóa Duy Nhất Theme Andon Mặc Định**:
  - Gỡ bỏ hoàn toàn logic chuyển đổi của các layout phụ (`bento`, `hud`, `zone`) khỏi [`Dashboard.tsx`](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/Dashboard.tsx).
  - Cố định duy nhất 1 giao diện chuẩn: **Standard Factory Dark Andon Board** (nền tối chuyên dụng nhà xưởng, chống mỏi mắt, tương phản cao, số to).
  - Tinh giản mục Layout Studio trong trang Cài đặt [`AdminTargets.tsx`](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/AdminTargets.tsx), hiển thị thẻ trạng thái chuẩn hóa duy nhất kèm liên kết trực tiếp xem TV.
- **Container Tự Điều Chỉnh Linh Hoạt Trên Mọi Dạng Thiết Bị (Fluid Responsive Density)**:
  - **Trên TV / Desktop lớn (`lg:` trở lên)**: Tự động dàn trải vừa vặn 100% màn hình không cần thanh cuộn (`lg:h-full lg:auto-rows-fr`, 4 cột x 4 hàng).
  - **Trên Điện thoại & Tablet (`< lg`)**: Chuyển đổi linh hoạt sang chiều cao tự nhiên (`h-auto`), thanh cuộn mượt mà (`overflow-y-auto`). Chiều cao thẻ thoải mái (`h-auto min-h-[82px] p-2 sm:p-2.5`), xóa bỏ hoàn toàn tình trạng chữ đè lên nhau trên điện thoại.

---

## [2.11.8] - 2026-11-11

### Added & Improved (Layout 3 Tầng Tự Co Giãn Theo Mật Độ & Kế Thừa Điểm Lịch Sử Cho Mini Sparkline)
- **Tái Cấu Trúc Thẻ Khu Vực Thành Layout 3 Tầng Nén Thông Minh (Fluid Adaptive 3-Tier Layout)**:
  - **Tầng 1 (Header)**: Tên khu vực (trái) + Mini Sparkline 6 tuần kèm icon xu hướng `↗`/`↘`/`➔` (phải). Đưa sparkline lên đầu giúp triệt tiêu hoàn toàn hàng dọc dư thừa.
  - **Tầng 2 (Dual Telemetry Baseline)**: Cặp số liệu Tuần & Tháng nằm ngang trên cùng một dòng baseline (`W46: PEND` | `Nov: 87.0% ▲+2.5`), loại bỏ hoàn toàn việc chia dòng trên/dưới gây chiếm diện tích.
  - **Tầng 3 (Status & Action Footer)**: Huy hiệu trạng thái tuần (`W46 Pend` / `Pass` / `Warn` / `Fail`) đặt ở góc trái; bộ đếm hành động (`Open: 0` · `Verify: 0`) đặt ở góc phải. Kẹp giữa là thanh progress bar siêu mỏng 2px.
- **Tự Động Co Giãn Container Theo Mật Độ Hiển Thị (Display Density Auto-Fit)**:
  - Áp dụng `min-h-0`, `overflow-hidden`, padding co giãn `p-1.5 sm:p-2`, gap `gap-1 sm:gap-1.5` trên cả **Classic Matrix View** ([Dashboard.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/Dashboard.tsx)) và **Zone Focus View** ([DashboardZoneFocus.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/DashboardZoneFocus.tsx)).
  - Triệt tiêu 100% tình trạng tràn chữ, chồng chéo nhãn trên tất cả các độ phân giải (Full TV 1080p, 2K, Laptop, Mobile).
- **Kế Thừa Dữ Liệu Điểm Lịch Sử Tháng (`historical_monthly_scores`) Cho Chuỗi Xu Hướng Khu Vực**:
  - Khi một tuần chưa có dữ liệu chấm tuần (`audit_area_scores`), hệ thống tự động kế thừa điểm số lịch sử tháng của chính khu vực đó (`historicalByYearMonth`).
  - Mini Sparkline 6 tuần hiển thị trọn vẹn đường cong phong độ liên tục kèm tooltip từng tuần thay vì chỉ hiển thị một điểm chấm cô lập.
  - Modal chi tiết khu vực ([AreaTrendModal.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaTrendModal.tsx)) hiển thị đầy đủ quỹ đạo 12 tuần Recharts.

---

## [2.11.7] - 2026-11-11

### Fixed (Khắc Phục Lỗi Truy Vấn SQL Xu Hướng 12 Tuần Khiến API Bị 500)
- **Chuẩn Hóa Quan Hệ Truy Vấn Điểm Số Nhà Máy & Khu Vực**:
  - Tách bạch truy vấn điểm số toàn nhà máy từ bảng `audits` (`iso_year, iso_week, score`) và điểm số từng khu vực qua `JOIN audit_area_scores aas ON aas.audit_id = a.id`.
  - Khắc phục triệt để lỗi SQLite runtime `no such column: area_id` do truy vấn trực tiếp cột `area_id` từ bảng `audits`.
  - Khôi phục hoạt động bình thường 100% của API [`GET /api/reports/dashboard`](https://5s-audit.cetvn.workers.dev/api/reports/dashboard) và toàn bộ giao diện Smart Factory Andon TV.

---

## [2.11.6] - 2026-11-11

### Added & Improved (Tích Hợp Mini Sparkline Xu Hướng 6 Tuần & Modal Phân Tích Phong Độ 5S Chi Tiết)
- **Phân Tách Rõ Ràng Số Liệu Tuần & Tháng Trên Từng Thẻ Khu Vực**:
  - Hàng giữa thẻ được phân tách thành **2 cột số liệu có nhãn vĩnh viễn**:
    - **Cột Trái (Tuần)**: Hiển thị nhãn `W{w}` kèm điểm số tuần đã chấm hoặc nhãn `Chờ` nếu đang chờ chấm.
    - **Cột Phải (Tháng)**: Hiển thị nhãn `Tháng {m}` (ví dụ `Nov`) kèm điểm TB Tháng và delta biến động MoM (`▲+2.5đ`).
  - Huy hiệu góc trên: Khi tuần chưa chấm, hiển thị rõ ràng `Chờ W{w}` thay vì gây nhầm lẫn là tuần đã chấm.
- **Biểu Đồ Sóng Mini Sparkline 6 Tuần Trực Quan ([AreaSparkline.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaSparkline.tsx))**:
  - Vẽ đường cong phong độ 6 tuần gần nhất của riêng khu vực bằng SVG thuần siêu nhẹ.
  - Tự động đổi màu theo phân hạng chuẩn: Xanh (`≥95%`), Vàng (`≥90%`), Đỏ (`<90%`).
  - Tích hợp icon xu hướng động: `↗` (Tiến bộ), `↘` (Suy giảm), `➔` (Ổn định).
  - Hover chuột hiển thị tooltip chi tiết điểm số từng tuần: `W41: 90% · W42: 92% · ...`
- **Modal Phân Tích Xu Hướng & Phong Độ 5S Chuyên Sâu ([AreaTrendModal.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/AreaTrendModal.tsx))**:
  - Khi click vào bất kỳ thẻ khu vực nào: Mở ngay cửa sổ popup phân tích chuyên sâu mà **không bị chuyển trang hay mất ngữ cảnh Andon TV**:
    - Header: Tên khu vực, mã KV, Manager quản lý và Auditor phụ trách.
    - 4 Khối Telemetry: Điểm Tuần, Điểm Tháng (MoM), Biến động tuần qua tuần (WoW), Số lỗi mở/quá hạn.
    - Biểu đồ đường 12 tuần Recharts phóng to kèm 2 đường chuẩn Target 95% và Cảnh báo 90%.
    - Phân tích chi tiết lỗi vi phạm và điểm phạt của 5 Trụ cột 5S (S1 - S5) của riêng khu vực.
    - Nút liên kết trực tiếp sang danh mục lỗi của khu vực.
- **Tối Ưu Hóa Backend & Đa Ngôn Ngữ**:
  - Query 12 tuần được tích hợp chung cho cả toàn nhà máy và từng khu vực, **không phát sinh thêm truy vấn database nào**.
  - Bổ sung 18 khóa dịch đa ngôn ngữ đối xứng 100% cho Tiếng Việt và Tiếng Anh.

---

## [2.11.5] - 2026-11-10

### Added & Improved (Tự Động Hiển Thị Tuần Gần Nhất Khi Tuần Hiện Tại Chưa Có Đánh Giá Mới)
- **Cơ Chế Fallback Thông Minh Cho Khối Thẻ Điểm TB Tuần (KPI 1)**:
  - Khi tuần hiện tại chưa có đợt đánh giá mới (`kpi.weekly_avg === null`), hệ thống tự động kế thừa và hiển thị điểm số cùng tên tuần đã hoàn thành gần nhất (`kpi.latest_completed_avg`, `kpi.latest_completed_week`).
  - Tiêu đề card tự động cập nhật tuần tương ứng: **`ĐIỂM TB TUẦN {W_gần_nhất}`** (thay vì cố định tuần hiện tại khi chưa có số liệu).
  - Huy hiệu trạng thái chuyển sang **`[Tuần gần nhất]`** kèm tooltip thông báo tuần đang chờ chấm.
  - Điểm số tuần được hiển thị to rõ với phân loại màu tiêu chuẩn 3 mức: Xanh (`≥95%`), Vàng (`≥90%`), Đỏ (`<90%`).
  - Delta biến động tuần được giữ nguyên kèm chú thích rõ ràng: **`▲ +0.3% (W{hiện_tại} chờ chấm)`**.
- **Đồng Bộ Hoàn Toàn Trên Tất Cả Chế Độ Dashboard**:
  - Cập nhật đồng bộ trên giao diện chính **Classic Matrix View** ([Dashboard.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/pages/Dashboard.tsx)) và **Zone Focus View** ([DashboardZoneFocus.tsx](file:///c:/Users/cevtsduong/Documents/CETVN%205S%20Audit/src/components/dashboard/DashboardZoneFocus.tsx)).
  - Bổ sung các khóa đa ngôn ngữ: `latest_week_badge`, `pending_audit_week`, `vs_prev_week` trong `vi.ts` và `en.ts`.

---

## [2.11.4] - 2026-11-10

### Fixed & Improved (Chuẩn Hóa Nhãn Nút Tab "Improvement" & Loại Bỏ Thuật Ngữ "Kaizen" Trùng Lặp)
- **Chuẩn Hóa Nhãn Nút Tab Trong Khối 5S Continuous Improvement**:
  - Thay thế nhãn cứng `Kaizen` trên nút chuyển tab bằng khóa đa ngôn ngữ `{t('tab_improvement_btn')}`.
  - Giao diện Tiếng Anh hiển thị chuẩn mực: **`[Improvement]  [Top]`**, đồng bộ 100% với tên khối thẻ `5S CONTINUOUS IMPROVEMENT`.
  - Giao diện Tiếng Việt hiển thị: **`[Cải thiện]  [Top]`**.
- **Đồng Bộ Hóa Ngữ Nghĩa Toàn Bộ Khối Thẻ**:
  - Cập nhật thanh Micro-Strip: `▼ {n} Needs Improvement` (EN) / `▼ {n} Cần cải thiện` (VI).
  - Cập nhật tiêu đề phân mục khu vực chưa cải thiện: `⚠️ STAGNANT / NEEDS IMPROVEMENT` (EN) / `⚠️ Khu vực Chưa cải thiện` (VI).
  - Loại bỏ hoàn toàn sự không nhất quán giữa các thuật ngữ tiếng Anh và tiếng Việt trong toàn bộ ứng dụng.

---

## [2.11.3] - 2026-11-10

### Added & Improved (Trung Tâm Thông Báo Dropdown Xổ Xuống & Thẻ Cảnh Báo Accordion)
- **Tích Hợp Notification Center Dropdown Tại Nút Chuông Header (`NotificationDropdown.tsx`)**:
  - Chuyển đổi nút Chuông cảnh báo trên thanh điều hướng từ thẻ link thô sang một **Trung tâm Thông báo Dropdown (Popover)** nổi sang trọng.
  - Hỗ trợ đóng mở linh hoạt: Click bật/tắt, tự động đóng khi click ra ngoài (`mousedown`) hoặc khi nhấn phím `Escape`.
  - Cung cấp **3 Tab Lọc Nhanh Thông Báo**:
    - **Tất cả (`All`)**: Tổng hợp toàn bộ các cảnh báo đang hoạt động trong hệ thống.
    - **Cần khắc phục (`Needs Fix`)**: Lọc riêng các lỗi mở quá hạn hoặc sắp đến hạn mà Area Manager cần xử lý.
    - **Chờ duyệt (`Awaiting Verify`)**: Lọc riêng các lỗi đã cập nhật khắc phục đang chờ Auditor nghiệm thu.
  - Hiển thị đầy đủ Telemetry: Badge trạng thái (Quá hạn X ngày, Hôm nay, Còn X ngày, Chờ verify), mã khu vực, mã tiêu chí vi phạm, điểm phạt (-1đ), trích dẫn nội dung vi phạm và hạn xử lý.
  - Bấm vào bất kỳ thông báo nào sẽ đóng menu và mở thẳng trang chi tiết lỗi để thao tác; chân menu có liên kết nhanh đến danh sách lỗi quá hạn và toàn bộ danh mục lỗi.
  - Tự động thích ứng màu sắc và hiệu ứng kính mờ (`backdrop-blur-md`) trên cả Dark Mode và Light Mode.
- **Thẻ Cảnh Báo Trên Dashboard Dạng Xổ Xuống (Accordion Drawer)**:
  - Khối `7-DAY ALARMS & REPEATED FINDINGS` trên Dashboard cho phép bấm vào từng thẻ cảnh báo để **xổ xuống (Accordion Drawer)** đọc toàn bộ nội dung tiêu chí 5S, ghi chú hiện trường thực tế (`description`), khu vực và ngày hết hạn mà không cần rời màn hình.
  - Nút hành động trực tiếp ("Cập nhật khắc phục →" / "Xác nhận đóng lỗi →") kèm ngăn chặn xung đột sự kiện (`stopPropagation`), đảm bảo chuyển trang mượt mà.
- **Chuẩn Hóa Quốc Tế Hóa (i18n)**:
  - Bổ sung 100% các khóa dịch i18n mới cho Tiếng Việt và Tiếng Anh (`notifications`, `tab_all_notifications`, `tab_fix_needed`, `tab_verify_needed`, `view_all_findings`, `view_overdue_only`, `alarm_details_expand`, `alarm_details_collapse`, `refresh_notifications`), 0 hardcoded text.

---

## [2.11.2] - 2026-11-10

### Fixed & Improved (Tối Ưu Hóa & Lấp Đầy Khoảng Trống Thừa 2 Khối 5S Breakdown & Kaizen Continuous Improvement)
- **Cải Tiến Triệt Để Ô "FINDINGS & PENALTIES BY 5S"**:
  - Chuyển đổi 5 hàng vi phạm đơn dòng trước đây sang cấu trúc **2-Tier Stacked Telemetry Row** hiện đại:
    - Hàng trên: Nhãn nhóm S kèm dot tròn màu nhận diện (`S1 · Sort - Sàng lọc`, `S2 · Set in order - Sắp xếp`,...), bên phải hiển thị số lỗi và điểm phạt (-Xđ/-Xpts) với màu cảnh báo rõ ràng.
    - Hàng dưới: Thanh tiến độ dày dặn (`h-2.5 sm:h-3 rounded-full`) với animation chuyển động 500ms mượt mà.
  - Tích hợp **Thanh Tóm Tắt Telemetry Dưới Đáy (Footer Strip)**: Hiển thị Tổng điểm phạt trong tháng (`Tổng phạt: -Xđ`) và Nhóm có số lỗi vi phạm cao nhất (`Lỗi nhiều nhất: S...`), phân bổ đều đặn và triệt tiêu 100% khoảng trống thừa trong chế độ Full TV.
- **Tối Ưu Hóa Ô "5S CONTINUOUS IMPROVEMENT / LEADERBOARD"**:
  - **Tab Kaizen**:
    - Bổ sung **Kaizen Status Micro-Strip**: Thanh thống kê nhanh 3 chỉ số Kaizen toàn xưởng (`▲ X Tiến bộ` | `▬ Y Ổn định` | `▼ Z Cần Kaizen`).
    - Mở rộng hiển thị từ 2 lên tới **Top 3 Khu vực tiến bộ tốt nhất** (`🚀`) và **Top 3 Khu vực chưa cải thiện / cần Kaizen** (`⚠️`), kèm điểm trung bình tháng và delta so sánh tháng trước.
  - **Tab Leaderboard (Top)**:
    - Mở rộng hiển thị từ 2 lên tới **Top 3 Dẫn đầu** (`🏆 1.`, `🥈 2.`, `🥉 3.`) và **Top 3 Cần Cải thiện** (`⚠️`).
    - Tinh chỉnh padding thẻ (`px-2.5 py-1.5 sm:py-2`), cân bằng tỷ lệ hoàn hảo với biểu đồ 12 tuần bên cạnh.
- **Chuẩn Hóa Ngôn Ngữ & Đơn Vị**:
  - Bổ sung các khóa i18n mới: `total_penalty_month`, `top_violation_group`, `kaizen_stat_improved`, `kaizen_stat_stable`, `kaizen_stat_declined`, `top_leaders_title`, `bottom_lagging_title`.
  - Đảm bảo 100% không còn văn bản hardcoded, quy chuẩn `đ` (Tiếng Việt) và `pts` (Tiếng Anh).

---

## [2.11.1] - 2026-11-10

### Fixed & Improved (Tự Động Co Giãn Fluid Lấp Đầy Màn Hình Khi Bật Full TV Mode)
- **Khắc Phục Hoàn Toàn Khoảng Trống Đen Thừa Ở Chân Trang Trong Chế Độ Full TV**:
  - Khi xem trên TV hoặc màn hình lớn (1080p, 1440p, 4K), các khối nội dung Dashboard trước đây bị cố định chiều cao tối thiểu khiến gần 40% diện tích màn hình phía dưới bị bỏ trống.
  - Áp dụng cơ chế **Flexbox Fluid Auto-Fit** thông minh: Hàng 2 (Ma trận 16 khu vực & Báo động 7 ngày) tự động nhận `flex-[1.25] min-h-[290px]`, Hàng 3 (Biểu đồ xu hướng 12 tuần & Phân tích 5S/Kaizen) tự động nhận `flex-1 min-h-[180px]`. Toàn bộ không gian màn hình được phân bổ đều, triệt tiêu 100% dải đen thừa ở đáy trang.
  - Vùng chứa biểu đồ Recharts chuyển sang `flex-1 min-h-[140px]`, tự động phóng lớn chiều cao và tăng độ chi tiết trực quan cho đường xu hướng 12 tuần.
  - Tất cả các thẻ khu vực (Area cards) và thẻ cảnh báo (Alarm cards) đều nhận `h-full flex flex-col justify-between`, các nội dung bên trong được dàn đều hoàn hảo theo chiều dọc.
- **Đồng Bộ Hoàn Chỉnh Trên Cả 4 Mẫu Layout**:
  - **Mẫu 1 (Classic Andon Matrix)**: Co giãn cân xứng giữa ma trận 16 ô và tháp cảnh báo 7 ngày.
  - **Mẫu 2 (Workshop Zone Focus)**: Hai phân khu Sản xuất chính (`flex-[1.4]`) và Phụ trợ dịch vụ (`flex-1`) tự động giãn nở lấp đầy chiều cao.
  - **Mẫu 3 (Bento Telemetry 2.0)**: Lưới Bento 16 ô và các thẻ tiến độ Kaizen tự động dàn đều.
  - **Mẫu 4 (Industrial SCADA HUD)**: Bảng điều khiển vi sai 3 cánh và khu vực Telemetry Spline lấp đầy toàn bộ màn hình.
- **Bảo Toàn Trải Nghiệm Laptop 14" (Chế Độ Cửa Sổ)**:
  - Nhờ duy trì các ngưỡng chặn `min-h-[...]` và lớp cuộn dọc tự nhiên (`overflow-y: auto`), giao diện trên laptop nhỏ không bao giờ bị vỡ hay chồng đè chữ, cuộn mượt mà khi cửa sổ trình duyệt bị thu nhỏ.

---

## [2.11.0] - 2026-11-09

### Added & Improved (UI/UX Pro Max 4 Mẫu Dashboard & Chuẩn Hóa Quản Trị Trung Tâm)
- **Tích Hợp 2 Mẫu Dashboard Thiết Kế Mới Tuyệt Đẹp (4 Mẫu Hoàn Chỉnh)**:
  - **Mẫu 3: Bento Telemetry 2.0 (`bento` - Bento Grid Đa Chiều)**:
    - Bố cục Bento Grid bất đối xứng 4x4 hiện đại với góc bo tròn mềm mại (`rounded-2xl`).
    - Tích hợp biểu đồ Radar 5S Telemetry hình sao SVG tự vẽ, hiển thị sức khỏe cân bằng cả 5 trụ cột S1-S5 toàn nhà máy.
    - Thanh đo tiến độ vi mô kèm điểm Kaizen MoM Spotlight (Top Improvers vs Stagnant Areas) và biểu đồ xu hướng 12 tuần spline.
  - **Mẫu 4: Industrial SCADA HUD (`hud` - Tactical Factory Cyberpunk)**:
    - Giao diện phòng điều khiển trung tâm tương phản cao với viền huỳnh quang Cyan / Amber phong cách SCADA công nghiệp.
    - Phân tách 2 cánh chiến thuật: Cánh trái gồm 10 xưởng Sản xuất chính, Cánh phải gồm 6 bộ phận Phụ trợ & Tiện ích.
    - Trung tâm là bảng điều khiển cảnh báo 7 ngày trực tiếp kèm chỉ số thực hiện khắc phục lỗi đúng hạn (On-Time Rate).
- **Chuyển Toàn Bộ Quyền Chọn Layout Vào Cài Đặt Admin (Admin Layout Studio)**:
  - **Xóa Nút Chọn Layout Ngoài Dashboard Tổng**: Gỡ bỏ hoàn toàn thanh nút bấm chuyển đổi layout công khai ở header `Dashboard.tsx`, trả lại giao diện tối giản, tập trung và sạch sẽ cho màn hình TV nhà xưởng.
  - **Admin Layout Studio (`AdminTargets.tsx`)**: Là nơi duy nhất cho phép quản trị viên xem trước 4 mẫu layout qua các thẻ minh họa CSS trực quan và lưu cấu hình mặc định toàn nhà máy (`app_settings.dashboard_layout`).
  - **Đồng Bộ Tự Động**: Khách và người dùng khi mở Dashboard sẽ luôn nhận diện và tải đúng layout do Admin chỉ định từ backend API (`/api/reports/dashboard`).
- **Chuẩn Hóa 100% Đơn Vị Điểm Số & Điểm Trừ Toàn Hệ Thống**:
  - Khắc phục triệt để hiện tượng không đồng nhất (nơi hiển thị tắt `pts`, nơi lại dùng `đ`).
  - **Tiếng Việt (`vi`)**: Chuẩn hóa 100% sử dụng đơn vị `đ` viết liền cho tất cả điểm số, điểm trừ lỗi và biến động MoM (`-1đ`, `(-7đ)`, `▲ +5.5đ`, `▼ -1.0đ`, `+1đ/tuần`).
  - **Tiếng Anh (`en`)**: Chuẩn hóa 100% sử dụng đơn vị `pts` (`-1 pt`, `(-7 pts)`, `▲ +5.5 pts`, `▼ -1.0 pts`, `+1 pt/week`).

---

## [2.10.2] - 2026-11-09

### Added & Improved (Tra Cứu Lỗi Từng Khu Vực Cho Khách Mà Không Cần Đăng Nhập)
- **Cho Phép Khách (Guest) Tra Cứu Lỗi Khu Vực Từ Dashboard Không Cần Sign In**:
  - **Mẫu 1 & Mẫu 2 Dashboard (`Dashboard.tsx` & `DashboardZoneFocus.tsx`)**:
    - Gỡ bỏ hoàn toàn điều kiện bắt buộc đăng nhập `is_authenticated ? ... : '/login'`. Khách nhấn vào bất kỳ ô nào trong 16 khu vực (hoặc cụm Production & Support) sẽ được chuyển thẳng đến danh sách lỗi của khu vực đó: `/findings?area_id=X`.
    - Thẻ trong bảng cảnh báo 7 ngày liên kết trực tiếp tới chi tiết lỗi: `/findings/:id`.
  - **Mở Quyền Đọc Công Khai (Public Read) An Toàn Cho Backend (`areas.ts` & `photos.ts`)**:
    - `GET /api/areas` & `GET /api/areas/:id/na`: Cho phép truy cập công khai để trang Findings tải danh mục khu vực và các thanh lọc nhanh (quick area pills). Các thao tác chỉnh sửa (`POST`, `PUT`) tiếp tục được bảo vệ nghiêm ngặt bằng `authMiddleware` và quyền Admin.
    - `GET /api/photos/:id`: Mở quyền đọc công khai để khách xem được ảnh chứng cứ 5S trước/sau (Before / After) và phóng to qua Lightbox. Route xóa ảnh (`DELETE /api/photos/:id`) duy trì bảo vệ bằng `authMiddleware` và phân quyền.
  - **Trải Nghiệm Thân Thiện Trên Trang Lỗi 5S (`FindingsList.tsx` & `FindingDetail.tsx`)**:
    - Thêm nút bấm nổi bật `← Quay lại Dashboard` ở đầu trang danh sách lỗi, giúp người dùng quay về Dashboard tức thì với 1 click.
    - Hiển thị huy hiệu `Chế độ xem công khai (Không cần đăng nhập)` khi người dùng là khách (`!user`).
    - Nút quay lại tại trang chi tiết lỗi trỏ chính xác về danh sách khu vực đã chọn (`/findings?area_id=X`).

---

## [2.10.1] - 2026-11-09

### Fixed & Improved (Auto-Scale Kích Thước Chữ, Ô & Khắc Phục Tràn Viền Trên Bản Web)
- **Cơ Chế Cuộn Tự Nhiên & Bỏ Khóa Cuộn Tĩnh Trên Bản Web (`src/index.css`)**:
  - Gỡ bỏ hoàn toàn media query cưỡng bức `@media (min-height: 860px) and (min-width: 1280px) { overflow-y: hidden; }` từng cấm cuộn trên màn hình laptop 1080p mở cửa sổ trình duyệt thường (có tab, thanh bookmark và taskbar).
  - Lớp `.theme-tv-canvas` mặc định luôn có `overflow-y: auto`, chỉ khóa cứng không cuộn khi người dùng kích hoạt Full TV Mode (`:fullscreen`, `:-webkit-full-screen`, `.full-tv-mode`).
- **Auto-Scale Toàn Diện & Triệt Tiêu Hiện Tượng Đè Chữ (`Dashboard.tsx`)**:
  - Gỡ bỏ `lg:overflow-visible` và các tỉ lệ flex cứng (`lg:flex-[58]`, `lg:flex-[42]`), chuyển sang cấu trúc auto-scale linh hoạt `overflow-y: auto overflow-x-hidden`.
  - **Hàng 1 (6 KPI Strip):** Giảm chiều cao từ `72px` xuống `min-h-[56px] sm:min-h-[62px]`, font số `text-lg sm:text-xl font-mono`, padding `p-1.5 sm:px-2.5 sm:py-1.5`.
  - **Hàng 2 (Ma trận 16 Ô & Bảng Báo Động 7 Ngày):**
    - 16 ô khu vực: Chiều cao tối ưu `min-h-[56px] sm:min-h-[62px] lg:min-h-[66px]`, padding `px-2 py-1 sm:px-2.5 sm:py-1.5`, tên khu vực `truncate max-w-[68%] text-[11px] sm:text-xs`, điểm số `text-sm sm:text-base lg:text-lg`. Tổng chiều cao ma trận giảm từ 420px xuống còn ~300px.
    - Bảng báo động 7 ngày: 3 thẻ cảnh báo hạ chiều cao đồng bộ `min-h-[46px] sm:min-h-[50px]`, tiêu đề thu gọn 1 dòng. Chiều cao bằng khít với ma trận 16 ô bên cạnh, triệt tiêu 100% hiện tượng thẻ cảnh báo đè lên Hàng 3.
  - **Hàng 3 (Biểu Đồ Xu Hướng & Kaizen Tracker):**
    - Biểu đồ xu hướng hạ chiều cao `h-36 sm:h-40 lg:h-44 min-h-[140px]`. Cột 5S và thẻ Kaizen/Xếp hạng padding gọn gàng `py-0.5 px-1.5`.
  - **Tổng chiều cao toàn Dashboard:** Giảm từ ~820px xuống mức lý tưởng ~620px - 650px, vừa vặn 100% trong 1 màn hình laptop 14", và cuộn trơn tru không bao giờ bị đè chữ.
- **Đồng Bộ Mẫu 2 (`DashboardZoneFocus.tsx`)**:
  - Đồng bộ kích thước Hero circular gauge `w-20 h-20 sm:w-22 sm:h-22` và các ô khu vực co giãn tự động.

---

## [2.10.0] - 2026-11-09

### Added (Theo Dõi Tiến Bộ & Cải Thiện Liên Tục 5S MoM)
- **Hệ Thống Phân Tích Cải Thiện Liên Tục MoM (Month-over-Month Continuous Improvement)**:
  - **Backend (`worker/routes/reports.ts`)**:
    - Truy vấn dữ liệu điểm trung bình tháng và audit của cả năm hiện tại, năm hiệu lực và năm liền trước (`effectiveYear - 1`), đảm bảo tính toán chênh lệch MoM chính xác ngay cả trong tháng 1 (so sánh với tháng 12 năm trước).
    - Tính toán $\Delta$ điểm tháng (`delta_prev_month` = điểm tháng này trừ điểm tháng trước, làm tròn 1 chữ số thập phân) cho tất cả 16 khu vực xưởng.
    - Phân loại trạng thái xu hướng Kaizen tự động: `improved` (tiến bộ), `declined` (suy giảm), `stagnant` (dậm chân / chưa cải thiện), `stable` (ổn định).
    - Trả về cấu trúc `improvement_analysis` tổng hợp danh sách **Top Improvers** (Top khu vực bứt phá cải thiện điểm số mạnh nhất) và **Stagnant Areas** (Khu vực có điểm dưới mục tiêu hoặc suy giảm cần Kaizen khẩn cấp).
  - **Frontend (`Dashboard.tsx` & `DashboardZoneFocus.tsx`)**:
    - Hiển thị badge MoM delta trực quan trên từng ô khu vực: `▲ +X.Xđ` (xanh ngọc khi tiến bộ), `▼ X.Xđ` (đỏ khi sụt giảm), `▬ 0đ` (xám khi duy trì).
    - Tích hợp công tắc chuyển đổi góc nhìn **Kaizen / Xếp hạng** tại thẻ phân tích Hàng 3 (Mẫu 1) và Command Column (Mẫu 2), cho phép Ban Giám đốc và Trưởng bộ phận theo dõi sát sao tiến độ cải tiến liên tục thay vì chỉ xem bảng xếp hạng tĩnh.

### Changed & Refactored (Tái Cấu Trúc Bố Cục Dashboard Mẫu 2 - Phân Nhóm 2 Khối)
- **Tái Cấu Trúc Dashboard Mẫu 2 (`DashboardZoneFocus.tsx`)**:
  - Gộp 4 cụm phân tán thành đúng **2 Khối Nhà Xưởng chuẩn hóa**:
    - 🏭 **Khối Sản Xuất** (*Production Division* - 10 khu vực): Dệt (Knitting), Nhuộm (Dyeing), Định lượng (Batching), Căng (Setting), Hấp (VAP), Kiểm Greige, Kiểm Final, Lab Dip, Lab Test, UNT.
    - 🛠️ **Khối Phụ Trợ & Dịch Vụ** (*Support Division* - 6 khu vực): Kho bãi (Warehouse), Cơ điện (MTN), Năng lượng (Utility), Kỹ thuật (TSC), Hành chính (ADM), FM/CFD.
  - Mỗi khối có Header thống kê chuyên biệt: Điểm số trung bình toàn khối, Biến động MoM của khối, Huy hiệu PASS/WARN/FAIL, và Tổng số lỗi mở / quá hạn.
  - Nâng cấp cột điều hành bên trái với thanh điều hướng 3 tab: **Cải thiện 5S MoM**, **Phân rã 5 Trụ cột (S1-S5)**, và **Top/Bottom Leaderboard**.

### Removed (Tinh Gọn Hệ Thống Bố Cục Dashboard)
- **Gỡ Bỏ Hoàn Toàn Dashboard Mẫu 3 Heatmap (`DashboardHeatmapAction.tsx`)**:
  - Loại bỏ hoàn toàn mã nguồn và kiểu dữ liệu `heatmap` khỏi hệ thống, đưa bộ sưu tập bố cục về 2 mẫu Andon tinh giản, tập trung và trực quan nhất: **Mẫu 1 (Ma trận Andon 3 Tầng)** và **Mẫu 2 (Phân nhóm SX & Phụ trợ)**.
  - Cập nhật trang Quản trị Mục tiêu (`/admin/targets`) với lưới 2 cột xem trước sơ đồ bố cục chuẩn.

### Fixed (Khắc Phục Lỗi Hiển Thị & Chống Cắt Chữ Trên Laptop 14")
- **Tối Ưu Không Gian & Khắc Phục Tràn Khung Trên Màn Hình Nhỏ**:
  - Thêm `overflow-y-auto` vào `theme-tv-canvas` trong `Layout.tsx`, đảm bảo giao diện có thể cuộn linh hoạt trên laptop 14" (độ phân giải 1366x768 hoặc scaling 125%/150%), loại bỏ hiện tượng nội dung bảng báo động 7 ngày bị ép tràn đè lên ranh giới Hàng 3.
  - Tối ưu hóa kích thước tối thiểu các thẻ báo động khẩn cấp (`min-h-[58px]`), kết hợp line clamping tiêu đề và chống tràn văn bản `truncate min-w-0`.

---

## [2.9.0] - 2026-11-09

### Added (Hệ Thống 3 Mẫu Bố Cục Trình Bày Dashboard & Nút Chuyển Đổi Nhanh)
- **Bộ Nút Chọn 3 Mẫu Dashboard Trực Tiếp Trên Thanh Công Cụ (`/`)**:
  - Tích hợp 3 nút chuyển đổi bố cục trực quan trên toolbar Dashboard:
    - **⊞ Mẫu 1: Ma trận Andon (Classic 3-Row Matrix)**: Bố cục kinh điển gồm 6 thẻ KPI strip, ma trận 16 ô khu vực 4x4, bảng báo động 7 ngày, biểu đồ xu hướng 12 tuần và phân tích nhóm 5S.
    - **☷ Mẫu 2: Phân cụm Phân xưởng (`DashboardZoneFocus.tsx`)**: Cột chỉ số điều hành Hero Gauge (điểm toàn xưởng lớn dạng vòng tròn LED, thanh S1-S5, xếp hạng Top/Bottom, widget báo động nóng) kết hợp 4 cụm xưởng sản xuất (*Dệt & Nhuộm, Hoàn tất & Cơ điện, Kiểm phẩm & Kho, Văn phòng & Phụ trợ*) có điểm số riêng và biểu đồ so sánh xu hướng.
    - **▦ Mẫu 3: Bản đồ nhiệt 5S & Tác nghiệp (`DashboardHeatmapAction.tsx`)**: Bản đồ nhiệt ma trận 16 khu vực $\times$ 5 trụ cột S1-S5 chỉ rõ điểm yếu từng xưởng bằng màu sắc trực quan (Xanh/Vàng/Đỏ), kết hợp trung tâm tác nghiệp 3 cột feed (*🚨 Quá hạn >7 ngày, ⚠️ Tái lặp tuần này, ✅ Chờ Auditor xác minh*).
  - Tự động lưu lựa chọn vào `localStorage` (`crystal_5s_dashboard_layout`) cho phép chuyển đổi tức thì không cần tải lại trang.
- **Dashboard Layout Studio trong Trang Quản trị (`/admin/targets`)**:
  - Cho phép Admin xem trước hình ảnh sơ đồ và thiết lập mẫu bố cục Dashboard mặc định cho toàn bộ màn hình TV Andon của nhà máy thông qua `PUT /api/settings` (`dashboard_layout`).
- **Truy vấn Ma trận Nhiệt 5S tại Backend (`GET /api/reports/dashboard`)**:
  - Truy vấn nhóm lỗi theo từng khu vực và từng trụ cột `ci.s_group` (`area_s_matrix`), mở rộng danh sách cảnh báo khẩn cấp lên 15 items.

### Removed (Dọn dẹp Theme Hệ thống Cũ)
- Loại bỏ hoàn toàn 2 theme toàn hệ thống cũ (`crystal-glass` và `crystal-hybrid`), trả hệ thống về giao diện chuẩn công nghiệp duy nhất **Classic Emerald Andon** (`classic`) với màn hình TV tối và giao diện quản trị sáng phẳng.

---

## [2.8.1] - 2026-11-09

### Fixed & Improved (Tối ưu Hiển thị Thích ứng Đa Màn hình & Khắc phục Rơi chữ trên Laptop 14")
- **Khắc phục Triệt để Hiện tượng Rơi chữ (Text Dropping) và Bẹp Layout trên Màn hình Laptop 14"**:
  - Gỡ bỏ các giới hạn chiều cao cưỡng bức (`lg:overflow-hidden`, `lg:min-h-0`) từng khiến các khối nội dung bị dồn ép chỉ còn dưới 46px trên laptop có độ phân giải 1366x768 hoặc tỉ lệ hiển thị Windows 125%/150%.
  - Bổ sung cấu hình `.theme-tv-canvas` trong `src/index.css`: Mặc định kích hoạt cuộn mượt mà (`overflow-y: auto`) trên các màn hình có chiều cao hạn chế (< 860px).
  - Tự động duy trì tiêu chuẩn khóa cứng 100vh không cuộn (`overflow-y: hidden`) trên Smart TV Wall / Màn hình lớn (`@media (min-height: 860px) and (min-width: 1280px)`) và khi ở chế độ Fullscreen (`:fullscreen`).
- **Tối ưu Bố cục Dashboard 3 Tầng (3-Row Layout Optimization)**:
  - **Dòng 1 (KPI Strip):** Tăng chiều cao tối thiểu (`min-h-[68px] sm:min-h-[72px]`), chuyển `flex-wrap` thành `flex-nowrap`, áp dụng `whitespace-nowrap` cho điểm số và `shrink-0` cho các chỉ số cảnh báo/chênh lệch; Khắc phục lỗi chữ `areas` hoặc `KV` bị rớt xuống dòng thứ 2 tại thẻ KPI số khu vực đạt chuẩn.
  - **Dòng 2 (Ma trận 16 Khu vực & Bảng Báo động 7 Ngày):** Thiết lập `min-h-[380px]` cho toàn dòng và `min-h-[80px] sm:min-h-[84px]` cho từng thẻ khu vực; Cắt ngắn an toàn tiêu đề khu vực (`max-w-[70%] truncate`); Đảm bảo đường viền ngăn cách không đè lên chữ số đếm lỗi (`Open / Verify`); Tối ưu khối cảnh báo 7 ngày với các thẻ mini rút gọn và mô tả lỗi không vỡ layout.
  - **Dòng 3 (Phân tích: Xu hướng 12 Tuần, Phân rã 5S & Bảng Xếp hạng):** Thiết lập `min-h-[220px]`; Điều chỉnh tỉ lệ cột biểu đồ phân rã 5S thành 4:4:4 kèm `whitespace-nowrap` để nhãn phạt `(-7pts)` hiển thị gọn gàng trên một hàng duy nhất; Bổ sung `truncate min-w-0` và `shrink-0` cho Bảng xếp hạng.
- **Tinh gọn Bản địa hóa Song ngữ (i18n)**:
  - Cập nhật từ khóa `'avg_remediation_time'` thành `'TB xử lý'` (VI) / `'Avg Time'` (EN).
  - Cập nhật `'area_count_slash'` thành `'/{n} KV'` (VI) / `'/{n}'` (EN).
  - Bổ sung truncation lũy tiến cho tiêu đề ứng dụng trên Header (`src/components/Layout.tsx`).

---

## [2.8.0] - 2026-11-09

### Added & Improved (Tính năng Chỉnh sửa Lỗi 5S Đã Nhập & Nút Edit Trong Phiếu Chấm)
- **Nút Chỉnh sửa (Edit) Lỗi 5S trong Chi tiết Phiếu Chấm (`/audits/:id`)**:
  - Bổ sung nút biểu tượng `Edit2` cạnh nút xóa `Trash2` tại danh sách lỗi ghi nhận (Section 2).
  - Cho phép Auditor/Admin chỉnh sửa lỗi khi đợt chấm đang ở bản nháp (`draft`) hoặc khi đã nộp (`submitted`) mà lỗi vẫn đang mở (`status === 'open'`). Chặn sửa lỗi khi đã khắc phục hoặc đã đóng.
- **Modal Chỉnh sửa Lỗi Toàn diện & Tự động Tính toán Điểm số**:
  - Hỗ trợ đổi lại **Khu vực** và **Tiêu chí 5S** (tự động loại trừ các tiêu chí Không áp dụng - NA của khu vực đã chọn).
  - Xem trước mức phạt leo thang theo thời gian thực (**Live Escalation Badge**) theo chuỗi lịch sử tuần trước trong tháng.
  - Tự động tính toán lại `repeat_level`, `base_penalty`, `applied_penalty`, `prev_finding_id` và kích hoạt `recalculateAuditScores` cập nhật lại điểm tuần của khu vực và xưởng.
- **Quản lý Hình ảnh Before Linh hoạt**:
  - Hiển thị danh sách ảnh Before hiện có kèm nút xóa từng ảnh (hộp thoại xác nhận).
  - Cho phép chụp hoặc tải thêm ảnh Before mới (tối đa 6 ảnh tổng cộng), tự động nén ảnh chất lượng cao trước khi tải lên.
  - Đồng bộ cập nhật backend `PUT /api/findings/:id`, `POST /api/findings/:id/photos` và `DELETE /api/photos/:id`.
- **Bản địa hóa Song ngữ (VI / EN)**:
  - Bổ sung đầy đủ các nhãn và thông báo cho tính năng chỉnh sửa lỗi trong `vi.ts` và `en.ts`.

---

## [2.7.0] - 2026-11-08

### Added & Changed (Theme Studio cho Admin & Tích hợp Giao diện Crystal Glass / Crystal Hybrid)
- **Khu vực Quản trị Giao diện (**Theme Studio**) cho Admin (`/admin/targets`)**:
  - Giữ nguyên **Classic Andon (`classic`)** làm giao diện mặc định toàn hệ thống qua D1 setting `ui_theme` (`migrations/0008_ui_theme_setting.sql`).
  - Cho phép Admin **Xem thử tức thì** và **Lưu & Áp dụng toàn hệ thống** giữa 3 giao diện: **Classic Andon (Mặc định)**, **Crystal Glass Enterprise (Mẫu 2)** và **Crystal Hybrid Adaptive (Mẫu 4)**.
  - Bổ sung API công khai `ui_theme` trong `GET /api/settings` và xác thực quyền Admin + ghi activity log `update_ui_theme` trong `PUT /api/settings` (HTTP 400 nếu sai theme).
- **2 Giao diện Hiện đại Mới với Chế độ Sáng / Tối Độc lập (`Light / Dark Mode`)**:
  - **Crystal Glass Enterprise (`crystal-glass`)**: Hiệu ứng kính mờ tinh thể (`backdrop-blur`), độ sâu nổi bật, ánh sáng xanh dương doanh nghiệp.
  - **Crystal Hybrid Adaptive (`crystal-hybrid`)**: Giao diện Bento tối ưu cả Smart TV Andon lẫn thao tác di động, nổi bật dải màu trạng thái cạnh trái và thanh điều hướng đáy màn hình trên thiết bị di động (`< 768px`).
  - Hỗ trợ chuyển đổi Sáng / Tối tức thì trên Header, trang Đăng nhập (`/login`) và Thiết lập (`/setup`), lưu cấu hình từng trình duyệt và đồng bộ đa tab không nháy sáng/tối trước khi hydrate (`index.html`).
- **Tối ưu Hóa Trải nghiệm Bảng Ma trận, Khả năng Tiếp cận & Đồng bộ Ngưỡng 3 Màu**:
  - Bổ sung `.sticky-matrix-table` cố định cột đầu nền đục khi cuộn ngang bảng Báo cáo (`/reports`) & Phiếu chấm (`/audits/:id`), hỗ trợ điều hướng cuộn bằng bàn phím (`tabIndex={0} role="region"`).
  - Đồng bộ ngưỡng mục tiêu năm (`target` & `warning_target`) vào API `GET /api/audits` và danh sách phiếu chấm (`/audits`).
  - Bảo toàn 100% quy tắc xếp loại 3 màu (Đỏ / Vàng / Xanh) và bản quyền tác giả **Simon** trên mọi giao diện.

---

## [2.6.0] - 2026-11-04

### Added & Improved (Hỗ trợ 3 Mức Xếp loại Màu Đỏ - Vàng - Xanh & Cho Phép Admin Cấu hình Ngưỡng Cảnh báo Theo Năm)
- **Hệ thống Xếp loại Điểm số 3 Tầng Màu Sắc Chuẩn Công nghiệp (Đỏ - Vàng - Xanh)**:
  - 🔴 **Đỏ (Không đạt)**: Điểm số dưới mức Cảnh báo (`score < warning_target`, mặc định `< 90,0%`).
  - 🟡 **Vàng (Cảnh báo)**: Điểm số nằm giữa mức Cảnh báo và Mục tiêu Đạt (`warning_target <= score < target`, mặc định `90,0% <= score < 95,0%`).
  - 🟢 **Xanh (Đạt chuẩn)**: Điểm số đạt hoặc vượt mục tiêu (`score >= target`, mặc định `>= 95,0%`).
- **Cho Phép Quản trị viên (Admin) Tùy Chỉnh Ngưỡng Điểm Cảnh báo (`warning_target`)**:
  - Nâng cấp bảng `yearly_targets` với cột `warning_target REAL NOT NULL DEFAULT 90`.
  - Giao diện Quản trị Mục tiêu Năm (`/admin/targets`) hiển thị bảng quy tắc 3 màu trực quan và Modal chỉnh sửa cho phép nhập cả 2 mức điểm (Đạt Xanh và Cảnh báo Vàng) kèm thanh xem trước màu sắc tức thì.
  - Kiểm tra hợp lệ chặt chẽ: $0 \le \text{warning\_target} \le \text{target} \le 100$.
- **Đồng bộ Giao diện Toàn Hệ thống theo Chuẩn 3 Màu**:
  - **TV Andon Dashboard**: 16 thẻ khu vực hiển thị viền và nhãn Amber khi rơi vào mức Cảnh báo; dải đếm trạng thái phân loại 3 màu (Xanh / Vàng / Đỏ); Biểu đồ xu hướng Recharts hiển thị đường chuẩn nét liền xanh lá và đường cảnh báo nét đứt màu vàng.
  - **Báo cáo Matrix Tuần & Tháng (`/reports`)**: Các ô điểm cảnh báo hiển thị nền màu Amber, cột trạng thái phân loại ĐẠT / CẢNH BÁO / K.ĐẠT.
  - **Chi tiết Phiếu Chấm (`/audits/:id`)**: Huy hiệu điểm toàn xưởng và bảng điểm 16 khu vực áp dụng chuẩn 3 màu.
  - **Bản địa hóa Song ngữ (VI / EN)**: Bổ sung đầy đủ nhãn và thông báo cảnh báo đa ngôn ngữ.

---

## [2.5.9] - 2026-11-04

### Added & Improved (Cập nhật 150 Điểm số Lịch sử Năm 2026 Chuẩn 1 Số Thập phân & File Seed Dữ liệu)
- **Đồng bộ 150 Điểm số Lịch sử Thực tế từ Bảng Ma trận Nhà máy Năm 2026**:
  - Cập nhật toàn bộ điểm số của 15 khu vực sản xuất qua 10 tháng (Tháng 1 đến Tháng 10 năm 2026) theo đúng số liệu thực tế có 1 chữ số thập phân (`89,5%`, `94,3%`, `81,5%`, `90,5%`, `98,5%`, v.v.).
  - Thay thế hoàn toàn dữ liệu điểm nguyên làm tròn cũ trên Cloudflare D1 Remote (`cetvn-5s-db`) và Local D1.
  - Tự động tính toán lại toàn diện điểm trung bình tháng toàn nhà máy, bảng xếp hạng Top 2 vinh danh và Bottom 2 nhắc nhở trên TV Dashboard.
- **Bổ sung File Seed & Script Tạo Dữ liệu SQL Chuẩn Hóa**:
  - `seed/update_historical_scores_2026.sql`: Lưu trữ 150 câu lệnh SQL nạp điểm lịch sử với cú pháp an toàn `ON CONFLICT DO UPDATE`.
  - `scripts/generate_historical_sql.mjs`: Script hỗ trợ nạp và tái tạo dữ liệu ma trận điểm số nhà máy.

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
