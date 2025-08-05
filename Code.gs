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
  Logger.log("Webhook response: " + response.getContentText());
  return response.getContentText();
}

// Function để set webhook với URL cụ thể
function setWebhookWithURL(newWebAppUrl) {
  var url = telegramUrl + "/setWebhook?url=" + newWebAppUrl;
  var response = UrlFetchApp.fetch(url);
  Logger.log("Webhook set to: " + newWebAppUrl);
  Logger.log("Response: " + response.getContentText());
  return response.getContentText();
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
function createAllocationKeyboard(transactionId) {
  var keyboard = [];
  
  // Tạo hàng keyboard, mỗi hàng 2 button
  for (var i = 0; i < allocations.length; i += 2) {
    var row = [];
    
    // Phân biệt format cho transaction mới vs edit
    var callbackPrefix = '';
    if (transactionId) {
      // Edit transaction: edit_alloc_tx_123456_0
      callbackPrefix = 'edit_alloc_' + transactionId + '_';
    } else {
      // Transaction mới: allocation_0
      callbackPrefix = 'allocation_';
    }
    
    row.push({
      text: allocations[i],
      callback_data: callbackPrefix + i // Dùng index thay tên
    });
    
    if (i + 1 < allocations.length) {
      row.push({
        text: allocations[i + 1],
        callback_data: callbackPrefix + (i + 1) // Dùng index thay tên
      });
    }
    
    keyboard.push(row);
  }
  
  return {
    "inline_keyboard": keyboard
  };
}

// Helper function để tạo edit keyboard
function createEditKeyboard(transactionId) {
  var callbackData = transactionId ? 'edit_transaction_' + transactionId : 'edit_transaction';
  return {
    "inline_keyboard": [
      [
        {
          text: '✏️ Chỉnh sửa',
          callback_data: callbackData
        }
      ]
    ]
  };
}

// Global createSubCategoryKeyboard function
function createSubCategoryKeyboard(allocation, isEdit, transactionId, allocationIndex) {
  if (!subCategories[allocation]) return null;
  
  var keyboard = [];
  var subs = subCategories[allocation];
  var prefix = '';
  
  if (isEdit && transactionId && (allocationIndex !== undefined && allocationIndex >= 0)) {
    // Format mới ngắn: edit_sub_tx_123456_0_1 (allocationIndex_subIndex)
    prefix = 'edit_sub_' + transactionId + '_' + allocationIndex + '_';
  } else if (isEdit && transactionId) {
    // Format cũ dài: edit_subcategory_tx_123456_AllocationName_
    prefix = 'edit_subcategory_' + transactionId + '_' + allocation + '_';
  } else if (isEdit) {
    // Format cũ không có transactionId
    prefix = 'edit_subcategory_' + allocation + '_';
  } else {
    // Format thường cho transaction mới
    prefix = 'subcategory_' + allocation + '_';
  }
  
  // Tạo hàng keyboard, mỗi hàng 2 button
  for (var i = 0; i < subs.length; i += 2) {
    var row = [];
    
    if (isEdit && transactionId && (allocationIndex !== undefined && allocationIndex >= 0)) {
      // Dùng index cho subcategory để rút ngắn
      row.push({
        text: subs[i],
        callback_data: prefix + i // subcategory index
      });
      
      if (i + 1 < subs.length) {
        row.push({
          text: subs[i + 1],
          callback_data: prefix + (i + 1) // subcategory index
        });
      }
    } else {
      // Dùng tên subcategory (format cũ)
      row.push({
        text: subs[i],
        callback_data: prefix + subs[i]
      });
      
      if (i + 1 < subs.length) {
        row.push({
          text: subs[i + 1],
          callback_data: prefix + subs[i + 1]
        });
      }
    }
    
    keyboard.push(row);
  }
  
  // Thêm nút "Quay lại" ở hàng cuối
  var backButtonData = '';
  if (isEdit && transactionId) {
    // Cho edit flow: quay lại chọn hũ
    backButtonData = 'edit_transaction_' + transactionId;
  } else {
    // Cho transaction mới: quay lại chọn hũ  
    backButtonData = 'back_to_allocation';
  }
  
  keyboard.push([{
    text: "🔙 Quay lại chọn hũ",
    callback_data: backButtonData
  }]);
  
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

// Function để edit tin nhắn hiện tại thay vì gửi tin nhắn mới
function editText(chatId, messageId, text, keyBoard) {
  var formattedText = formatNumberWithSeparator(text);
  var data = {
    method: "post",
    payload: {
      method: "editMessageText",
      chat_id: String(chatId),
      message_id: String(messageId),
      text: formattedText,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyBoard)
    }
  };
  
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/', data);
    Logger.log("DEBUG: Message edited successfully");
    return true;
  } catch (error) {
    Logger.log("DEBUG: Failed to edit message: " + error.toString());
    // Fallback: gửi tin nhắn mới nếu không edit được
    sendText(chatId, text, keyBoard);
    return false;
  }
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
    var messageId = contents.callback_query.message.message_id;
    
    Logger.log("CALLBACK QUERY DETECTED:");
    Logger.log("Chat ID: " + chatId);
    Logger.log("Message ID: " + messageId);
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
        var transactionId = 'tx_' + Date.now(); // Unique ID cho transaction
        var transactionInfo = {
          userId: chatId,
          transactionId: transactionId,
          date: tempTransaction.date,
          description: tempTransaction.description,
          amount: tempTransaction.amount,
          allocation: allocation,
          type: tempTransaction.type,
          subCategory: subCategory,
          rowIndex: getLastRowIndex(chatId) // Lấy index của row vừa thêm
        };
        saveTransactionForEdit(chatId, transactionInfo, transactionId);
        
        // Xóa cache tạm
        clearTempTransaction(chatId);
        
        // Thông báo thành công với keyboard chỉnh sửa
        var typeText = tempTransaction.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        var editKeyboard = createEditKeyboard(transactionId);
        
        editText(chatId, messageId,
          "✅ Đã ghi nhận " + typeText + ": " + tempTransaction.description + 
          " " + tempTransaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
          " vào hũ " + allocation + " với nhãn " + subCategory,
          editKeyboard
        );
      }
      return;
    } else if (data === 'edit_transaction' || data.startsWith('edit_transaction_')) {
      // Xử lý chỉnh sửa giao dịch
      Logger.log("DEBUG: edit_transaction callback received for user: " + chatId);
      var transactionId = data.startsWith('edit_transaction_') ? data.replace('edit_transaction_', '') : null;
      Logger.log("DEBUG: Transaction ID: " + transactionId);
      var transactionInfo = getTransactionForEdit(chatId, transactionId);
      Logger.log("DEBUG: transactionInfo from cache: " + JSON.stringify(transactionInfo));
      
      if (transactionInfo) {
        // Hiển thị keyboard chọn hũ mới với transactionId
        var allocationKeyboard = createAllocationKeyboard(transactionInfo.transactionId);
        Logger.log("DEBUG: Allocation keyboard created with " + allocationKeyboard.inline_keyboard.length + " rows");
        
        // Debug keyboard content
        for (var i = 0; i < allocationKeyboard.inline_keyboard.length; i++) {
          var row = allocationKeyboard.inline_keyboard[i];
          Logger.log("Keyboard row " + (i+1) + ": " + JSON.stringify(row));
        }
        
        editText(chatId, messageId,
          "🔄 Chỉnh sửa giao dịch: " + transactionInfo.description + 
          " " + transactionInfo.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
          "\n\nVui lòng chọn hũ mới:",
          allocationKeyboard
        );
        Logger.log("DEBUG: Edit message sent");
      } else {
        Logger.log("DEBUG: No transaction info found in cache");
        editText(chatId, messageId, "❌ Không tìm thấy thông tin giao dịch để chỉnh sửa. Vui lòng thử lại.", null);
      }
      return;
    } else if (data.startsWith('edit_allocation_') || data.startsWith('edit_alloc_')) {
      // Xử lý chọn hũ mới khi chỉnh sửa (format mới ngắn hơn)
      Logger.log("DEBUG: edit_allocation callback: " + data);
      
      // Parse transactionId và allocation index từ callback_data
      var parts = data.split('_');
      var transactionId = null;
      var allocationIndex = -1;
      var allocation = '';
      
      if (data.startsWith('edit_alloc_') && parts.length >= 4 && parts[2] === 'tx') {
        // Format mới: edit_alloc_tx_123456_0
        // parts = ['edit', 'alloc', 'tx', '123456', '0']
        transactionId = parts[2] + '_' + parts[3]; // Tái tạo 'tx_123456'
        allocationIndex = parseInt(parts[4]);
        allocation = allocations[allocationIndex]; // Lấy tên từ index
      } else if (data.startsWith('edit_allocation_') && parts.length > 3 && parts[2] === 'tx') {
        // Format cũ: edit_allocation_tx_123456_AllocationName (backward compatibility)
        transactionId = parts[2] + '_' + parts[3];
        allocation = parts.slice(4).join('_');
      } else {
        // Format cũ nhất: edit_allocation_AllocationName (backward compatibility)
        allocation = parts.slice(2).join('_');
      }
      
      Logger.log("DEBUG: Parsed transactionId: " + transactionId + ", allocationIndex: " + allocationIndex + ", allocation: " + allocation);
      Logger.log("DEBUG: ChatId: " + chatId);
      
      // Luôn sử dụng transactionId nếu có, không fallback sang userId
      var transactionInfo = null;
      if (transactionId) {
        transactionInfo = getTransactionForEdit(chatId, transactionId);
      } else {
        // Backward compatibility - chỉ khi không có transactionId
        transactionInfo = getTransactionForEdit(chatId);
      }
      Logger.log("DEBUG: Retrieved transaction for edit: " + JSON.stringify(transactionInfo));
      
      if (transactionInfo) {
        // Cập nhật allocation
        transactionInfo.allocation = allocation;
        saveTransactionForEdit(chatId, transactionInfo, transactionInfo.transactionId);
        Logger.log("DEBUG: Updated allocation to: " + allocation);
        
        // Hiển thị keyboard chọn nhãn con cho edit
        var keyboard = createSubCategoryKeyboard(allocation, true, transactionInfo.transactionId, allocationIndex);
        editText(chatId, messageId,
          "Đã chọn hũ: " + allocation + 
          "\nVui lòng chọn nhãn cụ thể:",
          keyboard
        );
        Logger.log("DEBUG: Subcategory keyboard sent");
      } else {
        Logger.log("DEBUG: No transaction info found for edit_allocation");
        editText(chatId, messageId, "❌ Không tìm thấy thông tin giao dịch để chỉnh sửa. Vui lòng thử lại.", null);
      }
      return;
    } else if (data.startsWith('edit_subcategory_') || data.startsWith('edit_sub_')) {
      // Xử lý chọn nhãn con mới khi chỉnh sửa
      Logger.log("DEBUG: edit_subcategory callback: " + data);
      var parts = data.split('_');
      var transactionId = null;
      var allocation = '';
      var subCategory = '';
      var allocationIndex = -1;
      var subCategoryIndex = -1;
      
      if (data.startsWith('edit_sub_') && parts.length >= 6 && parts[2] === 'tx') {
        // Format mới ngắn: edit_sub_tx_123456_0_1 (allocationIndex_subCategoryIndex)
        // parts = ['edit', 'sub', 'tx', '123456', '0', '1']
        transactionId = parts[2] + '_' + parts[3]; // Tái tạo 'tx_123456'
        allocationIndex = parseInt(parts[4]);
        subCategoryIndex = parseInt(parts[5]);
        allocation = allocations[allocationIndex];
        subCategory = subCategories[allocation][subCategoryIndex];
      } else if (data.startsWith('edit_subcategory_') && parts.length > 4 && parts[2] === 'tx') {
        // Format cũ dài: edit_subcategory_tx_123456_AllocationName_SubCategory
        transactionId = parts[2] + '_' + parts[3];
        allocation = parts[4];
        subCategory = parts.slice(5).join('_');
      } else {
        // Format cũ nhất: edit_subcategory_AllocationName_SubCategory (backward compatibility)
        allocation = parts[2];
        subCategory = parts.slice(3).join('_');
      }
      
      Logger.log("DEBUG: Parsed transactionId: " + transactionId + ", allocationIndex: " + allocationIndex + ", subCategoryIndex: " + subCategoryIndex);
      Logger.log("DEBUG: allocation: " + allocation + ", subCategory: " + subCategory);
      Logger.log("DEBUG: ChatId: " + chatId);
      
      // Luôn sử dụng transactionId nếu có, không fallback sang userId  
      var transactionInfo = null;
      if (transactionId) {
        transactionInfo = getTransactionForEdit(chatId, transactionId);
      } else {
        // Backward compatibility - chỉ khi không có transactionId
        transactionInfo = getTransactionForEdit(chatId);
      }
      Logger.log("DEBUG: Retrieved transaction: " + JSON.stringify(transactionInfo));
      
      if (transactionInfo) {
        // Cập nhật subcategory
        transactionInfo.allocation = allocation;
        transactionInfo.subCategory = subCategory;
        Logger.log("DEBUG: Updated transaction info: " + JSON.stringify(transactionInfo));
        
        // Cập nhật giao dịch trong sheet
        updateTransactionInSheet(transactionInfo);
        Logger.log("DEBUG: Updated transaction in sheet");
        
        // Không xóa cache để có thể chỉnh sửa tiếp
        Logger.log("DEBUG: Keeping cache for future edits");
        
        // Lưu lại thông tin giao dịch vừa cập nhật để có thể chỉnh sửa tiếp
        saveTransactionForEdit(chatId, transactionInfo, transactionInfo.transactionId);
        
        // Thông báo thành công với nút chỉnh sửa
        var typeText = transactionInfo.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        var editKeyboard = createEditKeyboard(transactionInfo.transactionId);
        
        editText(chatId, messageId,
          "✅ Đã cập nhật " + typeText + ": " + transactionInfo.description + 
          " " + transactionInfo.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
          " vào hũ " + allocation + " với nhãn " + subCategory,
          editKeyboard
        );
        Logger.log("DEBUG: Success message with edit button sent");
      } else {
        Logger.log("DEBUG: No transaction info found for edit_subcategory");
        editText(chatId, messageId, "❌ Không tìm thấy thông tin giao dịch để chỉnh sửa. Vui lòng thử lại.", null);
      }
      return;
    } else if (data.startsWith('allocation_')) {
      // Xử lý chọn hũ cho transaction mới
      Logger.log("DEBUG: allocation callback: " + data);
      
      // Parse allocation index từ callback_data: allocation_0
      var parts = data.split('_');
      var allocationIndex = parseInt(parts[1]);
      var allocation = allocations[allocationIndex];
      
      Logger.log("DEBUG: Parsed allocationIndex: " + allocationIndex + ", allocation: " + allocation);
      
      // Lấy thông tin transaction tạm từ cache
      var tempTransaction = getTempTransaction(chatId);
      Logger.log("DEBUG: Retrieved temp transaction: " + JSON.stringify(tempTransaction));
      
      if (tempTransaction) {
        // Cập nhật allocation
        tempTransaction.allocation = allocation;
        saveTempTransaction(chatId, tempTransaction);
        Logger.log("DEBUG: Updated temp transaction allocation to: " + allocation);
        
        // Hiển thị keyboard chọn nhãn con
        var keyboard = createSubCategoryKeyboard(allocation, false, null, null);
        editText(chatId, messageId,
          (tempTransaction.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
          tempTransaction.description + " " + 
          formatNumberWithSeparator(tempTransaction.amount) + " vào hũ " + allocation + 
          "\nVui lòng chọn nhãn cụ thể:",
          keyboard
        );
        Logger.log("DEBUG: Subcategory keyboard sent for new transaction");
      } else {
        Logger.log("DEBUG: No temp transaction found for allocation selection");
        editText(chatId, messageId, "❌ Không tìm thấy thông tin giao dịch. Vui lòng nhập lại giao dịch của bạn.", null);
      }
      return;
    } else if (data === 'back_to_allocation') {
      // Xử lý nút "Quay lại" cho transaction mới
      Logger.log("DEBUG: back_to_allocation callback");
      
      // Lấy thông tin transaction tạm từ cache
      var tempTransaction = getTempTransaction(chatId);
      Logger.log("DEBUG: Retrieved temp transaction: " + JSON.stringify(tempTransaction));
      
      if (tempTransaction) {
        // Hiển thị lại keyboard chọn hũ
        var keyboard = createAllocationKeyboard(null); // Không có transactionId cho transaction mới
        editText(chatId, messageId,
          "🔄 Quay lại chọn hũ\n" +
          (tempTransaction.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
          tempTransaction.description + " " + 
          formatNumberWithSeparator(tempTransaction.amount) + 
          "\n\nVui lòng chọn hũ:",
          keyboard
        );
        Logger.log("DEBUG: Back to allocation keyboard sent");
      } else {
        Logger.log("DEBUG: No temp transaction found for back_to_allocation");
        editText(chatId, messageId, "❌ Không tìm thấy thông tin giao dịch. Vui lòng nhập lại giao dịch của bạn.", null);
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

  // (Cache functions moved to global scope for reusability)

    // (updateTransactionInSheet function moved to global scope)

  if (contents.callback_query) {
    var id_callback = chatId;
    var data = contents.callback_query.data;
    var messageId = contents.callback_query.message.message_id;
    
    Logger.log("SECOND CALLBACK BLOCK:");
    Logger.log("Chat ID: " + id_callback);
    Logger.log("Message ID: " + messageId);
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
          var keyboard = createSubCategoryKeyboard(allocation, false, null, null);
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
          var keyboard = createSubCategoryKeyboard(allocation, false, null, null);
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

// Temp transaction cache functions (Global scope)
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

// Quản lý cache cho chỉnh sửa giao dịch (Global functions)
function saveTransactionForEdit(userId, transactionInfo, transactionId) {
  var cache = CacheService.getScriptCache();
  var cacheKey = transactionId ? 'edit_transaction_' + transactionId : 'edit_transaction_' + userId;
  Logger.log("CACHE SAVE: Key=" + cacheKey + ", TransactionInfo=" + JSON.stringify(transactionInfo));
  cache.put(cacheKey, JSON.stringify(transactionInfo), 1800); // 30 phút
}

function getTransactionForEdit(userId, transactionId) {
  var cache = CacheService.getScriptCache();
  var cacheKey = transactionId ? 'edit_transaction_' + transactionId : 'edit_transaction_' + userId;
  var data = cache.get(cacheKey);
  Logger.log("CACHE GET: Key=" + cacheKey + ", Found=" + (data ? "YES" : "NO"));
  if (data) {
    Logger.log("CACHE GET: Data=" + data);
  }
  return data ? JSON.parse(data) : null;
}

function clearTransactionForEdit(userId, transactionId) {
  var cache = CacheService.getScriptCache();
  var cacheKey = transactionId ? 'edit_transaction_' + transactionId : 'edit_transaction_' + userId;
  Logger.log("CACHE CLEAR: Key=" + cacheKey);
  cache.remove(cacheKey);
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
  
          var editKeyboard = createSubCategoryKeyboard('Chi tiêu thiết yếu', true, null, null);
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
    saveTransactionForEdit(userId, testData); // Backward compatibility - no transactionId
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
    clearTransactionForEdit(userId); // Backward compatibility - no transactionId
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

// Hàm test flow chỉnh sửa với Transaction ID
function testEditFlowWithTransactionId() {
  Logger.log("=== TEST EDIT FLOW WITH TRANSACTION ID ===");
  
  var testUserId = "TEST_USER_456";
  var transactionId = 'tx_' + Date.now();
  
  // 1. Tạo transaction với transactionId
  var testTransaction = {
    userId: testUserId,
    transactionId: transactionId,
    date: new Date(),
    description: "Test transaction",
    amount: 30000,
    allocation: "Chi tiêu thiết yếu",
    type: "ChiTieu",
    subCategory: "Ăn ngoài",
    rowIndex: 3
  };
  
  Logger.log("1. Saving transaction with ID: " + transactionId);
  saveTransactionForEdit(testUserId, testTransaction, transactionId);
  
  // 2. Test keyboard creation với transactionId
  Logger.log("2. Creating allocation keyboard...");
  var allocationKeyboard = createAllocationKeyboard(transactionId);
  
  Logger.log("Allocation keyboard with transactionId:");
  for (var i = 0; i < allocationKeyboard.inline_keyboard.length; i++) {
    var row = allocationKeyboard.inline_keyboard[i];
    for (var j = 0; j < row.length; j++) {
      Logger.log("Button: " + row[j].text + " -> " + row[j].callback_data);
    }
  }
  
  // 3. Simulate chọn allocation
  Logger.log("3. Simulating allocation selection...");
  var mockAllocationCallback = 'edit_allocation_' + transactionId + '_Hưởng thụ';
  Logger.log("Mock callback: " + mockAllocationCallback);
  
  // Parse như trong code thực
  var parts = mockAllocationCallback.split('_');
  var parsedTransactionId = null;
  var parsedAllocation = '';
  
  if (parts.length > 3 && parts[2] === 'tx') {
    parsedTransactionId = parts[2] + '_' + parts[3]; // Tái tạo 'tx_123456'
    parsedAllocation = parts.slice(4).join('_');
  }
  
  Logger.log("Parts array: " + JSON.stringify(parts));
  
  Logger.log("Parsed transactionId: " + parsedTransactionId);
  Logger.log("Parsed allocation: " + parsedAllocation);
  
  // 4. Test lấy transaction từ cache
  var retrievedTransaction = getTransactionForEdit(testUserId, parsedTransactionId);
  Logger.log("Retrieved transaction: " + JSON.stringify(retrievedTransaction));
  
  if (retrievedTransaction && retrievedTransaction.transactionId === transactionId) {
    Logger.log("✅ Transaction ID flow working correctly");
  } else {
    Logger.log("❌ Transaction ID flow failed");
  }
  
  Logger.log("=== TEST EDIT FLOW WITH TRANSACTION ID COMPLETED ===");
}

// Test scenario: Tạo A, tạo B, chỉnh sửa A thành công, chỉnh sửa B bị lỗi
function testMultipleTransactionEditing() {
  Logger.log("=== TEST MULTIPLE TRANSACTION EDITING ===");
  
  var testUserId = "USER_MULTI_TEST";
  
  // 1. Tạo transaction A
  var transactionIdA = 'tx_' + (Date.now() - 1000); // A tạo trước 1 giây
  var transactionA = {
    userId: testUserId,
    transactionId: transactionIdA,
    date: new Date(),
    description: "Transaction A",
    amount: 25000,
    allocation: "Chi tiêu thiết yếu",
    type: "ChiTieu",
    subCategory: "Ăn ngoài",
    rowIndex: 2
  };
  
  Logger.log("1. Creating Transaction A with ID: " + transactionIdA);
  saveTransactionForEdit(testUserId, transactionA, transactionIdA);
  
  // 2. Tạo transaction B
  var transactionIdB = 'tx_' + Date.now(); // B tạo sau
  var transactionB = {
    userId: testUserId,
    transactionId: transactionIdB,
    date: new Date(),
    description: "Transaction B",
    amount: 50000,
    allocation: "Hưởng thụ",
    type: "ChiTieu",
    subCategory: "Giải trí",
    rowIndex: 3
  };
  
  Logger.log("2. Creating Transaction B with ID: " + transactionIdB);
  saveTransactionForEdit(testUserId, transactionB, transactionIdB);
  
  // 3. Kiểm tra cả 2 transactions đều tồn tại
  Logger.log("3. Checking both transactions exist...");
  var checkA = getTransactionForEdit(testUserId, transactionIdA);
  var checkB = getTransactionForEdit(testUserId, transactionIdB);
  
  Logger.log("Transaction A exists: " + (checkA ? "YES" : "NO"));
  Logger.log("Transaction B exists: " + (checkB ? "YES" : "NO"));
  
  // 4. Simulate chỉnh sửa A thành công (update A)
  Logger.log("4. Simulating edit A success...");
  if (checkA) {
    checkA.allocation = "Hưởng thụ";
    checkA.subCategory = "Mua sắm";
    saveTransactionForEdit(testUserId, checkA, checkA.transactionId);
    Logger.log("Transaction A updated successfully");
  }
  
  // 5. Kiểm tra lại sau khi update A
  Logger.log("5. Checking transactions after A update...");
  var checkA2 = getTransactionForEdit(testUserId, transactionIdA);
  var checkB2 = getTransactionForEdit(testUserId, transactionIdB);
  
  Logger.log("Transaction A after update: " + (checkA2 ? "YES" : "NO"));
  Logger.log("Transaction B after A update: " + (checkB2 ? "YES" : "NO"));
  
  if (checkB2) {
    Logger.log("✅ Transaction B still exists after A update");
  } else {
    Logger.log("❌ Transaction B disappeared after A update");
  }
  
  // 6. Simulate chọn hũ cho B (như user mô tả)
  Logger.log("6. Simulating edit B allocation selection...");
  var mockCallbackB = 'edit_allocation_' + transactionIdB + '_Tiết kiệm dài hạn';
  Logger.log("Mock callback for B: " + mockCallbackB);
  
  // Parse callback B
  var partsB = mockCallbackB.split('_');
  var parsedTransactionIdB = null;
  var parsedAllocationB = '';
  
  if (partsB.length > 3 && partsB[2] === 'tx') {
    parsedTransactionIdB = partsB[2] + '_' + partsB[3];
    parsedAllocationB = partsB.slice(4).join('_');
  }
  
  Logger.log("Parsed B transactionId: " + parsedTransactionIdB);
  Logger.log("Parsed B allocation: " + parsedAllocationB);
  
  // Try to get transaction B
  var finalCheckB = getTransactionForEdit(testUserId, parsedTransactionIdB);
  
  if (finalCheckB) {
    Logger.log("✅ Transaction B can be edited successfully");
  } else {
    Logger.log("❌ Transaction B cannot be found for editing");
  }
  
  Logger.log("=== TEST MULTIPLE TRANSACTION EDITING COMPLETED ===");
}

// Test function để kiểm tra deployment
function testDeployment() {
  Logger.log("=== TEST DEPLOYMENT ===");
  
  try {
    // Test các function cơ bản
    Logger.log("1. Testing createAllocationKeyboard...");
    var keyboard = createAllocationKeyboard("tx_test123");
    Logger.log("Keyboard created: " + JSON.stringify(keyboard));
    
    Logger.log("2. Testing cache functions...");
    var testTransaction = {
      userId: "test",
      transactionId: "tx_test123",
      description: "test",
      amount: 1000
    };
    saveTransactionForEdit("test", testTransaction, "tx_test123");
    var retrieved = getTransactionForEdit("test", "tx_test123");
    Logger.log("Cache test: " + (retrieved ? "SUCCESS" : "FAILED"));
    
    Logger.log("3. Testing parsing logic...");
    var testCallback = "edit_allocation_tx_123_Hưởng thụ";
    var parts = testCallback.split('_');
    var transactionId = null;
    var allocation = '';
    
    if (parts.length > 3 && parts[2] === 'tx') {
      transactionId = parts[2] + '_' + parts[3];
      allocation = parts.slice(4).join('_');
    }
    
    Logger.log("Parsed ID: " + transactionId + ", Allocation: " + allocation);
    
    Logger.log("✅ Deployment test completed successfully");
    
  } catch (error) {
    Logger.log("❌ Deployment test failed: " + error.toString());
  }
  
  Logger.log("=== TEST DEPLOYMENT COMPLETED ===");
}

// Test chính xác scenario user mô tả
function testUserScenario() {
  Logger.log("=== TEST USER SCENARIO ===");
  
  var userId = "USER_SCENARIO_TEST";
  
  // 1. Tạo transaction A (a - 3)
  Logger.log("1. Creating transaction A (a - 3)...");
  var transactionIdA = 'tx_' + (Date.now() - 5000); // A tạo trước 5 giây
  var transactionA = {
    userId: userId,
    transactionId: transactionIdA,
    date: new Date(),
    description: "a",
    amount: 3000,
    allocation: "Chi tiêu thiết yếu",
    type: "ChiTieu",
    subCategory: "Nhà ở",
    rowIndex: 2
  };
  saveTransactionForEdit(userId, transactionA, transactionIdA);
  Logger.log("Transaction A saved with ID: " + transactionIdA);
  
  // 2. Tạo transaction B (b - 4)  
  Logger.log("2. Creating transaction B (b - 4)...");
  var transactionIdB = 'tx_' + Date.now(); // B tạo sau
  var transactionB = {
    userId: userId,
    transactionId: transactionIdB,
    date: new Date(),
    description: "b",
    amount: 4000,
    allocation: "Chi tiêu thiết yếu",
    type: "ChiTieu", 
    subCategory: "Ăn ngoài",
    rowIndex: 3
  };
  saveTransactionForEdit(userId, transactionB, transactionIdB);
  Logger.log("Transaction B saved with ID: " + transactionIdB);
  
  // 3. Kiểm tra cả 2 transactions
  Logger.log("3. Checking both transactions exist...");
  var checkA1 = getTransactionForEdit(userId, transactionIdA);
  var checkB1 = getTransactionForEdit(userId, transactionIdB);
  
  Logger.log("Transaction A exists: " + (checkA1 ? "YES - " + checkA1.description : "NO"));
  Logger.log("Transaction B exists: " + (checkB1 ? "YES - " + checkB1.description : "NO"));
  
  // 4. User nhấn [✏️ Chỉnh sửa A] - tạo allocation keyboard
  Logger.log("4. User clicks Edit A - creating allocation keyboard...");
  if (checkA1) {
    var keyboardA = createAllocationKeyboard(checkA1.transactionId);
    Logger.log("Allocation keyboard created for A");
    Logger.log("Sample button: " + JSON.stringify(keyboardA.inline_keyboard[0][0]));
  }
  
  // 5. User chọn hũ mới cho A (simulate callback)
  Logger.log("5. User selects new allocation for A...");
  var callbackA = 'edit_allocation_' + transactionIdA + '_Hưởng thụ';
  Logger.log("Callback data: " + callbackA);
  
  // Parse callback như trong code thực
  var parts = callbackA.split('_');
  var parsedTransactionId = null;
  var parsedAllocation = '';
  
  if (parts.length > 3 && parts[2] === 'tx') {
    parsedTransactionId = parts[2] + '_' + parts[3];
    parsedAllocation = parts.slice(4).join('_');
  }
  
  Logger.log("Parsed transactionId: " + parsedTransactionId);
  Logger.log("Parsed allocation: " + parsedAllocation);
  
  // 6. Thử lấy transaction A để update
  Logger.log("6. Retrieving transaction A for update...");
  var transactionForUpdate = getTransactionForEdit(userId, parsedTransactionId);
  
  if (transactionForUpdate) {
    Logger.log("✅ Transaction A found for update: " + transactionForUpdate.description);
    Logger.log("Transaction A details: " + JSON.stringify(transactionForUpdate));
  } else {
    Logger.log("❌ Transaction A NOT FOUND for update");
    
    // Debug: Kiểm tra có cache nào cho user này không
    Logger.log("Debugging cache keys...");
    
    // Thử các cache key khác nhau
    var fallbackCheck = getTransactionForEdit(userId); // Không có transactionId
    Logger.log("Fallback check (no ID): " + (fallbackCheck ? fallbackCheck.description : "NO"));
    
    var directCheckA = getTransactionForEdit(userId, transactionIdA);
    Logger.log("Direct check A: " + (directCheckA ? directCheckA.description : "NO"));
    
    var directCheckB = getTransactionForEdit(userId, transactionIdB);
    Logger.log("Direct check B: " + (directCheckB ? directCheckB.description : "NO"));
  }
  
  Logger.log("=== TEST USER SCENARIO COMPLETED ===");
}

// Test toàn bộ edit allocation flow
function testFullEditAllocationFlow() {
  Logger.log("=== TEST FULL EDIT ALLOCATION FLOW ===");
  
  var userId = "USER_EDIT_FLOW_TEST";
  var transactionId = 'tx_' + Date.now();
  
  // 1. Tạo transaction
  var transaction = {
    userId: userId,
    transactionId: transactionId,
    date: new Date(),
    description: "test transaction",
    amount: 5000,
    allocation: "Chi tiêu thiết yếu",
    type: "ChiTieu",
    subCategory: "Nhà ở",
    rowIndex: 5
  };
  
  Logger.log("1. Saving transaction: " + transactionId);
  saveTransactionForEdit(userId, transaction, transactionId);
  
  // 2. Simulate edit_allocation callback
  var callbackData = 'edit_allocation_' + transactionId + '_Hưởng thụ';
  Logger.log("2. Simulating callback: " + callbackData);
  
  try {
    // Parse như trong doPost
    var parts = callbackData.split('_');
    var parsedTransactionId = null;
    var parsedAllocation = '';
    
    if (parts.length > 3 && parts[2] === 'tx') {
      parsedTransactionId = parts[2] + '_' + parts[3];
      parsedAllocation = parts.slice(4).join('_');
    }
    
    Logger.log("Parsed transactionId: " + parsedTransactionId);
    Logger.log("Parsed allocation: " + parsedAllocation);
    
    // 3. Get transaction như trong doPost
    var transactionInfo = null;
    if (parsedTransactionId) {
      transactionInfo = getTransactionForEdit(userId, parsedTransactionId);
    }
    
    if (transactionInfo) {
      Logger.log("3. Transaction found for edit");
      
      // 4. Update allocation như trong doPost
      transactionInfo.allocation = parsedAllocation;
      saveTransactionForEdit(userId, transactionInfo, transactionInfo.transactionId);
      Logger.log("4. Allocation updated to: " + parsedAllocation);
      
      // 5. Test tạo subcategory keyboard
      try {
        var keyboard = createSubCategoryKeyboard(parsedAllocation, true, transactionInfo.transactionId);
        Logger.log("5. Subcategory keyboard created successfully");
        Logger.log("Sample button: " + JSON.stringify(keyboard.inline_keyboard[0][0]));
        
      } catch (keyboardError) {
        Logger.log("❌ Subcategory keyboard failed: " + keyboardError.toString());
      }
      
      // 6. Test updateTransactionInSheet (mock)
      try {
        Logger.log("6. Testing updateTransactionInSheet...");
        // updateTransactionInSheet(transactionInfo); // Không chạy thực để tránh lỗi sheet
        Logger.log("6. updateTransactionInSheet would be called here");
        
      } catch (updateError) {
        Logger.log("❌ updateTransactionInSheet failed: " + updateError.toString());
      }
      
      Logger.log("✅ Full edit allocation flow completed successfully");
      
    } else {
      Logger.log("❌ Transaction not found for edit");
    }
    
  } catch (error) {
    Logger.log("❌ Edit allocation flow failed: " + error.toString());
    Logger.log("Error stack: " + error.stack);
  }
  
  Logger.log("=== TEST FULL EDIT ALLOCATION FLOW COMPLETED ===");
}

// Test từng hũ để tìm ra cái nào gây lỗi
function testEachAllocation() {
  Logger.log("=== TEST EACH ALLOCATION ===");
  
  var testUserId = "TEST_ALLOCATION_USER";
  var baseTransactionId = 'tx_' + Date.now();
  
  // Test từng hũ
  for (var i = 0; i < allocations.length; i++) {
    var allocation = allocations[i];
    var transactionId = baseTransactionId + '_' + i;
    
    Logger.log("Testing allocation " + (i+1) + ": " + allocation);
    
    try {
      // 1. Tạo callback data
      var callbackData = 'edit_allocation_' + transactionId + '_' + allocation;
      Logger.log("  Callback data: " + callbackData);
      Logger.log("  Callback length: " + callbackData.length + " chars");
      Logger.log("  Callback bytes: " + encodeURIComponent(callbackData).length + " bytes");
      
      // 2. Test parsing
      var parts = callbackData.split('_');
      Logger.log("  Split parts: " + JSON.stringify(parts));
      
      var parsedTransactionId = null;
      var parsedAllocation = '';
      
      if (parts.length > 3 && parts[2] === 'tx') {
        parsedTransactionId = parts[2] + '_' + parts[3];
        parsedAllocation = parts.slice(4).join('_');
      }
      
      Logger.log("  Parsed transactionId: " + parsedTransactionId);
      Logger.log("  Parsed allocation: " + parsedAllocation);
      
      // 3. Kiểm tra match
      if (parsedAllocation === allocation) {
        Logger.log("  ✅ " + allocation + " - PARSING OK");
      } else {
        Logger.log("  ❌ " + allocation + " - PARSING FAILED");
        Logger.log("    Expected: '" + allocation + "'");
        Logger.log("    Got: '" + parsedAllocation + "'");
      }
      
      // 4. Test tạo subcategory keyboard  
      try {
        var keyboard = createSubCategoryKeyboard(allocation, true, transactionId);
        if (keyboard && keyboard.inline_keyboard) {
          Logger.log("  ✅ " + allocation + " - SUBCATEGORY KEYBOARD OK");
          
          // Test sample subcategory callback
          var firstButton = keyboard.inline_keyboard[0][0];
          var subCallbackData = firstButton.callback_data;
          Logger.log("    Sample subcategory callback: " + subCallbackData);
          Logger.log("    Subcategory callback length: " + subCallbackData.length + " chars");
          Logger.log("    Subcategory callback bytes: " + encodeURIComponent(subCallbackData).length + " bytes");
          
          if (encodeURIComponent(subCallbackData).length > 64) {
            Logger.log("    ⚠️ SUBCATEGORY CALLBACK TOO LONG!");
          }
          
        } else {
          Logger.log("  ❌ " + allocation + " - SUBCATEGORY KEYBOARD FAILED");
        }
      } catch (keyboardError) {
        Logger.log("  ❌ " + allocation + " - SUBCATEGORY KEYBOARD ERROR: " + keyboardError.toString());
      }
      
      // 5. Kiểm tra callback data length
      if (encodeURIComponent(callbackData).length > 64) {
        Logger.log("  ⚠️ " + allocation + " - CALLBACK TOO LONG (>64 bytes)");
      }
      
    } catch (error) {
      Logger.log("  ❌ " + allocation + " - ERROR: " + error.toString());
    }
    
    Logger.log(""); // Dòng trống
  }
  
  Logger.log("=== TEST EACH ALLOCATION COMPLETED ===");
}

// Test format mới ngắn
function testShortCallbackFormat() {
  Logger.log("=== TEST SHORT CALLBACK FORMAT ===");
  
  var testUserId = "USER_SHORT_TEST";
  var transactionId = 'tx_' + Date.now();
  
  Logger.log("Testing new short format with transactionId: " + transactionId);
  
  // Test từng hũ với format mới
  for (var i = 0; i < allocations.length; i++) {
    var allocation = allocations[i];
    Logger.log("Testing allocation " + i + ": " + allocation);
    
    try {
      // 1. Test allocation keyboard (format mới ngắn cho EDIT)
      var editAllocationKeyboard = createAllocationKeyboard(transactionId);
      var editAllocationButton = editAllocationKeyboard.inline_keyboard[Math.floor(i/2)][i%2];
      
      Logger.log("  Edit allocation callback: " + editAllocationButton.callback_data);
      Logger.log("  Edit allocation callback length: " + editAllocationButton.callback_data.length + " chars");
      Logger.log("  Edit allocation callback bytes: " + encodeURIComponent(editAllocationButton.callback_data).length + " bytes");
      
      // 1b. Test allocation keyboard (format mới cho TRANSACTION MỚI)
      var newAllocationKeyboard = createAllocationKeyboard(null);
      var newAllocationButton = newAllocationKeyboard.inline_keyboard[Math.floor(i/2)][i%2];
      
      Logger.log("  New allocation callback: " + newAllocationButton.callback_data);
      Logger.log("  New allocation callback length: " + newAllocationButton.callback_data.length + " chars");
      Logger.log("  New allocation callback bytes: " + encodeURIComponent(newAllocationButton.callback_data).length + " bytes");
      
      // 2. Test subcategory keyboard (format mới ngắn)
      var subKeyboard = createSubCategoryKeyboard(allocation, true, transactionId, i);
      if (subKeyboard && subKeyboard.inline_keyboard && subKeyboard.inline_keyboard[0]) {
        var subButton = subKeyboard.inline_keyboard[0][0];
        
        Logger.log("  Subcategory callback: " + subButton.callback_data);
        Logger.log("  Subcategory callback length: " + subButton.callback_data.length + " chars");
        Logger.log("  Subcategory callback bytes: " + encodeURIComponent(subButton.callback_data).length + " bytes");
        
        // 3. Test parsing EDIT allocation callback
        var editAllocParts = editAllocationButton.callback_data.split('_');
        if (editAllocParts.length >= 4 && editAllocParts[2] === 'tx') {
          var parsedTransactionId = editAllocParts[2] + '_' + editAllocParts[3];
          var parsedAllocIndex = parseInt(editAllocParts[4]);
          var parsedAllocation = allocations[parsedAllocIndex];
          
          if (parsedAllocation === allocation) {
            Logger.log("  ✅ Edit allocation parsing OK: " + parsedAllocation);
          } else {
            Logger.log("  ❌ Edit allocation parsing FAILED: Expected " + allocation + ", got " + parsedAllocation);
          }
        }
        
        // 3b. Test parsing NEW allocation callback
        var newAllocParts = newAllocationButton.callback_data.split('_');
        if (newAllocParts.length >= 2 && newAllocParts[0] === 'allocation') {
          var newParsedAllocIndex = parseInt(newAllocParts[1]);
          var newParsedAllocation = allocations[newParsedAllocIndex];
          
          if (newParsedAllocation === allocation) {
            Logger.log("  ✅ New allocation parsing OK: " + newParsedAllocation);
          } else {
            Logger.log("  ❌ New allocation parsing FAILED: Expected " + allocation + ", got " + newParsedAllocation);
          }
        }
        
        // 4. Test parsing subcategory callback
        var subParts = subButton.callback_data.split('_');
        if (subParts.length >= 6 && subParts[2] === 'tx') {
          var subParsedTransactionId = subParts[2] + '_' + subParts[3];
          var subParsedAllocIndex = parseInt(subParts[4]);
          var subParsedSubIndex = parseInt(subParts[5]);
          var subParsedAllocation = allocations[subParsedAllocIndex];
          var subParsedSubCategory = subCategories[subParsedAllocation][subParsedSubIndex];
          
          if (subParsedAllocation === allocation) {
            Logger.log("  ✅ Subcategory allocation parsing OK: " + subParsedAllocation);
            Logger.log("  ✅ Subcategory parsing OK: " + subParsedSubCategory);
          } else {
            Logger.log("  ❌ Subcategory parsing FAILED");
          }
        }
        
        // 5. Check callback length
        var editAllocLength = encodeURIComponent(editAllocationButton.callback_data).length;
        var newAllocLength = encodeURIComponent(newAllocationButton.callback_data).length;
        var subLength = encodeURIComponent(subButton.callback_data).length;
        
        if (editAllocLength <= 64 && newAllocLength <= 64 && subLength <= 64) {
          Logger.log("  ✅ " + allocation + " - ALL CALLBACKS WITHIN LIMIT");
        } else {
          Logger.log("  ⚠️ " + allocation + " - SOME CALLBACKS TOO LONG");
          if (editAllocLength > 64) Logger.log("    Edit allocation too long: " + editAllocLength + " bytes");
          if (newAllocLength > 64) Logger.log("    New allocation too long: " + newAllocLength + " bytes");  
          if (subLength > 64) Logger.log("    Subcategory too long: " + subLength + " bytes");
        }
        
      } else {
        Logger.log("  ❌ Failed to create subcategory keyboard");
      }
      
    } catch (error) {
      Logger.log("  ❌ Error testing " + allocation + ": " + error.toString());
    }
    
    Logger.log(""); // Dòng trống
  }
  
  Logger.log("=== TEST SHORT CALLBACK FORMAT COMPLETED ===");
}

// Test nút "Quay lại"
function testBackButton() {
  Logger.log("=== TEST BACK BUTTON ===");
  
  var testUserId = "USER_BACK_TEST";
  var transactionId = 'tx_' + Date.now();
  
  Logger.log("Testing back button functionality");
  
  try {
    // 1. Test subcategory keyboard có nút "Quay lại" (transaction mới)
    Logger.log("1. Testing back button for new transaction:");
    var newTransKeyboard = createSubCategoryKeyboard('Chi tiêu thiết yếu', false, null, null);
    if (newTransKeyboard && newTransKeyboard.inline_keyboard) {
      var lastRow = newTransKeyboard.inline_keyboard[newTransKeyboard.inline_keyboard.length - 1];
      var backButton = lastRow[0];
      
      Logger.log("  Back button text: " + backButton.text);
      Logger.log("  Back button callback: " + backButton.callback_data);
      
      if (backButton.callback_data === 'back_to_allocation') {
        Logger.log("  ✅ New transaction back button OK");
      } else {
        Logger.log("  ❌ New transaction back button FAILED");
      }
    }
    
    // 2. Test subcategory keyboard có nút "Quay lại" (edit mode)
    Logger.log("\n2. Testing back button for edit transaction:");
    var editKeyboard = createSubCategoryKeyboard('Chi tiêu thiết yếu', true, transactionId, 0);
    if (editKeyboard && editKeyboard.inline_keyboard) {
      var lastRow = editKeyboard.inline_keyboard[editKeyboard.inline_keyboard.length - 1]; 
      var backButton = lastRow[0];
      
      Logger.log("  Back button text: " + backButton.text);
      Logger.log("  Back button callback: " + backButton.callback_data);
      
      if (backButton.callback_data === 'edit_transaction_' + transactionId) {
        Logger.log("  ✅ Edit transaction back button OK");
      } else {
        Logger.log("  ❌ Edit transaction back button FAILED");
      }
    }
    
    // 3. Test callback length cho nút "Quay lại"
    Logger.log("\n3. Testing back button callback length:");
    var shortCallback = 'back_to_allocation';
    var longCallback = 'edit_transaction_' + transactionId;
    
    Logger.log("  Short callback: " + shortCallback + " (" + shortCallback.length + " chars, " + encodeURIComponent(shortCallback).length + " bytes)");
    Logger.log("  Long callback: " + longCallback + " (" + longCallback.length + " chars, " + encodeURIComponent(longCallback).length + " bytes)");
    
    if (encodeURIComponent(shortCallback).length <= 64 && encodeURIComponent(longCallback).length <= 64) {
      Logger.log("  ✅ All back button callbacks within limit");
    } else {
      Logger.log("  ⚠️ Some back button callbacks too long");
    }
    
    Logger.log("  ✅ Back button test completed successfully");
    
  } catch (error) {
    Logger.log("  ❌ Error testing back button: " + error.toString());
  }
  
  Logger.log("=== TEST BACK BUTTON COMPLETED ===");
}

// Test luồng quay lại cho transaction mới
function testNewTransactionBackFlow() {
  Logger.log("=== TEST NEW TRANSACTION BACK FLOW ===");
  
  var testUserId = "USER_NEW_BACK_TEST";
  var testChatId = 123456789;
  
  try {
    // 1. Simulate người dùng nhập "ăn trưa - 30000"
    Logger.log("1. Simulate input: 'ăn trưa - 30000'");
    
    var description = "ăn trưa";
    var amount = 30000;
    var type = "expense";
    var defaultAllocation = "Chi tiêu thiết yếu"; // Default allocation
    
    // 2. Test lưu temp transaction
    Logger.log("2. Testing saveTempTransaction");
    var tempTransaction = {
      description: description,
      amount: amount,
      type: type,
      allocation: defaultAllocation
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Saved temp transaction: " + JSON.stringify(tempTransaction));
    
    // 3. Test lấy temp transaction
    Logger.log("3. Testing getTempTransaction");
    var retrievedTemp = getTempTransaction(testChatId);
    Logger.log("  Retrieved temp transaction: " + JSON.stringify(retrievedTemp));
    
    if (retrievedTemp && retrievedTemp.description === description) {
      Logger.log("  ✅ Temp transaction save/retrieve OK");
    } else {
      Logger.log("  ❌ Temp transaction save/retrieve FAILED");
    }
    
    // 4. Test tạo subcategory keyboard với nút quay lại
    Logger.log("4. Testing subcategory keyboard with back button");
    var subKeyboard = createSubCategoryKeyboard(defaultAllocation, false, null, null);
    
    if (subKeyboard && subKeyboard.inline_keyboard) {
      var lastRow = subKeyboard.inline_keyboard[subKeyboard.inline_keyboard.length - 1];
      var backButton = lastRow[0];
      
      Logger.log("  Back button text: " + backButton.text);
      Logger.log("  Back button callback: " + backButton.callback_data);
      
      if (backButton.callback_data === 'back_to_allocation') {
        Logger.log("  ✅ Back button in subcategory keyboard OK");
      } else {
        Logger.log("  ❌ Back button in subcategory keyboard FAILED");
      }
    }
    
    // 5. Test allocation keyboard cho transaction mới
    Logger.log("5. Testing allocation keyboard for new transaction");
    var allocKeyboard = createAllocationKeyboard(null);
    
    if (allocKeyboard && allocKeyboard.inline_keyboard) {
      Logger.log("  Allocation keyboard created successfully");
      Logger.log("  Number of rows: " + allocKeyboard.inline_keyboard.length);
      
      // Log first few buttons
      for (var i = 0; i < Math.min(2, allocKeyboard.inline_keyboard.length); i++) {
        var row = allocKeyboard.inline_keyboard[i];
        for (var j = 0; j < row.length; j++) {
          Logger.log("    Button: " + row[j].text + " -> " + row[j].callback_data);
        }
      }
      Logger.log("  ✅ Allocation keyboard for new transaction OK");
    } else {
      Logger.log("  ❌ Allocation keyboard for new transaction FAILED");
    }
    
    // 6. Test callback format cho allocation buttons
    Logger.log("6. Testing allocation callback format");
    if (allocKeyboard && allocKeyboard.inline_keyboard && allocKeyboard.inline_keyboard[0]) {
      var firstButton = allocKeyboard.inline_keyboard[0][0];
      var callbackData = firstButton.callback_data;
      
      Logger.log("  First allocation callback: " + callbackData);
      
      // Check if callback starts with expected format for new transactions
      if (callbackData.startsWith('allocation_')) {
        Logger.log("  ✅ New transaction callback format correct: " + callbackData);
      } else {
        Logger.log("  ❌ WARNING: New transaction using wrong format: " + callbackData);
        Logger.log("  Expected format should be 'allocation_X' for new transactions");
      }
    }
    
    // Cleanup
    clearTempTransaction(testChatId);
    Logger.log("7. Cleaned up temp transaction");
    
    Logger.log("  ✅ New transaction back flow test completed");
    
  } catch (error) {
    Logger.log("  ❌ Error in new transaction back flow test: " + error.toString());
  }
  
  Logger.log("=== TEST NEW TRANSACTION BACK FLOW COMPLETED ===");
}

// Test debug callback "back_to_allocation"
function debugBackToAllocation() {
  Logger.log("=== DEBUG BACK TO ALLOCATION ===");
  
  var testUserId = "USER_DEBUG_BACK";
  var testChatId = 123456789;
  
  try {
    // 1. Tạo temp transaction giống flow thực tế
    Logger.log("1. Creating temp transaction như flow thực tế");
    var tempTransaction = {
      description: "c",
      amount: 9000,
      type: "expense", 
      allocation: "Chi tiêu thiết yếu"
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Saved temp transaction: " + JSON.stringify(tempTransaction));
    
    // 2. Test lấy temp transaction
    var retrieved = getTempTransaction(testChatId);
    Logger.log("  Retrieved temp transaction: " + JSON.stringify(retrieved));
    
    if (retrieved) {
      Logger.log("  ✅ Temp transaction exists in cache");
    } else {
      Logger.log("  ❌ Temp transaction NOT found in cache");
    }
    
    // 3. Test tạo allocation keyboard 
    Logger.log("3. Testing allocation keyboard creation");
    var allocKeyboard = createAllocationKeyboard(null);
    
    if (allocKeyboard && allocKeyboard.inline_keyboard) {
      Logger.log("  ✅ Allocation keyboard created successfully");
      Logger.log("  Number of buttons: " + allocKeyboard.inline_keyboard.length);
      
      // Log first row buttons
      var firstRow = allocKeyboard.inline_keyboard[0];
      for (var i = 0; i < firstRow.length; i++) {
        Logger.log("    Button " + i + ": " + firstRow[i].text + " -> " + firstRow[i].callback_data);
      }
    } else {
      Logger.log("  ❌ Failed to create allocation keyboard");
    }
    
    // 4. Test tạo message text
    Logger.log("4. Testing message text creation");
    var messageText = (retrieved.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
      retrieved.description + " " + 
      formatNumberWithSeparator(retrieved.amount) + 
      "\nChọn hũ chi tiêu:";
    
    Logger.log("  Message text: " + messageText);
    
    // 5. Test callback data format trong subcategory keyboard
    Logger.log("5. Testing back button in subcategory keyboard");
    var subKeyboard = createSubCategoryKeyboard("Chi tiêu thiết yếu", false, null, null);
    
    if (subKeyboard && subKeyboard.inline_keyboard) {
      var lastRow = subKeyboard.inline_keyboard[subKeyboard.inline_keyboard.length - 1];
      var backButton = lastRow[0];
      
      Logger.log("  Back button text: " + backButton.text);
      Logger.log("  Back button callback: " + backButton.callback_data);
      
      if (backButton.callback_data === 'back_to_allocation') {
        Logger.log("  ✅ Back button callback format correct");
      } else {
        Logger.log("  ❌ Back button callback format wrong: " + backButton.callback_data);
      }
    }
    
    // Cleanup
    clearTempTransaction(testChatId);
    Logger.log("6. Cleaned up temp transaction");
    
  } catch (error) {
    Logger.log("  ❌ Error in back to allocation debug: " + error.toString());
  }
  
  Logger.log("=== DEBUG BACK TO ALLOCATION COMPLETED ===");
}

// Test xử lý callback back_to_allocation
function simulateBackToAllocationCallback() {
  Logger.log("=== SIMULATE BACK TO ALLOCATION CALLBACK ===");
  
  var testUserId = "USER_SIMULATE_BACK";
  var testChatId = 123456789;
  
  try {
    // 1. Setup temp transaction
    var tempTransaction = {
      description: "c",
      amount: 9000,
      type: "expense",
      allocation: "Chi tiêu thiết yếu"
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("1. Setup temp transaction: " + JSON.stringify(tempTransaction));
    
    // 2. Simulate callback processing logic
    Logger.log("2. Simulating back_to_allocation callback processing");
    var data = 'back_to_allocation';
    
    if (data === 'back_to_allocation') {
      Logger.log("  ✅ Callback matches 'back_to_allocation'");
      
      // Lấy thông tin transaction tạm từ cache
      var retrievedTemp = getTempTransaction(testChatId);
      Logger.log("  Retrieved temp transaction: " + JSON.stringify(retrievedTemp));
      
      if (retrievedTemp) {
        Logger.log("  ✅ Temp transaction found");
        
        // Tạo keyboard chọn hũ
        var keyboard = createAllocationKeyboard(null);
        Logger.log("  ✅ Allocation keyboard created");
        
        // Tạo message text
        var messageText = (retrievedTemp.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
          retrievedTemp.description + " " + 
          formatNumberWithSeparator(retrievedTemp.amount) + 
          "\nChọn hũ chi tiêu:";
        
        Logger.log("  Message would be: " + messageText);
        Logger.log("  ✅ Back to allocation flow completed successfully");
        
      } else {
        Logger.log("  ❌ No temp transaction found");
      }
    } else {
      Logger.log("  ❌ Callback does not match 'back_to_allocation'");
    }
    
    // Cleanup
    clearTempTransaction(testChatId);
    
  } catch (error) {
    Logger.log("  ❌ Error in simulate callback: " + error.toString());
  }
  
  Logger.log("=== SIMULATE BACK TO ALLOCATION CALLBACK COMPLETED ===");
}

// Debug chọn hũ sau khi back
function debugAllocationAfterBack() {
  Logger.log("=== DEBUG ALLOCATION AFTER BACK ===");
  
  var testUserId = "USER_DEBUG_AFTER_BACK";
  var testChatId = 123456789;
  
  try {
    // 1. Setup temp transaction như flow thực tế (expense)
    Logger.log("1. Setup temp transaction như expense flow");
    var tempTransaction = {
      date: new Date().toISOString().split('T')[0],
      description: "c", 
      amount: 9000,
      allocation: "Chi tiêu thiết yếu",
      type: "ChiTieu" // Từ expense flow (line 831)
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Saved temp transaction: " + JSON.stringify(tempTransaction));
    
    // 2. Test callback data format từ allocation keyboard
    Logger.log("2. Testing allocation keyboard callback format");
    var allocKeyboard = createAllocationKeyboard(null);
    
    if (allocKeyboard && allocKeyboard.inline_keyboard) {
      var firstButton = allocKeyboard.inline_keyboard[0][0]; // "Chi tiêu thiết yếu"
      var secondButton = allocKeyboard.inline_keyboard[0][1]; // "Hưởng thụ"
      
      Logger.log("  First button: " + firstButton.text + " -> " + firstButton.callback_data);
      Logger.log("  Second button: " + secondButton.text + " -> " + secondButton.callback_data);
      
      // 3. Simulate chọn hũ đầu tiên (allocation_0)
      Logger.log("3. Simulating allocation_0 callback");
      var data = firstButton.callback_data; // Should be "allocation_0"
      
      if (data.startsWith('allocation_')) {
        Logger.log("  ✅ Callback matches allocation_ pattern: " + data);
        
        // Parse allocation index
        var parts = data.split('_');
        var allocationIndex = parseInt(parts[1]);
        var allocation = allocations[allocationIndex];
        
        Logger.log("  Parsed allocationIndex: " + allocationIndex);
        Logger.log("  Parsed allocation: " + allocation);
        
        if (allocation) {
          Logger.log("  ✅ Allocation found: " + allocation);
          
          // Get temp transaction
          var retrievedTemp = getTempTransaction(testChatId);
          Logger.log("  Retrieved temp transaction: " + JSON.stringify(retrievedTemp));
          
          if (retrievedTemp) {
            Logger.log("  ✅ Temp transaction found");
            
            // Update allocation
            retrievedTemp.allocation = allocation;
            saveTempTransaction(testChatId, retrievedTemp);
            Logger.log("  ✅ Updated temp transaction allocation to: " + allocation);
            
            // Test subcategory keyboard creation
            var subKeyboard = createSubCategoryKeyboard(allocation, false, null, null);
            if (subKeyboard && subKeyboard.inline_keyboard) {
              Logger.log("  ✅ Subcategory keyboard created");
              Logger.log("  Number of subcategory rows: " + subKeyboard.inline_keyboard.length);
              
              // Test message text
              var messageText = (retrievedTemp.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
                retrievedTemp.description + " " + 
                formatNumberWithSeparator(retrievedTemp.amount) + " vào hũ " + allocation + 
                "\nVui lòng chọn nhãn cụ thể:";
              
              Logger.log("  Message would be: " + messageText);
              Logger.log("  ✅ Allocation after back flow completed successfully");
              
            } else {
              Logger.log("  ❌ Failed to create subcategory keyboard");
            }
          } else {
            Logger.log("  ❌ No temp transaction found");
          }
        } else {
          Logger.log("  ❌ Allocation not found for index: " + allocationIndex);
        }
      } else {
        Logger.log("  ❌ Callback does not match allocation_ pattern: " + data);
      }
    } else {
      Logger.log("  ❌ Failed to create allocation keyboard");
    }
    
    // Cleanup
    clearTempTransaction(testChatId);
    
  } catch (error) {
    Logger.log("  ❌ Error in allocation after back debug: " + error.toString());
  }
  
  Logger.log("=== DEBUG ALLOCATION AFTER BACK COMPLETED ===");
}

// Test function để test edit message functionality
function testEditMessage() {
  Logger.log("=== TEST EDIT MESSAGE FUNCTIONALITY ===");
  
  var testChatId = 123456789;
  var testMessageId = 999999; // Fake message ID for testing
  
  try {
    // 1. Test edit text without keyboard
    Logger.log("1. Testing editText without keyboard");
    var result1 = editText(testChatId, testMessageId, "Test message 1: Đây là test edit text", null);
    Logger.log("  editText result: " + result1);
    
    // 2. Test edit text with keyboard
    Logger.log("2. Testing editText with keyboard");
    var testKeyboard = createAllocationKeyboard(null);
    var result2 = editText(testChatId, testMessageId, "Test message 2: Với keyboard chọn hũ", testKeyboard);
    Logger.log("  editText with keyboard result: " + result2);
    
    // 3. Test format validation
    Logger.log("3. Testing formatNumberWithSeparator integration");
    var testText = "Chi tiêu: abc 50000 vào hũ test";
    var result3 = editText(testChatId, testMessageId, testText, null);
    Logger.log("  Text with number formatting result: " + result3);
    
    Logger.log("✅ Edit message functionality test completed");
    Logger.log("Note: Actual edit calls may fail with fake messageId, but function structure is tested");
    
  } catch (error) {
    Logger.log("❌ Error in edit message test: " + error.toString());
  }
  
  Logger.log("=== TEST EDIT MESSAGE FUNCTIONALITY COMPLETED ===");
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
  saveTransactionForEdit(testUserId, mockTransaction); // Backward compatibility - no transactionId
  
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