# Crystal 5S Audit — Hệ thống Đánh giá, Giám sát Andon & Cải tiến 5S Nhà Máy

**Ngôn ngữ: [🇻🇳 Tiếng Việt](./README.md) · [🇬🇧 English](./README.en.md)**  
**Phiên bản hiện tại: `v2.11.3`** · Xem lịch sử cập nhật chi tiết tại [CHANGELOG.md](./CHANGELOG.md) / [CHANGELOG.en.md](./CHANGELOG.en.md).  
**Tác giả: Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814))  
**Kho lưu trữ chính thức:** [https://github.com/vodanh1814/Crystal-6S](https://github.com/vodanh1814/Crystal-6S)

Ứng dụng web & bộ cài đặt độc lập toàn diện hỗ trợ kiểm tra, chấm điểm, theo dõi tiến độ khắc phục lỗi hình ảnh 2K và hiển thị bảng điện tử **Smart Factory Andon TV** cho hoạt động 5S (*Sort – Set in order – Shine – Standardize – Sustain*) tại nhà máy. Hệ thống hoạt động linh hoạt cả trên **Mạng nội bộ (Local LAN)** lẫn **Đám mây Cloudflare (Workers, D1 Database, R2 Object Storage)**.

---

## 1. Điểm nổi bật của phiên bản `v2.11.3`

### 🔔 Trung Tâm Thông Báo Dropdown Xổ Xuống & Thẻ Cảnh Báo Accordion
- **Notification Center Dropdown Tại Header**: Chuyển đổi nút Chuông cảnh báo trên thanh Menu thành menu xổ xuống (Popover), cho phép người dùng đọc nhanh tất cả thông báo/cảnh báo mà không bị gián đoạn hay phải chuyển trang. Tự động đóng khi click ra ngoài hoặc bấm phím `Esc`.
- **3 Tab Phân Loại Thông Báo Nhanh**:
  - `Tất cả`: Tổng hợp mọi cảnh báo.
  - `Cần khắc phục`: Lọc các lỗi quá hạn hoặc sắp hết hạn cho Quản lý khu vực (Area MNG).
  - `Chờ duyệt`: Lọc các lỗi đã hoàn thành khắc phục chờ Auditor nghiệm thu.
- **Accordion Xổ Xuống Trên Thẻ Cảnh Báo Dashboard**: Cho phép bấm vào từng thẻ cảnh báo trong khối `7-DAY ALARMS & REPEATED FINDINGS` để xổ xuống xem đầy đủ nội dung tiêu chí 5S, ghi chú hiện trường thực tế, khu vực và hạn khắc phục.
- **Chuẩn Hóa Quốc Tế Hóa (i18n)**: Bổ sung 100% các khóa dịch cho Tiếng Việt và Tiếng Anh, đảm bảo không có văn bản hardcoded.

---

## 2. Điểm nổi bật của phiên bản `v2.11.2`

### 📊 Tối Ưu Bố Cục & Triệt Tiêu Khoảng Trống Thừa 2 Khối 5S Breakdown & Kaizen
- **Cấu Trúc 2-Tier Stacked Telemetry Row Cho 5S Breakdown**: Thay thế hàng đơn dòng cũ bằng hàng 2 tầng trực quan: tầng trên hiển thị nhãn nhóm S kèm dot màu nhận diện và số lỗi + điểm phạt (-Xđ/-Xpts); tầng dưới là thanh đo tiến độ dày dặn (`h-2.5 sm:h-3 rounded-full`) với animation chuyển động 500ms mượt mà.
- **Thanh Tóm Tắt Telemetry Dưới Đáy (Footer Strip)**: Tích hợp thông tin tổng điểm phạt trong tháng (`Tổng phạt: -Xđ`) và nhóm vi phạm nhiều nhất (`Lỗi nhiều nhất: S...`), lấp đầy hoàn hảo chiều cao thẻ và xóa bỏ 100% khoảng trống thừa trong chế độ Full TV.
- **Micro-Strip & Mở Rộng Danh Sách Kaizen / Leaderboard**:
  - Tab Kaizen: Bổ sung thanh thống kê nhanh (`▲ X Tiến bộ` | `▬ Y Ổn định` | `▼ Z Cần Kaizen`) và hiển thị lên tới **Top 3 Khu vực tiến bộ** (`🚀`) cùng **Top 3 Khu vực cần Kaizen** (`⚠️`).
  - Tab Leaderboard: Mở rộng hiển thị lên tới **Top 3 Dẫn đầu** (`🏆 1.`, `🥈 2.`, `🥉 3.`) và **Top 3 Cần Cải thiện** (`⚠️`).
  - Tinh chỉnh padding thẻ (`px-2.5 py-1.5 sm:py-2`), cân xứng tuyệt đối với biểu đồ xu hướng 12 tuần bên cạnh.
- **Chuẩn Hóa Ngôn Ngữ & Đơn Vị**: Bổ sung đầy đủ khóa dịch i18n mới, chuẩn hóa `đ` (Tiếng Việt) và `pts` (Tiếng Anh), 0 hardcoded text.

---

## 2. Điểm nổi bật của phiên bản `v2.11.1`

### 📺 Tự Động Co Giãn Fluid Auto-Fit Khi Bật Chế Độ Full TV Mode
- **Khắc Phục 100% Khoảng Trống Đen Ở Chân Trang**: Ứng dụng cơ chế Flexbox tỉ lệ động (`flex-[1.25]` và `flex-1`), cho phép các khối ma trận 16 khu vực, bảng báo động 7 ngày và biểu đồ xu hướng tự động giãn nở lấp đầy toàn bộ chiều cao màn hình TV 1080p, 1440p hoặc 4K.
- **Biểu Đồ Xu Hướng & Thẻ Khu Vực To Rõ Ràng**: Vùng chứa biểu đồ chuyển sang `flex-1 min-h-[140px]`, các thẻ khu vực và cảnh báo nhận `h-full flex flex-col justify-between`, tối ưu góc nhìn từ xa trong xưởng sản xuất.
- **Áp Dụng Đồng Bộ Cho Cả 4 Mẫu Layout**: Cả 4 giao diện (Classic Matrix, Zone Focus, Bento Telemetry 2.0, Industrial SCADA HUD) đều tự động co giãn toàn màn hình mượt mà.
- **Bảo Toàn Hiển Thị Trên Laptop 14"**: Giữ nguyên giới hạn an toàn `min-h-[...]` và chế độ cuộn tự nhiên trên trình duyệt cửa sổ thu nhỏ.

---

## 2. Điểm nổi bật của phiên bản `v2.11.0`

### 🎨 Tích Hợp 4 Layout Dashboard Tuyệt Đẹp Chuẩn UI/UX Pro Max
- **Mẫu 1: Classic Andon Matrix (`matrix`)**: Ma trận 3 tầng tiêu chuẩn nhà máy, hiển thị 16 khu vực, cảnh báo 7 ngày và biểu đồ 12 tuần.
- **Mẫu 2: Workshop Zone Focus (`zone`)**: Phân nhóm 2 khối lớn Sản xuất chính (10 khu vực) & Phụ trợ dịch vụ (6 khu vực) kèm Hero gauge và thanh lệnh 3 tab.
- **Mẫu 3: Bento Telemetry 2.0 (`bento`)**: Bố cục Bento Grid 4x4 đa chiều kèm Radar 5S Telemetry hình sao SVG, theo dõi cân bằng 5 trụ cột và Kaizen MoM Spotlight.
- **Mẫu 4: Industrial SCADA HUD (`hud`)**: Phong cách phòng điều khiển vi sai công nghiệp tương phản cao (Cyan / Amber), tháp cảnh báo thời gian thực và 2 cánh chiến thuật.

### ⚙️ Chuyển Quyền Quản Lý Layout Độc Quyền Vào Admin Settings (Layout Studio)
- **Tập Trung Hóa Quản Trị**: Xóa bỏ các nút chọn layout công khai ngoài Dashboard tổng. Chỉ Admin có quyền xem trước 4 layout và thiết lập mẫu mặc định cho toàn bộ nhà máy tại `AdminTargets.tsx`.
- **Tự Động Đồng Bộ Toàn Nhà Máy**: Khách và người xem khi mở trang chủ Dashboard luôn tự động tải mẫu bố cục do Admin cấu hình.

### 📏 Chuẩn Hóa 100% Đơn Vị Điểm Số (`đ` và `pts`)
- Loại bỏ hoàn toàn lỗi hiển thị lệch đơn vị: Phiên bản tiếng Việt chuẩn hóa sử dụng đơn vị `đ` (`-1đ`, `(-7đ)`, `▲ +5.5đ`, `+1đ/tuần`); phiên bản tiếng Anh chuẩn hóa sử dụng `pts` (`-1 pt`, `(-7 pts)`, `▲ +5.5 pts`, `+1 pt/week`).

---

## 2. Điểm nổi bật của phiên bản `v2.10.2`

### 🔓 Tra Cứu Lỗi Khu Vực Dành Cho Khách Không Cần Đăng Nhập
- **Xem Lỗi Trực Tiếp Từ Dashboard**: Khách (Guest) nhấp vào bất kỳ ô nào trong 16 khu vực trên Dashboard hoặc khối Production/Support sẽ được chuyển thẳng đến danh sách lỗi của khu vực đó (`/findings?area_id=X`) mà không bị chuyển hướng về trang `/login`.
- **Mở Public Đọc API An Toàn**: `GET /api/areas` và `GET /api/photos/:id` được mở quyền đọc công khai, cho phép xem ảnh bằng chứng 5S và phóng to Lightbox sắc nét trong khi các route sửa/xóa vẫn được bảo vệ nghiêm ngặt.
- **Điều Hướng & Trải Nghiệm Khách Tiện Lợi**: Nút `← Quay lại Dashboard` giúp quay về màn hình chính tức thì; trang hiển thị huy hiệu `Chế độ xem công khai` trang nhã.

### 💻 Tự Động Co Giãn (Auto-Scale) Chữ & Ô theo Màn Hình Bản Web
- **Khắc Phục Hoàn Toàn Lỗi Đè Chữ & Tràn Khung trên Laptop 14"**:
  - Gỡ bỏ giới hạn tĩnh và các tỉ lệ flex cứng (`lg:flex-[58]`, `lg:overflow-visible`), cho phép container chính cuộn êm ái (`overflow-y: auto`) trên bản web.
  - Tối ưu hóa kích thước tối thiểu các ô khu vực (`min-h-[56px] sm:min-h-[62px] lg:min-h-[66px]`) và 3 thẻ cảnh báo (`min-h-[46px] sm:min-h-[50px]`), giúp chiều cao bảng báo động 7 ngày bằng khít với ma trận 16 ô, triệt tiêu 100% hiện tượng tràn đè lên Hàng 3.
  - Tổng chiều cao Dashboard tối ưu về ~620px - 650px, vừa vặn hoàn hảo trên 1 màn hình laptop 14" (độ phân giải 1366x768 hoặc 1080p scaling 125%-150%) mà không cần cuộn trang.
  - Chỉ khóa cứng không cuộn khi người dùng kích hoạt chế độ **Full TV Mode** (`:fullscreen`).

### 📈 Theo Dõi Tiến Độ & Cải Thiện Liên Tục 5S MoM (Month-over-Month Kaizen)
- **Hệ Thống Phân Tích MoM Toàn Diện**:
  - Tự động tính toán chênh lệch điểm số trung bình tháng hiện tại so với tháng trước (`▲ +X.Xđ` / `▼ X.Xđ` / `▬ 0đ`) cho tất cả 16 khu vực xưởng.
  - Xử lý mượt mà bước chuyển năm (tháng 1 so với tháng 12 năm trước) nhờ mở rộng truy vấn dữ liệu quá khứ và audit.
  - Phân loại trực quan: **Top Improvers** (Khu vực có mức độ tiến bộ vượt bậc) và **Stagnant Areas** (Khu vực có điểm dưới mục tiêu hoặc suy giảm cần Kaizen khẩn cấp).
  - Tích hợp công tắc chuyển đổi góc nhìn **Kaizen / Xếp hạng** tiện dụng trên cả 2 mẫu Dashboard.

### 🏭 Tái Cấu Trúc Bố Cục Dashboard Mẫu 2: Chuẩn Hóa 2 Khối Sản Xuất & Phụ Trợ
- **Tập Trung Hóa 2 Khối Vận Hành**:
  - Gộp các cụm phân tán thành đúng 2 khối: **Khối Sản Xuất** (10 xưởng: Dệt, Nhuộm, Định lượng, Căng, Hấp, Kiểm Greige, Kiểm Final, Lab Dip, Lab Test, UNT) và **Khối Phụ Trợ & Dịch Vụ** (6 xưởng: Kho bãi, Cơ điện, Năng lượng, Kỹ thuật, Hành chính, FM/CFD).
  - Thống kê độc lập từng khối: Điểm trung bình, biến động MoM, số khu vực Đạt/Cảnh báo/Chưa đạt, và tổng lỗi quá hạn.
  - Command Bar với 3 tab: Cải thiện 5S MoM, Phân rã 5 trụ cột S1-S5, và Xếp hạng Top/Bottom.

### 🖥️ Tinh Gọn 2 Mẫu Bố Cục Trực Tiếp & Khắc Phục Tràn Viền Trên Laptop 14"
- **Loại Bỏ Mẫu Heatmap, Giữ 2 Mẫu Andon Tinh Gọn**:
  - Gỡ bỏ hoàn toàn Mẫu 3 Heatmap, tập trung trải nghiệm vào 2 mẫu thiết kế hiệu quả nhất: **Mẫu 1 (Ma trận Andon 3 Tầng)** và **Mẫu 2 (Phân nhóm SX & Phụ trợ)** kèm nút chuyển đổi tức thì trên toolbar.
- **Tối Ưu Trải Nghiệm Laptop 14"**:
  - Bổ sung `overflow-y-auto` trên container TV Canvas, cho phép cuộn êm ái trên laptop màn hình nhỏ (1366x768 hoặc scaling 125%/150%), triệt tiêu hoàn toàn hiện tượng tràn bảng báo động 7 ngày sang Hàng 3.

### ✏️ Tính năng Chỉnh sửa Lỗi 5S Đã Nhập (Edit Finding) Trong Phiếu Chấm (`v2.8.0`)
- **Bổ sung Nút Chỉnh sửa (Edit) tại Section 2 Phiếu Chấm (`/audits/:id`)**:
  - Cho phép người chấm (Auditor) hoặc Quản trị viên (Admin) điều chỉnh thông tin lỗi 5S sau khi đã nhập hoặc nộp phiếu chấm (khi lỗi đang ở trạng thái `open`).
- **Modal Chỉnh sửa Toàn diện & Tự động Tính toán Lại Điểm**:
  - Hỗ trợ đổi **Khu vực** hoặc **Tiêu chí 5S vi phạm** (tự động loại bỏ tiêu chí NA của khu vực đã chọn).
  - Tự động tính toán lại mức phạt leo thang theo tuần lặp lại (`repeat_level`, `applied_penalty`) và cập nhật lại điểm tuần toàn xưởng.
  - Quản lý ảnh Before linh hoạt: xóa ảnh cũ không đạt chuẩn và bổ sung ảnh chụp mới (tối đa 6 ảnh) kèm nén ảnh tự động.

### ✨ Admin Theme Studio & Bộ Giao diện Đa Phong cách (Classic Default · Crystal Glass · Crystal Hybrid - `v2.7.0`)
- **Theme Studio dành riêng cho Quản trị viên (`/admin/targets`)**:
  - Giữ nguyên **Classic Andon (`classic`)** làm giao diện mặc định toàn hệ thống qua cài đặt D1 (`ui_theme`).
  - Admin có thể **Xem thử tức thì (Live Preview)** hoặc **Lưu & Áp dụng toàn hệ thống** 2 giao diện mới: **Crystal Glass Enterprise (Mẫu 2)** và **Crystal Hybrid Adaptive (Mẫu 4)**.
- **Chế độ Sáng / Tối Độc lập (`Light / Dark Mode`) & Khử nháy FOUC**:
  - Hỗ trợ chuyển đổi Sáng / Tối ngay trên Header, trang Đăng nhập và Thiết lập cho cả `crystal-glass` và `crystal-hybrid`, tự động đồng bộ đa tab.
- **Tối ưu Di động & Bảng Ma trận Cố định Cột đầu**:
  - Bổ sung thanh điều hướng dưới cùng trên mobile cho `crystal-hybrid`, bảng cuộn mượt có cột đầu cố định `.sticky-matrix-table`, hỗ trợ cuộn bàn phím (`tabIndex={0}`) và đồng bộ ngưỡng 3 màu trên mọi giao diện.

### 🎨 Phân loại Điểm số 3 Mức Màu (Đỏ - Vàng - Xanh) & Tùy chỉnh Ngưỡng Cảnh báo Admin (`v2.6.0`)
- **Hệ Thống Đánh Giá 3 Tầng Màu Sắc Chuẩn Công Nghiệp**:
  - 🔴 **Đỏ (Không đạt)**: Điểm $< \text{warning\_target}$ (mặc định $< 90,0\%$).
  - 🟡 **Vàng (Cảnh báo)**: Điểm $\ge \text{warning\_target}$ và $< \text{target}$ (mặc định $90,0\% \to < 95,0\%$).
  - 🟢 **Xanh (Đạt chuẩn)**: Điểm $\ge \text{target}$ (mặc định $\ge 95,0\%$).
- **Admin Chủ Động Thiết Lập Ngưỡng Điểm Cảnh Báo (`warning_target`)**:
  - Giao diện Quản trị Mục tiêu Năm (`/admin/targets`) cho phép quản trị viên nhập điểm Cảnh báo Vàng và điểm Chuẩn Xanh theo từng năm.
  - Tích hợp thanh xem trước màu sắc trực quan theo thời gian thực và kiểm tra tính hợp lệ chặt chẽ.
- **Đồng Bộ Trực Quan Trên Mọi Giao Diện**:
  - **TV Andon Dashboard**: 16 thẻ khu vực xưởng hiển thị viền và nhãn Amber khi rơi vào mức Cảnh báo; Biểu đồ Recharts hiển thị đường chuẩn nét liền xanh lá và đường nét đứt màu vàng tham chiếu.
  - **Báo cáo Tuần / Tháng & Chi tiết Phiếu Chấm**: Bổ sung đầy đủ trạng thái ĐẠT / CẢNH BÁO / K.ĐẠT.

### 🎯 Chuẩn hóa Hiển thị Điểm số Có 1 Chữ số Thập phân Toàn Hệ thống (`v2.5.8`)
- **Hiển thị Chính xác & Chuyên nghiệp**:
  - Mọi điểm số trên TV Dashboard, bảng vinh danh Top 2 / Nhắc nhở Bottom 2, ma trận 16 khu vực xưởng sản xuất, báo cáo tuần / tháng, ScoreBadge và bảng điểm chi tiết đều hiển thị chuẩn 1 chữ số thập phân (`95,3%`, `95,0%`, `100,0%`).
  - Hỗ trợ bản địa hóa định dạng số: Tiếng Việt dùng dấu phẩy `,` (`95,3%`), Tiếng Anh dùng dấu chấm `.` (`95.3%`).
  - Hiển thị biến động điểm số tuần (`formatDelta`) trực quan kèm ký hiệu mũi tên: `▲ +1,5%` / `▼ -2,3%`.
  - Bộ tiện ích `src/lib/format.ts` tập trung xử lý biên an toàn tuyệt đối (`null`, `undefined`, `NaN` fallback thành `"-"`).

### 🚀 Tự động Hóa Cập nhật Hệ thống & Triển khai Đa Nhà máy (`v2.5.7`)
- **Zero-Manual-Secret Cloudflare Auto-Deploy**: Tự động chuyển giao Cloudflare API Token từ Web Settings sang GitHub Actions Workflow, triển khai hệ thống mượt mà mà không cần tạo secret thủ công.
- **Bộ Cài Đặt Độc Lập Windows (`Crystal_5S_Setup.exe`)**: Tự động tạo và phát hành bộ cài đặt EXE kèm GitHub Releases cho phép cài đặt và chạy trên mạng LAN chỉ với 1 cú click.

### 📅 Lọc & Chọn Kết quả Đánh giá Theo Tháng trên Dashboard
- **Xem Dữ liệu Quá khứ & Lịch sử Linh hoạt**:
  - Bổ sung thanh công cụ chọn tháng trực quan ngay trên đầu màn hình TV Dashboard (`?month=YYYY-MM`).
  - Tự động quét toàn bộ các tháng có dữ liệu từ cả kỳ đánh giá tuần thực tế và bảng nhập điểm lịch sử Excel (`historical_monthly_scores`).
  - Tự động tính toán lại toàn diện: Điểm trung bình tháng, Xếp hạng Top/Bottom, Ma trận 16 khu vực và Phân bổ lỗi 5S theo đúng tháng được chọn.
  - Tích hợp nút bấm *"Quay về hiện tại"* 1-click cùng huy hiệu trạng thái rõ ràng.

### 🔒 Khóa Bản quyền Tác giả Simon & Cửa sổ About App
- **Bảo vệ Bản quyền Kiến trúc & Thông tin Tác giả**:
  - Thêm cửa sổ **About App Modal** hiển thị thông tin hệ thống, tác giả **Simon** và nút liên hệ trực tiếp trên GitHub ([https://github.com/vodanh1814](https://github.com/vodanh1814)).
  - Bổ sung khối **Bản quyền tác giả được bảo vệ** cố định (Read-Only Card) trong mục Quản trị (`/admin/targets`), ngăn ngừa việc ghi đè hoặc can thiệp thông tin bản quyền khi doanh nghiệp tùy chỉnh Logo và Tên công ty.
  - Hiển thị dòng bản quyền tinh tế tại trang Đăng nhập và chân thanh bên Sidebar.

### 🌐 Bổ sung Toàn diện Tài liệu Tiếng Anh (English Docs)
- Xuất bản tài liệu hướng dẫn tiếng Anh chuẩn mực ([`README.en.md`](./README.en.md)) và nhật ký phiên bản tiếng Anh ([`CHANGELOG.en.md`](./CHANGELOG.en.md)).
- Tích hợp các nút chuyển đổi ngôn ngữ song ngữ ở đầu các tài liệu.

---

## 🏭 Hướng dẫn Triển khai & Tự Động Cập nhật cho Nhà máy của Bạn

Hệ thống được thiết kế theo chuẩn **Mô hình Đa Nhà máy (Multi-Instance)**. Mỗi doanh nghiệp có thể tự do triển khai độc lập theo 1 trong 2 phương án dưới đây mà vẫn đảm bảo tính bảo mật và khả năng cập nhật mượt mà:

### 🏢 Phương án 1: Triển khai Cục bộ trên Mạng LAN / Máy chủ Nội bộ (Khuyên dùng cho xưởng sản xuất)
> *Phù hợp cho các nhà máy muốn bảo mật 100% dữ liệu sản xuất bên trong mạng nội bộ intranet, không đưa dữ liệu ra ngoài Internet.*

1. **Tải file cài đặt**:
   - Truy cập mục [Releases](https://github.com/vodanh1814/Crystal-6S/releases) trên GitHub và tải về file **`Crystal_5S_Setup.exe`**.
2. **Cài đặt & Khởi chạy**:
   - Chạy file `Crystal_5S_Setup.exe` trên máy tính hoặc máy chủ tại xưởng (hỗ trợ Windows 10/11, Windows Server).
   - Chọn thư mục lưu trữ và bấm **"Cài đặt & Khởi chạy"**.
   - Trình cài đặt sẽ tự động thiết lập Node.js, SQLite và chạy ngầm vĩnh viễn dưới dạng dịch vụ hệ thống.
3. **Sử dụng trong toàn nhà máy**:
   - Mọi máy tính, điện thoại, máy tính bảng và màn hình Smart TV trong mạng LAN đều có thể truy cập qua IP máy chủ (ví dụ: `http://192.168.1.100:5173`).
4. **Cơ chế Cập nhật Tự động (1-Click Auto-Update)**:
   - Khi tác giả **Simon** phát hành phiên bản mới trên GitHub, trong trang Quản trị (`/admin/targets`) sẽ xuất hiện nút màu xanh: **"Tự động Cập nhật Ngay (vX.Y.Z) - 1 Click"**.
   - Bạn chỉ cần bấm nút này: Hệ thống sẽ tự động đồng bộ mã nguồn mới từ Git, cài đặt thư viện và nâng cấp cơ sở dữ liệu an toàn — **giữ nguyên 100% dữ liệu phiếu đánh giá và hình ảnh lịch sử**.

---

### ☁️ Phương án 2: Triển khai Độc lập trên Cloudflare của Doanh nghiệp (Miễn phí 100% — Truy cập Toàn cầu)
> *Phù hợp cho các doanh nghiệp có nhiều nhà máy ở các tỉnh khác nhau hoặc ban giám đốc muốn theo dõi từ xa qua Internet điện thoại/laptop.*

1. **Fork kho lưu trữ**:
   - Bấm nút **Fork** ở góc phải trên cùng của repository này về tài khoản GitHub của doanh nghiệp bạn.
2. **Triển khai tự động bằng dòng lệnh (CLI)**:
   ```bash
   git clone https://github.com/<your-org>/Crystal-6S.git
   cd Crystal-6S
   npm install
   npm run setup:cloud
   ```
   - Script tự động kết nối tài khoản Cloudflare của bạn, tạo cơ sở dữ liệu D1 (`cetvn-5s-db`) và bộ nhớ ảnh R2 (`cetvn-5s-photos`), sau đó tự động deploy lên Cloudflare Workers hoàn toàn miễn phí.
3. **Cơ chế Cập nhật Tự động trên Cloudflare**:
   - **Cách A (Nhanh nhất — 15 giây)**: Mở terminal trên máy tính kỹ thuật và chạy lệnh: `npx wrangler deploy`.
   - **Cách B (Tự động 1-click từ Web)**: Cấu hình GitHub Token có quyền `workflow` trong trang Quản trị và thêm 2 Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) trong GitHub Repo của bạn để kích hoạt tự động qua GitHub Actions.

---

## 2. Điểm nổi bật của phiên bản `v2.5.4`

### 🔄 Nâng cấp Toàn diện Cơ chế Git Auto-Update & Bảo vệ Dữ liệu Riêng tư
- **Hỗ trợ Tự động Cập nhật Mượt mà cho cả Kho GitHub Public & Private**:
  - Tự động nhận diện và nạp dữ liệu cập nhật không cần Token khi repo ở chế độ **Public** (qua raw GitHub fallback), chống nghẽn giới hạn API rate limit.
  - Tích hợp giao diện quản trị **Cấu hình GitHub Personal Access Token (PAT)** trong trang Quản trị: Hỗ trợ lưu token an toàn được mã hóa chuẩn **AES-GCM-256** vào cơ sở dữ liệu (`app_settings`), hỗ trợ gỡ bỏ token khi chuyển sang chế độ Public.
  - Bổ sung thông báo trạng thái vàng (`notice`) và cảnh báo lỗi đỏ (`error`) trực quan giúp Quản trị viên nắm bắt tức thời tình trạng kết nối tới GitHub repository.
- **Cơ chế Tự Sửa lỗi Git (Auto-Git-Repair) cho Bản Cài đặt Windows EXE**:
  - Tự động phát hiện trường hợp thư mục giải nén từ bộ cài đặt `.exe` chưa có thư mục `.git`, tự động khởi tạo `git init -b main` và gán remote repository chính thức.
  - Tự động loại trừ các file binary và phát sinh sau build (`Crystal_5S_Setup.exe`, `package-lock.json`) khỏi bộ kiểm tra `dirty check`, loại bỏ triệt để lỗi chặn cập nhật do thay đổi cục bộ.
  - Tích hợp cơ chế fallback an toàn: nếu lệnh fast-forward gặp phân nhánh, hệ thống tự động hoàn nguyên về bản phát hành chính thức (`git reset --hard origin/main`).
- **Bảo mật & Loại bỏ Thông tin Cá nhân / Hạ tầng Nội bộ trên Git**:
  - Gỡ bỏ vĩnh viễn file theo dõi URL hạ tầng `CLOUDFLARE_LIVE_URL.txt` khỏi Git và đưa vào `.gitignore`.
  - Khử bỏ toàn bộ các đường dẫn tuyệt đối của máy dev trong tài liệu hướng dẫn và mã nguồn.
  - Đồng nhất tên cơ sở dữ liệu `cetvn-5s-db` xuyên suốt `package.json`, `wrangler.jsonc`, `vite.config.ts` và backend.

---

## 2. Điểm nổi bật của phiên bản `v2.5.3`

### 📱 Tối ưu hóa Toàn diện Bố cục Di động & Cuộn Chạm Mượt mà (Mobile & Tablet)
- **Tối ưu hóa Bố cục Responsive Tương thích Mọi Kích thước Màn hình**:
  - **Khử bỏ Tỷ lệ Flexbox Cứng trên Mobile**: Gỡ bỏ ràng buộc `flex-[58]` và `flex-[42]`, cho phép các thành phần trên điện thoại tự do giãn dòng và cuộn dọc tự nhiên.
  - **Loại bỏ Hoàn toàn Bẫy Cuộn Lồng nhau**: Chỉ để 1 thanh cuộn duy nhất, thao tác chạm vuốt trên iPhone và Android siêu mượt, không bị khựng đơ.
  - **Ma trận 16 Khu vực Đạt chuẩn**: Lưới 2 cột thông thoáng trên điện thoại (`min-h-[88px]`), phân tầng mạch lạc: Tên + Huy hiệu $\rightarrow$ Điểm số $\rightarrow$ Tồn / Đã sửa, không bị nén đè chữ.
  - **Khắc phục Sập Chiều cao Biểu đồ Recharts**: Gán chiều cao tối thiểu 224px - 256px trên mobile/tablet, đảm bảo đường xu hướng 12 tuần hiển thị sắc nét.
  - **Tối ưu Thanh Header Màn hình Hẹp**: Ẩn nút chiếu TV trên điện thoại, mở rộng không gian cho tiêu đề nhà máy và chuẩn hóa kích thước nút bấm cảm ứng.
  - **Bảo toàn 100% Trải nghiệm Smart TV Wall**: Giữ nguyên vẹn tỷ lệ hiển thị không cuộn chuột trên màn hình TV xưởng và Desktop.

---

## 2. Điểm nổi bật của phiên bản `v2.5.2`

### 🏭 Hiển thị Tên Khu vực (`area_name`) Trực quan trên Dashboard Nhà máy
- **Thay thế hoàn toàn mã viết tắt bằng tên khu vực dễ nhớ**:
  - **Ma trận 16 Khu vực (16-Area Matrix Wall)**: Hiển thị tên đầy đủ của từng bộ phận (`Knitting`, `Dyeing`, `Setting`, `Warehouse`, `Batching`, `Greige QC`, `Final QC`, `Lab test`...) giúp quan sát nhanh chóng trên Smart TV nhà xưởng.
  - Tích hợp tooltip hover hiển thị đầy đủ tên và mã: `${area.area_name} (${area.area_code})`.
  - Tối ưu layout với `truncate` và `min-w-0`, chống tràn viền và vỡ khung trên mọi độ phân giải.
  - **Bảng xếp hạng Top & Bottom**: Vinh danh khu vực dẫn đầu và khu vực cần cải thiện bằng tên bộ phận trực quan.
  - **Cảnh báo Khẩn cấp & Dải KPI**: Hiển thị tên khu vực trên thẻ sự cố và danh sách cảnh báo quá hạn / lỗi lặp lại.

---

## 2. Điểm nổi bật của phiên bản `v2.5.1`

### 📺 Kết nối Điểm Lịch sử & Smart Fallback Dashboard Nhà máy
- **Hiển thị Toàn diện Điểm Nhập Lịch sử trên Dashboard**:
  - Tích hợp 150 điểm lịch sử từ cơ sở dữ liệu lên màn hình Dashboard TV công cộng.
  - Phân cấp ưu tiên thông minh: điểm audit tuần thực tế luôn được ưu tiên; khi chưa có kiểm tra trong tháng sẽ tự động lấy điểm lịch sử (`historical`).
- **Cơ chế Fallback Thông minh Đầu tháng (Smart Fallback)**:
  - Khi bước sang đầu tháng mới (ví dụ Tuần W45 tháng 11/2026) chưa có kết quả audit, hệ thống tự động tìm kiếm lùi về tháng gần nhất (**Tháng 10/2026** với điểm trung bình **96.33%**).
  - **KPI 1 (Điểm TB Tuần)**: Hiển thị trạng thái `Chờ đánh giá`, hiển thị mốc gần nhất `T10: 96.33%`.
  - **KPI 2 (Điểm TB Tháng)**: Tiêu đề `ĐIỂM TB THÁNG 10/2026`, badge cam `Gần nhất` và nhãn `Dữ liệu lịch sử`, điểm TB: `96.33%`.
  - **KPI 3 (Khu vực Đạt chuẩn)**: Tự động tính toán số khu vực đạt chuẩn/dưới chuẩn của tháng gần nhất (11/15 khu vực đạt $\ge 95\%$) kèm nhãn `T10 (Gần nhất)`.
  - **Ma trận 16 Khu vực**: Tự động lấy điểm tháng gần nhất để tô màu xanh (đạt) / đỏ (dưới chuẩn) và hiển thị nhãn `Lịch sử`, không bị rỗng điểm.
  - **Leaderboard Top & Bottom**: Xếp hạng khu vực theo tháng gần nhất `XẾP HẠNG THÁNG 10/2026`.
  - **Biểu đồ Xu hướng 12 Tuần**: Tự động kết nối điểm trung bình tháng lịch sử với cờ `source: 'historical'`, đường xu hướng mượt mà với `connectNulls`.
- **Tối ưu hóa Tốc độ Đóng gói EXE**:
  - Nâng cấp `scripts/build_exe.mjs` sử dụng công cụ `bsdtar` chuẩn của Windows, đóng gói mã nguồn trong 0.5 giây và triệt tiêu lỗi khóa file.

---

## 2. Điểm nổi bật của phiên bản `v2.5.0`

### 📊 Quản trị & Import Điểm Lịch sử Excel Thông minh (Admin Only)
- **Tải file mẫu Excel (.xlsx) chuẩn hóa theo danh sách Khu vực Nhà máy**:
  - Tự động sinh file Excel ma trận 12 tháng theo hàng và các khu vực thực tế đang hoạt động theo cột.
  - Tự động điền dữ liệu điểm đã có để quản trị viên tải về đối chiếu hoặc cập nhật bổ sung.
- **Tải lên File Excel (.xlsx / .xls) 1-Click**:
  - Hỗ trợ hoàn hảo định dạng bảng thực tế của các nhà máy sản xuất (điển hình như file `5S.xlsx`).
  - Tự động nhận diện hướng ma trận (Tháng theo dòng / Khu vực theo cột hoặc ngược lại).
  - Thuật toán Fuzzy & Synonym Matching linh hoạt cho toàn bộ khu vực dệt may (`Knitting`, `Warehouse`, `Greige_PP`, `QC-Final`, `QC-Greige`, `Dyeing`, `Setting`, `VAP`, `MTN`, `Utility`, `TSC`, `FM/CFD`, `Lab dip`...).
  - Tự động chuyển đổi tỷ lệ thập phân ($0.9 \rightarrow 90.0, 1 \rightarrow 100.0$) và chuỗi phần trăm.
- **Đồng bộ hóa Phiên bản Toàn diện & Nâng cấp Trình Đóng gói EXE**:
  - Khắc phục lỗi lệch version, đồng bộ phiên bản `v2.5.0` xuyên suốt: Git, App SPA (`src/version.ts`), `package.json` và bộ cài độc lập `Crystal_5S_Setup.exe`.
  - Tự động hóa `scripts/build_exe.mjs` liên kết động AssemblyVersion và UI Title từ `package.json`.

---

## 2. Điểm nổi bật của phiên bản `v2.4.3`

### ⚡ Chuẩn hóa & Rút gọn Tên miền Cloudflare Worker thành `5s-audit`
- **Loại bỏ tiền tố công ty bị lặp**: Tên Worker được cố định là `5s-audit`, loại bỏ tiền tố thừa khi subdomain Cloudflare đã mang tên nhà máy.
  - URL trước đây: `https://<company>-5s-audit.<subdomain>.workers.dev`
  - URL mới: 👉 **`https://5s-audit.<subdomain>.workers.dev`** *(ngắn gọn, trực quan, chuyên nghiệp)*.
- **Phân lập Dữ liệu Độc lập**: D1 Database (`<slug>-5s-db`) và R2 Storage (`<slug>-5s-photos`) vẫn được phân lập riêng biệt cho từng doanh nghiệp.
- **Quy trình Phát triển & Triển khai 6 Bước**: Chuẩn hóa quy tắc làm việc theo [GEMINI.md](./GEMINI.md) đảm bảo mọi thay đổi đều qua kiểm thử độc lập 0 lỗi và có sự phê duyệt trước khi xuất bản.

---

## 2. Điểm nổi bật của phiên bản `v2.4.2`

### 🌐 Tối ưu hóa Điều hướng Kích hoạt Subdomain Cloudflare Mới
- **Khắc phục triệt để lỗi trang tạo Domain không vào được (do Cloudflare khai tử route `/workers/onboarding`)**:
  - Tự động bóc tách Account ID và chuyển hướng chính xác đến trang quản lý chính thức của Cloudflare: `https://dash.cloudflare.com/<accountId>/workers-and-pages` (mục **"Your subdomain"** ở cột bên phải) hoặc link cấu hình trực tiếp `https://dash.cloudflare.com/<accountId>/workers/subdomain`.
  - Hướng dẫn tiếng Việt 4 bước trực quan, định vị rõ từng nút bấm trên giao diện Cloudflare giúp quản trị viên kích hoạt tên miền phụ chỉ trong 1 phút.
  - Tăng thời gian chờ cho môi trường GUI độc lập ([Crystal_5S_Setup.exe](./Crystal_5S_Setup.exe)) lên 20 giây đảm bảo thao tác trên trình duyệt mượt mà và không gián đoạn tiến trình.

---

## 2. Điểm nổi bật của phiên bản `v2.4.1`

### 🛡️ Tự động hóa & Khôi phục Thiết lập Subdomain `workers.dev` cho Tài khoản Cloudflare Mới
- **Kênh Tương tác Tức thời (`Interactive stdin`)**:
  - Hỗ trợ nhập liệu bàn phím trực tiếp khi chạy `npm run deploy` trong trình cài đặt [scripts/auto_setup.mjs](./scripts/auto_setup.mjs), cho phép người dùng trả lời và đặt tên Subdomain ngay trong cửa sổ dòng lệnh nếu Wrangler yêu cầu.
- **Cơ chế Tự Phục Hồi Thông Minh (Auto-Recovery)**:
  - Tự động phát hiện tài khoản Cloudflare mới chưa đăng ký tên miền phụ, tự động trích xuất và mở link thiết lập trong trình duyệt: `https://dash.cloudflare.com/<accountId>/workers-and-pages` (mục **Your subdomain**).
  - Hướng dẫn tiếng Việt 3 bước rõ ràng và dừng chờ Enter để thử lại ngay lập tức mà không cần cài đặt lại từ đầu.
  - Hỗ trợ fallback thông minh khi chạy trong môi trường GUI độc lập ([Crystal_5S_Setup.exe](./Crystal_5S_Setup.exe)), ngăn ngừa hoàn toàn tình trạng treo tiến trình.
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

---

## 5. Bản quyền & Sở hữu Trí tuệ (License & Copyright)

**Bản quyền © 2026 Simon. All rights reserved.**  
Thiết kế, xây dựng và phát triển kiến trúc bởi tác giả **Simon** ([GitHub: @vodanh1814](https://github.com/vodanh1814)).

Mọi quyền sở hữu trí tuệ, cấu trúc cơ sở dữ liệu và mã nguồn ứng dụng đều được bảo lưu. Doanh nghiệp và nhà máy được toàn quyền tùy biến Tên công ty và Logo đại diện để phục vụ vận hành sản xuất nội bộ.
