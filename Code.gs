var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
var gemini_token = PropertiesService.getScriptProperties().getProperty('GEMINI_TOKEN');
var main_sheet = PropertiesService.getScriptProperties().getProperty('ID_MAINSHEET');

function getApiKeys() {
  var keysString = PropertiesService.getScriptProperties().getProperty('GEMINI_LISTKEY');
  if (!keysString) return [];
  return JSON.parse(keysString);
}


var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = "CHANGE_YOU_URL_APPSCRIP";


function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
}

function formatNumberWithSeparator(number) {
  return number
    .toString()
}

// Global allocations array (sử dụng cho toàn bộ ứng dụng)
var allocations = [
  'Chi tiêu thiết yếu',
  'Hưởng thụ',
  'Tiết kiệm dài hạn',
  'Giáo dục',
  'Tự do tài chính',
  'Cho đi'
];

// Global subcategories object
var subCategories = {
  'Chi tiêu thiết yếu': ['Nhà ở', 'Ăn ngoài', 'Hóa đơn', 'Đi chợ siêu thị', 'Di chuyển', 'Sức khỏe'],
  'Hưởng thụ': ['Giải trí', 'Thức uống', 'Nhà hàng', 'Mua sắm', 'Chăm sóc bản thân', 'Du lịch', 'Thể thao'],
  'Tiết kiệm dài hạn': ['Mua sắm những món đồ giá trị', 'Những kỳ nghỉ lớn', 'Các mục tiêu cá nhân khác', 'Quỹ dự phòng khẩn cấp'],
  'Giáo dục': ['Sách', 'Khóa học', 'Sự kiện'],
  'Tự do tài chính': ['Đầu tư', 'Kinh doanh', 'Bất động sản', 'Gửi tiết kiệm sinh lời'],
  'Cho đi': ['Từ thiện', 'Giúp đỡ người thân', 'Quà tặng', 'Đóng góp cho cộng đồng']
};

// Global createAllocationKeyboard function
function createAllocationKeyboard() {
  var keyboard = [];
  
  // Tạo hàng keyboard, mỗi hàng 2 button
  for (var i = 0; i < allocations.length; i += 2) {
    var row = [];
    row.push({
      text: allocations[i],
      callback_data: 'edit_allocation_' + allocations[i]
    });
    
    if (i + 1 < allocations.length) {
      row.push({
        text: allocations[i + 1],
        callback_data: 'edit_allocation_' + allocations[i + 1]
      });
    }
    
    keyboard.push(row);
  }
  
  return {
    "inline_keyboard": keyboard
  };
}

// Global createSubCategoryKeyboard function
function createSubCategoryKeyboard(allocation, isEdit) {
  if (!subCategories[allocation]) return null;
  
  var keyboard = [];
  var subs = subCategories[allocation];
  var prefix = isEdit ? 'edit_subcategory_' : 'subcategory_';
  
  // Tạo hàng keyboard, mỗi hàng 2 button
  for (var i = 0; i < subs.length; i += 2) {
    var row = [];
    row.push({
      text: subs[i],
      callback_data: prefix + allocation + '_' + subs[i]
    });
    
    if (i + 1 < subs.length) {
      row.push({
        text: subs[i + 1],
        callback_data: prefix + allocation + '_' + subs[i + 1]
      });
    }
    
    keyboard.push(row);
  }
  
  return {
    "inline_keyboard": keyboard
  };
}

function addTransactionData(userId, date, description, amount, allocation, type, subCategory) {
  var sheet = getSheet(userId); 
  subCategory = subCategory || ""; // Mặc định rỗng nếu không có
  
  sheet.appendRow([date, description, amount, allocation, type, subCategory]);
}


function sendText(chatId, text, keyBoard) {
  var formattedText = formatNumberWithSeparator(text);
  var data = {
    method: "post",
    payload: {
      method: "sendMessage",
      chat_id: String(chatId),
      text: formattedText,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyBoard)
    }
  };
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/', data);
}

var keyBoard = {
  "inline_keyboard": [
    [
      {
        text: 'Xem Tổng Chi Tiêu',
        callback_data: 'totalchi'
      }
    ],
    [
      {
        text: 'Xem Tổng Thu Nhập',
        callback_data: 'totalthunhap'
      }
    ],
    [
      {
        text: 'Xem Số Tiền Hiện Tại',
        callback_data: 'currentbalance'
      }
    ],
    [
      {
        text: 'Xem Chi Tiết Các Hũ',
        callback_data: 'getTotalAllocationBalances'
      }
    ],
    [
      {
        text: 'Xem Lịch Sử Thu/Chi',
        callback_data: 'history'
      }
    ],
    [
      {
        text: 'Open App',
        web_app: {
          url: 'https://moneynebot.blogspot.com/?m=1'
        }
      }
    ],
    [
      {
        text: 'Connect Email',
        callback_data: 'connect_email'
      }
    ]
  ]
};
var menuchi = {
  "inline_keyboard": [
    [
      {
        text: 'Xem Tổng Thu Nhập',
        callback_data: 'totalthunhap'
      },
      {
        text: 'Xem Chi Tiết Các Hũ',
        callback_data: 'getTotalAllocationBalances'
      }
    ]
  ]
};

function doPost(e) {
  var contents = JSON.parse(e.postData.contents);
  var chatId;
  var userName;

  // DEBUG: Log toàn bộ request
  Logger.log("=== DOPOST DEBUG ===");
  Logger.log("Request contents: " + JSON.stringify(contents));
  
  if (contents.callback_query) {
    chatId = contents.callback_query.from.id;
    userName = contents.callback_query.from.first_name;
    var data = contents.callback_query.data;
    
    Logger.log("CALLBACK QUERY DETECTED:");
    Logger.log("Chat ID: " + chatId);
    Logger.log("Callback data: " + data);

    if (data === 'connect_email') {
      sendText(chatId, "Vui lòng nhập email của bạn:");
      return;
    } else if (data.startsWith('bank_')) {
      var bankName = data.split('_')[1]; 
      saveBankToSheet(chatId, bankName); 
      sendText(chatId, "Ngân hàng của bạn đã được kết nối thành công: " + bankName);
      return;
    } else if (data.startsWith('subcategory_')) {
      // Xử lý chọn nhãn con
      var parts = data.split('_');
      var allocation = parts[1];
      var subCategory = parts.slice(2).join('_');
      
      // Lấy thông tin giao dịch tạm từ cache
      var tempTransaction = getTempTransaction(chatId);
      if (tempTransaction) {
        // Lưu giao dịch với subcategory
        addTransactionData(
          chatId, 
          tempTransaction.date, 
          tempTransaction.description, 
          tempTransaction.amount, 
          allocation, 
          tempTransaction.type,
          subCategory
        );
        
        // Lưu thông tin giao dịch vừa tạo để có thể chỉnh sửa
        var transactionInfo = {
          userId: chatId,
          date: tempTransaction.date,
          description: tempTransaction.description,
          amount: tempTransaction.amount,
          allocation: allocation,
          type: tempTransaction.type,
          subCategory: subCategory,
          rowIndex: getLastRowIndex(chatId) // Lấy index của row vừa thêm
        };
        saveTransactionForEdit(chatId, transactionInfo);
        
        // Xóa cache tạm
        clearTempTransaction(chatId);
        
        // Thông báo thành công với keyboard chỉnh sửa
        var typeText = tempTransaction.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        var editKeyboard = {
          "inline_keyboard": [
            [
              {
                text: '✏️ Chỉnh sửa',
                callback_data: 'edit_transaction'
              }
            ]
          ]
        };
        
        sendText(chatId, 
          "✅ Đã ghi nhận " + typeText + ": " + tempTransaction.description + 
          " " + tempTransaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
          " vào hũ " + allocation + " với nhãn " + subCategory,
          editKeyboard
        );
      }
      return;
    } else if (data === 'edit_transaction') {
      // Xử lý chỉnh sửa giao dịch
      Logger.log("DEBUG: edit_transaction callback received for user: " + chatId);
      var transactionInfo = getTransactionForEdit(chatId);
      Logger.log("DEBUG: transactionInfo from cache: " + JSON.stringify(transactionInfo));
      
      if (transactionInfo) {
        // Hiển thị keyboard chọn hũ mới
        var allocationKeyboard = createAllocationKeyboard();
        Logger.log("DEBUG: Allocation keyboard created with " + allocationKeyboard.inline_keyboard.length + " rows");
        
        // Debug keyboard content
        for (var i = 0; i < allocationKeyboard.inline_keyboard.length; i++) {
          var row = allocationKeyboard.inline_keyboard[i];
          Logger.log("Keyboard row " + (i+1) + ": " + JSON.stringify(row));
        }
        
        sendText(chatId, 
          "🔄 Chỉnh sửa giao dịch: " + transactionInfo.description + 
          " " + transactionInfo.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
          "\n\nVui lòng chọn hũ mới:",
          allocationKeyboard
        );
        Logger.log("DEBUG: Edit message sent");
      } else {
        Logger.log("DEBUG: No transaction info found in cache");
        sendText(chatId, "❌ Không tìm thấy thông tin giao dịch để chỉnh sửa. Vui lòng thử lại.");
      }
      return;
    } else if (data.startsWith('edit_allocation_')) {
      // Xử lý chọn hũ mới khi chỉnh sửa
      Logger.log("DEBUG: edit_allocation callback: " + data);
      var allocation = data.replace('edit_allocation_', '');
      var transactionInfo = getTransactionForEdit(chatId);
      Logger.log("DEBUG: Retrieved transaction for edit: " + JSON.stringify(transactionInfo));
      
      if (transactionInfo) {
        // Cập nhật allocation
        transactionInfo.allocation = allocation;
        saveTransactionForEdit(chatId, transactionInfo);
        Logger.log("DEBUG: Updated allocation to: " + allocation);
        
        // Hiển thị keyboard chọn nhãn con cho edit
        var keyboard = createSubCategoryKeyboard(allocation, true);
        sendText(chatId, 
          "Đã chọn hũ: " + allocation + 
          "\nVui lòng chọn nhãn cụ thể:",
          keyboard
        );
        Logger.log("DEBUG: Subcategory keyboard sent");
      } else {
        Logger.log("DEBUG: No transaction info found for edit_allocation");
        sendText(chatId, "❌ Không tìm thấy thông tin giao dịch để chỉnh sửa. Vui lòng thử lại.");
      }
      return;
    } else if (data.startsWith('edit_subcategory_')) {
      // Xử lý chọn nhãn con mới khi chỉnh sửa
      Logger.log("DEBUG: edit_subcategory callback: " + data);
      var parts = data.split('_');
      var allocation = parts[2];
      var subCategory = parts.slice(3).join('_');
      Logger.log("DEBUG: Parsed allocation: " + allocation + ", subCategory: " + subCategory);
      
      var transactionInfo = getTransactionForEdit(chatId);
      Logger.log("DEBUG: Retrieved transaction: " + JSON.stringify(transactionInfo));
      
      if (transactionInfo) {
        // Cập nhật subcategory
        transactionInfo.allocation = allocation;
        transactionInfo.subCategory = subCategory;
        Logger.log("DEBUG: Updated transaction info: " + JSON.stringify(transactionInfo));
        
        // Cập nhật giao dịch trong sheet
        updateTransactionInSheet(transactionInfo);
        Logger.log("DEBUG: Updated transaction in sheet");
        
        // Xóa cache
        clearTransactionForEdit(chatId);
        Logger.log("DEBUG: Cleared edit cache");
        
        // Thông báo thành công
        var typeText = transactionInfo.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        sendText(chatId, 
          "✅ Đã cập nhật " + typeText + ": " + transactionInfo.description + 
          " " + transactionInfo.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
          " vào hũ " + allocation + " với nhãn " + subCategory
        );
        Logger.log("DEBUG: Success message sent");
      } else {
        Logger.log("DEBUG: No transaction info found for edit_subcategory");
        sendText(chatId, "❌ Không tìm thấy thông tin giao dịch để chỉnh sửa. Vui lòng thử lại.");
      }
      return;
    } else {
      // Log unhandled callback
      Logger.log("DEBUG: Unhandled callback in first block: " + data);
      Logger.log("Available handlers: connect_email, bank_, subcategory_, edit_transaction, edit_allocation_, edit_subcategory_");
    }
  } else if (contents.message) {
    chatId = contents.message.chat.id;
    userName = contents.message.from.first_name;
    var text = contents.message.text;
    if (contents.message.voice) {
      var fileId = contents.message.voice.file_id;
      processVoiceMessage(fileId, chatId);
      return;
    }

    
    if (isValidEmail(text)) {
      var userId = chatId;
      saveEmailToSheet(userId, text);
      sendBankOptions(chatId); 
      return;
    }
  }

  // (Allocations và functions đã di chuyển thành global)

  // Quản lý cache giao dịch tạm
  function saveTempTransaction(userId, transactionData) {
    var cache = CacheService.getScriptCache();
    cache.put('temp_transaction_' + userId, JSON.stringify(transactionData), 600); // 10 phút
  }

  function getTempTransaction(userId) {
    var cache = CacheService.getScriptCache();
    var data = cache.get('temp_transaction_' + userId);
    return data ? JSON.parse(data) : null;
  }

  function clearTempTransaction(userId) {
    var cache = CacheService.getScriptCache();
    cache.remove('temp_transaction_' + userId);
  }

  // (Cache functions moved to global scope for reusability)

    // (updateTransactionInSheet function moved to global scope)

  if (contents.callback_query) {
    var id_callback = chatId;
    var data = contents.callback_query.data;
    
    Logger.log("SECOND CALLBACK BLOCK:");
    Logger.log("Chat ID: " + id_callback);
    Logger.log("Callback data: " + data);

    if (data === 'totalchi') {
      var userId = chatId;
      var totalExpenses = getTotalAmountByType(userId, "ChiTieu");
      sendText(id_callback, "Tổng chi tiêu của bạn là: " + totalExpenses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), menuchi);
    } else if (data === 'totalthunhap') {
      var userId = chatId;
      sendTotalIncomeSummary(id_callback, userId);
    } else if (data === 'currentbalance') {
      var userId = chatId;
      var currentBalance = getCurrentBalance(userId);
      sendText(id_callback, "Số tiền hiện tại của bạn là: " + currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    } else if (data === 'getTotalAllocationBalances') {
      var userId = chatId;
      sendTotalPhanboSummary(id_callback, userId);
    } else if (data === 'history') {
      var userId = chatId;
      sendTransactionHistory(id_callback, userId);
    } else {
      Logger.log("DEBUG: Unhandled callback in second block: " + data);
    }
  } else if (contents.message) {
    var id_message = chatId;
    var text = contents.message.text;
    if (text === '/clearthunhap') {
      var userId = chatId;
      var sheet = getSheet(userId);
      var data = sheet
        .getDataRange()
        .getValues();
      var newData = [];

      for (var i = 0; i < data.length; i++) {
        if (data[i][4] !== "ThuNhap") {
          newData.push(data[i]);
        }
      }
      
      sheet
        .getDataRange()
        .clearContent();

      
      if (newData.length > 0) {
        sheet
          .getRange(1, 1, newData.length, newData[0].length)
          .setValues(newData);
      }
      sendText(chatId, "Đã xoá các thu nhập.");
      return;
    } else if (text === '/clearchitieu') {
      var userId = chatId;
      var sheet = getSheet(userId);
      var data = sheet
        .getDataRange()
        .getValues();
      var newData = [];

      for (var i = 0; i < data.length; i++) {
        if (data[i][4] !== "ChiTieu") {
          newData.push(data[i]);
        }
      }
      
      sheet
        .getDataRange()
        .clearContent();

      
      if (newData.length > 0) {
        sheet
          .getRange(1, 1, newData.length, newData[0].length)
          .setValues(newData);
      }
      sendText(chatId, "Đã xoá các giao dịch chi tiêu.");
      return;
    } else if (text === '/clearall') {
      var userId = chatId;
      var sheet = getSheet(userId);
      var data = sheet
        .getDataRange()
        .getValues();
      var newData = [];

      for (var i = 0; i < data.length; i++) {
        if (data[i][4] !== "ChiTieu" && data[i][4] !== "ThuNhap") {
          newData.push(data[i]);
        }
      }
      
      sheet
        .getDataRange()
        .clearContent();

      
      if (newData.length > 0) {
        sheet
          .getRange(1, 1, newData.length, newData[0].length)
          .setValues(newData);
      }
      sendText(chatId, "Đã xoá các giao dịch chi tiêu và thu nhập.");
      
      return;
    } else if (text.includes("+")) {
      var parts = text.split(" + ");
      if (parts.length >= 2) {
        var itemWithAllocation = parts[0].trim();
        var amountWithDate = parts[1].trim();
        var allocationAndDate = parts
          .slice(2)
          .join(" ")
          .trim() || "Chi tiêu thiết yếu";
        var allocationParts = itemWithAllocation.split("+");
        var currentDate = new Date(year, month, day);
        var date;

        if (allocationParts.length >= 2) {
          item = allocationParts[0].trim();
          allocationAndDate = allocationParts[1].trim();
        } else {
          item = itemWithAllocation;
        }
        
        var dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{4})/;
        var dateMatch = allocationAndDate.match(dateRegex);

        if (dateMatch) {
          
          var dateParts = dateMatch[0].split(/[/-]/);
          var day = parseInt(dateParts[0]);
          var month = parseInt(dateParts[1]) - 1;
          var year = parseInt(dateParts[2]);
          date = new Date(year, month, day);
          allocationAndDate = allocationAndDate
            .replace(dateRegex, "")
            .trim();
        } else {
          
          var currentDate = new Date();
          var day = currentDate.getDate();
          var month = currentDate.getMonth();
          var year = currentDate.getFullYear();
          date = new Date(year, month, day);
        }
        var amount = parseFloat(amountWithDate);
        var allocation = allocationAndDate || "Chi tiêu thiết yếu";
        var type = "ThuNhap"; 
        if (!isNaN(amount) && allocations.includes(allocation)) {
          // Lưu thông tin giao dịch tạm
          saveTempTransaction(chatId, {
            date: date,
            description: item,
            amount: amount,
            allocation: allocation,
            type: type
          });
          
          // Hiển thị keyboard chọn nhãn con
          var keyboard = createSubCategoryKeyboard(allocation, false);
          sendText(
            id_message,
            "Thu nhập: " + item + " " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
            " vào hũ " + allocation + "\nVui lòng chọn nhãn cụ thể:",
            keyboard
          );
          return;
        } else {
          sendText(
            id_message,
            "Vui lòng cung cấp thông tin thu nhập và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Thu nhập:</b>\n   - <code>nội dung + số tiền</code>\n\n<b>2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm + hũ (Chi tiêu thiết yếu, Hưởng thụ, Tiết kiệm dài hạn, Giáo dục, Tự do tài chính, Cho đi)</code>"
          ); return;
        }
      } else {
        sendText(
          id_message,
          "Vui lòng cung cấp thông tin thu nhập và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Thu nhập:</b>\n   - <code>nội dung + số tiền</code>\n\n<b>2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm + hũ (Chi tiêu thiết yếu, Hưởng thụ, Tiết kiệm dài hạn, Giáo dục, Tự do tài chính, Cho đi)</code>"
        ); return;
        
      }
    } else if (text.includes("-")) {
      var parts = text.split(" - ");
      if (parts.length >= 2) {
        var itemWithAllocation = parts[0].trim();
        var amountWithDate = parts[1].trim();
        var allocationAndDate = parts
          .slice(2)
          .join(" ")
          .trim() || "Chi tiêu thiết yếu";
        var allocationParts = itemWithAllocation.split("-");
        var currentDate = new Date(year, month, day);
        var date;

        if (allocationParts.length >= 2) {
          item = allocationParts[0].trim();
          allocationAndDate = allocationParts[1].trim();
        } else {
          item = itemWithAllocation;
        }
        
        var dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{4})/;
        var dateMatch = allocationAndDate.match(dateRegex);
        if (dateMatch) {
          
          var dateParts = dateMatch[0].split(/[/-]/);
          var day = parseInt(dateParts[0]);
          var month = parseInt(dateParts[1]) - 1;
          var year = parseInt(dateParts[2]);
          date = new Date(year, month, day);
          allocationAndDate = allocationAndDate
            .replace(dateRegex, "")
            .trim();
        } else {
          
          var currentDate = new Date();
          var day = currentDate.getDate();
          var month = currentDate.getMonth();
          var year = currentDate.getFullYear();
          date = new Date(year, month, day);
        }
        var amount = parseFloat(amountWithDate) 
        var allocation = allocationAndDate || "Chi tiêu thiết yếu";
        var type = "ChiTieu"; 
        if (!isNaN(amount) && allocations.includes(allocation)) {
          // Lưu thông tin giao dịch tạm
          saveTempTransaction(chatId, {
            date: date,
            description: item,
            amount: amount,
            allocation: allocation,
            type: type
          });
          
          // Hiển thị keyboard chọn nhãn con
          var keyboard = createSubCategoryKeyboard(allocation, false);
          sendText(
            id_message,
            "Chi tiêu: " + item + " " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
            " vào hũ " + allocation + "\nVui lòng chọn nhãn cụ thể:",
            keyboard
          );
          return;
        } else {
          sendText(
            id_message,
            "Vui lòng cung cấp thông tin Chi tiêu và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Chi tiêu:</b>\n   - <code>nội dung - số tiền</code>\n\n<b>2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm - hũ (Chi tiêu thiết yếu, Hưởng thụ, Tiết kiệm dài hạn, Giáo dục, Tự do tài chính, Cho đi)</code>"
          ); return;

        }
      } else {
        sendText(
          id_message,
          "Vui lòng cung cấp thông tin Chi tiêu và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Chi tiêu:</b>\n   - <code>nội dung - số tiền</code>\n\n<b>2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm - hũ (Chi tiêu thiết yếu, Hưởng thụ, Tiết kiệm dài hạn, Giáo dục, Tự do tài chính, Cho đi)</code>"
        ); return;

      }
    }
    
    if (text.startsWith("/history")) {
      var parts = text.split(" ");
      if (parts.length >= 2) {
        var historyType = parts[1].toLowerCase();
        var userId = chatId;
        var startDate;
        var endDate;

        if (historyType === "today") {
          
          var today = new Date();
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        } else if (historyType === "week") {
          
          var today = new Date();
          var startOfWeek = today.getDate() - today.getDay();
          startDate = new Date(today.getFullYear(), today.getMonth(), startOfWeek);
          endDate = new Date(today.getFullYear(), today.getMonth(), startOfWeek + 7);
        } else if (text.startsWith("/history w")) {
          var parts = text.split(" ");
          if (parts.length === 3 && parts[1] === "w") {
            var weekNumber = parseInt(parts[2]);
            if (!isNaN(weekNumber) && weekNumber >= 1 && weekNumber <= 4) {
              
              var currentDate = new Date();
              var startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), (weekNumber - 1) * 7 + 1);
              var endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), weekNumber * 7 + 1);

              
              sendTransactionHistoryByDateRange(chatId, userId, startDate, endDate);
              return;
            }
          }
          sendText(id_message, "Vui lòng cung cấp tuần hợp lệ, bạn có thể thử /history w 1, /history w 2, /history w 3, /history w 4.");
        } else if (text.startsWith("/history month")) {
          var parts = text.split(" ");
          if (parts.length === 3 && parts[1] === "month") {
            var monthYearStr = parts[2];
            var [month, year] = monthYearStr.split("/");
            if (month && year) {
              month = parseInt(month);
              year = parseInt(year);
              if (!isNaN(month) && !isNaN(year)) {
                
                var startDate = new Date(year, month - 1, 1);
                var endDate = new Date(year, month, 0);
              }
            } else {
              sendText(
                id_message,
                "Vui lòng cung cấp tháng hợp lệ, ví dụ: /history month MM/YYYY"
              );
              return;
            }
          }
        } else if (text.startsWith("/history year")) {
          var parts = text.split(" ");
          if (parts.length === 3 && parts[1] === "year") {
            var year = parseInt(parts[2]);
            if (!isNaN(year)) {
              var startDate = new Date(year, 0, 1);
              var endDate = new Date(year + 1, 0, 1);
            }
          } else {
            sendText(
              id_message,
              "Vui lòng cung cấp năm hợp lệ, ví dụ: /history year YYYY"
            );
            return;
          }
        } else if (parts.length >= 3 && parts[1] === 'd') {
          
          var dateParts = parts
            .slice(2)
            .join(" ")
            .split("/");
          if (dateParts.length === 3) {
            var year = parseInt(dateParts[2]);
            var month = parseInt(dateParts[1]) - 1; 
            var day = parseInt(dateParts[0]);
            startDate = new Date(year, month, day);
            endDate = new Date(year, month, day + 1); 
          } else {
            sendText(
              id_message,
              "Vui lòng cung cấp ngày/tháng/năm hợp lệ, ví dụ: /history d DD/MM/YYYY"
            );
            return;
          }
        } else {
          sendText(
            id_message,
            'Lệnh không hợp lệ. Hãy sử dụng các lệnh sau:\n <b>1. Lịch sử Thu/Chi hôm nay:</b>\n   - <code>/history today</code>\n\n<b>2. Lịch sử Thu/Chi ngày cụ thể:</b>\n   - <code>/history d ngày/tháng/năm</code>\n\n<b>3. Lịch sử Thu/Chi trong tuần:</b>\n   - <code>/history week</code>\n\n<b>4. Lịch sử Thu/Chi trong tuần cụ thể:</b>\n   - <code>/history w 1 (2, 3, 4)</code>\n\n<b>5. Lịch sử Thu/Chi tháng:</b>\n   - <code>/history month tháng/năm</code>\n\n<b>6. Lịch sử Thu/Chi năm:</b>\n   - <code>/history year năm</code>\n'
          ); return;


        }

        sendTransactionHistoryByDateRange(id_message, userId, startDate, endDate);
      } else {
        sendText(
          id_message,
          'Hãy sử dụng các lệnh sau:\n <b>1. Lịch sử Thu/Chi hôm nay:</b>\n   - <code>/history today</code>\n\n<b>2. Lịch sử Thu/Chi ngày cụ thể:</b>\n   - <code>/history d ngày/tháng/năm</code>\n\n<b>3. Lịch sử Thu/Chi trong tuần:</b>\n   - <code>/history week</code>\n\n<b>4. Lịch sử Thu/Chi trong tuần cụ thể:</b>\n   - <code>/history w 1 (2, 3, 4)</code>\n\n<b>5. Lịch sử Thu/Chi tháng:</b>\n   - <code>/history month tháng/năm</code>\n\n<b>6. Lịch sử Thu/Chi năm:</b>\n   - <code>/history year năm</code>\n'
        ); return;
      }
    } else if (text === '/start') {
      
      sendText(id_message, 'Xin chào ' + userName + '! Money Nè là Bot giúp bạn quản lý Thu/Chi, thu nhập có thể phân bổ ra các hũ và còn các tính năng khác nữa. Để biết thêm chi tiết về các lệnh, bạn có thể sử dụng lệnh /help hoặc cũng có thể xem menu Money Nè tại đây.',
        keyBoard
      );
    }
    else if (text === '/menu') {
      
      sendText(id_message, 'Xin chào ' + userName + '! Menu Money Nè tại đây.',
        keyBoard
      );
    } else if (text.startsWith('/del')) {
      var userId = chatId;
      var transactionId;
      var menuthuchi = {
        "inline_keyboard": [
          [
            {
              text: 'Xem số thứ tự Thu/Chi',
              callback_data: 'history'
            }
          ]
        ]
      };
      
      var parts = text.split(' ');

      
      for (var i = 1; i < parts.length; i++) {
        var part = parts[i];
        if (!isNaN(parseInt(part))) {
          
          transactionId = parseInt(part);
          break;
        }
      }

      if (transactionId !== undefined) {
        
        var success = deleteTransactionByRow(userId, transactionId);

        if (success) {
          sendText(id_message, 'Đã xoá thành công Thu/Chi có số thứ tự: ' + transactionId);
        } else {
          sendText(id_message, 'Không tìm thấy thu/chi có số thứ tự ' + transactionId);
        }
      } else {
        sendText(id_message, 'Vui lòng cung cấp số thứ tự của thu/chi cần xoá vào lệnh ví dụ bên dưới.\n Ví dụ: <code>/del số_thứ_tự</code>', menuthuchi);
      }
      return;
    } else if (text === '/help') {
      
      sendText(id_message, `Xin chào ` + userName + `! Dưới đây là cách bạn có thể gửi thông tin về Chi tiêu và Thu nhập của bạn cũng như xem lịch sử chi tiêu:

<b>💳 Chi tiêu:</b>
1. Thêm thông tin Chi tiêu:
  \<code>nội dung - số tiền\</code>

2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:
  \<code>nội dung - số tiền - ngày/tháng/năm\</code>

3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:
  \<code>nội dung - số tiền - ngày/tháng/năm - hũ (Chi tiêu thiết yếu, Hưởng thụ, Tiết kiệm dài hạn, Giáo dục, Tự do tài chính, Cho đi)\</code>

<b>💰 Thu nhập:</b>
1. Thêm thông tin Thu nhập:
  \<code>nội dung + số tiền\</code>

2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:
  \<code>nội dung + số tiền + ngày/tháng/năm\</code>

3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:
  \<code>nội dung + số tiền + ngày/tháng/năm + hũ (Chi tiêu thiết yếu, Hưởng thụ, Tiết kiệm dài hạn, Giáo dục, Tự do tài chính, Cho đi)\</code>

<b>📅 Lịch sử Thu/Chi:</b>
1. Lịch sử Thu/Chi hôm nay:
  \<code>/history today\</code>

2. Lịch sử Thu/Chi ngày cụ thể:
  \<code>/history d ngày/tháng/năm\</code>

3. Lịch sử Thu/Chi trong tuần:
  \<code>/history week\</code>

4. Lịch sử Thu/Chi trong tuần cụ thể:
  \<code>/history w 1 (2, 3, 4)\</code>

5. Lịch sử Thu/Chi tháng:
  \<code>/history month tháng/năm\</code>

6. Lịch sử Thu/Chi năm:
  \<code>/history year năm\</code>

<b>🗑️ Clear:</b>
1. Xoá Thu/Chi:
  \<code>/del\</code>
2. Xoá tất cả chi tiêu:
  \<code>/clearchitieu\</code>
3. Xoá tất cả thu nhập:
  \<code>/clearthunhap\</code>
`);
    } else {
      
      sendText(
        id_message,
        "Xin chào " + userName + "! Để biết thêm chi tiết về các lệnh, bạn có thể sử dụng lệnh /help hoặc cũng có thể xem menu Money Nè tại đây."
      );
    }
  }
}



function addIncomeData(userId, date, content, amount, allocation, subCategory) {
  var sheet = getSheet(userId);
  subCategory = subCategory || "";
  
  var type = "ThuNhap";
  sheet.appendRow([date, content, amount, allocation, type, subCategory]);
}

function addExpenseData(userId, date, item, amount, allocation, subCategory) {
  var sheet = getSheet(userId);
  subCategory = subCategory || "";
  
  var type = "ChiTieu";
  sheet.appendRow([date, item, amount, allocation, type, subCategory]);
}

function getTotalIncome(userId) {
  var sheet = getSheet(userId);
  var data = sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 1)
    .getValues();
  var total = 0;
  for (var i = 0; i < data.length; i++) {
    total += data[i][0];
  }
  return total;
}

function getTotalExpenses(userId) {
  var sheet = getSheet(userId);
  var data = sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 1)
    .getValues();
  var total = 0;
  for (var i = 0; i < data.length; i++) {
    total += data[i][0];
  }
  return total;
}

function getCurrentBalance(userId) {
  var totalIncome = getTotalAmountByType(userId, "ThuNhap");
  var totalExpenses = getTotalAmountByType(userId, "ChiTieu");
  return totalIncome - totalExpenses;
}


function getTotalAllocationBalances(userId) {
  // (Using global allocations array)
  var balances = {};
  for (var i = 0; i < allocations.length; i++) {
    balances[allocations[i]] = 0;
  }
  var sheet = getSheet(userId);
  var data = sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 3)
    .getValues();
  for (var i = 0; i < data.length; i++) {
    var allocation = data[i][1];
    var type = data[i][2];
    if (allocations.includes(allocation)) {
      if (type === "ThuNhap") {
        
        balances[allocation] += data[i][0];
      } else if (type === "ChiTieu") {
        
        balances[allocation] -= data[i][0];
      }
    }
  }
  return balances;
}

function sendTotalPhanboSummary(chatId, userId) {
  var allocations = getTotalAllocationBalances(userId);
  var message = "\nSố tiền phân bổ theo hũ:\n";
  for (var allocation in allocations) {
    message += "- " + allocation + ": " + allocations[allocation].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "\n";
  }
  var menuphanbo = {
    "inline_keyboard": [
      [
        {
          text: 'Xem Tổng Thu Nhập',
          callback_data: 'totalthunhap'
        },
        {
          text: 'Xem Tổng Chi Tiêu',
          callback_data: 'totalchi'
        }
      ]
    ]
  };
  sendText(chatId, message, menuphanbo);
}

function getTransactionHistory(userId, timeframe) {
  var sheet = getSheet(userId);
  var data = sheet
    .getDataRange()
    .getValues();
  var transactions = [];
  var currentDate = new Date();
  for (var i = 1; i < data.length; i++) {
    var transactionDate = new Date(data[i][0]);
    if (transactionDate >= timeframe.startDate && transactionDate < timeframe.endDate) {
      var transaction = {
        date: data[i][0],
        description: data[i][1],
        amount: data[i][2],
        allocation: data[i][3],
        type: data[i][4] 
      };
      transactions.push(transaction);
    }
  }
  return transactions;
}
function getOrCreateFolder(folderName) {
  // Tìm thư mục theo tên
  var folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    // Nếu tìm thấy thư mục, trả về thư mục đầu tiên
    Logger.log("Tìm thấy thư mục: " + folderName);
    return folders.next();
  } else {
    // Nếu chưa có, tạo thư mục mới
    Logger.log("Tạo thư mục mới: " + folderName);
    return DriveApp.createFolder(folderName);
  }
}

// Hàm debug để kiểm tra thư mục và file
function debugFolderAndFiles() {
  Logger.log("=== DEBUG FOLDER AND FILES ===");
  
  // Kiểm tra thư mục Money Capybara
  var folders = DriveApp.getFoldersByName('Money Capybara');
  if (folders.hasNext()) {
    var folder = folders.next();
    Logger.log("Thư mục Money Capybara tồn tại. ID: " + folder.getId());
    
    // Liệt kê file trong thư mục
    var files = folder.getFiles();
    var fileCount = 0;
    while (files.hasNext()) {
      var file = files.next();
      Logger.log("File trong thư mục: " + file.getName() + " (ID: " + file.getId() + ")");
      fileCount++;
    }
    Logger.log("Tổng số file trong thư mục: " + fileCount);
  } else {
    Logger.log("Thư mục Money Capybara không tồn tại");
  }
  
  // Kiểm tra file Expense Tracker ở thư mục gốc
  var rootFiles = DriveApp.getRootFolder().getFilesByName('Expense Tracker');
  var rootFileCount = 0;
  while (rootFiles.hasNext()) {
    var file = rootFiles.next();
    Logger.log("File Expense Tracker ở thư mục gốc: " + file.getName());
    rootFileCount++;
  }
  Logger.log("Số file Expense Tracker ở thư mục gốc: " + rootFileCount);
}

// Hàm test tạo file mới để kiểm tra logic thư mục
function testCreateFileInFolder() {
  Logger.log("=== TEST CREATE FILE IN FOLDER ===");
  
  try {
    // Tạo file test
    var testUserId = "TEST_USER_" + new Date().getTime();
    var newSpreadsheet = SpreadsheetApp.create('Test Expense Tracker for ' + testUserId);
    var sheetId = newSpreadsheet.getId();
    Logger.log("Tạo file test thành công. ID: " + sheetId);
    
    // Lấy thư mục Money Capybara
    var targetFolder = getOrCreateFolder('Money Capybara');
    Logger.log("Lấy/tạo thư mục thành công. ID: " + targetFolder.getId());
    
    // Di chuyển file vào thư mục
    var file = DriveApp.getFileById(sheetId);
    Logger.log("Lấy file thành công. Tên: " + file.getName());
    
    // Thêm file vào thư mục đích
    targetFolder.addFile(file);
    Logger.log("Thêm file vào thư mục thành công");
    
    // Xóa file khỏi thư mục gốc
    var rootFolder = DriveApp.getRootFolder();
    rootFolder.removeFile(file);
    Logger.log("Xóa file khỏi thư mục gốc thành công");
    
    Logger.log("TEST HOÀN THÀNH - File test đã được tạo và di chuyển vào thư mục Money Capybara");
    
    // Chạy debug để kiểm tra kết quả
    debugFolderAndFiles();
    
  } catch (error) {
    Logger.log("LỖI trong quá trình test: " + error.toString());
  }
}

// Hàm test tính năng subcategory
function testSubCategoryKeyboard() {
  Logger.log("=== TEST SUBCATEGORY KEYBOARD ===");
  
  // (Using global allocations array)

  var subCategories = {
    'Chi tiêu thiết yếu': ['Nhà ở', 'Ăn ngoài', 'Hóa đơn', 'Đi chợ siêu thị', 'Di chuyển', 'Sức khỏe'],
    'Hưởng thụ': ['Giải trí', 'Thức uống', 'Nhà hàng', 'Mua sắm', 'Chăm sóc bản thân', 'Du lịch', 'Thể thao'],
    'Tiết kiệm dài hạn': ['Mua sắm những món đồ giá trị', 'Những kỳ nghỉ lớn', 'Các mục tiêu cá nhân khác', 'Quỹ dự phòng khẩn cấp'],
    'Giáo dục': ['Sách', 'Khóa học', 'Sự kiện'],
    'Tự do tài chính': ['Đầu tư', 'Kinh doanh', 'Bất động sản', 'Gửi tiết kiệm sinh lời'],
    'Cho đi': ['Từ thiện', 'Giúp đỡ người thân', 'Quà tặng', 'Đóng góp cho cộng đồng']
  };
  
  function createSubCategoryKeyboard(allocation, isEdit) {
    if (!subCategories[allocation]) return null;
    
    var keyboard = [];
    var subs = subCategories[allocation];
    var prefix = isEdit ? 'edit_subcategory_' : 'subcategory_';
    
    for (var i = 0; i < subs.length; i += 2) {
      var row = [];
      row.push({
        text: subs[i],
        callback_data: prefix + allocation + '_' + subs[i]
      });
      
      if (i + 1 < subs.length) {
        row.push({
          text: subs[i + 1],
          callback_data: prefix + allocation + '_' + subs[i + 1]
        });
      }
      
      keyboard.push(row);
    }
    
    return {
      "inline_keyboard": keyboard
    };
  }
  
  // Test tất cả allocation
  for (var i = 0; i < allocations.length; i++) {
    var allocation = allocations[i];
    Logger.log("Testing keyboard for: " + allocation);
    var keyboard = createSubCategoryKeyboard(allocation, false);
    if (keyboard) {
      Logger.log("Keyboard created with " + keyboard.inline_keyboard.length + " rows");
      for (var j = 0; j < keyboard.inline_keyboard.length; j++) {
        var row = keyboard.inline_keyboard[j];
        Logger.log("Row " + (j+1) + ": " + row.map(function(btn) { return btn.text; }).join(", "));
      }
    }
    Logger.log("---");
  }
  
  Logger.log("TEST SUBCATEGORY KEYBOARD COMPLETED");
}

// Quản lý cache cho chỉnh sửa giao dịch (Global functions)
function saveTransactionForEdit(userId, transactionInfo) {
  var cache = CacheService.getScriptCache();
  cache.put('edit_transaction_' + userId, JSON.stringify(transactionInfo), 1800); // 30 phút
}

function getTransactionForEdit(userId) {
  var cache = CacheService.getScriptCache();
  var data = cache.get('edit_transaction_' + userId);
  return data ? JSON.parse(data) : null;
}

function clearTransactionForEdit(userId) {
  var cache = CacheService.getScriptCache();
  cache.remove('edit_transaction_' + userId);
}

function getLastRowIndex(userId) {
  var sheet = getSheet(userId);
  return sheet.getLastRow();
}

// Cập nhật giao dịch trong sheet
function updateTransactionInSheet(transactionInfo) {
  var sheet = getSheet(transactionInfo.userId);
  var rowIndex = transactionInfo.rowIndex;
  
  // Cập nhật dữ liệu trong hàng
  sheet.getRange(rowIndex, 1, 1, 6).setValues([[
    transactionInfo.date,
    transactionInfo.description,
    transactionInfo.amount,
    transactionInfo.allocation,
    transactionInfo.type,
    transactionInfo.subCategory
  ]]);
}

// Hàm debug callback để kiểm tra
function debugCallback(callbackData, userId) {
  Logger.log("=== DEBUG CALLBACK ===");
  Logger.log("Callback data: " + callbackData);
  Logger.log("User ID: " + userId);
  
  if (callbackData === 'edit_transaction') {
    var transactionInfo = getTransactionForEdit(userId);
    Logger.log("Transaction info from cache: " + JSON.stringify(transactionInfo));
    if (!transactionInfo) {
      Logger.log("ERROR: No transaction info found in cache!");
    }
  } else if (callbackData.startsWith('edit_allocation_')) {
    var allocation = callbackData.replace('edit_allocation_', '');
    Logger.log("Selected allocation: " + allocation);
    var transactionInfo = getTransactionForEdit(userId);
    Logger.log("Transaction info: " + JSON.stringify(transactionInfo));
  } else if (callbackData.startsWith('edit_subcategory_')) {
    var parts = callbackData.split('_');
    var allocation = parts[2];
    var subCategory = parts.slice(3).join('_');
    Logger.log("Selected allocation: " + allocation + ", subCategory: " + subCategory);
  }
  
  Logger.log("=== END DEBUG ===");
}

// Hàm test tính năng chỉnh sửa giao dịch
function testEditTransactionFlow() {
  Logger.log("=== TEST EDIT TRANSACTION FLOW ===");
  
  // (Using global allocations array)

  // Test allocation keyboard
  Logger.log("Testing allocation keyboard:");
  // (Using global createAllocationKeyboard function)
  
  var allocationKeyboard = createAllocationKeyboard();
  Logger.log("Allocation keyboard created with " + allocationKeyboard.inline_keyboard.length + " rows");
  
  // Test edit subcategory keyboard
  Logger.log("Testing edit subcategory keyboards:");
  var subCategories = {
    'Chi tiêu thiết yếu': ['Nhà ở', 'Ăn ngoài', 'Hóa đơn', 'Đi chợ siêu thị', 'Di chuyển', 'Sức khỏe'],
    'Hưởng thụ': ['Giải trí', 'Thức uống', 'Nhà hàng', 'Mua sắm', 'Chăm sóc bản thân', 'Du lịch', 'Thể thao']
  };
  
  function createSubCategoryKeyboard(allocation, isEdit) {
    if (!subCategories[allocation]) return null;
    var keyboard = [];
    var subs = subCategories[allocation];
    var prefix = isEdit ? 'edit_subcategory_' : 'subcategory_';
    for (var i = 0; i < subs.length; i += 2) {
      var row = [];
      row.push({
        text: subs[i],
        callback_data: prefix + allocation + '_' + subs[i]
      });
      if (i + 1 < subs.length) {
        row.push({
          text: subs[i + 1],
          callback_data: prefix + allocation + '_' + subs[i + 1]
        });
      }
      keyboard.push(row);
    }
    return {
      "inline_keyboard": keyboard
    };
  }
  
  var editKeyboard = createSubCategoryKeyboard('Chi tiêu thiết yếu', true);
  Logger.log("Edit keyboard for 'Chi tiêu thiết yếu':");
  for (var i = 0; i < editKeyboard.inline_keyboard.length; i++) {
    var row = editKeyboard.inline_keyboard[i];
    Logger.log("Row " + (i+1) + ": " + row.map(function(btn) { return btn.text + " (" + btn.callback_data + ")"; }).join(", "));
  }
  
  Logger.log("TEST EDIT TRANSACTION FLOW COMPLETED");
}

// Hàm test cache đơn giản  
function testEditCache() {
  Logger.log("=== SIMPLE CACHE TEST ===");
  
  var userId = "TEST_123";
  var testData = {
    userId: userId,
    description: "Test transaction",
    amount: 25000,
    allocation: "Chi tiêu thiết yếu",
    type: "ChiTieu",
    subCategory: "Ăn ngoài",
    rowIndex: 2
  };
  
  Logger.log("1. Saving transaction...");
  try {
    saveTransactionForEdit(userId, testData);
    Logger.log("✅ Save successful");
  } catch (error) {
    Logger.log("❌ Save failed: " + error.toString());
    return;
  }
  
  Logger.log("2. Retrieving transaction...");
  try {
    var retrieved = getTransactionForEdit(userId);
    Logger.log("Retrieved: " + JSON.stringify(retrieved));
    
    if (retrieved && retrieved.description === testData.description) {
      Logger.log("✅ Retrieve successful");
    } else {
      Logger.log("❌ Retrieve failed - data mismatch");
    }
  } catch (error) {
    Logger.log("❌ Retrieve failed: " + error.toString());
    return;
  }
  
  Logger.log("3. Clearing cache...");
  try {
    clearTransactionForEdit(userId);
    var afterClear = getTransactionForEdit(userId);
    if (!afterClear) {
      Logger.log("✅ Clear successful");
    } else {
      Logger.log("❌ Clear failed - data still exists");
    }
  } catch (error) {
    Logger.log("❌ Clear failed: " + error.toString());
  }
  
  Logger.log("=== CACHE TEST COMPLETED ===");
}

// Hàm test keyboard creation
function testKeyboardCreation() {
  Logger.log("=== TEST KEYBOARD CREATION ===");
  
  // (Using global allocations array)

  // (Using global createAllocationKeyboard function)
  
  var keyboard = createAllocationKeyboard();
  Logger.log("Allocation keyboard created:");
  Logger.log(JSON.stringify(keyboard, null, 2));
  
  Logger.log("TEST KEYBOARD CREATION COMPLETED");
}

// Hàm test simulate nhấn nút chỉnh sửa
function testEditButton() {
  Logger.log("=== TEST EDIT BUTTON ===");
  
  var testUserId = "TEST_EDIT_123";
  
  // 1. Tạo mock transaction data trong cache trước
  var mockTransaction = {
    userId: testUserId,
    date: new Date(),
    description: "Cà phê sáng",
    amount: 25000,
    allocation: "Chi tiêu thiết yếu",
    type: "ChiTieu", 
    subCategory: "Ăn ngoài",
    rowIndex: 3
  };
  
  Logger.log("1. Saving mock transaction to cache...");
  saveTransactionForEdit(testUserId, mockTransaction);
  
  // 2. Simulate callback edit_transaction  
  Logger.log("2. Simulating edit_transaction callback...");
  
  // Tạo mock request như Telegram gửi
  var mockRequest = {
    callback_query: {
      from: {
        id: testUserId,
        first_name: "TestUser"
      },
      data: "edit_transaction"
    }
  };
  
  // Simulate doPost với mock request
  var e = {
    postData: {
      contents: JSON.stringify(mockRequest)
    }
  };
  
  Logger.log("3. Calling doPost with mock request...");
  try {
    doPost(e);
    Logger.log("✅ doPost executed successfully");
  } catch (error) {
    Logger.log("❌ doPost failed: " + error.toString());
  }
  
  Logger.log("=== TEST EDIT BUTTON COMPLETED ===");
}

function getSheet(userId) {
  

  
  var usersSpreadsheet = SpreadsheetApp.openById(main_sheet);
  var usersSheet = usersSpreadsheet.getSheetByName('UserList'); 

  
  var userData = usersSheet.getDataRange().getValues();
  var sheetId = null;
  for (var i = 0; i < userData.length; i++) {
    if (userData[i][0] === userId) {
      sheetId = userData[i][1];
      break;
    }
  }

  if (!sheetId) {
    
    var newSpreadsheet = SpreadsheetApp.create('Expense Tracker for ' + userId);
    sheetId = newSpreadsheet.getId();
    
    // Lấy thư mục "Money Capybara"
    var targetFolder = getOrCreateFolder('Money Capybara');
    
    // Di chuyển file vào thư mục
    var file = DriveApp.getFileById(sheetId);
    
    // Thêm file vào thư mục đích
    targetFolder.addFile(file);
    
    // Xóa file khỏi thư mục gốc (My Drive)
    var rootFolder = DriveApp.getRootFolder();
    rootFolder.removeFile(file);

    
    usersSheet.appendRow([userId, sheetId]);

    
    var sheet = newSpreadsheet.getActiveSheet();
    sheet.getRange('A1:F1').setValues([
      ["Date", "Description", "Amount", "Allocation", "Type", "SubCategory"]
    ]);

    
    sheet.deleteColumns(7, 20); 

    
    var numRows = sheet.getMaxRows();
    if (numRows > 2) {
      sheet.deleteRows(3, numRows - 2); 
    }
  }

  
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  return sheet;
}


function sendTotalIncomeSummary(chatId, userId) {
  var totalIncome = getTotalAmountByType(userId, "ThuNhap");
  var totalExpenses = getTotalAmountByType(userId, "ChiTieu");
  var currentBalance = getCurrentBalance(userId);

  var message = "- Tổng thu nhập của bạn là: " + totalIncome.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "\n";
  message += "- Số tiền hiện tại của bạn là: " + currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "\n";



  var menuchithu = {
    "inline_keyboard": [
      [
        {
          text: 'Xem Tổng Chi Tiêu',
          callback_data: 'totalchi'
        },
        {
          text: 'Xem Chi Tiết Các Hũ',
          callback_data: 'getTotalAllocationBalances'
        }
      ]
    ]
  };

  sendText(chatId, message, menuchithu);
}

function getTotalAmountByType(userId, type) {
  var sheet = getSheet(userId);
  var data = sheet
    .getDataRange()
    .getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === type) {
      total += data[i][2];
    }
  }
  return total;
}

function sendTransactionHistoryPart(chatId, userId, transactions, chunkIndex, chunkSize, totalChunks, totalThuNhap, totalChiTieu) {
  var startIndex = chunkIndex * chunkSize;
  var endIndex = Math.min((chunkIndex + 1) * chunkSize, transactions.length);
  var message = "Lịch sử chi tiêu của bạn (Trang " + (chunkIndex + 1) + " / " + totalChunks + "):\n";

  function formatTransaction(transaction, index) {
    var formattedDate = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(transaction.date);
    var formattedAmount = formatNumberWithSeparator(transaction.amount);

    var typeLabel = "";
    var transactionAmount = transaction.amount;

    if (transaction.type === "ChiTieu") {
      typeLabel = "Chi tiêu💸";
      transactionAmount = "<s>-" + formattedAmount + "</s>";
      totalChiTieu += transaction.amount;
    } else if (transaction.type === "ThuNhap") {
      typeLabel = "Thu nhập💰";
      transactionAmount = "<b>+" + formattedAmount + "</b>";
      totalThuNhap += transaction.amount;
    } else {
      typeLabel = transaction.type;
    }

    var transactionString = `
${index + 1}. Ngày: ${formattedDate}
- Mô tả: ${transaction.description}
- Số tiền: ${transactionAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
- Hũ: ${transaction.allocation}
<i>- Loại:</i> ${typeLabel}
`;

    return transactionString;
  }

  for (var i = startIndex; i < endIndex; i++) {
    var transaction = transactions[i];
    message += formatTransaction(transaction, i);
  }

  
  if (chunkIndex == totalChunks - 1) {
    var currentBalance = getCurrentBalance(userId);
    message += "<b>💸 Tổng Chi tiêu: <s>" + totalChiTieu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</s></b>\n";
    message += "<b>💰 Tổng Thu nhập: " + totalThuNhap.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>\n";
    message += "<b>💹 Số tiền hiện tại của bạn là: " + currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>\n";

  }

  
  sendText(chatId, message);

  
  if (chunkIndex < totalChunks - 1) {
    Utilities.sleep(3000); 
    sendTransactionHistoryPart(chatId, userId, transactions, chunkIndex + 1, chunkSize, totalChunks, totalThuNhap, totalChiTieu);
  }
}


function sendTransactionHistory(chatId, userId) {
  var transactions = getTransactionHistory(userId);
  if (transactions.length === 0) {
    sendText(chatId, "Bạn chưa có chi tiêu nào.");
    return;
  }

  var chunkSize = 16; 
  var totalChunks = Math.ceil(transactions.length / chunkSize);
  var totalThuNhap = 0; 
  var totalChiTieu = 0; 

  sendTransactionHistoryPart(chatId, userId, transactions, 0, chunkSize, totalChunks, totalThuNhap, totalChiTieu);
}

function getTransactionHistory(userId) {
  var sheet = getSheet(userId);
  var data = sheet
    .getDataRange()
    .getValues();
  var transactions = [];
  for (var i = 1; i < data.length; i++) {
    var transaction = {
      date: data[i][0],
      description: data[i][1],
      amount: data[i][2],
      allocation: data[i][3],
      type: data[i][4] 
    };
    transactions.push(transaction);
  }
  return transactions;
}


function formatDate(dateStr) {
  var date = new Date(dateStr);
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();
  return day + "/" + month + "/" + year;
}


function sendTransactionHistoryByDateRange(chatId, userId, startDate, endDate) {
  var transactions = getTransactionHistoryByDateRange(userId, startDate, endDate);
  var chunkSize = 16;
  var totalChunks = Math.ceil(transactions.length / chunkSize);

  
  var totalChiTieu = 0;
  var totalThuNhap = 0;

  function sendTransactionHistoryPart(chunkIndex) {
    var message = "Lịch sử chi tiêu từ " + formatDate(startDate) + " đến " + formatDate(endDate) +
      " (Trang " + (chunkIndex + 1) + " / " + totalChunks + "):\n\n";

    var startIndex = chunkIndex * chunkSize;
    var endIndex = Math.min((chunkIndex + 1) * chunkSize, transactions.length);

    for (var i = startIndex; i < endIndex; i++) {
      var transaction = transactions[i];
      var formattedDate = formatDate(transaction.date);
      var typeLabel = "";
      var transactionAmount = transaction.amount;
      var formatTransactionAmount = new Intl.NumberFormat('vi-VN').format(transactionAmount);

      if (transaction.type === "ChiTieu") {
        typeLabel = "Chi tiêu💸";
        transactionAmount = "<s>-" + formatTransactionAmount + "đ</s>";
        totalChiTieu += transaction.amount;
      } else if (transaction.type === "ThuNhap") {
        typeLabel = "Thu nhập💰";
        transactionAmount = "<b>+" + formatTransactionAmount + "đ</b>";
        totalThuNhap += transaction.amount;
      } else {
        typeLabel = transaction.type;
      }

      message += `${i + 1}. Ngày: ${formattedDate}\n`;
      message += "- Mô tả: " + transaction.description + "\n";
      message += "- Số tiền: " + transactionAmount + "\n";
      message += "- Hũ: " + transaction.allocation + "\n";
      message += "<i>- Loại: " + typeLabel + "</i>\n\n";
    }

    
    if (chunkIndex === totalChunks - 1) {
      var currentBalance = getCurrentBalance(userId);
      message += "<b>💸 Tổng Chi tiêu: <s>" + totalChiTieu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</s></b>\n";
      message += "<b>💰 Tổng Thu nhập: " + totalThuNhap.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>\n";
      message += "<b>💹 Số tiền hiện tại: " + currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>\n";
    }

    sendText(chatId, message);

    if (chunkIndex < totalChunks - 1) {
      Utilities.sleep(3000);
      sendTransactionHistoryPart(chunkIndex + 1);
    }
  }

  if (transactions.length === 0) {
    sendText(chatId, "Không có giao dịch nào trong khoảng thời gian này.");
  } else {
    sendTransactionHistoryPart(0);
  }
}






function getTransactionHistoryByDateRange(userId, startDate, endDate) {
  var sheet = getSheet(userId);
  var data = sheet
    .getDataRange()
    .getValues();
  var transactions = [];
  for (var i = 1; i < data.length; i++) {
    var transactionDate = new Date(data[i][0]);
    if (transactionDate >= startDate && transactionDate < endDate) {
      var transaction = {
        date: data[i][0],
        description: data[i][1],
        amount: data[i][2],
        allocation: data[i][3],
        type: data[i][4] 
      };
      transactions.push(transaction);
    }
  }
  return transactions;
}

function formatDate(date) {
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();
  return day + "/" + month + "/" + year;
}

function deleteTransactionByRow(userId, rowToDelete) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();

  
  var rowIndex = rowToDelete - 1; 

  if (rowIndex >= 0 && rowIndex < data.length) {
    
    sheet.deleteRow(rowIndex + 2); 
    return true; 
  } else {
    return false; 
  }
}


function isValidEmail(email) {
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}



function saveEmailToSheet(userId, email) {
  var usersSpreadsheet = SpreadsheetApp.openById(main_sheet);
  var usersSheet = usersSpreadsheet.getSheetByName('UserList'); 

  var data = usersSheet.getDataRange().getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === userId) { 
      usersSheet.getRange(i + 1, 3).setValue(email); 
      break;
    }
  }
}

function sendBankOptions(chatId) {
  var bankKeyboard = {
    "inline_keyboard": [
      [
        { text: 'VIB', callback_data: 'bank_VIB' },
        { text: 'CAKE', callback_data: 'bank_CAKE' },
        { text: 'VPBank', callback_data: 'bank_VPBank' },
        { text: 'ACB', callback_data: 'bank_ACB' }
      ]
    ]
  };
  sendText(chatId, "Vui lòng chọn ngân hàng của bạn:", bankKeyboard);
}


function saveBankToSheet(userId, bankName) {
  var usersSpreadsheet = SpreadsheetApp.openById(main_sheet);
  var usersSheet = usersSpreadsheet.getSheetByName('UserList'); 

  var data = usersSheet.getDataRange().getValues();

  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === userId) { 
      usersSheet.getRange(i + 1, 4).setValue(bankName); 
      break;
    }
  }
}


function stripHtml(html) {
  var doc = DocumentApp.create('temp');
  doc.getBody().setText(html);
  var text = doc.getBody().getText();
  DriveApp.getFileById(doc.getId()).setTrashed(true); 
  return text;
}

function sendToGeminiAPI(emailBody) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + gemini_token;

  const payload = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: "Bạn là một AI Chi tiêu, hãy cho tôi tiền chi tiêu, nội dung(Nội dung, diễn giải) giao dịch và loại ThuNhap hay ChiTieu, nếu không phải có rõ số tiền, nội dung và loại Thu nhập/Chi tiêu thì phản hồi lại trống cho tôi, đây là mail: " + emailBody
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.55,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          amount: { type: "string" },
          type: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  });

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: payload
  };

  try {
    const response = UrlFetchApp.fetch(url, options); 
    const responseData = JSON.parse(response.getContentText()); 

    
    const candidates = responseData.candidates;
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content; 
      const parts = content.parts;
      if (parts && parts.length > 0) {
        const text = parts[0].text; 
        return JSON.parse(text); 
      }
    }
    return null; 
  } catch (error) {
    Logger.log("Lỗi khi gọi API: " + error.message);
    return null; 
  }
}



var geminiApiKeys = getApiKeys();


function getRandomGeminiApiKey() {
  var randomIndex = Math.floor(Math.random() * geminiApiKeys.length);
  return geminiApiKeys[randomIndex];
}




function processVoiceMessage(fileId, chatId) {
  var telegramUrl = "https://api.telegram.org/bot" + token;

  
  var getFileUrl = telegramUrl + "/getFile?file_id=" + fileId;
  var getFileResponse = UrlFetchApp.fetch(getFileUrl);
  var fileInfo = JSON.parse(getFileResponse.getContentText());
  if (!fileInfo.ok) {
    Logger.log("Không lấy được file từ Telegram.");
    sendText(chatId, "Xin lỗi, không thể xử lý tin nhắn voice của bạn.");
    return;
  }
  var filePath = fileInfo.result.file_path;
  var voiceUrl = "https://api.telegram.org/file/bot" + token + "/" + filePath;

  
  var voiceResponse = UrlFetchApp.fetch(voiceUrl);
  var blob = voiceResponse.getBlob();
  var mimeType = blob.getContentType();
  if (mimeType === "application/octet-stream") {
    mimeType = "audio/ogg";
  }
  var numBytes = blob.getBytes().length;
  var displayName = "voice_file";

  
  var apiKey = getRandomGeminiApiKey();
  var initUrl = "https://generativelanguage.googleapis.com/upload/v1beta/files?key=" + apiKey;
  var initHeaders = {
    "X-Goog-Upload-Protocol": "resumable",
    "X-Goog-Upload-Command": "start",
    "X-Goog-Upload-Header-Content-Length": String(numBytes),
    "X-Goog-Upload-Header-Content-Type": mimeType,
    "Content-Type": "application/json"
  };
  var initPayload = JSON.stringify({ file: { display_name: displayName } });
  var initOptions = {
    "method": "post",
    "headers": initHeaders,
    "payload": initPayload,
    "muteHttpExceptions": true
  };

  var initResponse = UrlFetchApp.fetch(initUrl, initOptions);
  var initResponseHeaders = initResponse.getAllHeaders();
  var uploadUrl = initResponseHeaders["X-Goog-Upload-Url"] || initResponseHeaders["x-goog-upload-url"];
  if (!uploadUrl) {
    Logger.log("Không lấy được upload URL: " + initResponse.getContentText());
    sendText(chatId, "Lỗi khi xử lý file voice.");
    return;
  }

  
  var uploadHeaders = {
    "X-Goog-Upload-Offset": "0",
    "X-Goog-Upload-Command": "upload, finalize"
  };
  var uploadOptions = {
    "method": "post",
    "headers": uploadHeaders,
    "payload": blob.getBytes(),
    "muteHttpExceptions": true
  };

  var uploadResponse = UrlFetchApp.fetch(uploadUrl, uploadOptions);
  var uploadResult = JSON.parse(uploadResponse.getContentText());
  var fileUri = uploadResult.file.uri;
  if (!fileUri) {
    Logger.log("Upload thất bại: " + uploadResponse.getContentText());
    sendText(chatId, "Upload file voice thất bại.");
    return;
  }
  Logger.log("File URI: " + fileUri);

  
  var generateUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;
  var generatePayload = JSON.stringify({
    contents: [{
      parts: [
        { "text": 'Bạn là một AI Chi tiêu. Hãy trích xuất thông tin về số tiền, nội dung và loại giao dịch (type luôn đặt là: Thu nhập hoặc Chi tiêu) từ giọng nói. Lưu ý: nhận diện các biểu thức rút gọn và các từ lóng/địa phương liên quan đến tiền tệ. Ví dụ: “củ” tương đương với “triệu", “k hoặc ca hoặc ka” tương đương với “trăm”, “nghìn” hoặc “ngàn” tương đương với “nghìn”, “ty” hoặc “tỉ” tương đương với “tỷ”, “lít” tương đương với “trăm” (các từ rút gọn này chỉ áp dụng khi đi kèm với giá tiền). Nếu không nghe rõ hoặc không nhận diện được số tiền, hãy trả về rỗng {}. Tuyệt đối không được tự suy đoán hay chế thông tin.' },
        { "file_data": { "mime_type": mimeType, "file_uri": fileUri } }
      ]
    }],
    generationConfig: {
      "temperature": 0.2,
      "topK": 64,
      "topP": 0.95,
      "maxOutputTokens": 8192,
      "responseMimeType": "application/json",
      "responseSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "amount": { "type": "string" },
            "type": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      }
    }
  });

  var generateOptions = {
    "method": "post",
    "contentType": "application/json",
    "payload": generatePayload,
    "muteHttpExceptions": true
  };

  var generateResponse = UrlFetchApp.fetch(generateUrl, generateOptions);
  Logger.log("Response: " + generateResponse.getContentText());

  
  
  try {
    var responseData = JSON.parse(generateResponse.getContentText());
    if (responseData && responseData.candidates && responseData.candidates.length > 0) {
      var content = responseData.candidates[0].content;
      if (content.parts && content.parts.length > 0) {
        var resultText = content.parts[0].text;
        
        
        var transactions = JSON.parse(resultText);

        
        recordTransactionsFromAI(chatId, transactions);
      } else {
        sendText(chatId, "Không nhận được nội dung phản hồi từ hệ thống AI.");
      }
    } else {
      sendText(chatId, "AI không nghe rõ được Voice, vui lòng thử lại.");
    }
  } catch (err) {
    Logger.log("Lỗi khi xử lý phản hồi: " + err);
    sendText(chatId, "AI không nghe rõ được Voice, vui lòng thử lại.");
  }
}

function recordTransactionsFromAI(chatId, transactions) {
  
  var isInvalid = transactions.some(function(tx) {
    return !tx.amount || tx.amount.trim() === "";
  });
  
  if (isInvalid) {
    sendText(chatId, "AI không nghe rõ được Voice, vui lòng thử lại.");
    return;
  }
  
  var userId = chatId; 
  var date = new Date();
  var formattedDate = formatDate(date); 
  var messages = [];
  
  transactions.forEach(function (tx) {
    
    var amount = parseInt(tx.amount.replace(/,/g, ''), 10);
    var description = tx.description;
    
    
    var typeLower = tx.type.toLowerCase();
    var transactionType = typeLower.includes("thu") ? "ThuNhap" : typeLower.includes("chi") ? "ChiTieu" : tx.type;
    
    
    var allocation = "Chi tiêu thiết yếu";
    
    
    addTransactionData(userId, date, description, amount, allocation, transactionType, "");
    
    
    if (transactionType === "ThuNhap") {
      messages.push("Bạn đã thu nhâp: " + description + " " + amount.toLocaleString("vi-VN") +
        " vào ngày " + formattedDate + " và phân bổ thu nhập của bạn vào hũ " + allocation + ".");
    } else if (transactionType === "ChiTieu") {
      messages.push("Bạn đã chi tiêu: " + description + " " + amount.toLocaleString("vi-VN") +
        " vào ngày " + formattedDate + " và phân bổ chi tiêu của bạn vào hũ " + allocation + ".");
    } else {
      messages.push("Giao dịch: " + description + " " + amount.toLocaleString("vi-VN") +
        " vào ngày " + formattedDate + ".");
    }
  });
  
  
  sendText(chatId, messages.join("\n"));
}






const bankDomains = {
  "VIB": "vib.com.vn",
  "CAKE": "no-reply@cake.vn",
  "VPBank": ["vpbankonline@vpb.com.vn", "customercare@care.vpb.com.vn"],
  "ACB": "mailalert@acb.com.vn"
};

function checkEmail() {
  const usersSpreadsheet = SpreadsheetApp.openById(main_sheet);
  const usersSheet = usersSpreadsheet.getSheetByName('UserList');
  const data = usersSheet.getDataRange().getValues();

  for (let k = 1; k < data.length; k++) { 
    const emailToCheck = data[k][2]; 
    if (emailToCheck) {
      const bank = data[k][3]; 
      
      if (!bankDomains.hasOwnProperty(bank)) {
        Logger.log("Không có ngân hàng phù hợp: " + bank);
        continue;
      }
      
      let searchQuery = '';
      const domain = bankDomains[bank];
      
      if (bank === "VPBank" && Array.isArray(domain)) {
        searchQuery = '(' + domain.join(' OR ') + ') to:' + emailToCheck;
      } else {
        searchQuery = domain + ' to:' + emailToCheck;
      }
      
      
      searchQuery += " is:unread";
      
      const threads = GmailApp.search(searchQuery);
      for (let i = 0; i < threads.length; i++) {
        const messages = threads[i].getMessages();
        for (let j = 0; j < messages.length; j++) {
          const message = messages[j];
          const emailBody = message.getBody();
          const timestamp = message.getDate();
          const timestampEpoch = timestamp.getTime();

          const apiResponse = sendToGeminiAPI(emailBody); 
          if (apiResponse && apiResponse.amount && apiResponse.type && apiResponse.description) {
            const amount = parseInt(apiResponse.amount.replace(/,/g, '').trim(), 10);
            const explanation = apiResponse.description;
            const type = apiResponse.type;

            const targetSpreadsheetId = data[k][1];
            const targetSpreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
            const targetSheet = targetSpreadsheet.getActiveSheet();
            const targetData = targetSheet.getDataRange().getValues();

            let alreadyRecorded = false;
            for (let m = 1; m < targetData.length; m++) { 
              const recordedTimestamp = targetData[m][5];
              if (recordedTimestamp === timestampEpoch) {
                alreadyRecorded = true;
                break;
              }
            }
            if (!alreadyRecorded) {
              targetSheet.appendRow([timestamp, explanation, amount, "Chi tiêu thiết yếu", type, "", timestampEpoch]);
              Logger.log("Đã ghi nội dung vào sheet.");
            } else {
              Logger.log("Nội dung đã được ghi trước đó.");
            }
          } else {
            Logger.log("API không trả về dữ liệu hợp lệ hoặc nội dung trống.");
          }
        }
        threads[i].markRead();
      }
    } else {
      Logger.log("Bỏ qua hàng rỗng ở dòng: " + (k + 1));
    }
  }
}