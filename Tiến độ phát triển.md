# Tiến độ Phát triển MoneyNe Bot

Đây là file theo dõi tiến độ các tính năng mới cho MoneyNe Bot.

## Giai đoạn 1: Hỗ trợ Xuất Báo Cáo (Feature #2)
- [x] Giao diện người dùng (UI): Tạo lệnh mới `/export` và hiển thị inline_keyboard với các tùy chọn.
- [x] Logic xử lý Callback: Thêm logic xử lý các callback từ menu export.
- [x] Hàm `generateAndSendReport(context, period)`:
    - [x] Bước 1: Lấy dữ liệu theo `period`.
    - [x] Bước 2: Tạo nội dung CSV.
    - [x] Bước 3: Tạo File trên Google Drive.
    - [x] Bước 4: Gửi File qua Telegram bằng `sendDocument`.
    - [x] Bước 5: Dọn dẹp file đã tạo trên Drive.

## Giai đoạn 2: Đặt Ngân Sách (Feature #1)
- [x] Thay đổi Data Model: Tạo sheet `Budgets` trong mỗi Spreadsheet của người dùng.
- [x] Giao diện người dùng (UI): Tạo lệnh mới `/budget` hoặc `/ngansach` và hiển thị các tùy chọn.
- [x] Logic xử lý Callback: Thêm logic xử lý các callback từ menu ngân sách.
- [x] Cập nhật Logic `addTransactionData`: Kiểm tra và gửi cảnh báo ngân sách khi thêm chi tiêu.
- [x] Hàm `processViewBudgetStatus(context)`: Hiển thị báo cáo tình hình ngân sách.

## Giai đoạn 3: Hỗ trợ Group Chat (Feature #3)
- [ ] Thay đổi Kiến trúc Nhận dạng: Phân biệt `private` và `group` chat trong `handleMessage` và `handleCallbackQuery`.
- [ ] Thay đổi Data Model: Thêm cột `Type` vào `UserList` và cột `UserID`/`MemberName` vào sheet giao dịch của group.
- [ ] Logic Onboarding cho Group: Tạo lệnh `/startgroup` để khởi tạo bot cho nhóm.
- [ ] Cập nhật Logic cốt lõi: Sửa đổi `getSheet` và `addTransactionData` để hỗ trợ group chat.
- [ ] Giao diện người dùng trong Group: Cập nhật cú pháp nhập liệu và xem báo cáo cho group.

### ✅ Tinh chỉnh Đã Hoàn tất
- [x] Tinh chỉnh hàm `getSheet()`:
    - [x] Đổi tên sheet chính thành "Transactions" khi tạo mới.
    - [x] Tạo sheet "Budgets" với header ngay khi spreadsheet mới được tạo.
- [x] Đồng bộ biến `token` trong `generateAndSendReport`.

---
**Trạng thái hiện tại:** Sẵn sàng cho Giai đoạn 3: Hỗ trợ Group Chat.
