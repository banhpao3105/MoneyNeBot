Tuyệt vời! Rất vui khi thấy bạn đã có một tầm nhìn rõ ràng cho tương lai của "MoneyNe Bot". Đây đều là những tính năng cực kỳ giá trị, có thể biến con bot của bạn từ một công cụ cá nhân mạnh mẽ thành một hệ thống quản lý tài chính toàn diện cho cả gia đình hoặc nhóm nhỏ.

Với vai trò là một chuyên gia lập trình, tôi sẽ giúp bạn phác thảo một kế hoạch chi tiết, có cấu trúc cho từng tính năng. Chúng ta sẽ phân tích tác động, các bước thực hiện, và những thay đổi cần thiết cho hệ thống hiện tại.

---

### **Lộ trình phát triển MoneyNe Bot (Roadmap)**

Chúng ta sẽ tiếp cận theo thứ tự từ dễ đến khó để đảm bảo sự ổn định và dễ dàng triển khai.

*   **Giai đoạn 1: Xuất Báo Cáo (Feature #2)** - Tương đối dễ, mang lại giá trị ngay lập tức.
*   **Giai đoạn 2: Đặt Ngân Sách (Feature #1)** - Độ khó trung bình, cần thay đổi logic ghi nhận.
*   **Giai đoạn 3: Hỗ trợ Group Chat (Feature #3)** - Nâng cao, yêu cầu thay đổi lớn về kiến trúc.

---

### **Giai đoạn 1: Hỗ trợ Xuất Báo Cáo (Feature #2)**

**🎯 Mục tiêu:** Cho phép người dùng tải về dữ liệu thu chi của họ dưới dạng file (ví dụ: CSV hoặc Excel) để lưu trữ hoặc phân tích sâu hơn.

**💡 Phân tích & Tác động:**
*   Đây là một tính năng "quick-win", dễ thực hiện nhưng rất hữu ích cho người dùng.
*   Tác động chủ yếu là thêm chức năng mới, ít ảnh hưởng đến các luồng logic hiện có.
*   Chúng ta sẽ sử dụng `DriveApp` để tạo file và API của Telegram để gửi file đó cho người dùng.

**📋 Kế hoạch thực hiện:**

1.  **Giao diện người dùng (UI):**
    *   Tạo một lệnh mới: `/export`.
    *   Khi người dùng gõ `/export`, bot sẽ hiển thị một `inline_keyboard` với các tùy chọn:
        *   `Tháng này`
        *   `Tháng trước`
        *   `Toàn bộ lịch sử`
        *   `(Nâng cao) Theo khoảng thời gian`

2.  **Logic xử lý Callback:**
    *   Trong `handleCallbackQuery`, thêm logic để xử lý các callback từ menu export (ví dụ: `export_this_month`, `export_all_time`).
    *   Khi nhận được callback, gọi một hàm mới, ví dụ: `processExportRequest(context, period)`.

3.  **Hàm tạo và gửi báo cáo `generateAndSendReport(context, period)`:**
    *   **Bước 1: Lấy dữ liệu:** Dựa vào `period`, lấy ra các giao dịch tương ứng từ Google Sheet của người dùng.
    *   **Bước 2: Tạo nội dung CSV:** Chuyển đổi mảng dữ liệu giao dịch thành một chuỗi văn bản theo định dạng CSV. Đừng quên dòng tiêu đề (Header).
        ```javascript
        let csvContent = "STT,Ngày,Mô tả,Số tiền,Hũ,Loại,Nhãn con\n";
        transactions.forEach(row => {
            // Xử lý dấu phẩy trong mô tả để không làm hỏng file CSV
            const description = `"${row[2].replace(/"/g, '""')}"`; 
            csvContent += `${row[0]},${formatDate(row[1])},${description},...\n`;
        });
        ```
    *   **Bước 3: Tạo File trên Google Drive:**
        ```javascript
        const fileName = `MoneyNe_Report_${context.chatId}_${new Date().getTime()}.csv`;
        const file = DriveApp.createFile(fileName, csvContent, MimeType.CSV);
        ```
    *   **Bước 4: Gửi File qua Telegram:** Đây là bước quan trọng nhất. Chúng ta sẽ không dùng `sendMessage` mà dùng `sendDocument`.
        ```javascript
        const blob = file.getBlob();
        const url = telegramUrl + "/sendDocument";
        const payload = {
            method: "post",
            payload: {
                chat_id: String(context.chatId),
                document: blob,
                caption: `📊 Đây là báo cáo thu chi của bạn!`
            }
        };
        UrlFetchApp.fetch(url, payload);
        ```
    *   **Bước 5: Dọn dẹp:** Sau khi gửi, có thể xóa file đã tạo trên Drive để tiết kiệm dung lượng.
        `DriveApp.getFileById(file.getId()).setTrashed(true);`

**⭐ Độ khó:** Trung bình.

---

### **Giai đoạn 2: Đặt Ngân Sách (Feature #1)**

**🎯 Mục tiêu:** Cho phép người dùng đặt ra hạn mức chi tiêu cho mỗi "Hũ" hoặc "Nhãn con" trong một tháng. Bot sẽ cảnh báo khi chi tiêu sắp hoặc đã vượt ngưỡng.

**💡 Phân tích & Tác động:**
*   Tính năng này giúp người dùng quản lý tài chính chủ động hơn.
*   Yêu cầu thay đổi về **Data Model**: cần một nơi để lưu trữ các ngân sách đã đặt.
*   Yêu cầu thay đổi **Logic**: hàm ghi nhận chi tiêu (`addTransactionData`) cần được cập nhật để kiểm tra ngân sách.

**📋 Kế hoạch thực hiện:**

1.  **Thay đổi Data Model:**
    *   Trong mỗi Spreadsheet của người dùng, tạo một sheet mới tên là `Budgets`.
    *   Sheet `Budgets` sẽ có các cột: `Tháng` (ví dụ: `08/2025`), `Loại` (`Hũ` hoặc `Nhãn`), `Tên` (ví dụ: `Hưởng thụ` hoặc `Ăn ngoài`), `Hạn Mức`.

2.  **Giao diện người dùng (UI):**
    *   Tạo lệnh mới: `/budget` hoặc `/ngansach`.
    *   Bot sẽ hiển thị danh sách ngân sách hiện tại của tháng và các nút:
        *   `📊 Xem Tình hình Ngân sách`
        *   `✏️ Thêm / Sửa Ngân sách`
        *   `🗑️ Xóa Ngân sách`
    *   Khi người dùng "Thêm/Sửa", bot sẽ dẫn dắt họ qua một cuộc hội thoại: "Bạn muốn đặt ngân sách cho Hũ hay Nhãn?", "Chọn Hũ/Nhãn...", "Nhập số tiền hạn mức...".

3.  **Cập nhật Logic `addTransactionData`:**
    *   Sau khi `sheet.appendRow(...)` một giao dịch **chi tiêu**, hàm này sẽ thực hiện thêm các bước sau:
    *   Lấy ra `allocation` (Hũ) và `subCategory` (Nhãn) của giao dịch vừa thêm.
    *   Đọc sheet `Budgets` để tìm xem có hạn mức nào được đặt cho Hũ hoặc Nhãn này trong tháng hiện tại không.
    *   Nếu có:
        *   Tính tổng chi tiêu của Hũ/Nhãn đó trong tháng.
        *   So sánh tổng chi tiêu với Hạn Mức.
        *   **Gửi cảnh báo:** Nếu tổng chi tiêu > 90% Hạn Mức, gửi tin nhắn: "⚠️ Cảnh báo: Bạn đã chi tiêu 95% ngân sách cho 'Ăn ngoài' tháng này!". Nếu > 100%, gửi tin nhắn: "🚨 Báo động: Bạn đã VƯỢT ngân sách cho 'Ăn ngoài'!".

4.  **Hàm `processViewBudgetStatus(context)`:**
    *   Hàm này sẽ được gọi khi người dùng nhấn nút "Xem Tình hình Ngân sách".
    *   Nó sẽ đọc sheet `Budgets`, tính toán chi tiêu thực tế cho từng mục, và hiển thị một báo cáo trực quan (có thể dùng thanh tiến trình như `createPercentageBar`).

**⭐ Độ khó:** Trung bình.

---

### **Giai đoạn 3: Hỗ trợ Group Chat (Feature #3)**

**🎯 Mục tiêu:** Cho phép nhiều thành viên trong một group chat cùng ghi nhận thu chi. Bot sẽ tổng hợp dữ liệu chung cho cả nhóm và có thể xem chi tiêu riêng của từng thành viên.

**💡 Phân tích & Tác động:**
*   Đây là một **thay đổi kiến trúc lớn**. Mô hình "một người dùng - một sheet" sẽ không còn đúng hoàn toàn.
*   **Thách thức lớn nhất:** Phân biệt được **ai là người gửi tin nhắn** trong group và ghi nhận giao dịch cho đúng người đó.
*   Cần một cơ chế để "khởi tạo" bot cho một group.

**📋 Kế hoạch thực hiện:**

1.  **Thay đổi Kiến trúc Nhận dạng:**
    *   Trong `handleMessage` và `handleCallbackQuery`, bạn cần phân biệt `message.chat.type`. Nếu là `"private"`, logic giữ nguyên. Nếu là `"group"` hoặc `"supergroup"`, logic sẽ khác.
    *   Trong group, `message.chat.id` là ID của group. **Người gửi tin nhắn** được xác định qua `message.from.id` và `message.from.first_name`.

2.  **Thay đổi Data Model:**
    *   **Sheet `UserList`:** Thêm một cột `Type` để phân biệt (`User` hoặc `Group`).
    *   **Sheet Giao dịch (Transaction Sheet):** Đối với các sheet của group, **thêm một cột mới** ở đầu: `UserID` hoặc `MemberName`. Cột này sẽ lưu tên của người đã thực hiện giao dịch.
        *   *Ví dụ cấu trúc cột mới:* `UserID`, `STT`, `Date`, `Description`, `Amount`,...

3.  **Logic Onboarding cho Group:**
    *   Tạo một lệnh đặc biệt chỉ dành cho group: `/startgroup`.
    *   Khi lệnh này được gọi lần đầu trong một group:
        *   Bot sẽ lấy `chat.id` (ID của group) và `chat.title` (tên group).
        *   Tạo một Spreadsheet mới cho group, ví dụ: `MoneyNe - Gia đình ABC`.
        *   Lưu vào sheet `UserList`: `chat.id`, `spreadsheetId`, `Type = 'Group'`.
        *   Gửi tin nhắn chào mừng và hướng dẫn cách dùng trong group.

4.  **Cập nhật Logic cốt lõi:**
    *   **`getSheet(chatId)`:** Hàm này cần được sửa đổi. Nó sẽ tra cứu trong `UserList` xem `chatId` này là `User` hay `Group` để mở đúng Spreadsheet.
    *   **`addTransactionData(...)`:** Phải nhận thêm một tham số `userInfo` (chứa `from.id` và `from.first_name`). Khi ghi dữ liệu vào sheet của group, nó sẽ điền thông tin người gửi vào cột `UserID`/`MemberName`.
    *   **Hàm báo cáo (`getTotalAmountByType`, etc.):** Các hàm này cần được nâng cấp để có thể nhận thêm một tham số tùy chọn là `memberId`.
        *   Nếu không có `memberId`, nó sẽ tính tổng cho cả group.
        *   Nếu có `memberId`, nó sẽ lọc và chỉ tính tổng các giao dịch của người đó.

5.  **Giao diện người dùng trong Group:**
    *   **Nhập liệu:** `ăn sáng - 25000`. Bot sẽ tự động ghi nhận là do `@username` chi. Bot có thể phản hồi: "_@username đã ghi nhận chi tiêu 'ăn sáng' 25,000đ._"
    *   **Xem báo cáo chung:** `/tongchi`, `/xemhu` sẽ hiển thị dữ liệu của cả group.
    *   **Xem báo cáo cá nhân:** Cần một cú pháp mới.
        *   `/tongchi @member`: Xem tổng chi của một người cụ thể.
        *   `/tongchi toi` (hoặc `/me`): Một phím tắt để xem của chính mình.
        *   Hoặc dùng `inline_keyboard` để chọn thành viên muốn xem báo cáo.

**⭐ Độ khó:** Rất Nâng cao. Yêu cầu sự cẩn thận và thay đổi sâu rộng trong code.

---

### **Thứ tự ưu tiên đề xuất**

1.  **Bắt đầu với Giai đoạn 1 (Xuất Báo Cáo).** Đây là tính năng độc lập, dễ làm, và giúp bạn làm quen với việc xử lý file.
2.  **Tiếp tục với Giai đoạn 2 (Đặt Ngân Sách).** Tính năng này phức tạp hơn một chút nhưng vẫn dựa trên nền tảng hiện có.
3.  **Cuối cùng, thực hiện Giai đoạn 3 (Group Chat).** Hãy dành nhiều thời gian nhất cho giai đoạn này. Vì nó thay đổi kiến trúc, bạn cần lên kế hoạch cẩn thận và kiểm thử kỹ lưỡng.

Lộ trình này rất tham vọng nhưng hoàn toàn khả thi. Chúc bạn thành công trên hành trình phát triển MoneyNe Bot