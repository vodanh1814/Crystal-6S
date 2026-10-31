# Crystal 5S Audit — Hệ thống Đánh giá & Cải tiến 5S

Ứng dụng web toàn diện hỗ trợ kiểm tra, chấm điểm, theo dõi tiến độ khắc phục và báo cáo 5S (Sort – Set in order – Shine – Standardize – Sustain) tại nhà máy, hoạt động hoàn toàn trên nền tảng Cloudflare (Cloudflare Workers, D1 Database, R2 Object Storage và Cloudflare Workers Static Assets).

---

## 1. Tính năng nổi bật

- **Kiến trúc Serverless tối ưu**: Một Worker Hono duy nhất phục vụ toàn bộ REST API (`/api/*`) và lưu trữ tệp tĩnh giao diện React SPA (Vite + Tailwind CSS v4).
- **Song ngữ hoàn toàn (Tiếng Việt & Tiếng Anh)**: Tự động phát hiện hoặc chuyển đổi linh hoạt qua nút toggle; lưu trữ tùy chọn ngôn ngữ theo từng tài khoản người dùng.
- **Tuân thủ chính xác bộ quy tắc 5S & Công thức tính điểm**:
  - Mỗi khu vực (Area) thực hiện đúng **1 đợt kiểm tra / tuần** (theo chuẩn ISO Week: Thứ Hai – Chủ Nhật).
  - Điểm tuần: `Điểm = max(0, 100 - Σ penalty áp dụng)`.
  - Phạt lũy tiến theo tuần (`escalating`): lỗi chưa khắc phục lặp lại tuần tiếp theo sẽ bị cộng thêm **+1 điểm phạt** cho mỗi tuần lặp lại (`penalty = penalty_gốc + (repeat_level - 1)`). Hệ số lặp tự động đặt lại (reset) về 1 vào đầu mỗi tháng mới.
  - Các lỗi ngoại lệ không áp dụng lũy tiến: `S5.2-BOD`, `S5.2-CUS`, `S5.3` (Internal IE).
  - Điểm tháng: Trung bình cộng các đợt kiểm tra đã hoàn thành trong tháng đó.
  - Điểm chuẩn theo năm (`yearly_targets`): 2026 mặc định 95%; điểm đạt hiển thị xanh, dưới chuẩn hiển thị đỏ.
- **Quy trình Khắc phục & Chuyển tuần (Carry-over Flow)**:
  - Khi tạo đợt kiểm tra tuần mới, hệ thống tự động tải toàn bộ lỗi chưa đóng của tuần trước đó (Pending Previous Findings).
  - Auditor bắt buộc phải đánh giá: **"Đã cải thiện" (Improved)** (đóng lỗi) hoặc **"Chưa cải thiện" (Not improved)** (chuyển sang tuần này với mức phạt lũy tiến tăng thêm 1 điểm) trước khi có thể Submit audit.
  - Cho phép hoàn tác (Undo) quyết định khi audit còn ở trạng thái nháp (Draft).
- **Cảnh báo hạn 7 ngày (7-day Alarms)**:
  - Tự động tính hạn khắc phục (due date = ngày audit + 7 ngày).
  - Đếm ngược số ngày còn lại; cảnh báo đỏ khi quá hạn.
  - Chuông thông báo hiển thị tổng số cảnh báo cần xử lý theo vai trò (Area MNG: lỗi Open cần khắc phục; Auditor: lỗi Fixed cần xác nhận).
- **Hình ảnh Before / After nén trực tiếp trên trình duyệt**:
  - Hỗ trợ chụp trực tiếp từ camera điện thoại (`capture="environment"`) hoặc tải từ thư viện ảnh.
  - Nén tự động bằng Canvas (cạnh tối đa 1600px, JPEG quality 0.75) trước khi tải lên R2, tiết kiệm băng thông và dung lượng lưu trữ.
- **Báo cáo đa chiều & Xuất Excel**:
  - Dashboard tổng quan: Điểm tuần hiện tại, bảng xếp hạng tháng, biểu đồ đường xu hướng điểm 12 tuần (Recharts), biểu đồ cột phân bổ lỗi theo nhóm S1–S5.
  - Báo cáo tuần & tháng ma trận nhiệt (heatmap colors vs target).
  - Xuất báo cáo ra file Excel (.xlsx) thông qua SheetJS tải động (lazy dynamic import).

---

## 2. Yêu cầu môi trường

- **Node.js**: Phiên bản 20.x trở lên (đã kiểm thử tương thích tốt với Node 24.x).
- **npm**: Phiên bản 10.x trở lên.
- **Tài khoản Cloudflare**: Miễn phí hoặc trả phí có quyền truy cập Workers, D1 và R2.

---

## 3. Cài đặt & Phát triển Local

### Bước 1: Cài đặt dependencies
```powershell
npm install
```

### Bước 2: Cấu hình biến môi trường cục bộ
Tạo file `.dev.vars` từ file mẫu `.dev.vars.example`:
```powershell
Copy-Item .dev.vars.example .dev.vars
```
Chỉnh sửa chuỗi bí mật `JWT_SECRET` trong `.dev.vars` nếu cần (dùng để ký phiên đăng nhập JWT).

### Bước 3: Áp dụng Database Migrations cho môi trường Local
Hệ thống sử dụng Cloudflare D1 cục bộ (lưu trữ trong `.wrangler/state/v3/d1`):
```powershell
npm run db:migrate:local
```

### Bước 4: (Tùy chọn) Khởi tạo 16 khu vực mẫu & ma trận tiêu chí không áp dụng (NA)
Nếu muốn sử dụng danh sách 16 khu vực tiêu chuẩn từ nhà máy (KNI, GQC, WH, BAT, DYE, L-DIP, UNT, SET, VAP, FQC, L-TES, MTN, UTI, TSC, ADM, FM/CFD):
```powershell
npm run db:sample:local
```

### Bước 5: Khởi động máy chủ phát triển
```powershell
npm run dev
```
Trình duyệt sẽ mở ứng dụng tại: `http://localhost:5173`

### Bước 6: Khởi tạo tài khoản Quản trị viên đầu tiên
Khi truy cập lần đầu tiên, hệ thống sẽ tự động chuyển hướng đến màn hình khởi tạo:
`http://localhost:5173/setup`
Nhập Họ tên, Tên đăng nhập và Mật khẩu (tối thiểu 6 ký tự) để tạo tài khoản Admin tối cao.

---

## 4. Triển khai lên Cloudflare (Production)

### Bước 1: Đăng nhập Cloudflare qua Wrangler
```powershell
npx wrangler login
```

### Bước 2: Tạo D1 Database trên Cloudflare
```powershell
npx wrangler d1 create crystal5s-db
```
Lệnh sẽ trả về thông tin cấu hình, ví dụ:
```json
{
  "binding": "DB",
  "database_name": "crystal5s-db",
  "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```
Mở file `wrangler.jsonc` và thay thế giá trị `database_id: "placeholder-d1-id"` bằng `database_id` vừa nhận được.

### Bước 3: Tạo R2 Storage Bucket trên Cloudflare
```powershell
npx wrangler r2 bucket create crystal5s-photos
```

### Bước 4: Thiết lập chuỗi bí mật JWT trên Cloudflare
```powershell
npx wrangler secret put JWT_SECRET
```
Nhập một chuỗi bí mật ngẫu nhiên và an toàn khi được hỏi trong terminal.

### Bước 5: Chạy Database Migrations trên Cloudflare D1
```powershell
npm run db:migrate:remote
```

*(Tùy chọn)* Chèn 16 khu vực mẫu lên Cloudflare D1:
```powershell
npm run db:sample:remote
```

### Bước 6: Build & Deploy toàn bộ ứng dụng
```powershell
npm run deploy
```
Wrangler sẽ biên dịch toàn bộ Worker backend và đóng gói giao diện React SPA tải lên Workers Static Assets.

### Bước 7: Thiết lập Admin đầu tiên trên Production
Mở đường dẫn URL do Cloudflare cung cấp (ví dụ: `https://crystal-5s-audit.your-subdomain.workers.dev/setup`) và điền thông tin để tạo tài khoản Quản trị viên đầu tiên.

---

## 5. Kiểm thử & Đảm bảo chất lượng

Dự án đi kèm bộ kiểm thử tự động toàn diện:

1. **Kiểm tra TypeScript Typecheck**:
   ```powershell
   npm run typecheck
   ```
   Kiểm tra đồng thời toàn bộ `src/` (React SPA) và `worker/` (Cloudflare Workers API).

2. **Chạy Unit Tests cho Logic cốt lõi**:
   ```powershell
   npm test
   ```
   Kiểm thử 100% các hàm thuần tính toán (`worker/lib/week.ts` và `worker/lib/scoring.ts`) bằng `node:test`.

3. **Kiểm tra Build Bundle**:
   ```powershell
   npm run build
   ```
   Biên dịch thành công Worker bundle và tách riêng lazy chunk cho thư viện Excel `xlsx`.

4. **Chạy kịch bản Kiểm thử Tích hợp (Smoke Test)**:
   ```powershell
   powershell.exe -ExecutionPolicy Bypass -File scripts/smoke_test_curl.ps1
   ```
   Tự động khởi động dev server, chạy chuỗi kiểm thử curl khép kín (Khởi tạo admin → Đăng nhập → Tạo Area → Gán Auditor → Tạo Audit 1 → Thêm lỗi S1.1 → Submit đạt 98 điểm → Tạo Audit 2 tuần sau → Chuyển lỗi với trạng thái Chưa cải thiện → Xác minh điểm phạt lũy tiến tăng từ 2 lên 3 điểm) và tự động tắt server sau khi hoàn tất.
