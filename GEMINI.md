# Quy trình Phát triển, Kiểm thử & Triển khai Dự án Crystal 5S Audit

Tất cả các Agent khi hoạt động trong dự án này BẮT BUỘC phải tuân thủ nghiêm ngặt phân bổ Model / Agent con và quy trình 6 bước chuẩn hóa dưới đây:

---

## 🤖 Phân bổ Model & Agent Con theo Vai trò (Model & Subagent Allocation)

1. **`Neon` (`.agents/agents/neon.md`)**: **Model chính cho lập trình, thiết kế kiến trúc, xử lý vấn đề phức tạp và review code.**
2. **`Argon` (`.agents/agents/argon.md`)**: **Model chuyên phân tích sâu, nghiên cứu, lập kế hoạch và review độc lập.**
3. **`Hydrogen` (`.agents/agents/hydrogen.md`)**: **Model thực thi nhanh, viết code theo đặc tả, sửa lỗi nhỏ và chạy test.**

---

## 📌 Quy trình 6 Bước Tiêu chuẩn (Standard 6-Step Workflow)

### Bước 1: Lên kế hoạch (Planning — Agent: `Argon` & `Neon`)
- Sử dụng **`Argon`** để phân tích sâu yêu cầu, nghiên cứu nguyên nhân gốc (root cause) hoặc bài toán kỹ thuật mới, và phối hợp **`Neon`** trong thiết kế kiến trúc / giải pháp kỹ thuật phức tạp.
- Đưa ra các phương án khả thi kèm ưu / nhược điểm.
- Lập bản kế hoạch triển khai cụ thể:
  - Danh sách các file dự kiến tạo mới hoặc chỉnh sửa.
  - Các bước thực hiện chi tiết.
  - Kế hoạch kiểm thử tự động (Unit test, typecheck, build).

### Bước 2: Chờ người dùng duyệt (Duyệt Plan)
- Trình bày kế hoạch cho người dùng một cách rõ ràng, mạch lạc bằng tiếng Việt.
- **DỪNG LẠI và CHỜ người dùng xác nhận / phê duyệt**.
- ⚠️ **TUYỆT ĐỐI KHÔNG tự ý sửa code hay triển khai khi chưa có sự đồng ý của người dùng.**

### Bước 3: Agent triển khai (Execute — Agent: `Neon` & `Hydrogen`)
- Sau khi nhận được lệnh duyệt từ người dùng:
  - **`Neon`** đảm nhận lập trình chính, thiết kế kiến trúc và xử lý vấn đề phức tạp.
  - **`Hydrogen`** thực thi nhanh viết code theo đúng đặc tả, sửa lỗi nhỏ và chạy test.
- Đảm bảo tính toàn vẹn của tài liệu, giữ nguyên các comment / docstring không liên quan.

### Bước 4: Agent review & Kiểm thử độc lập (Review — Agent: `Argon` & `Neon` - 0 lỗi)
- **`Neon`** thực hiện review code và kiến trúc chuyên sâu.
- **`Argon`** thực hiện review độc lập và kiểm chứng toàn bộ quy trình kiểm thử tự động đạt chuẩn **0 lỗi**:
  - `npm test`: Phải pass 100% tất cả các test suites.
  - `npm run typecheck`: 0 lỗi (`tsc -b`).
  - `npm run build`: Build thành công cả Worker và Client bundle.
  - `npm run build:exe`: Biên dịch lại file EXE độc lập nếu có sửa đổi bundle hoặc scripts.
- Tổng hợp báo cáo kiểm thử chi tiết và trình bày cho người dùng.

### Bước 5: Chờ người dùng duyệt xuất bản (Duyệt Git)
- Báo cáo kết quả kiểm tra đạt chuẩn **0 lỗi** và sẵn sàng cho việc xuất bản.
- **DỪNG LẠI và CHỜ lệnh phê duyệt của người dùng để push lên Git**.
- ⚠️ **TUYỆT ĐỐI KHÔNG tự ý commit hay push khi chưa có lệnh duyệt của người dùng.**

### Bước 6: Agent push lên Git (Execute — Agent: `Hydrogen`)
Khi người dùng đã ra lệnh duyệt push lên Git, **`Hydrogen`** thực hiện:
1. **Nâng phiên bản (`version`)** đồng bộ trong cả `package.json` và `src/version.ts` (`APP_VERSION`, `APP_RELEASE_DATE`) theo chuẩn Semantic Versioning (Patch, Minor hoặc Major).
2. **Cập nhật `CHANGELOG.md`**: Ghi rõ số phiên bản mới, ngày phát hành và chi tiết các mục Fixed / Added / Changed.
3. **Cập nhật `README.md`**: Cập nhật huy hiệu phiên bản hiện tại và tóm tắt các điểm nổi bật của phiên bản mới.
4. **Tái đóng gói file EXE**: Chạy `npm run build:exe` để nhúng mã nguồn mới vào `Crystal_5S_Setup.exe`.
5. **Git Commit & Tag**: Tạo git commit với commit message chuẩn mực, tạo git annotated tag (`git tag -a vX.Y.Z -m "..."`).
6. **Git Push**: Đẩy mã nguồn và tag lên remote repository (`git push origin main --tags`).
7. **Cloudflare Deploy**: Chạy `npm run deploy` để đồng bộ phiên bản mới lên Cloudflare Workers Production.
