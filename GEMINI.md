# Quy trình Phát triển, Kiểm thử & Triển khai Dự án Crystal 5S Audit

Tất cả các Agent khi hoạt động trong dự án này BẮT BUỘC phải tuân thủ nghiêm ngặt quy trình 6 bước chuẩn hóa dưới đây:

---

## 📌 Quy trình 6 Bước Tiêu chuẩn (Standard 6-Step Workflow)

### Bước 1: Lên kế hoạch (Lên Plan)
- Phân tích chi tiết yêu cầu, nguyên nhân lỗi (root cause) hoặc bài toán kỹ thuật mới.
- Đưa ra các phương án khả thi kèm ưu / nhược điểm.
- Lập bản kế hoạch triển khai cụ thể:
  - Danh sách các file dự kiến tạo mới hoặc chỉnh sửa.
  - Các bước thực hiện chi tiết.
  - Kế hoạch kiểm thử tự động (Unit test, typecheck, build).

### Bước 2: Chờ người dùng duyệt (Duyệt Plan)
- Trình bày kế hoạch cho người dùng một cách rõ ràng, mạch lạc bằng tiếng Việt.
- **DỪNG LẠI và CHỜ người dùng xác nhận / phê duyệt**.
- ⚠️ **TUYỆT ĐỐI KHÔNG tự ý sửa code hay triển khai khi chưa có sự đồng ý của người dùng.**

### Bước 3: Agent triển khai (Triển khai code)
- Sau khi nhận được lệnh duyệt từ người dùng, Agent tiến hành chỉnh sửa hoặc viết mới mã nguồn đúng theo kế hoạch đã thống nhất.
- Đảm bảo tính toàn vẹn của tài liệu, giữ nguyên các comment / docstring không liên quan.

### Bước 4: Agent review & Kiểm thử độc lập (Agent Review - 0 lỗi)
- Khởi tạo subagent chuyên trách (Reviewer Agent) để review chéo mã nguồn và logic nghiệp vụ.
- Thực thi toàn bộ quy trình kiểm thử tự động:
  - `npm test`: Phải pass 100% tất cả các test suites.
  - `npm run typecheck`: 0 lỗi (`tsc -b`).
  - `npm run build`: Build thành công cả Worker và Client bundle.
  - `npm run build:exe`: Biên dịch lại file EXE độc lập nếu có sửa đổi bundle hoặc scripts.
- Tổng hợp báo cáo kiểm thử chi tiết và trình bày cho người dùng.

### Bước 5: Chờ người dùng duyệt xuất bản (Duyệt Git)
- Báo cáo kết quả kiểm tra đạt chuẩn **0 lỗi** và sẵn sàng cho việc xuất bản.
- **DỪNG LẠI và CHỜ lệnh phê duyệt của người dùng để push lên Git**.
- ⚠️ **TUYỆT ĐỐI KHÔNG tự ý commit hay push khi chưa có lệnh duyệt của người dùng.**

### Bước 6: Agent push lên Git (Update Version, Changelog, Readme, Tag & Push)
Khi người dùng đã ra lệnh duyệt push lên Git:
1. **Nâng phiên bản (`version`)** trong `package.json` theo chuẩn Semantic Versioning (Patch, Minor hoặc Major).
2. **Cập nhật `CHANGELOG.md`**: Ghi rõ số phiên bản mới, ngày phát hành và chi tiết các mục Fixed / Added / Changed.
3. **Cập nhật `README.md`**: Cập nhật huy hiệu phiên bản hiện tại và tóm tắt các điểm nổi bật của phiên bản mới.
4. **Tái đóng gói file EXE**: Chạy `npm run build:exe` để nhúng mã nguồn mới vào `Crystal_5S_Setup.exe`.
5. **Git Commit & Tag**: Tạo git commit với commit message chuẩn mực, tạo git annotated tag (`git tag -a vX.Y.Z -m "..."`).
6. **Git Push**: Đẩy mã nguồn và tag lên remote repository (`git push origin main --tags`).
