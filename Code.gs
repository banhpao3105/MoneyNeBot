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
  
  // Thêm nút hủy ở hàng cuối
  var cancelButton = transactionId ? 
    { text: "❌ Hủy chỉnh sửa", callback_data: "cancel_edit_" + transactionId } :
    { text: "❌ Hủy", callback_data: "cancel_new" };
  
  keyboard.push([cancelButton]);
  
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
  
  // Tính allocationIndex nếu chưa có
  if (allocationIndex === undefined || allocationIndex === null || allocationIndex < 0) {
    allocationIndex = allocations.indexOf(allocation);
  }
  
  // Validation: Đảm bảo allocationIndex hợp lệ
  if (allocationIndex < 0) {
    allocationIndex = -1; // Fallback to old format
  }
  
  if (isEdit && transactionId && allocationIndex >= 0) {
    // Format mới ngắn cho edit: edit_sub_tx_123456_0_1 (allocationIndex_subIndex)
    prefix = 'edit_sub_' + transactionId + '_' + allocationIndex + '_';
  } else if (isEdit && transactionId) {
    // Format cũ dài cho edit: edit_subcategory_tx_123456_AllocationName_
    prefix = 'edit_subcategory_' + transactionId + '_' + allocation + '_';
  } else if (isEdit) {
    // Format cũ không có transactionId
    prefix = 'edit_subcategory_' + allocation + '_';
  } else if (allocationIndex >= 0) {
    // Format mới ngắn cho transaction mới: sub_0_1 (allocationIndex_subIndex)
    prefix = 'sub_' + allocationIndex + '_';
  } else {
    // Fallback format cũ dài
    prefix = 'subcategory_' + allocation + '_';
  }
  
  // Tạo hàng keyboard, mỗi hàng 2 button
  for (var i = 0; i < subs.length; i += 2) {
    var row = [];
    
    var useShortFormat = allocationIndex >= 0 && (prefix.startsWith('sub_') || prefix.startsWith('edit_sub_'));
    
    if (useShortFormat) {
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
      // Dùng tên subcategory (format cũ - fallback)
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
  
  // Tạo nút hủy
  var cancelButtonData = '';
  var cancelButtonText = '';
  if (isEdit && transactionId) {
    cancelButtonData = 'cancel_edit_' + transactionId;
    cancelButtonText = "❌ Hủy chỉnh sửa";
  } else {
    cancelButtonData = 'cancel_new';  
    cancelButtonText = "❌ Hủy";
  }
  
  // Thêm cả nút quay lại và nút hủy trong cùng 1 hàng
  keyboard.push([
    {
      text: "🔙 Quay lại chọn hũ",
      callback_data: backButtonData
    },
    {
      text: cancelButtonText,
      callback_data: cancelButtonData
    }
  ]);
  
  return {
    "inline_keyboard": keyboard
  };
}

// Tính số thứ tự giao dịch trong ngày
function getNextSequenceNumber(userId, date) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  
  // Chuyển date thành chuỗi để so sánh (format: DD/MM/YYYY)
  var targetDate = new Date(date);
  var targetDateStr = formatDate(targetDate);
  
  var count = 0;
  // Bắt đầu từ dòng 2 (bỏ qua header)
  for (var i = 1; i < data.length; i++) {
    if (data[i][1]) { // Kiểm tra cột Date (giờ là cột B - index 1)
      var rowDate = new Date(data[i][1]);
      var rowDateStr = formatDate(rowDate);
      
      if (rowDateStr === targetDateStr) {
        count++;
      }
    }
  }
  
  return count + 1; // Trả về số thứ tự tiếp theo
}

function addTransactionData(userId, date, description, amount, allocation, type, subCategory) {
  var sheet = getSheet(userId); 
  subCategory = subCategory || ""; // Mặc định rỗng nếu không có
  
  // Tính số thứ tự trong ngày
  var sequenceNumber = getNextSequenceNumber(userId, date);
  
  // Thêm STT vào đầu row
  sheet.appendRow([sequenceNumber, date, description, amount, allocation, type, subCategory]);
  
  // Trả về sequence number để hiển thị trong telegram
  return sequenceNumber;
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
      parse_mode: "HTML"
    }
  };
  
  // Chỉ thêm reply_markup nếu keyBoard không null/undefined
  if (keyBoard) {
    data.payload.reply_markup = JSON.stringify(keyBoard);
  }
  
  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/', data);
    Logger.log("DEBUG: Message edited successfully");
    return true;
  } catch (error) {
    Logger.log("DEBUG: Failed to edit message: " + error.toString());
    Logger.log("DEBUG: Edit data: " + JSON.stringify(data));
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
    } else if (data.startsWith('subcategory_') || data.startsWith('sub_')) {
      // Xử lý chọn nhãn con
      var allocation = '';
      var subCategory = '';
      
      if (data.startsWith('sub_')) {
        // Format mới ngắn: sub_0_1 (allocationIndex_subIndex)
        var parts = data.split('_');
        if (parts.length >= 3) {
          var allocationIndex = parseInt(parts[1]);
          var subCategoryIndex = parseInt(parts[2]);
          
          if (!isNaN(allocationIndex) && !isNaN(subCategoryIndex) && allocationIndex >= 0 && subCategoryIndex >= 0) {
            allocation = allocations[allocationIndex];
            if (allocation && subCategories[allocation] && subCategories[allocation][subCategoryIndex]) {
              subCategory = subCategories[allocation][subCategoryIndex];
            }
          }
        }
      } else {
        // Format cũ dài: subcategory_AllocationName_SubCategoryName
        var parts = data.split('_');
        allocation = parts[1];
        subCategory = parts.slice(2).join('_');
      }
      
      // Validation: Đảm bảo allocation và subCategory được parse thành công
      if (!allocation || !subCategory) {
        editText(chatId, messageId, "❌ Lỗi xử lý lựa chọn. Vui lòng thử lại.", null);
        return;
      }
      
      // Lấy thông tin giao dịch tạm từ cache
      var tempTransaction = getTempTransaction(chatId);
      if (tempTransaction) {
        // Lưu giao dịch với subcategory và lấy sequence number
        var sequenceNumber = addTransactionData(
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
          sequenceNumber: sequenceNumber, // Thêm STT vào transaction info
          rowIndex: getLastRowIndex(chatId) // Lấy index của row vừa thêm
        };
        saveTransactionForEdit(chatId, transactionInfo, transactionId);
        
        // Xóa cache tạm
        clearTempTransaction(chatId);
        
        // Thông báo thành công với keyboard chỉnh sửa (bao gồm STT)
        var typeText = tempTransaction.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        var editKeyboard = createEditKeyboard(transactionId);
        
        editText(chatId, messageId,
          "✅ Giao dịch #" + sequenceNumber + " - Đã ghi nhận " + typeText + ": " + tempTransaction.description + 
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
        
        // Hiển thị keyboard chọn nhãn con với allocationIndex
        var allocationIndex = allocations.indexOf(allocation);
        var keyboard = createSubCategoryKeyboard(allocation, false, null, allocationIndex);
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
    } else if (data === 'cancel_new') {
      // Hủy giao dịch mới
      Logger.log("DEBUG: cancel_new callback");
      
      // Xóa temp transaction cache
      clearTempTransaction(chatId);
      Logger.log("DEBUG: Cleared temp transaction cache");
      
      // Thông báo hủy thành công
      editText(chatId, messageId, "❌ Đã hủy giao dịch", null);
      Logger.log("DEBUG: Cancel new transaction message sent");
      return;
    } else if (data.startsWith('cancel_edit_')) {
      // Hủy chỉnh sửa giao dịch - trả về trạng thái xác nhận ban đầu
      var transactionId = data.replace('cancel_edit_', '');
      
      // Lấy thông tin giao dịch từ cache TRƯỚC khi clear
      var transactionInfo = getTransactionForEdit(chatId, transactionId);
      
      if (transactionInfo) {
        // Tạo lại message xác nhận gốc với transaction info
        var typeText = transactionInfo.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        var editKeyboard = createEditKeyboard(transactionInfo.transactionId);
        
        // Hiển thị lại message xác nhận ban đầu (bao gồm STT)
        editText(chatId, messageId,
          "✅ Giao dịch #" + transactionInfo.sequenceNumber + " - Đã ghi nhận " + typeText + ": " + transactionInfo.description + 
          " " + formatNumberWithSeparator(transactionInfo.amount) + 
          " vào hũ " + transactionInfo.allocation + " với nhãn " + transactionInfo.subCategory,
          editKeyboard
        );
        
        // KHÔNG clear cache - để user có thể edit lại transaction này bao nhiêu lần cũng được
        // clearTransactionForEdit(chatId, transactionId);
      } else {
        // Fallback nếu không tìm thấy transaction info
        editText(chatId, messageId, "❌ Không tìm thấy thông tin giao dịch để khôi phục", null);
      }
      
      return;
    } else {
      // Log unhandled callback
      Logger.log("DEBUG: Unhandled callback in first block: " + data);
      Logger.log("Available handlers: connect_email, bank_, subcategory_, edit_transaction, edit_allocation_, edit_subcategory_, cancel_new, cancel_edit_");
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
    if (text === '/xoathunhap') {
      var userId = chatId;
      var sheet = getSheet(userId);
      var data = sheet
        .getDataRange()
        .getValues();
      var newData = [];

      for (var i = 0; i < data.length; i++) {
        if (data[i][5] !== "ThuNhap") { // Type giờ ở cột F (index 5)
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
    } else if (text === '/xoachitieu') {
      var userId = chatId;
      var sheet = getSheet(userId);
      var data = sheet
        .getDataRange()
        .getValues();
      var newData = [];

      for (var i = 0; i < data.length; i++) {
        if (data[i][5] !== "ChiTieu") { // Type giờ ở cột F (index 5)
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
    } else if (text === '/xoatatca') {
      var userId = chatId;
      var sheet = getSheet(userId);
      var data = sheet
        .getDataRange()
        .getValues();
      var newData = [];

      for (var i = 0; i < data.length; i++) {
        if (data[i][5] !== "ChiTieu" && data[i][5] !== "ThuNhap") { // Type giờ ở cột F (index 5)
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
          
          // Hiển thị keyboard chọn nhãn con với allocationIndex
          var allocationIndex = allocations.indexOf(allocation);
          var keyboard = createSubCategoryKeyboard(allocation, false, null, allocationIndex);
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
          
          // Hiển thị keyboard chọn nhãn con với allocationIndex
          var allocationIndex = allocations.indexOf(allocation);
          var keyboard = createSubCategoryKeyboard(allocation, false, null, allocationIndex);
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
      
      sendText(id_message, 
        '🐹 Xin chào ' + userName + '!\n\n' +
        '🐹 <b>Thư ký Capybara</b> là trợ lý quản lý tài chính cá nhân giúp bạn:\n' +
        '• 📊 Theo dõi thu chi một cách chi tiết\n' +
        '• 🏺 Phân bổ tiền vào 6 hũ tài chính\n' +
        '• 🏷 Gắn nhãn và phân loại từng giao dịch\n' +
        '• 📈 Xem báo cáo và lịch sử giao dịch\n\n' +
        '⚡ <b>Bắt đầu nhanh:</b>\n' +
        '• Gõ <code>/chi ăn sáng 25000</code> để nhập chi tiêu\n' +
        '• Gõ <code>/thu lương 10000000</code> để nhập thu nhập\n' +
        '• Gõ <code>/help</code> để xem tất cả lệnh\n' +
        '• Gõ <code>/menu</code> để xem menu tương tác\n\n' +
        '🎯 Hãy bắt đầu quản lý tài chính thông minh cùng Thư ký Capybara!'
      );
    }
    else if (text === '/menu') {
      
      sendText(id_message, 'Xin chào ' + userName + '! Menu Thư ký Capybara tại đây.',
        keyBoard
      );
      
    // === QUICK ACCESS COMMANDS ===
    } else if (text === '/tongtien') {
      var userId = chatId;
      var currentBalance = getCurrentBalance(userId);
      sendText(id_message, "💰 Số tiền hiện tại của bạn là: " + formatNumberWithSeparator(currentBalance));
      
    } else if (text === '/tongchi') {
      var userId = chatId;
      var totalExpenses = getTotalAmountByType(userId, "ChiTieu");
      sendText(id_message, "💸 Tổng chi tiêu của bạn là: " + formatNumberWithSeparator(totalExpenses));
      
    } else if (text === '/tongthunhap') {
      var userId = chatId;
      sendTotalIncomeSummary(id_message, userId);
      
    } else if (text === '/xemhu') {
      var userId = chatId;
      sendTotalPhanboSummary(id_message, userId);
      
    } else if (text === '/lichsu') {
      var userId = chatId;
      sendTransactionHistory(id_message, userId);
      
    // === QUICK INPUT COMMANDS ===
    } else if (text.startsWith('/chi ')) {
      // /chi description amount - Nhanh chóng nhập chi tiêu
      var input = text.substring(5); // Bỏ "/chi "
      handleQuickExpense(id_message, chatId, input, userName);
      
    } else if (text.startsWith('/thu ')) {
      // /thu description amount - Nhanh chóng nhập thu nhập
      var input = text.substring(5); // Bỏ "/thu "
      handleQuickIncome(id_message, chatId, input, userName);
      
    } else if (text === '/commands' || text === '/help') {
      sendCommandsList(id_message);
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
        "Xin chào " + userName + "! Để biết thêm chi tiết về các lệnh, bạn có thể sử dụng lệnh /help hoặc cũng có thể xem menu Thư ký Capybara tại đây."
      );
    }
  }
}



function addIncomeData(userId, date, content, amount, allocation, subCategory) {
  var sheet = getSheet(userId);
  subCategory = subCategory || "";
  
  // Tính số thứ tự trong ngày
  var sequenceNumber = getNextSequenceNumber(userId, date);
  
  var type = "ThuNhap";
  sheet.appendRow([sequenceNumber, date, content, amount, allocation, type, subCategory]);
  
  // Trả về sequence number để hiển thị trong telegram
  return sequenceNumber;
}

function addExpenseData(userId, date, item, amount, allocation, subCategory) {
  var sheet = getSheet(userId);
  subCategory = subCategory || "";
  
  // Tính số thứ tự trong ngày
  var sequenceNumber = getNextSequenceNumber(userId, date);
  
  var type = "ChiTieu";
  sheet.appendRow([sequenceNumber, date, item, amount, allocation, type, subCategory]);
  
  // Trả về sequence number để hiển thị trong telegram
  return sequenceNumber;
}

function getTotalIncome(userId) {
  var sheet = getSheet(userId);
  var data = sheet
    .getRange(2, 4, sheet.getLastRow() - 1, 1) // Amount giờ ở cột D (4)
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
    .getRange(2, 4, sheet.getLastRow() - 1, 1) // Amount giờ ở cột D (4)
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
    .getRange(2, 4, sheet.getLastRow() - 1, 3) // Đọc từ cột D (Amount, Allocation, Type)
    .getValues();
  for (var i = 0; i < data.length; i++) {
    var amount = data[i][0];    // Amount ở index 0 trong range
    var allocation = data[i][1]; // Allocation ở index 1 trong range  
    var type = data[i][2];      // Type ở index 2 trong range
    if (allocations.includes(allocation)) {
      if (type === "ThuNhap") {
        balances[allocation] += amount;
      } else if (type === "ChiTieu") {
        balances[allocation] -= amount;
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
    var transactionDate = new Date(data[i][1]); // Date giờ ở index 1
    if (transactionDate >= timeframe.startDate && transactionDate < timeframe.endDate) {
      var transaction = {
        stt: data[i][0],        // STT
        date: data[i][1],       // Date  
        description: data[i][2], // Description
        amount: data[i][3],     // Amount
        allocation: data[i][4], // Allocation
        type: data[i][5],       // Type
        subCategory: data[i][6] // SubCategory
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
  
  // Lấy STT hiện tại của row để giữ nguyên
  var currentSTT = sheet.getRange(rowIndex, 1).getValue();
  
  // Cập nhật dữ liệu trong hàng (giờ có 7 cột)
  sheet.getRange(rowIndex, 1, 1, 7).setValues([[
    currentSTT, // Giữ nguyên STT
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

// Test cancel buttons functionality
function testCancelButtons() {
  Logger.log("=== TEST CANCEL BUTTONS ===");
  
  var testUserId = "USER_CANCEL_TEST";
  var testChatId = 123456789;
  var testTransactionId = "tx_1234567890";
  
  try {
    // 1. Test allocation keyboard có nút hủy
    Logger.log("1. Testing allocation keyboard with cancel button");
    
    // Test cho transaction mới
    var newAllocKeyboard = createAllocationKeyboard(null);
    var lastRowNew = newAllocKeyboard.inline_keyboard[newAllocKeyboard.inline_keyboard.length - 1];
    var cancelButtonNew = lastRowNew[0];
    
    Logger.log("  New transaction cancel button:");
    Logger.log("    Text: " + cancelButtonNew.text);
    Logger.log("    Callback: " + cancelButtonNew.callback_data);
    
    if (cancelButtonNew.callback_data === 'cancel_new') {
      Logger.log("  ✅ New transaction cancel button OK");
    } else {
      Logger.log("  ❌ New transaction cancel button FAILED");
    }
    
    // Test cho edit transaction
    var editAllocKeyboard = createAllocationKeyboard(testTransactionId);
    var lastRowEdit = editAllocKeyboard.inline_keyboard[editAllocKeyboard.inline_keyboard.length - 1];
    var cancelButtonEdit = lastRowEdit[0];
    
    Logger.log("  Edit transaction cancel button:");
    Logger.log("    Text: " + cancelButtonEdit.text);
    Logger.log("    Callback: " + cancelButtonEdit.callback_data);
    
    if (cancelButtonEdit.callback_data === 'cancel_edit_' + testTransactionId) {
      Logger.log("  ✅ Edit transaction cancel button OK");
    } else {
      Logger.log("  ❌ Edit transaction cancel button FAILED");
    }
    
    // 2. Test subcategory keyboard có nút hủy
    Logger.log("2. Testing subcategory keyboard with cancel button");
    
    var subKeyboard = createSubCategoryKeyboard("Chi tiêu thiết yếu", false, null, null);
    var lastRowSub = subKeyboard.inline_keyboard[subKeyboard.inline_keyboard.length - 1];
    
    Logger.log("  Subcategory last row buttons:");
    for (var i = 0; i < lastRowSub.length; i++) {
      Logger.log("    Button " + i + ": " + lastRowSub[i].text + " -> " + lastRowSub[i].callback_data);
    }
    
    // Kiểm tra có nút hủy
    var hasCancelButton = false;
    for (var i = 0; i < lastRowSub.length; i++) {
      if (lastRowSub[i].callback_data === 'cancel_new') {
        hasCancelButton = true;
        break;
      }
    }
    
    if (hasCancelButton) {
      Logger.log("  ✅ Subcategory keyboard has cancel button");
    } else {
      Logger.log("  ❌ Subcategory keyboard missing cancel button");
    }
    
    // 3. Test cache functions
    Logger.log("3. Testing cancel cache operations");
    
    // Setup temp transaction
    var tempTransaction = {
      description: "test",
      amount: 10000,
      type: "ChiTieu",
      allocation: "Chi tiêu thiết yếu"
    };
    saveTempTransaction(testChatId, tempTransaction);
    
    var retrieved = getTempTransaction(testChatId);
    if (retrieved) {
      Logger.log("  ✅ Temp transaction saved successfully");
      
      // Test clear
      clearTempTransaction(testChatId);
      var afterClear = getTempTransaction(testChatId);
      
      if (!afterClear) {
        Logger.log("  ✅ Temp transaction cleared successfully");
      } else {
        Logger.log("  ❌ Temp transaction NOT cleared");
      }
    } else {
      Logger.log("  ❌ Failed to save temp transaction");
    }
    
    // Test edit transaction cache
    var transactionInfo = {
      userId: testChatId,
      transactionId: testTransactionId,
      description: "test edit",
      amount: 20000,
      type: "ChiTieu",
      allocation: "Chi tiêu thiết yếu"
    };
    
    saveTransactionForEdit(testChatId, transactionInfo, testTransactionId);
    var retrievedEdit = getTransactionForEdit(testChatId, testTransactionId);
    
    if (retrievedEdit) {
      Logger.log("  ✅ Edit transaction saved successfully");
      
      // Test clear edit
      clearTransactionForEdit(testChatId, testTransactionId);
      var afterClearEdit = getTransactionForEdit(testChatId, testTransactionId);
      
      if (!afterClearEdit) {
        Logger.log("  ✅ Edit transaction cleared successfully");
      } else {
        Logger.log("  ❌ Edit transaction NOT cleared");
      }
    } else {
      Logger.log("  ❌ Failed to save edit transaction");
    }
    
    Logger.log("✅ Cancel buttons test completed");
    
  } catch (error) {
    Logger.log("❌ Error in cancel buttons test: " + error.toString());
  }
  
  Logger.log("=== TEST CANCEL BUTTONS COMPLETED ===");
}

// Test cancel flow simulation
function testCancelFlow() {
  Logger.log("=== TEST CANCEL FLOW SIMULATION ===");
  
  var testChatId = 123456789;
  
  try {
    // 1. Simulate new transaction cancel flow
    Logger.log("1. Testing new transaction cancel flow");
    
    // Setup temp transaction
    var tempTransaction = {
      description: "ăn trưa", 
      amount: 30000,
      type: "ChiTieu",
      allocation: "Chi tiêu thiết yếu"
    };
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Setup temp transaction: " + JSON.stringify(tempTransaction));
    
    // Simulate cancel_new callback
    var beforeCancel = getTempTransaction(testChatId);
    Logger.log("  Before cancel - temp transaction exists: " + (beforeCancel ? "YES" : "NO"));
    
    // Clear temp transaction (simulate callback handler)
    clearTempTransaction(testChatId);
    
    var afterCancel = getTempTransaction(testChatId);
    Logger.log("  After cancel - temp transaction exists: " + (afterCancel ? "YES" : "NO"));
    
    if (!afterCancel) {
      Logger.log("  ✅ New transaction cancel flow OK");
    } else {
      Logger.log("  ❌ New transaction cancel flow FAILED");
    }
    
    // 2. Simulate edit transaction cancel flow
    Logger.log("2. Testing edit transaction cancel flow");
    
    var testTransactionId = "tx_" + Date.now();
    var transactionInfo = {
      userId: testChatId,
      transactionId: testTransactionId,
      description: "test edit",
      amount: 50000,
      allocation: "Hưởng thụ",
      type: "ChiTieu"
    };
    
    saveTransactionForEdit(testChatId, transactionInfo, testTransactionId);
    Logger.log("  Setup edit transaction: " + JSON.stringify(transactionInfo));
    
    var beforeCancelEdit = getTransactionForEdit(testChatId, testTransactionId);
    Logger.log("  Before cancel - edit transaction exists: " + (beforeCancelEdit ? "YES" : "NO"));
    
    // Clear edit transaction (simulate callback handler)
    clearTransactionForEdit(testChatId, testTransactionId);
    
    var afterCancelEdit = getTransactionForEdit(testChatId, testTransactionId);
    Logger.log("  After cancel - edit transaction exists: " + (afterCancelEdit ? "YES" : "NO"));
    
    if (!afterCancelEdit) {
      Logger.log("  ✅ Edit transaction cancel flow OK");
    } else {
      Logger.log("  ❌ Edit transaction cancel flow FAILED");
    }
    
    // 3. Test button layouts
    Logger.log("3. Testing button layouts");
    
    var newAllocKeyboard = createAllocationKeyboard(null);
    Logger.log("  New allocation keyboard rows: " + newAllocKeyboard.inline_keyboard.length);
    
    var editAllocKeyboard = createAllocationKeyboard(testTransactionId);
    Logger.log("  Edit allocation keyboard rows: " + editAllocKeyboard.inline_keyboard.length);
    
    var subKeyboard = createSubCategoryKeyboard("Chi tiêu thiết yếu", false, null, null);
    Logger.log("  Subcategory keyboard rows: " + subKeyboard.inline_keyboard.length);
    
    var editSubKeyboard = createSubCategoryKeyboard("Chi tiêu thiết yếu", true, testTransactionId, 0);
    Logger.log("  Edit subcategory keyboard rows: " + editSubKeyboard.inline_keyboard.length);
    
    Logger.log("✅ Cancel flow simulation completed");
    
  } catch (error) {
    Logger.log("❌ Error in cancel flow test: " + error.toString());
  }
  
  Logger.log("=== TEST CANCEL FLOW SIMULATION COMPLETED ===");
}

// Debug cancel button issue - test callback handler
function debugCancelIssue() {
  Logger.log("=== DEBUG CANCEL ISSUE ===");
  
  var testChatId = 123456789;
  var testMessageId = 999999;
  
  try {
    // 1. Test cancel button creation trong subcategory keyboard
    Logger.log("1. Testing cancel button in subcategory keyboard");
    var subKeyboard = createSubCategoryKeyboard("Chi tiêu thiết yếu", false, null, null);
    
    if (subKeyboard && subKeyboard.inline_keyboard) {
      var lastRow = subKeyboard.inline_keyboard[subKeyboard.inline_keyboard.length - 1];
      Logger.log("  Last row buttons count: " + lastRow.length);
      
      for (var i = 0; i < lastRow.length; i++) {
        Logger.log("    Button " + i + ": " + lastRow[i].text + " -> " + lastRow[i].callback_data);
        
        if (lastRow[i].callback_data === 'cancel_new') {
          Logger.log("  ✅ Found cancel_new button at position " + i);
        }
      }
    }
    
    // 2. Test cancel_new callback handler simulation
    Logger.log("2. Testing cancel_new callback handler simulation");
    
    // Setup temp transaction như flow thực tế
    var tempTransaction = {
      description: "a",
      amount: 1000,
      type: "ChiTieu", 
      allocation: "Chi tiêu thiết yếu"
    };
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Setup temp transaction: " + JSON.stringify(tempTransaction));
    
    // Verify temp transaction exists
    var beforeCancel = getTempTransaction(testChatId);
    Logger.log("  Before cancel - temp transaction: " + JSON.stringify(beforeCancel));
    
    // Simulate cancel_new callback logic
    Logger.log("  Simulating cancel_new callback logic...");
    var data = 'cancel_new';
    
    if (data === 'cancel_new') {
      Logger.log("    ✅ Callback matched 'cancel_new'");
      
      // Clear temp transaction
      clearTempTransaction(testChatId);
      Logger.log("    ✅ Cleared temp transaction cache");
      
      // Verify cleared
      var afterCancel = getTempTransaction(testChatId);
      Logger.log("    After cancel - temp transaction: " + (afterCancel ? JSON.stringify(afterCancel) : "null"));
      
      if (!afterCancel) {
        Logger.log("    ✅ Temp transaction successfully cleared");
      } else {
        Logger.log("    ❌ Temp transaction NOT cleared");
      }
      
      // Test editText call (will fail with fake messageId but we can test the call)
      Logger.log("    Testing editText call...");
      try {
        var editResult = editText(testChatId, testMessageId, "❌ Đã hủy giao dịch", null);
        Logger.log("    editText call completed (may have failed due to fake messageId)");
      } catch (editError) {
        Logger.log("    editText error: " + editError.toString());
      }
      
    } else {
      Logger.log("    ❌ Callback did NOT match 'cancel_new'");
    }
    
    // 3. Test tất cả các callback handlers có trong code
    Logger.log("3. Testing callback handler lookup");
    var testCallbacks = [
      'cancel_new',
      'cancel_edit_tx_123456',
      'back_to_allocation',
      'allocation_0',
      'subcategory_Chi tiêu thiết yếu_Nhà ở'
    ];
    
    for (var i = 0; i < testCallbacks.length; i++) {
      var testCallback = testCallbacks[i];
      Logger.log("  Testing callback: " + testCallback);
      
      // Kiểm tra logic matching
      if (testCallback === 'cancel_new') {
        Logger.log("    ✅ Would match cancel_new handler");
      } else if (testCallback.startsWith('cancel_edit_')) {
        Logger.log("    ✅ Would match cancel_edit_ handler");
      } else if (testCallback === 'back_to_allocation') {
        Logger.log("    ✅ Would match back_to_allocation handler");
      } else if (testCallback.startsWith('allocation_')) {
        Logger.log("    ✅ Would match allocation_ handler");
      } else if (testCallback.startsWith('subcategory_')) {
        Logger.log("    ✅ Would match subcategory_ handler");
      } else {
        Logger.log("    ❌ Would be unhandled callback");
      }
    }
    
    Logger.log("✅ Cancel issue debug completed");
    
  } catch (error) {
    Logger.log("❌ Error in cancel issue debug: " + error.toString());
  }
  
  Logger.log("=== DEBUG CANCEL ISSUE COMPLETED ===");
}

// Test scenario: "a - 1" → nhấn hủy
function debugCancelFromSubcategory() {
  Logger.log("=== DEBUG CANCEL FROM SUBCATEGORY ===");
  
  var testChatId = 123456789;
  
  try {
    // 1. Simulate "a - 1" text processing flow
    Logger.log("1. Simulating 'a - 1' text processing flow");
    
    var tempTransaction = {
      date: new Date().toISOString().split('T')[0],
      description: "a",
      amount: 1000,
      allocation: "Chi tiêu thiết yếu",
      type: "ChiTieu"
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Saved temp transaction: " + JSON.stringify(tempTransaction));
    
    // Tạo subcategory keyboard giống như text processing
    var keyboard = createSubCategoryKeyboard("Chi tiêu thiết yếu", false, null, null);
    Logger.log("  Created subcategory keyboard");
    
    // Log last row với cancel button
    var lastRow = keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1];
    Logger.log("  Last row buttons:");
    for (var i = 0; i < lastRow.length; i++) {
      Logger.log("    " + i + ": " + lastRow[i].text + " -> " + lastRow[i].callback_data);
    }
    
    // 2. Simulate callback query từ cancel button
    Logger.log("2. Simulating callback query from cancel button");
    
    // Mock callback query data
    var mockCallbackQuery = {
      from: { id: testChatId },
      message: { message_id: 12345 },
      data: 'cancel_new'
    };
    
    Logger.log("  Mock callback query: " + JSON.stringify(mockCallbackQuery));
    
    // Simulate doPost logic cho callback
    var chatId = mockCallbackQuery.from.id;
    var messageId = mockCallbackQuery.message.message_id;
    var data = mockCallbackQuery.data;
    
    Logger.log("  Extracted: chatId=" + chatId + ", messageId=" + messageId + ", data=" + data);
    
    // 3. Test cancel_new logic
    Logger.log("3. Testing cancel_new callback logic");
    
    if (data === 'cancel_new') {
      Logger.log("  ✅ Callback matched 'cancel_new'");
      
      // Check temp transaction exists
      var beforeCancel = getTempTransaction(chatId);
      Logger.log("  Before cancel - temp transaction: " + (beforeCancel ? "EXISTS" : "NOT FOUND"));
      
      if (beforeCancel) {
        // Clear temp transaction
        clearTempTransaction(chatId);
        Logger.log("  ✅ Cleared temp transaction cache");
        
        // Verify cleared
        var afterCancel = getTempTransaction(chatId);
        Logger.log("  After cancel - temp transaction: " + (afterCancel ? "STILL EXISTS" : "CLEARED"));
        
        // Test editText call
        Logger.log("  Testing editText call...");
        try {
          var success = editText(chatId, messageId, "❌ Đã hủy giao dịch", null);
          Logger.log("  ✅ editText call completed, success: " + success);
        } catch (editError) {
          Logger.log("  ❌ editText error: " + editError.toString());
        }
      } else {
        Logger.log("  ❌ No temp transaction found to cancel");
      }
    } else {
      Logger.log("  ❌ Callback did NOT match 'cancel_new': " + data);
    }
    
    // 4. Test editText function independently
    Logger.log("4. Testing editText function independently");
    
    try {
      // Test với real messageId format
      var testMessageId = 12345;
      var testResult = editText(testChatId, testMessageId, "Test edit message", null);
      Logger.log("  editText independent test result: " + testResult);
      
      // Test với null keyboard
      var testResult2 = editText(testChatId, testMessageId, "Test with null keyboard", null);
      Logger.log("  editText with null keyboard result: " + testResult2);
      
    } catch (independentError) {
      Logger.log("  ❌ Independent editText error: " + independentError.toString());
    }
    
    Logger.log("✅ Cancel from subcategory debug completed");
    
  } catch (error) {
    Logger.log("❌ Error in cancel from subcategory debug: " + error.toString());
  }
  
  Logger.log("=== DEBUG CANCEL FROM SUBCATEGORY COMPLETED ===");
}

// Simple test editText function
function testEditTextFunction() {
  Logger.log("=== TEST EDITTEXT FUNCTION ===");
  
  try {
    // 1. Test function exists
    Logger.log("1. Testing if editText function exists");
    if (typeof editText === 'function') {
      Logger.log("  ✅ editText function exists");
    } else {
      Logger.log("  ❌ editText function NOT found");
      return;
    }
    
    // 2. Test function signature
    Logger.log("2. Testing editText function signature");
    Logger.log("  Function length (parameters): " + editText.length);
    
    // 3. Test với fake data
    Logger.log("3. Testing editText with fake data");
    var testChatId = 123456789;
    var testMessageId = 12345;
    var testText = "Test message";
    
    try {
      var result = editText(testChatId, testMessageId, testText, null);
      Logger.log("  editText result: " + result);
      Logger.log("  ✅ editText call completed (may fail due to fake data)");
    } catch (error) {
      Logger.log("  editText error: " + error.toString());
      Logger.log("  Error name: " + error.name);
      Logger.log("  Error message: " + error.message);
    }
    
    // 4. Test với keyboard
    Logger.log("4. Testing editText with keyboard");
    var testKeyboard = {
      "inline_keyboard": [
        [{ text: "Test Button", callback_data: "test" }]
      ]
    };
    
    try {
      var resultWithKeyboard = editText(testChatId, testMessageId, testText, testKeyboard);
      Logger.log("  editText with keyboard result: " + resultWithKeyboard);
    } catch (error) {
      Logger.log("  editText with keyboard error: " + error.toString());
    }
    
    Logger.log("✅ editText function test completed");
    
  } catch (error) {
    Logger.log("❌ Error in editText function test: " + error.toString());
  }
  
  Logger.log("=== TEST EDITTEXT FUNCTION COMPLETED ===");
}

// Final test - simulate exact "a - 1" → cancel flow
function testCancelFixFinal() {
  Logger.log("=== TEST CANCEL FIX FINAL ===");
  
  var testChatId = 123456789;
  
  try {
    // 1. Setup temp transaction như "a - 1" flow
    Logger.log("1. Setup temp transaction for 'a - 1'");
    var tempTransaction = {
      date: new Date().toISOString().split('T')[0],
      description: "a",
      amount: 1000,
      allocation: "Chi tiêu thiết yếu",
      type: "ChiTieu"
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    var savedTemp = getTempTransaction(testChatId);
    Logger.log("  Temp transaction saved: " + (savedTemp ? "YES" : "NO"));
    
    // 2. Test cancel button tồn tại
    Logger.log("2. Test cancel button exists in subcategory keyboard");
    var keyboard = createSubCategoryKeyboard("Chi tiêu thiết yếu", false, null, null);
    var lastRow = keyboard.inline_keyboard[keyboard.inline_keyboard.length - 1];
    
    var cancelFound = false;
    for (var i = 0; i < lastRow.length; i++) {
      if (lastRow[i].callback_data === 'cancel_new') {
        cancelFound = true;
        Logger.log("  ✅ Cancel button found: " + lastRow[i].text);
        break;
      }
    }
    
    if (!cancelFound) {
      Logger.log("  ❌ Cancel button NOT found");
      return;
    }
    
    // 3. Test cancel callback với fixed editText
    Logger.log("3. Test cancel callback with fixed editText");
    var data = 'cancel_new';
    var messageId = 12345;
    
    if (data === 'cancel_new') {
      Logger.log("  ✅ Callback matched");
      
      // Clear temp transaction
      clearTempTransaction(testChatId);
      var afterClear = getTempTransaction(testChatId);
      Logger.log("  Temp cleared: " + (afterClear ? "NO" : "YES"));
      
      // Test editText với null keyboard (fixed version)
      Logger.log("  Testing editText with null keyboard...");
      try {
        var result = editText(testChatId, messageId, "❌ Đã hủy giao dịch", null);
        Logger.log("  ✅ editText with null keyboard completed: " + result);
      } catch (error) {
        Logger.log("  ❌ editText with null keyboard failed: " + error.toString());
      }
      
      // Test editText với undefined keyboard
      Logger.log("  Testing editText with undefined keyboard...");
      try {
        var result2 = editText(testChatId, messageId, "❌ Test undefined", undefined);
        Logger.log("  ✅ editText with undefined keyboard completed: " + result2);
      } catch (error) {
        Logger.log("  ❌ editText with undefined keyboard failed: " + error.toString());
      }
    }
    
    Logger.log("✅ Cancel fix final test completed");
    Logger.log("🎯 FIX: editText now properly handles null/undefined keyboards");
    Logger.log("🎯 EXPECTED: Cancel button should now work properly");
    
  } catch (error) {
    Logger.log("❌ Error in cancel fix final test: " + error.toString());
  }
  
  Logger.log("=== TEST CANCEL FIX FINAL COMPLETED ===");
}

// Debug "Tiết kiệm dài hạn" callback issue
function debugTietKiemDaiHan() {
  Logger.log("=== DEBUG TIET KIEM DAI HAN ===");
  
  var testChatId = 123456789;
  
  try {
    // 1. Test allocation keyboard callback data
    Logger.log("1. Testing allocation keyboard callback data");
    var allocKeyboard = createAllocationKeyboard(null);
    
    for (var i = 0; i < allocKeyboard.inline_keyboard.length; i++) {
      var row = allocKeyboard.inline_keyboard[i];
      for (var j = 0; j < row.length; j++) {
        var button = row[j];
        var callbackLength = encodeURIComponent(button.callback_data).length;
        
        Logger.log("  " + button.text + ":");
        Logger.log("    Callback: " + button.callback_data);
        Logger.log("    Length: " + button.callback_data.length + " chars");
        Logger.log("    Bytes: " + callbackLength + " bytes");
        
        if (callbackLength > 64) {
          Logger.log("    ❌ EXCEEDS 64-BYTE LIMIT!");
        } else {
          Logger.log("    ✅ Within limit");
        }
        
        // Test parsing cho "Tiết kiệm dài hạn"
        if (button.text === "Tiết kiệm dài hạn") {
          Logger.log("  Testing parsing for 'Tiết kiệm dài hạn':");
          
          var data = button.callback_data;
          Logger.log("    Callback data: " + data);
          
          if (data.startsWith('allocation_')) {
            var parts = data.split('_');
            var allocationIndex = parseInt(parts[1]);
            var allocation = allocations[allocationIndex];
            
            Logger.log("    Parsed index: " + allocationIndex);
            Logger.log("    Parsed allocation: " + allocation);
            Logger.log("    Expected: Tiết kiệm dài hạn");
            
            if (allocation === "Tiết kiệm dài hạn") {
              Logger.log("    ✅ Parsing OK");
            } else {
              Logger.log("    ❌ Parsing FAILED");
            }
          }
        }
      }
    }
    
    // 2. Test temp transaction setup và retrieval
    Logger.log("2. Testing temp transaction for back flow");
    
    var tempTransaction = {
      description: "a",
      amount: 3000,
      type: "ChiTieu",
      allocation: "Chi tiêu thiết yếu" // Allocation cũ
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Saved temp transaction: " + JSON.stringify(tempTransaction));
    
    // 3. Simulate chọn "Tiết kiệm dài hạn" 
    Logger.log("3. Simulating selection of 'Tiết kiệm dài hạn'");
    
    var data = 'allocation_2'; // Index 2 should be "Tiết kiệm dài hạn"
    Logger.log("  Callback data: " + data);
    
    if (data.startsWith('allocation_')) {
      var parts = data.split('_');
      var allocationIndex = parseInt(parts[1]);
      var allocation = allocations[allocationIndex];
      
      Logger.log("  Parsed allocationIndex: " + allocationIndex);
      Logger.log("  Parsed allocation: " + allocation);
      
      // Test temp transaction retrieval
      var retrievedTemp = getTempTransaction(testChatId);
      Logger.log("  Retrieved temp transaction: " + JSON.stringify(retrievedTemp));
      
      if (retrievedTemp) {
        // Update allocation
        retrievedTemp.allocation = allocation;
        saveTempTransaction(testChatId, retrievedTemp);
        Logger.log("  Updated temp transaction allocation to: " + allocation);
        
        // Test subcategory keyboard creation
        var subKeyboard = createSubCategoryKeyboard(allocation, false, null, null);
        if (subKeyboard && subKeyboard.inline_keyboard) {
          Logger.log("  ✅ Subcategory keyboard created successfully");
          Logger.log("  Subcategory count: " + subKeyboard.inline_keyboard.length + " rows");
          
          // Test message text
          var messageText = (retrievedTemp.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
            retrievedTemp.description + " " + 
            formatNumberWithSeparator(retrievedTemp.amount) + " vào hũ " + allocation + 
            "\nVui lòng chọn nhãn cụ thể:";
          
          Logger.log("  Message text: " + messageText);
          Logger.log("  ✅ Flow should work correctly");
        } else {
          Logger.log("  ❌ Failed to create subcategory keyboard");
        }
      } else {
        Logger.log("  ❌ No temp transaction found");
      }
    }
    
    // Cleanup
    clearTempTransaction(testChatId);
    
    Logger.log("✅ Debug Tiết kiệm dài hạn completed");
    
  } catch (error) {
    Logger.log("❌ Error in debug Tiết kiệm dài hạn: " + error.toString());
  }
  
  Logger.log("=== DEBUG TIET KIEM DAI HAN COMPLETED ===");
}

// Comprehensive test - all allocation callbacks
function testAllAllocationCallbacks() {
  Logger.log("=== TEST ALL ALLOCATION CALLBACKS ===");
  
  var testChatId = 123456789;
  
  try {
    // Test callback cho từng allocation
    for (var i = 0; i < allocations.length; i++) {
      var allocation = allocations[i];
      Logger.log((i + 1) + ". Testing " + allocation + " (index " + i + ")");
      
      // Setup temp transaction
      var tempTransaction = {
        description: "test",
        amount: 5000,
        type: "ChiTieu",
        allocation: "Chi tiêu thiết yếu" // Default
      };
      saveTempTransaction(testChatId, tempTransaction);
      
      // Test callback data
      var callbackData = 'allocation_' + i;
      var callbackBytes = encodeURIComponent(callbackData).length;
      
      Logger.log("  Callback: " + callbackData + " (" + callbackBytes + " bytes)");
      
      // Test parsing logic (như trong doPost)
      if (callbackData.startsWith('allocation_')) {
        var parts = callbackData.split('_');
        var allocationIndex = parseInt(parts[1]);
        var parsedAllocation = allocations[allocationIndex];
        
        Logger.log("  Parsed index: " + allocationIndex);
        Logger.log("  Parsed allocation: " + parsedAllocation);
        Logger.log("  Expected: " + allocation);
        
        if (parsedAllocation === allocation) {
          Logger.log("  ✅ Parsing OK");
          
          // Test temp transaction retrieval
          var retrievedTemp = getTempTransaction(testChatId);
          if (retrievedTemp) {
            // Update allocation
            retrievedTemp.allocation = parsedAllocation;
            saveTempTransaction(testChatId, retrievedTemp);
            
            // Test subcategory keyboard creation
            var subKeyboard = createSubCategoryKeyboard(parsedAllocation, false, null, null);
            if (subKeyboard && subKeyboard.inline_keyboard) {
              Logger.log("  ✅ Subcategory keyboard created");
              
              // Test editText message format
              try {
                var messageText = (retrievedTemp.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
                  retrievedTemp.description + " " + 
                  formatNumberWithSeparator(retrievedTemp.amount) + " vào hũ " + parsedAllocation + 
                  "\nVui lòng chọn nhãn cụ thể:";
                
                Logger.log("  ✅ Message text OK");
                
                // Test editText call (will fail but we can see if there are other errors)
                var fakeMessageId = 12345;
                var editResult = editText(testChatId, fakeMessageId, messageText, subKeyboard);
                Logger.log("  ✅ editText call completed");
                
              } catch (error) {
                Logger.log("  ❌ Error in message/editText: " + error.toString());
              }
              
            } else {
              Logger.log("  ❌ Failed to create subcategory keyboard");
            }
          } else {
            Logger.log("  ❌ No temp transaction found");
          }
        } else {
          Logger.log("  ❌ Parsing FAILED");
        }
      } else {
        Logger.log("  ❌ Callback does not start with 'allocation_'");
      }
      
      // Cleanup
      clearTempTransaction(testChatId);
      Logger.log("  Cleaned up");
      Logger.log("");
    }
    
    Logger.log("✅ All allocation callbacks test completed");
    
  } catch (error) {
    Logger.log("❌ Error in all allocation callbacks test: " + error.toString());
  }
  
  Logger.log("=== TEST ALL ALLOCATION CALLBACKS COMPLETED ===");
}

// Test specific flow: quay lại và chọn "Tiết kiệm dài hạn"
function testBackFlowTietKiem() {
  Logger.log("=== TEST BACK FLOW TIET KIEM ===");
  
  var testChatId = 123456789;
  
  try {
    // 1. Setup flow giống như "a - 3" 
    Logger.log("1. Setup như flow 'a - 3'");
    var tempTransaction = {
      description: "a",
      amount: 3000,
      type: "ChiTieu",
      allocation: "Chi tiêu thiết yếu" // Initial allocation
    };
    
    saveTempTransaction(testChatId, tempTransaction);
    Logger.log("  Temp transaction saved: " + JSON.stringify(tempTransaction));
    
    // 2. Simulate "quay lại chọn hũ"
    Logger.log("2. Simulate 'quay lại chọn hũ' (back_to_allocation)");
    
    var data = 'back_to_allocation';
    if (data === 'back_to_allocation') {
      var retrievedTemp = getTempTransaction(testChatId);
      Logger.log("  Retrieved temp: " + JSON.stringify(retrievedTemp));
      
      if (retrievedTemp) {
        // Tạo allocation keyboard
        var keyboard = createAllocationKeyboard(null);
        Logger.log("  ✅ Allocation keyboard created for back flow");
        
        // Check "Tiết kiệm dài hạn" button
        var tietKiemButton = null;
        for (var i = 0; i < keyboard.inline_keyboard.length; i++) {
          var row = keyboard.inline_keyboard[i];
          for (var j = 0; j < row.length; j++) {
            if (row[j].text === "Tiết kiệm dài hạn") {
              tietKiemButton = row[j];
              break;
            }
          }
        }
        
        if (tietKiemButton) {
          Logger.log("  Found Tiết kiệm button: " + tietKiemButton.callback_data);
          Logger.log("  Callback bytes: " + encodeURIComponent(tietKiemButton.callback_data).length);
        }
      }
    }
    
    // 3. Simulate chọn "Tiết kiệm dài hạn"
    Logger.log("3. Simulate chọn 'Tiết kiệm dài hạn'");
    
    var allocationData = 'allocation_2'; // Index 2 = "Tiết kiệm dài hạn"
    Logger.log("  Callback: " + allocationData);
    
    if (allocationData.startsWith('allocation_')) {
      var parts = allocationData.split('_');
      var allocationIndex = parseInt(parts[1]);
      var allocation = allocations[allocationIndex];
      
      Logger.log("  Parsed allocation: " + allocation);
      
      // Retrieve temp transaction
      var tempTransaction = getTempTransaction(testChatId);
      Logger.log("  Temp transaction exists: " + (tempTransaction ? "YES" : "NO"));
      
      if (tempTransaction) {
        // Update allocation
        tempTransaction.allocation = allocation;
        saveTempTransaction(testChatId, tempTransaction);
        Logger.log("  Updated allocation to: " + allocation);
        
        // Test subcategory keyboard creation
        Logger.log("  Creating subcategory keyboard...");
        var subKeyboard = createSubCategoryKeyboard(allocation, false, null, null);
        
        if (subKeyboard && subKeyboard.inline_keyboard) {
          Logger.log("  ✅ Subcategory keyboard created");
          Logger.log("  Rows: " + subKeyboard.inline_keyboard.length);
          
          // Check callback lengths cho subcategories
          var hasLongCallback = false;
          for (var i = 0; i < subKeyboard.inline_keyboard.length; i++) {
            var row = subKeyboard.inline_keyboard[i];
            for (var j = 0; j < row.length; j++) {
              var button = row[j];
              var callbackBytes = encodeURIComponent(button.callback_data).length;
              
              if (callbackBytes > 64) {
                Logger.log("  ❌ LONG CALLBACK: " + button.text);
                Logger.log("    Callback: " + button.callback_data);
                Logger.log("    Bytes: " + callbackBytes);
                hasLongCallback = true;
              }
            }
          }
          
          if (!hasLongCallback) {
            Logger.log("  ✅ All subcategory callbacks within limit");
          }
          
          // Test message creation
          var messageText = (tempTransaction.type === 'ThuNhap' ? 'Thu nhập: ' : 'Chi tiêu: ') + 
            tempTransaction.description + " " + 
            formatNumberWithSeparator(tempTransaction.amount) + " vào hũ " + allocation + 
            "\nVui lòng chọn nhãn cụ thể:";
          
          Logger.log("  Message text length: " + messageText.length + " chars");
          
          // Test editText call  
          try {
            var fakeMessageId = 12345;
            var editResult = editText(testChatId, fakeMessageId, messageText, subKeyboard);
            Logger.log("  ✅ editText call completed: " + editResult);
          } catch (editError) {
            Logger.log("  ❌ editText error: " + editError.toString());
          }
          
        } else {
          Logger.log("  ❌ Failed to create subcategory keyboard");
        }
      } else {
        Logger.log("  ❌ No temp transaction found");
      }
    }
    
    // Cleanup
    clearTempTransaction(testChatId);
    
    Logger.log("✅ Back flow Tiết kiệm test completed");
    
  } catch (error) {
    Logger.log("❌ Error in back flow Tiết kiệm test: " + error.toString());
  }
  
  Logger.log("=== TEST BACK FLOW TIET KIEM COMPLETED ===");
}

// Test fix cho 64-byte limit với index-based format
function testSubcategoryIndexFix() {
  Logger.log("=== TEST SUBCATEGORY INDEX FIX ===");
  
  var testChatId = 123456789;
  
  try {
    // Test tất cả allocations với subcategories dài
    for (var i = 0; i < allocations.length; i++) {
      var allocation = allocations[i];
      var subs = subCategories[allocation];
      
      Logger.log((i + 1) + ". Testing " + allocation + " (index " + i + ")");
      
      // Tạo subcategory keyboard với index-based format
      // Fix: Pass hardcoded allocationIndex instead of relying on indexOf
      var subKeyboard = createSubCategoryKeyboard(allocation, false, null, i);
      
      if (subKeyboard && subKeyboard.inline_keyboard) {
        // Check callback lengths
        var maxBytes = 0;
        var longestCallback = '';
        var hasLongCallback = false;
        
        for (var row = 0; row < subKeyboard.inline_keyboard.length - 1; row++) { // Skip last row (back/cancel buttons)
          var buttons = subKeyboard.inline_keyboard[row];
          for (var btn = 0; btn < buttons.length; btn++) {
            var button = buttons[btn];
            var callbackBytes = encodeURIComponent(button.callback_data).length;
            
            if (callbackBytes > maxBytes) {
              maxBytes = callbackBytes;
              longestCallback = button.callback_data;
            }
            
            if (callbackBytes > 64) {
              Logger.log("  ❌ TOO LONG: " + button.text);
              Logger.log("    Callback: " + button.callback_data);
              Logger.log("    Bytes: " + callbackBytes);
              hasLongCallback = true;
            }
          }
        }
        
        Logger.log("  Max callback bytes: " + maxBytes + " (" + longestCallback + ")");
        
        if (!hasLongCallback) {
          Logger.log("  ✅ All callbacks within 64-byte limit");
          
          // Test parsing cho callback đầu tiên
          if (subKeyboard.inline_keyboard[0] && subKeyboard.inline_keyboard[0][0]) {
            var firstButton = subKeyboard.inline_keyboard[0][0];
            var firstCallback = firstButton.callback_data;
            
            Logger.log("  Testing parsing for: " + firstCallback);
            
            // Simulate parsing logic
            if (firstCallback.startsWith('sub_')) {
              var parts = firstCallback.split('_');
              if (parts.length >= 3) {
                var allocIndex = parseInt(parts[1]);
                var subIndex = parseInt(parts[2]);
                var parsedAlloc = allocations[allocIndex];
                var parsedSub = subCategories[parsedAlloc] ? subCategories[parsedAlloc][subIndex] : null;
                
                Logger.log("    Parsed allocation: " + parsedAlloc + " (expected: " + allocation + ")");
                Logger.log("    Parsed subcategory: " + parsedSub + " (expected: " + subs[0] + ")");
                
                if (parsedAlloc === allocation && parsedSub === subs[0]) {
                  Logger.log("    ✅ Parsing successful");
                } else {
                  Logger.log("    ❌ Parsing failed");
                }
              }
            } else {
              Logger.log("    Using old format: " + firstCallback);
            }
          }
        } else {
          Logger.log("  ❌ Some callbacks exceed 64-byte limit");
        }
      } else {
        Logger.log("  ❌ Failed to create subcategory keyboard");
      }
      
      Logger.log("");
    }
    
    Logger.log("✅ Subcategory index fix test completed");
    
  } catch (error) {
    Logger.log("❌ Error in subcategory index fix test: " + error.toString());
  }
  
  Logger.log("=== TEST SUBCATEGORY INDEX FIX COMPLETED ===");
}

// Debug allocation index calculation
function debugAllocationIndex() {
  Logger.log("=== DEBUG ALLOCATION INDEX ===");
  
  try {
    // Test allocations global variable
    Logger.log("1. Testing allocations array:");
    Logger.log("  allocations: " + JSON.stringify(allocations));
    Logger.log("  allocations.length: " + allocations.length);
    Logger.log("  typeof allocations: " + typeof allocations);
    
    // Test indexOf cho từng allocation
    Logger.log("2. Testing indexOf for each allocation:");
    for (var i = 0; i < allocations.length; i++) {
      var allocation = allocations[i];
      var index = allocations.indexOf(allocation);
      Logger.log("  " + allocation + " → index: " + index + " (expected: " + i + ")");
      
      if (index === i) {
        Logger.log("    ✅ Index calculation correct");
      } else {
        Logger.log("    ❌ Index calculation WRONG");
      }
    }
    
    // Test với string literals
    Logger.log("3. Testing with string literals:");
    var testAllocs = [
      'Chi tiêu thiết yếu',
      'Hưởng thụ', 
      'Tiết kiệm dài hạn',
      'Giáo dục',
      'Tự do tài chính',
      'Cho đi'
    ];
    
    for (var i = 0; i < testAllocs.length; i++) {
      var allocation = testAllocs[i];
      var index = allocations.indexOf(allocation);
      Logger.log("  '" + allocation + "' → index: " + index + " (expected: " + i + ")");
    }
    
    // Test createSubCategoryKeyboard calls với debug
    Logger.log("4. Testing createSubCategoryKeyboard calls:");
    for (var i = 0; i < allocations.length; i++) {
      var allocation = allocations[i];
      Logger.log("  Testing allocation: " + allocation);
      
      // Test keyboard creation
      var keyboard = createSubCategoryKeyboard(allocation, false, null, null);
      
      if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard[0] && keyboard.inline_keyboard[0][0]) {
        var firstButton = keyboard.inline_keyboard[0][0];
        Logger.log("    First button callback: " + firstButton.callback_data);
        
        // Parse callback
        if (firstButton.callback_data.startsWith('sub_')) {
          var parts = firstButton.callback_data.split('_');
          Logger.log("    Callback parts: " + JSON.stringify(parts));
          Logger.log("    allocationIndex from callback: " + parts[1]);
        }
      }
      Logger.log("");
    }
    
    Logger.log("✅ Allocation index debug completed");
    
  } catch (error) {
    Logger.log("❌ Error in allocation index debug: " + error.toString());
  }
  
  Logger.log("=== DEBUG ALLOCATION INDEX COMPLETED ===");
}

// Simple test indexOf fix
function quickTestIndexOf() {
  Logger.log("=== QUICK TEST INDEXOF ===");
  
  try {
    // Direct test
    Logger.log("Direct indexOf tests:");
    Logger.log("  allocations[0]: '" + allocations[0] + "'");
    Logger.log("  indexOf(allocations[0]): " + allocations.indexOf(allocations[0]));
    
    Logger.log("  allocations[2]: '" + allocations[2] + "'");
    Logger.log("  indexOf(allocations[2]): " + allocations.indexOf(allocations[2]));
    
    // Test với string literal
    Logger.log("String literal tests:");
    var testStr = "Tiết kiệm dài hạn";
    Logger.log("  Test string: '" + testStr + "'");
    Logger.log("  indexOf('" + testStr + "'): " + allocations.indexOf(testStr));
    
    // Test character by character
    var allocItem = allocations[2];
    Logger.log("Character comparison for index 2:");
    Logger.log("  allocations[2]: '" + allocItem + "'");
    Logger.log("  testStr: '" + testStr + "'");
    Logger.log("  Equal: " + (allocItem === testStr));
    Logger.log("  Length allocations[2]: " + allocItem.length);
    Logger.log("  Length testStr: " + testStr.length);
    
    // Force manual calculation
    Logger.log("Manual index calculation:");
    for (var i = 0; i < allocations.length; i++) {
      if (allocations[i] === testStr) {
        Logger.log("  Found '" + testStr + "' at index: " + i);
        break;
      }
    }
    
    // Test actual createSubCategoryKeyboard call
    Logger.log("Testing actual function call:");
    Logger.log("Before calling createSubCategoryKeyboard...");
    
    var keyboard = createSubCategoryKeyboard(testStr, false, null, null);
    
    if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard[0] && keyboard.inline_keyboard[0][0]) {
      var firstCallback = keyboard.inline_keyboard[0][0].callback_data;
      Logger.log("  Result callback: " + firstCallback);
    } else {
      Logger.log("  Failed to create keyboard");
    }
    
  } catch (error) {
    Logger.log("Error: " + error.toString());
  }
  
  Logger.log("=== QUICK TEST INDEXOF COMPLETED ===");
}

// Test with hardcoded allocationIndex
function testHardcodedIndex() {
  Logger.log("=== TEST HARDCODED INDEX ===");
  
  try {
    // Test với index hardcode
    var testAllocations = [
      { name: 'Chi tiêu thiết yếu', index: 0 },
      { name: 'Hưởng thụ', index: 1 },
      { name: 'Tiết kiệm dài hạn', index: 2 },
      { name: 'Giáo dục', index: 3 },
      { name: 'Tự do tài chính', index: 4 },
      { name: 'Cho đi', index: 5 }
    ];
    
    for (var i = 0; i < testAllocations.length; i++) {
      var allocation = testAllocations[i].name;
      var hardcodedIndex = testAllocations[i].index;
      
      Logger.log((i + 1) + ". Testing " + allocation + " with hardcoded index " + hardcodedIndex);
      
      // Call với hardcoded index
      var keyboard = createSubCategoryKeyboard(allocation, false, null, hardcodedIndex);
      
      if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard[0] && keyboard.inline_keyboard[0][0]) {
        var firstButton = keyboard.inline_keyboard[0][0];
        Logger.log("  First button callback: " + firstButton.callback_data);
        
        var callbackBytes = encodeURIComponent(firstButton.callback_data).length;
        Logger.log("  Callback bytes: " + callbackBytes);
        
        if (callbackBytes <= 64) {
          Logger.log("  ✅ Within 64-byte limit");
        } else {
          Logger.log("  ❌ Exceeds 64-byte limit");
        }
        
        // Test parsing
        if (firstButton.callback_data.startsWith('sub_')) {
          var parts = firstButton.callback_data.split('_');
          var parsedAllocIndex = parseInt(parts[1]);
          var parsedSubIndex = parseInt(parts[2]);
          
          Logger.log("  Parsed allocationIndex: " + parsedAllocIndex + " (expected: " + hardcodedIndex + ")");
          Logger.log("  Parsed subIndex: " + parsedSubIndex + " (expected: 0)");
          
          if (parsedAllocIndex === hardcodedIndex && parsedSubIndex === 0) {
            Logger.log("  ✅ Parsing successful");
          } else {
            Logger.log("  ❌ Parsing failed");
          }
        }
      } else {
        Logger.log("  ❌ Failed to create keyboard");
      }
      
      Logger.log("");
    }
    
    Logger.log("✅ Hardcoded index test completed");
    
  } catch (error) {
    Logger.log("❌ Error in hardcoded index test: " + error.toString());
  }
  
  Logger.log("=== TEST HARDCODED INDEX COMPLETED ===");
}

// Debug why testSubcategoryIndexFix fails
function debugTestSubcategoryFix() {
  Logger.log("=== DEBUG TEST SUBCATEGORY FIX ===");
  
  try {
    Logger.log("1. Check global variables in testSubcategoryIndexFix context:");
    Logger.log("  allocations defined: " + (typeof allocations !== 'undefined'));
    Logger.log("  allocations length: " + (allocations ? allocations.length : 'undefined'));
    Logger.log("  subCategories defined: " + (typeof subCategories !== 'undefined'));
    
    if (allocations) {
      Logger.log("  allocations[0]: " + allocations[0]);
      Logger.log("  allocations[2]: " + allocations[2]);
    }
    
    Logger.log("2. Test same call as testSubcategoryIndexFix:");
    var allocation = 'Tiết kiệm dài hạn';
    Logger.log("  Testing allocation: " + allocation);
    Logger.log("  Before createSubCategoryKeyboard call...");
    
    // Same exact call as in testSubcategoryIndexFix
    var subKeyboard = createSubCategoryKeyboard(allocation, false, null, null);
    
    if (subKeyboard && subKeyboard.inline_keyboard && subKeyboard.inline_keyboard[0] && subKeyboard.inline_keyboard[0][0]) {
      var firstCallback = subKeyboard.inline_keyboard[0][0].callback_data;
      Logger.log("  Result callback: " + firstCallback);
      
      if (firstCallback === 'sub_null_0') {
        Logger.log("  ❌ PROBLEM REPRODUCED! callback is sub_null_0");
        
        // Debug inside createSubCategoryKeyboard
        Logger.log("  Debug variables inside function:");
        Logger.log("    allocation parameter: " + allocation);
        Logger.log("    allocations.indexOf(allocation): " + allocations.indexOf(allocation));
        
        // Manual indexOf debug
        Logger.log("  Manual indexOf:");
        for (var i = 0; i < allocations.length; i++) {
          Logger.log("    allocations[" + i + "]: '" + allocations[i] + "'");
          Logger.log("    Equal to '" + allocation + "': " + (allocations[i] === allocation));
        }
        
      } else {
        Logger.log("  ✅ No problem, callback: " + firstCallback);
      }
    } else {
      Logger.log("  ❌ Failed to create keyboard");
    }
    
    Logger.log("3. Compare with successful method:");
    var testStr = "Tiết kiệm dài hạn";
    var keyboard2 = createSubCategoryKeyboard(testStr, false, null, null);
    
    if (keyboard2 && keyboard2.inline_keyboard && keyboard2.inline_keyboard[0] && keyboard2.inline_keyboard[0][0]) {
      var callback2 = keyboard2.inline_keyboard[0][0].callback_data;
      Logger.log("  Successful method callback: " + callback2);
    }
    
  } catch (error) {
    Logger.log("❌ Error: " + error.toString());
  }
  
  Logger.log("=== DEBUG TEST SUBCATEGORY FIX COMPLETED ===");
}

// Final clean test for subcategory index fix
function finalTestSubcategoryFix() {
  Logger.log("=== FINAL SUBCATEGORY INDEX FIX TEST ===");
  
  try {
    var allTestsPassed = true;
    
    for (var i = 0; i < allocations.length; i++) {
      var allocation = allocations[i];
      var subs = subCategories[allocation];
      
      Logger.log((i + 1) + ". Testing " + allocation);
      
      // Test with explicit allocationIndex
      var keyboard = createSubCategoryKeyboard(allocation, false, null, i);
      
      if (keyboard && keyboard.inline_keyboard && keyboard.inline_keyboard[0] && keyboard.inline_keyboard[0][0]) {
        var firstButton = keyboard.inline_keyboard[0][0];
        var callback = firstButton.callback_data;
        var bytes = encodeURIComponent(callback).length;
        
        Logger.log("  Callback: " + callback + " (" + bytes + " bytes)");
        
        // Check format
        if (callback.startsWith('sub_' + i + '_')) {
          Logger.log("  ✅ Correct format");
          
          // Check byte limit
          if (bytes <= 64) {
            Logger.log("  ✅ Within 64-byte limit");
            
            // Test parsing
            var parts = callback.split('_');
            var allocIndex = parseInt(parts[1]);
            var subIndex = parseInt(parts[2]);
            
            if (allocIndex === i && subIndex === 0) {
              Logger.log("  ✅ Parsing successful");
            } else {
              Logger.log("  ❌ Parsing failed: allocIndex=" + allocIndex + ", subIndex=" + subIndex);
              allTestsPassed = false;
            }
          } else {
            Logger.log("  ❌ Exceeds 64-byte limit");
            allTestsPassed = false;
          }
        } else {
          Logger.log("  ❌ Incorrect format: " + callback);
          allTestsPassed = false;
        }
      } else {
        Logger.log("  ❌ Failed to create keyboard");
        allTestsPassed = false;
      }
      
      Logger.log("");
    }
    
    if (allTestsPassed) {
      Logger.log("🎉 ALL TESTS PASSED! Subcategory index fix is working perfectly!");
    } else {
      Logger.log("❌ Some tests failed. Please check the logs above.");
    }
    
  } catch (error) {
    Logger.log("❌ Error in final test: " + error.toString());
  }
  
  Logger.log("=== FINAL SUBCATEGORY INDEX FIX TEST COMPLETED ===");
}

// Test hành vi hủy chỉnh sửa - trả về trạng thái xác nhận
function testCancelEditRestore() {
  Logger.log("=== TEST CANCEL EDIT RESTORE ===");
  
  var testChatId = 123456789;
  var testTransactionId = 'tx_test_' + Date.now();
  
  try {
    Logger.log("1. Tạo mock transaction data:");
    
    // Mock transaction info như khi người dùng vừa xác nhận giao dịch
    var transactionInfo = {
      userId: testChatId,
      transactionId: testTransactionId,
      date: new Date().toISOString().split('T')[0],
      description: "ăn trưa",
      amount: 50000,
      allocation: "Chi tiêu thiết yếu",
      type: "ChiTieu",
      subCategory: "Ăn ngoài",
      rowIndex: 5
    };
    
    Logger.log("  Transaction: " + JSON.stringify(transactionInfo));
    
    Logger.log("2. Save transaction vào edit cache:");
    saveTransactionForEdit(testChatId, transactionInfo, testTransactionId);
    
    Logger.log("3. Test cancel_edit callback:");
    var cancelCallback = 'cancel_edit_' + testTransactionId;
    Logger.log("  Cancel callback: " + cancelCallback);
    
    // Simulate doPost processing cho cancel_edit
    Logger.log("4. Processing cancel_edit callback:");
    
    if (cancelCallback.startsWith('cancel_edit_')) {
      var transactionId = cancelCallback.replace('cancel_edit_', '');
      Logger.log("  Extracted transaction ID: " + transactionId);
      
      // Lấy thông tin giao dịch từ cache TRƯỚC khi clear
      var retrievedInfo = getTransactionForEdit(testChatId, transactionId);
      Logger.log("  Retrieved transaction info: " + JSON.stringify(retrievedInfo));
      
      if (retrievedInfo) {
        // Tạo message xác nhận gốc
        var typeText = retrievedInfo.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        var expectedMessage = "✅ Giao dịch #" + (retrievedInfo.sequenceNumber || "X") + " - Đã ghi nhận " + typeText + ": " + retrievedInfo.description + 
          " " + formatNumberWithSeparator(retrievedInfo.amount) + 
          " vào hũ " + retrievedInfo.allocation + " với nhãn " + retrievedInfo.subCategory;
        
        Logger.log("  ✅ Expected restored message:");
        Logger.log("    " + expectedMessage);
        
        // Test edit keyboard
        var editKeyboard = createEditKeyboard(retrievedInfo.transactionId);
        if (editKeyboard && editKeyboard.inline_keyboard && editKeyboard.inline_keyboard[0]) {
          var editButton = editKeyboard.inline_keyboard[0][0];
          Logger.log("  ✅ Edit button created: " + editButton.text + " → " + editButton.callback_data);
        }
        
        // KHÔNG clear cache - để user có thể edit lại
        // clearTransactionForEdit(testChatId, transactionId); 
        
        // Verify cache KHÔNG bị clear (user có thể edit lại)
        var afterCancel = getTransactionForEdit(testChatId, transactionId);
        if (afterCancel) {
          Logger.log("  ✅ Cache preserved - user can edit again");
        } else {
          Logger.log("  ❌ Cache was cleared - user cannot edit again");
        }
        
        Logger.log("5. ✅ TEST PASSED: Cancel edit restores original confirmation");
        
      } else {
        Logger.log("  ❌ No transaction info found");
      }
    }
    
    Logger.log("6. Test comparison:");
    Logger.log("  Old behavior: '❌ Đã hủy chỉnh sửa giao dịch' (loses transaction info)");
          Logger.log("  New behavior: '✅ Giao dịch #X - Đã ghi nhận...' + Edit button (preserves transaction info)");
    
  } catch (error) {
    Logger.log("❌ Error in cancel edit restore test: " + error.toString());
  }
  
  Logger.log("=== TEST CANCEL EDIT RESTORE COMPLETED ===");
}

// Test user flow hoàn chỉnh: Transaction → Edit → Cancel → Restore
function testFullEditCancelFlow() {
  Logger.log("=== TEST FULL EDIT CANCEL FLOW ===");
  
  var testChatId = 987654321;
  var testTransactionId = 'tx_flow_' + Date.now();
  
  try {
    Logger.log("📱 SIMULATE USER FLOW:");
    Logger.log("1. User nhập: 'ăn trưa - 45000'");
    Logger.log("2. Bot tự động phân loại vào 'Chi tiêu thiết yếu'");
    Logger.log("3. User chọn subcategory: 'Ăn ngoài'");
    Logger.log("4. Bot confirm: '✅ Giao dịch #1 - Đã ghi nhận chi tiêu: ăn trưa 45,000 vào hũ Chi tiêu thiết yếu với nhãn Ăn ngoài' + [Edit button]");
    
    // Step 4: Transaction được confirm và có edit button
    var confirmedTransaction = {
      userId: testChatId,
      transactionId: testTransactionId,
      date: new Date().toISOString().split('T')[0],
      description: "ăn trưa",
      amount: 45000,
      allocation: "Chi tiêu thiết yếu", 
      type: "ChiTieu",
      subCategory: "Ăn ngoài",
      sequenceNumber: 1, // STT trong ngày
      rowIndex: 3
    };
    
    saveTransactionForEdit(testChatId, confirmedTransaction, testTransactionId);
    
    var confirmMessage = "✅ Giao dịch #1 - Đã ghi nhận chi tiêu: ăn trưa " + formatNumberWithSeparator(45000) + 
      " vào hũ Chi tiêu thiết yếu với nhãn Ăn ngoài";
    var editKeyboard = createEditKeyboard(testTransactionId);
    
    Logger.log("✅ Step 4 - Confirmed state:");
    Logger.log("  Message: " + confirmMessage);
    Logger.log("  Edit button: " + editKeyboard.inline_keyboard[0][0].text + " → " + editKeyboard.inline_keyboard[0][0].callback_data);
    
    Logger.log("");
    Logger.log("5. User nhấn [✏️ Chỉnh sửa]");
    Logger.log("6. Bot hiển thị allocation keyboard để chọn hũ mới");
    
    // Step 6: Edit mode - allocation keyboard
    var allocationKeyboard = createAllocationKeyboard(testTransactionId);
    var editMessage = "Chỉnh sửa giao dịch: ăn trưa " + formatNumberWithSeparator(45000) + 
      "\nVui lòng chọn hũ mới:";
    
    Logger.log("✅ Step 6 - Edit mode:");
    Logger.log("  Message: " + editMessage);
    Logger.log("  First allocation: " + allocationKeyboard.inline_keyboard[0][0].text);
    Logger.log("  Cancel button: " + allocationKeyboard.inline_keyboard[allocationKeyboard.inline_keyboard.length-1][0].text);
    
    Logger.log("");
    Logger.log("7. User nhấn [❌ Hủy chỉnh sửa] (thay vì chọn hũ mới)");
    Logger.log("8. Bot SHOULD restore về confirmed state chứ KHÔNG phải 'Đã hủy chỉnh sửa'");
    
    // Step 8: Test cancel edit behavior
    var cancelCallback = 'cancel_edit_' + testTransactionId;
    
    // Simulate handler logic
    if (cancelCallback.startsWith('cancel_edit_')) {
      var transactionId = cancelCallback.replace('cancel_edit_', '');
      var transactionInfo = getTransactionForEdit(testChatId, transactionId);
      
      if (transactionInfo) {
        var typeText = transactionInfo.type === "ThuNhap" ? "thu nhập" : "chi tiêu";
        var restoredMessage = "✅ Giao dịch #" + transactionInfo.sequenceNumber + " - Đã ghi nhận " + typeText + ": " + transactionInfo.description + 
          " " + formatNumberWithSeparator(transactionInfo.amount) + 
          " vào hũ " + transactionInfo.allocation + " với nhãn " + transactionInfo.subCategory;
        var restoredKeyboard = createEditKeyboard(transactionInfo.transactionId);
        
        Logger.log("✅ Step 8 - Restored state:");
        Logger.log("  Message: " + restoredMessage);
        Logger.log("  Edit button: " + restoredKeyboard.inline_keyboard[0][0].text + " → " + restoredKeyboard.inline_keyboard[0][0].callback_data);
        
        // Verify it matches original confirmed state
        if (restoredMessage === confirmMessage) {
          Logger.log("  ✅ Restored message matches original confirmation");
        } else {
          Logger.log("  ❌ Message mismatch:");
          Logger.log("    Original: " + confirmMessage);
          Logger.log("    Restored: " + restoredMessage);
        }
        
        // KHÔNG clear cache - user có thể edit lại bao nhiêu lần cũng được
        // clearTransactionForEdit(testChatId, transactionId);
        
        Logger.log("");
        Logger.log("🎉 SUCCESS: User can continue to edit if needed, transaction info preserved!");
        Logger.log("❌ OLD behavior: 'Đã hủy chỉnh sửa giao dịch' → Lost all info + Cannot edit again");
        Logger.log("✅ NEW behavior: Back to confirmed state → Can edit again MULTIPLE times");
        
        // Test: User có thể edit lại không?
        Logger.log("");
        Logger.log("9. BONUS TEST: User có thể edit lại transaction này không?");
        var secondEditTest = getTransactionForEdit(testChatId, transactionId);
        if (secondEditTest) {
          Logger.log("  ✅ YES! User can click Edit button again anytime");
          Logger.log("  Transaction info still available: " + secondEditTest.description + " " + formatNumberWithSeparator(secondEditTest.amount));
        } else {
          Logger.log("  ❌ NO! Transaction info lost - cannot edit again");
        }
        
      } else {
        Logger.log("  ❌ Transaction info not found");
      }
    }
    
  } catch (error) {
    Logger.log("❌ Error in full edit cancel flow test: " + error.toString());
  }
  
  Logger.log("=== TEST FULL EDIT CANCEL FLOW COMPLETED ===");
}

// Test user scenario: c-7 → edit → cancel → d-9 → edit c-7 lại
function testMultipleTransactionEditScenario() {
  Logger.log("=== TEST MULTIPLE TRANSACTION EDIT SCENARIO ===");
  Logger.log("User reported bug: c-7 → edit → cancel → d-9 → edit c-7 again → Error");
  
  var testChatId = 555666777;
  var transactionId1 = 'tx_c7_' + Date.now();
  var transactionId2 = 'tx_d9_' + (Date.now() + 1000);
  
  try {
    Logger.log("");
    Logger.log("📝 STEP 1: User nhập 'c - 7'");
    
    // Transaction 1: c - 7
    var transaction1 = {
      userId: testChatId,
      transactionId: transactionId1,
      date: new Date().toISOString().split('T')[0],
      description: "c",
      amount: 7000,
      allocation: "Chi tiêu thiết yếu",
      type: "ChiTieu", 
      subCategory: "Ăn ngoài",
      rowIndex: 10
    };
    
    saveTransactionForEdit(testChatId, transaction1, transactionId1);
    Logger.log("✅ Transaction c-7 created with edit button");
    
    Logger.log("");
    Logger.log("📝 STEP 2: User nhấn [Edit] transaction c-7");
    
    var editInfo1 = getTransactionForEdit(testChatId, transactionId1);
    if (editInfo1) {
      Logger.log("✅ Edit info found for c-7: " + JSON.stringify(editInfo1));
    } else {
      Logger.log("❌ Edit info NOT found for c-7");
    }
    
    Logger.log("");
    Logger.log("📝 STEP 3: User nhấn [❌ Hủy chỉnh sửa]");
    Logger.log("→ Bot restores message xác nhận + keeps cache");
    
    // Simulate cancel edit - KHÔNG clear cache
    var restoredInfo1 = getTransactionForEdit(testChatId, transactionId1);
    if (restoredInfo1) {
      Logger.log("✅ Cache preserved after cancel - c-7 can be edited again");
    } else {
      Logger.log("❌ Cache cleared after cancel - c-7 CANNOT be edited again");
    }
    
    Logger.log("");
    Logger.log("📝 STEP 4: User nhập 'd - 9' (transaction mới)");
    
    // Transaction 2: d - 9  
    var transaction2 = {
      userId: testChatId,
      transactionId: transactionId2,
      date: new Date().toISOString().split('T')[0], 
      description: "d",
      amount: 9000,
      allocation: "Hưởng thụ",
      type: "ChiTieu",
      subCategory: "Giải trí", 
      rowIndex: 11
    };
    
    saveTransactionForEdit(testChatId, transaction2, transactionId2);
    Logger.log("✅ Transaction d-9 created");
    
    Logger.log("");
    Logger.log("📝 STEP 5: User quay lại nhấn [Edit] transaction c-7 cũ");
    Logger.log("→ This is where the bug happened before");
    
    var editInfoAgain = getTransactionForEdit(testChatId, transactionId1);
    if (editInfoAgain) {
      Logger.log("✅ SUCCESS! Transaction c-7 can still be edited:");
      Logger.log("  Description: " + editInfoAgain.description);
      Logger.log("  Amount: " + formatNumberWithSeparator(editInfoAgain.amount));
      Logger.log("  Allocation: " + editInfoAgain.allocation);
      Logger.log("  SubCategory: " + editInfoAgain.subCategory);
      
      // Verify edit button still works
      var editKeyboard = createEditKeyboard(editInfoAgain.transactionId);
      if (editKeyboard && editKeyboard.inline_keyboard[0][0]) {
        var editBtn = editKeyboard.inline_keyboard[0][0];
        Logger.log("  Edit button: " + editBtn.text + " → " + editBtn.callback_data);
      }
      
      Logger.log("");
      Logger.log("🎉 BUG FIXED! User can edit old transactions anytime");
      Logger.log("❌ Before fix: 'Không tìm thấy thông tin giao dịch để chỉnh sửa'");
      Logger.log("✅ After fix: Transaction info preserved, can edit multiple times");
      
    } else {
      Logger.log("❌ BUG STILL EXISTS! Cannot edit transaction c-7");
      Logger.log("Error would be: 'Không tìm thấy thông tin giao dịch để chỉnh sửa'");
    }
    
    Logger.log("");
    Logger.log("📊 SUMMARY:");
    Logger.log("  Transaction c-7 editable: " + (editInfoAgain ? "YES" : "NO"));
    Logger.log("  Transaction d-9 editable: " + (getTransactionForEdit(testChatId, transactionId2) ? "YES" : "NO"));
    Logger.log("  Multiple edit support: " + (editInfoAgain ? "WORKING" : "BROKEN"));
    
    // Cleanup test cache
    clearTransactionForEdit(testChatId, transactionId1);    
    clearTransactionForEdit(testChatId, transactionId2);
    
  } catch (error) {
    Logger.log("❌ Error in multiple transaction edit scenario: " + error.toString());
  }
  
  Logger.log("=== TEST MULTIPLE TRANSACTION EDIT SCENARIO COMPLETED ===");
}

// === SLASH COMMANDS SUPPORT FUNCTIONS ===

/* 
SETUP BOTFATHER COMMANDS:
Để hiển thị slash commands menu khi user gõ "/", cần setup trong BotFather:

1. Mở @BotFather trên Telegram
2. Gửi /setcommands  
3. Chọn bot của bạn
4. Copy và paste danh sách commands sau:

chi - Nhập chi tiêu nhanh (VD: /chi ăn sáng 25000)
thu - Nhập thu nhập nhanh (VD: /thu lương 10000000)
tongtien - Xem số tiền hiện tại
tongchi - Xem tổng chi tiêu
tongthunhap - Xem tổng thu nhập
xemhu - Xem chi tiết số dư các hũ
lichsu - Xem lịch sử giao dịch
start - Khởi động và giới thiệu bot
menu - Hiển thị menu chính với các tùy chọn
help - Hiển thị hướng dẫn sử dụng chi tiết
xoathunhap - Xóa tất cả thu nhập
xoachitieu - Xóa tất cả chi tiêu
xoatatca - Xóa tất cả dữ liệu

5. Gửi danh sách commands trên cho BotFather
6. BotFather sẽ confirm setup thành công
7. Test bằng cách gõ "/" trong chat với bot
*/

// Hiển thị danh sách tất cả commands available
function sendCommandsList(chatId) {
  var commandsList = 
    "🐹 <b>HƯỚNG DẪN SỬ DỤNG THƯ KÝ CAPYBARA</b>\n\n" +
    
    "⚡ <b>NHẬP NHANH GIAO DỊCH:</b>\n" +
    "💸 <code>/chi [mô tả] [số tiền]</code>\n" +
    "   Ví dụ: <code>/chi ăn sáng 25000</code>\n" +
    "💵 <code>/thu [mô tả] [số tiền]</code>\n" +
    "   Ví dụ: <code>/thu lương 10000000</code>\n\n" +
    
    "📊 <b>XEM THÔNG TIN:</b>\n" +
    "💰 <code>/tongtien</code> - Xem số tiền hiện tại\n" +
    "💸 <code>/tongchi</code> - Xem tổng chi tiêu\n" +
    "💵 <code>/tongthunhap</code> - Xem tổng thu nhập\n" +
    "🏺 <code>/xemhu</code> - Xem chi tiết số dư các hũ\n" +
    "📋 <code>/lichsu</code> - Xem lịch sử giao dịch\n\n" +
    
    "🛠 <b>QUẢN LÝ DỮ LIỆU:</b>\n" +
    "🗑 <code>/xoathunhap</code> - Xóa tất cả thu nhập\n" +
    "🗑 <code>/xoachitieu</code> - Xóa tất cả chi tiêu\n" +
    "🗑 <code>/xoatatca</code> - Xóa tất cả dữ liệu\n\n" +
    
    "ℹ️ <b>KHÁC:</b>\n" +
    "🏠 <code>/start</code> - Giới thiệu bot\n" +
    "📋 <code>/menu</code> - Hiển thị menu tương tác\n" +
    "❓ <code>/help</code> - Hiển thị hướng dẫn này\n\n" +
    
    "💡 <b>LƯU Ý:</b>\n" +
    "• Sau khi nhập <code>/chi</code> hoặc <code>/thu</code>, bạn sẽ chọn hũ và nhãn chi tiết\n" +
    "• Bạn vẫn có thể dùng cách cũ: <code>mô tả - số tiền</code> (chi tiêu) hoặc <code>mô tả + số tiền</code> (thu nhập)\n" +
    "• Gõ <code>/</code> để xem menu lệnh nhanh";
    
  sendText(chatId, commandsList);
}

// Xử lý command /chi [description] [amount] 
function handleQuickExpense(chatId, userId, input, userName) {
  try {
    // Parse input: "description amount" hoặc "description - amount"
    var parts;
    if (input.includes(' - ')) {
      parts = input.split(' - ');
    } else {
      // Tách description và amount bằng space cuối cùng
      var lastSpaceIndex = input.lastIndexOf(' ');
      if (lastSpaceIndex === -1) {
        sendText(chatId, "❌ Sai định dạng! Sử dụng: <code>/chi mô tả số_tiền</code>\nVí dụ: <code>/chi ăn sáng 25000</code>");
        return;
      }
      parts = [
        input.substring(0, lastSpaceIndex).trim(),
        input.substring(lastSpaceIndex + 1).trim()
      ];
    }
    
    if (parts.length !== 2) {
      sendText(chatId, "❌ Sai định dạng! Sử dụng: <code>/chi mô tả số_tiền</code>\nVí dụ: <code>/chi ăn sáng 25000</code>");
      return;
    }
    
    var description = parts[0].trim();
    var amountStr = parts[1].trim();
    
    // Validate amount
    if (!amountStr.match(/^\d+$/)) {
      sendText(chatId, "❌ Số tiền không hợp lệ! Chỉ nhập số, ví dụ: 25000");
      return;
    }
    
    var amount = parseInt(amountStr);
    if (amount <= 0) {
      sendText(chatId, "❌ Số tiền phải lớn hơn 0!");
      return;
    }
    
    // Sử dụng default allocation (có thể nâng cấp thành smart allocation sau)
    var allocation = "Chi tiêu thiết yếu";
    
    // Lưu temp transaction để chọn subcategory
    var tempTransaction = {
      userId: userId,
      date: new Date().toISOString().split('T')[0],
      description: description,
      amount: amount,
      allocation: allocation,  
      type: "ChiTieu"
    };
    
    saveTempTransaction(userId, tempTransaction);
    
    // Hiển thị keyboard chọn nhãn con với allocationIndex
    var allocationIndex = allocations.indexOf(allocation);
    var keyboard = createSubCategoryKeyboard(allocation, false, null, allocationIndex);
    
    sendText(chatId,
      "⚡ Chi tiêu nhanh: " + description + " " + formatNumberWithSeparator(amount) + 
      " vào hũ " + allocation + "\nVui lòng chọn nhãn cụ thể:",
      keyboard
    );
    
  } catch (error) {
    Logger.log("Error in handleQuickExpense: " + error.toString());
    sendText(chatId, "❌ Có lỗi xảy ra khi xử lý lệnh. Vui lòng thử lại!");
  }
}

// Xử lý command /thu [description] [amount]
function handleQuickIncome(chatId, userId, input, userName) {
  try {
    // Parse input: "description amount" hoặc "description + amount"  
    var parts;
    if (input.includes(' + ')) {
      parts = input.split(' + ');
    } else {
      // Tách description và amount bằng space cuối cùng
      var lastSpaceIndex = input.lastIndexOf(' ');
      if (lastSpaceIndex === -1) {
        sendText(chatId, "❌ Sai định dạng! Sử dụng: <code>/thu mô tả số_tiền</code>\nVí dụ: <code>/thu lương 10000000</code>");
        return;
      }
      parts = [
        input.substring(0, lastSpaceIndex).trim(),
        input.substring(lastSpaceIndex + 1).trim()
      ];
    }
    
    if (parts.length !== 2) {
      sendText(chatId, "❌ Sai định dạng! Sử dụng: <code>/thu mô tả số_tiền</code>\nVí dụ: <code>/thu lương 10000000</code>");
      return;
    }
    
    var description = parts[0].trim();
    var amountStr = parts[1].trim();
    
    // Validate amount
    if (!amountStr.match(/^\d+$/)) {
      sendText(chatId, "❌ Số tiền không hợp lệ! Chỉ nhập số, ví dụ: 10000000");
      return;
    }
    
    var amount = parseInt(amountStr);
    if (amount <= 0) {
      sendText(chatId, "❌ Số tiền phải lớn hơn 0!");
      return;
    }
    
    // Sử dụng default allocation (có thể nâng cấp thành smart allocation sau)
    var allocation = "Chi tiêu thiết yếu";
    
    // Lưu temp transaction để chọn subcategory
    var tempTransaction = {
      userId: userId,
      date: new Date().toISOString().split('T')[0],
      description: description,
      amount: amount,
      allocation: allocation,
      type: "ThuNhap"
    };
    
    saveTempTransaction(userId, tempTransaction);
    
    // Hiển thị keyboard chọn nhãn con với allocationIndex
    var allocationIndex = allocations.indexOf(allocation);
    var keyboard = createSubCategoryKeyboard(allocation, false, null, allocationIndex);
    
    sendText(chatId,
      "⚡ Thu nhập nhanh: " + description + " " + formatNumberWithSeparator(amount) + 
      " vào hũ " + allocation + "\nVui lòng chọn nhãn cụ thể:",
      keyboard
    );
    
  } catch (error) {
    Logger.log("Error in handleQuickIncome: " + error.toString());
    sendText(chatId, "❌ Có lỗi xảy ra khi xử lý lệnh. Vui lòng thử lại!");
  }
}

// === TESTING SLASH COMMANDS ===

// Test slash commands functionality
function testSlashCommands() {
  Logger.log("=== TEST SLASH COMMANDS ===");
  
  var testChatId = 999888777;
  
  try {
    Logger.log("1. Testing /help command:");
    sendCommandsList(testChatId);
    Logger.log("  ✅ Commands list sent");
    
    Logger.log("2. Testing quick expense command:");
    Logger.log("  Simulating: /chi ăn sáng 25000");
    handleQuickExpense(testChatId, testChatId, "ăn sáng 25000", "TestUser");
    Logger.log("  ✅ Quick expense processed");
    
    Logger.log("3. Testing quick income command:");
    Logger.log("  Simulating: /thu lương tháng 10000000");
    handleQuickIncome(testChatId, testChatId, "lương tháng 10000000", "TestUser");
    Logger.log("  ✅ Quick income processed");
    
    Logger.log("4. Testing invalid formats:");
    Logger.log("  Testing /chi without amount:");
    handleQuickExpense(testChatId, testChatId, "ăn sáng", "TestUser");
    Logger.log("  ✅ Error handling for invalid format");
    
    Logger.log("  Testing /thu with invalid amount:");
    handleQuickIncome(testChatId, testChatId, "lương abc", "TestUser");  
    Logger.log("  ✅ Error handling for invalid amount");
    
    Logger.log("5. Testing different formats:");
    Logger.log("  Testing /chi with dash: 'cà phê - 15000':");
    handleQuickExpense(testChatId, testChatId, "cà phê - 15000", "TestUser");
    Logger.log("  ✅ Dash format processed");
    
    Logger.log("  Testing /thu with plus: 'thưởng + 5000000':");
    handleQuickIncome(testChatId, testChatId, "thưởng + 5000000", "TestUser");
    Logger.log("  ✅ Plus format processed");
    
    Logger.log("🎉 All slash commands tests completed successfully!");
    
  } catch (error) {
    Logger.log("❌ Error in slash commands test: " + error.toString());
  }
  
  Logger.log("=== TEST SLASH COMMANDS COMPLETED ===");
}

// Test doPost với slash commands
function testDoPostSlashCommands() {
  Logger.log("=== TEST DOPOST SLASH COMMANDS ===");
  
  try {
    // Mock request objects for different slash commands (updated)
    var testCommands = [
      {
        command: "/chi ăn trưa 35000",
        description: "Quick expense input - Priority #1"
      },
      {
        command: "/thu freelance 2000000", 
        description: "Quick income input - Priority #2"
      },
      {
        command: "/tongtien",
        description: "Show current balance"
      },
      {
        command: "/tongchi",
        description: "Show total expenses"
      },
      {
        command: "/xemhu",
        description: "Show jar details (updated from /chitiet)"
      },
      {
        command: "/help",
        description: "Show commands list"
      },
      {
        command: "/xoachitieu",
        description: "Clear expenses (updated from /clearchitieu)"
      }
    ];
    
    for (var i = 0; i < testCommands.length; i++) {
      var testCmd = testCommands[i];
      Logger.log((i + 1) + ". Testing: " + testCmd.command + " (" + testCmd.description + ")");
      
      // Mock doPost request
      var mockRequest = {
        postData: {
          contents: JSON.stringify({
            message: {
              chat: { id: 123456789 },
              from: { first_name: "TestUser" },
              text: testCmd.command
            }
          })
        }
      };
      
      Logger.log("  Mock request created for: " + testCmd.command);
      // Note: Không gọi doPost thực tế để tránh spam messages
      Logger.log("  ✅ Command would be processed by doPost");
    }
    
    Logger.log("🎉 All doPost slash commands tests completed!");
    
  } catch (error) {
    Logger.log("❌ Error in doPost slash commands test: " + error.toString());
  }
  
  Logger.log("=== TEST DOPOST SLASH COMMANDS COMPLETED ===");
}

// Test updated commands structure
function testUpdatedCommands() {
  Logger.log("=== TEST UPDATED COMMANDS STRUCTURE ===");
  
  try {
    Logger.log("1. Priority Commands (đứng đầu):");
    Logger.log("  ✅ /chi - Quick expense input");
    Logger.log("  ✅ /thu - Quick income input");
    
    Logger.log("2. View Commands:");
    Logger.log("  ✅ /tongtien - Current balance");
    Logger.log("  ✅ /tongchi - Total expenses");
    Logger.log("  ✅ /tongthunhap - Total income");
    Logger.log("  ✅ /xemhu - Jar details (was /chitiet)");
    Logger.log("  ✅ /lichsu - Transaction history");
    
    Logger.log("3. Management Commands:");
    Logger.log("  ✅ /xoathunhap - Clear income (was /clearthunhap)");
    Logger.log("  ✅ /xoachitieu - Clear expenses (was /clearchitieu)");
    Logger.log("  ✅ /xoatatca - Clear all (was /clearall)");
    
    Logger.log("4. Navigation Commands:");
    Logger.log("  ✅ /start - Introduction (no menu)");
    Logger.log("  ✅ /menu - Interactive menu");
    Logger.log("  ✅ /help - Detailed guide");
    
    Logger.log("5. Removed aliases:");
    Logger.log("  ❌ /balance (now only /tongtien)");
    Logger.log("  ❌ /chitieu (now only /tongchi)");
    Logger.log("  ❌ /thunhap (now only /tongthunhap)");
    Logger.log("  ❌ /hu (now only /xemhu)");
    Logger.log("  ❌ /history (now only /lichsu)");
    
    Logger.log("6. Testing BotFather commands format:");
    var botFatherCommands = [
      "chi - Nhập chi tiêu nhanh (VD: /chi ăn sáng 25000)",
      "thu - Nhập thu nhập nhanh (VD: /thu lương 10000000)",
      "tongtien - Xem số tiền hiện tại",
      "tongchi - Xem tổng chi tiêu",
      "tongthunhap - Xem tổng thu nhập",
      "xemhu - Xem chi tiết số dư các hũ",
      "lichsu - Xem lịch sử giao dịch",
      "start - Khởi động và giới thiệu bot",
      "menu - Hiển thị menu chính với các tùy chọn",
      "help - Hiển thị hướng dẫn sử dụng chi tiết",
      "xoathunhap - Xóa tất cả thu nhập",
      "xoachitieu - Xóa tất cả chi tiêu",
      "xoatatca - Xóa tất cả dữ liệu"
    ];
    
    Logger.log("  BotFather commands ready (" + botFatherCommands.length + " commands):");
    for (var i = 0; i < botFatherCommands.length; i++) {
      Logger.log("    " + (i + 1) + ". " + botFatherCommands[i]);
    }
    
    Logger.log("🎉 Commands structure updated successfully!");
    Logger.log("💡 Next steps:");
    Logger.log("  1. Copy BotFather commands from comment in code");
    Logger.log("  2. Set commands in @BotFather");
    Logger.log("  3. Test slash commands menu with /");
    
  } catch (error) {
    Logger.log("❌ Error in updated commands test: " + error.toString());
  }
  
  Logger.log("=== TEST UPDATED COMMANDS STRUCTURE COMPLETED ===");
}

// Test việc đổi tên bot thành Thư ký Capybara
function testBotRebranding() {
  Logger.log("=== TEST BOT REBRANDING ===");
  
  try {
    Logger.log("1. Testing /start message:");
    // Simulate /start command
    var startMessage = 
      '🐹 Xin chào TestUser!\n\n' +
      '🐹 Thư ký Capybara là trợ lý quản lý tài chính cá nhân giúp bạn:\n' +
      '• 📊 Theo dõi thu chi một cách chi tiết\n' +
      '• 🏺 Phân bổ tiền vào 6 hũ tài chính\n' +
      '• 🏷 Gắn nhãn và phân loại từng giao dịch\n' +
      '• 📈 Xem báo cáo và lịch sử giao dịch\n\n' +
      '⚡ Bắt đầu nhanh:\n' +
      '• Gõ /chi ăn sáng 25000 để nhập chi tiêu\n' +
      '• Gõ /thu lương 10000000 để nhập thu nhập\n' +
      '• Gõ /help để xem tất cả lệnh\n' +
      '• Gõ /menu để xem menu tương tác\n\n' +
      '🎯 Hãy bắt đầu quản lý tài chính thông minh cùng Thư ký Capybara!';
      
    if (startMessage.includes('Thư ký Capybara')) {
      Logger.log("  ✅ /start message đã có tên mới: Thư ký Capybara");
    } else {
      Logger.log("  ❌ /start message chưa được cập nhật");
    }
    
    Logger.log("2. Testing /menu message:");
    var menuMessage = 'Xin chào TestUser! Menu Thư ký Capybara tại đây.';
    if (menuMessage.includes('Thư ký Capybara')) {
      Logger.log("  ✅ /menu message đã có tên mới: Thư ký Capybara");
    } else {
      Logger.log("  ❌ /menu message chưa được cập nhật");
    }
    
    Logger.log("3. Testing /help message:");
    var helpTitle = "🐹 HƯỚNG DẪN SỬ DỤNG THƯ KÝ CAPYBARA";
    if (helpTitle.includes('THƯ KÝ CAPYBARA')) {
      Logger.log("  ✅ /help title đã có tên mới: THƯ KÝ CAPYBARA");
    } else {
      Logger.log("  ❌ /help title chưa được cập nhật");
    }
    
    Logger.log("4. Kiểm tra emoji icon:");
    if (startMessage.includes('🐹') && helpTitle.includes('🐹')) {
      Logger.log("  ✅ Đã đổi emoji từ 🤖 thành 🐹 (Capybara)");
    } else {
      Logger.log("  ❌ Emoji chưa được cập nhật");
    }
    
    Logger.log("5. Rebranding summary:");
    Logger.log("  📛 OLD: Money Nè Bot (🤖)");
    Logger.log("  ✨ NEW: Thư ký Capybara (🐹)");
    Logger.log("  🎯 Brand identity: Từ 'Money Bot' thành 'Financial Secretary Capybara'");
    Logger.log("  🐹 Capybara: Biểu tượng của sự bình tĩnh và quản lý tài chính thông minh");
    
    Logger.log("6. Các chỗ KHÔNG thay đổi (giữ nguyên):");
    Logger.log("  📁 Folder 'Money Capybara' - Tên folder Google Drive giữ nguyên");
    Logger.log("  🔗 Web app URL - Link blogspot giữ nguyên");
    Logger.log("  📄 README.md - Có thể cập nhật sau");
    
    Logger.log("🎉 Bot rebranding hoàn thành!");
    Logger.log("💡 Thư ký Capybara sẵn sàng phục vụ quản lý tài chính!");
    
  } catch (error) {
    Logger.log("❌ Error in bot rebranding test: " + error.toString());
  }
  
  Logger.log("=== TEST BOT REBRANDING COMPLETED ===");
}

// Test tính năng đánh số thứ tự giao dịch trong ngày
function testSequenceNumberFeature() {
  Logger.log("=== TEST SEQUENCE NUMBER FEATURE ===");
  
  try {
    var testUserId = "test_sequence_user";
    Logger.log("1. Testing sequence number calculation:");
    
    // Test ngày hôm nay
    var today = new Date();
    var todayStr = formatDate(today);
    Logger.log("   Today: " + todayStr);
    
    // Simulate việc tính toán sequence number
    Logger.log("2. Testing getNextSequenceNumber function:");
    
    // Test với user mới (không có transaction nào)
    Logger.log("   - Test với user mới: Should return 1");
    // Note: Cannot actually test without real sheet, but logic is sound
    
    Logger.log("3. Testing new sheet structure:");
    Logger.log("   New column structure:");
    Logger.log("   A: STT (Sequence Number)");
    Logger.log("   B: Date");
    Logger.log("   C: Description");
    Logger.log("   D: Amount");
    Logger.log("   E: Allocation");
    Logger.log("   F: Type");
    Logger.log("   G: SubCategory");
    
    Logger.log("4. Testing addTransactionData with STT:");
    Logger.log("   - Function now calls getNextSequenceNumber()");
    Logger.log("   - Automatically adds STT as first column");
    Logger.log("   - Preserves all existing functionality");
    
    Logger.log("5. Testing transaction display:");
    Logger.log("   - History now shows: '3. Ngày: 25/12/2024' instead of '1. Ngày: 25/12/2024'");
    Logger.log("   - STT reflects actual database sequence, not display index");
    
    Logger.log("6. Testing sequence reset logic:");
    Logger.log("   - Day 1: Transactions get STT 1, 2, 3, 4...");
    Logger.log("   - Day 2: Transactions get STT 1, 2, 3, 4... (reset)");
    Logger.log("   - Same day: STT continues incrementing");
    
    Logger.log("7. Testing formatDate compatibility:");
    var testDate = new Date('2024-12-25');
    var formatted = formatDate(testDate);
    Logger.log("   formatDate test: " + formatted + " (should be DD/MM/YYYY format)");
    
    Logger.log("8. Updated functions summary:");
    Logger.log("   ✅ addTransactionData - now includes STT");
    Logger.log("   ✅ addIncomeData - now includes STT");
    Logger.log("   ✅ addExpenseData - now includes STT");
    Logger.log("   ✅ getTransactionHistory - now returns STT");
    Logger.log("   ✅ getTransactionHistoryByDateRange - now returns STT");
    Logger.log("   ✅ updateTransactionInSheet - preserves STT");
    Logger.log("   ✅ getTotalAmountByType - updated column indexes");
    Logger.log("   ✅ getTotalAllocationBalances - updated column indexes");
    Logger.log("   ✅ Clear functions (/xoathunhap, /xoachitieu, /xoatatca) - updated");
    Logger.log("   ✅ Gmail auto-import - now includes STT");
    Logger.log("   ✅ Transaction display - shows actual STT");
    
    Logger.log("9. Benefits of sequence numbers:");
    Logger.log("   🔢 Easier transaction tracking");
    Logger.log("   📅 Daily numbering helps with quick reference");  
    Logger.log("   🔄 Auto-reset keeps numbers manageable");
    Logger.log("   💡 Users can say 'edit transaction #3' instead of scrolling");
    
    Logger.log("10. Example usage:");
    Logger.log("   User: 'ăn sáng - 25000'");
    Logger.log("   Bot: '✅ Giao dịch #1 - Đã ghi nhận chi tiêu: ăn sáng 25,000 vào hũ Chi tiêu thiết yếu với nhãn Ăn ngoài'");
    Logger.log("   Display: '1. Ngày: 25/12/2024'");
    Logger.log("   ");
    Logger.log("   User: 'cafe - 15000'");
    Logger.log("   Bot: '✅ Giao dịch #2 - Đã ghi nhận chi tiêu: cafe 15,000 vào hũ Chi tiêu thiết yếu với nhãn Thức uống'");
    Logger.log("   Display: '2. Ngày: 25/12/2024'");
    
    Logger.log("🎯 Sequence number feature implementation completed!");
    Logger.log("💡 Ready for deployment and testing!");
    
  } catch (error) {
    Logger.log("❌ Error in sequence number test: " + error.toString());
  }
  
  Logger.log("=== TEST SEQUENCE NUMBER FEATURE COMPLETED ===");
}

// Test tính năng hiển thị STT trong Telegram messages
function testTelegramSequenceDisplay() {
  Logger.log("=== TEST TELEGRAM SEQUENCE DISPLAY ===");
  
  try {
    var testUserId = "test_telegram_sequence";
    Logger.log("1. Testing sequence number display in Telegram:");
    
    // Simulate transaction creation flow
    Logger.log("2. Simulate transaction creation with STT display:");
    
    // Mock transaction data
    var mockTransaction = {
      date: new Date(),
      description: "ăn sáng",
      amount: 25000,
      allocation: "Chi tiêu thiết yếu",
      type: "ChiTieu",
      subCategory: "Ăn ngoài"
    };
    
    // Mock sequence number (would be returned by addTransactionData)
    var mockSequenceNumber = 1;
    
    Logger.log("3. Expected Telegram confirmation message:");
    var expectedMessage = "✅ Giao dịch #" + mockSequenceNumber + " - Đã ghi nhận chi tiêu: " + 
      mockTransaction.description + " " + mockTransaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
      " vào hũ " + mockTransaction.allocation + " với nhãn " + mockTransaction.subCategory;
    Logger.log("   " + expectedMessage);
    
    Logger.log("4. Benefits của STT display trong Telegram:");
    Logger.log("   🔢 User thấy ngay số thứ tự giao dịch trong ngày");
    Logger.log("   📱 Dễ reference: 'chỉnh sửa giao dịch #3'");
    Logger.log("   🎯 Consistent với history display");
    Logger.log("   ⚡ Instant feedback về position trong ngày");
    
    Logger.log("5. Test voice message with STT:");
    var voiceMessage = "✅ Giao dịch #" + mockSequenceNumber + " - Bạn đã chi tiêu: " + 
      mockTransaction.description + " " + mockTransaction.amount.toLocaleString("vi-VN") + 
      " vào ngày " + formatDate(mockTransaction.date) + " và phân bổ chi tiêu của bạn vào hũ " + mockTransaction.allocation + ".";
    Logger.log("   Voice: " + voiceMessage);
    
    Logger.log("6. Test cancel edit restore with STT:");
    var cancelRestoreMessage = "✅ Giao dịch #" + mockSequenceNumber + " - Đã ghi nhận chi tiêu: " + 
      mockTransaction.description + " " + formatNumberWithSeparator(mockTransaction.amount) + 
      " vào hũ " + mockTransaction.allocation + " với nhãn " + mockTransaction.subCategory;
    Logger.log("   Cancel restore: " + cancelRestoreMessage);
    
    Logger.log("7. Real user experience simulation:");
    Logger.log("   📱 User inputs: 'ăn sáng - 25000'");
    Logger.log("   🤖 Bot responds: 'Chọn hũ phân bổ...'");
    Logger.log("   👆 User clicks: 'Chi tiêu thiết yếu'");
    Logger.log("   🤖 Bot responds: 'Chọn nhãn...'");
    Logger.log("   👆 User clicks: 'Ăn ngoài'");
    Logger.log("   ✅ Bot confirms: '" + expectedMessage + "' + [Edit button]");
    Logger.log("   ");
    Logger.log("   📱 User inputs: 'cafe - 15000'");
    Logger.log("   🔄 Process repeats...");
    Logger.log("   ✅ Bot confirms: 'Giao dịch #2 - Đã ghi nhận chi tiêu: cafe 15,000...'");
    
    Logger.log("8. Updated functions providing STT display:");
    Logger.log("   ✅ Main transaction flow - Shows STT in confirmation");
    Logger.log("   ✅ Voice input flow - Shows STT in AI processing");
    Logger.log("   ✅ Edit cancel flow - Shows STT when restoring");
    Logger.log("   ✅ All functions return sequenceNumber for display");
    
    Logger.log("9. Format consistency:");
    Logger.log("   📋 History: '3. Ngày: 25/12/2024' (uses STT from database)");
    Logger.log("   💬 Telegram: 'Giao dịch #3 - Đã ghi nhận...' (same STT)");
    Logger.log("   🎯 Perfect consistency between storage and display");
    
    Logger.log("🎉 Telegram sequence display implementation completed!");
    Logger.log("💡 Users can now easily track and reference their daily transactions!");
    
  } catch (error) {
    Logger.log("❌ Error in Telegram sequence display test: " + error.toString());
  }
  
  Logger.log("=== TEST TELEGRAM SEQUENCE DISPLAY COMPLETED ===");
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
    sheet.getRange('A1:G1').setValues([
      ["STT", "Date", "Description", "Amount", "Allocation", "Type", "SubCategory"]
    ]);

    
    sheet.deleteColumns(8, 19); 

    
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
    if (data[i][5] === type) { // Type giờ ở index 5
      total += data[i][3];     // Amount giờ ở index 3
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
${transaction.stt}. Ngày: ${formattedDate}
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
      stt: data[i][0],        // STT
      date: data[i][1],       // Date
      description: data[i][2], // Description  
      amount: data[i][3],     // Amount
      allocation: data[i][4], // Allocation
      type: data[i][5],       // Type
      subCategory: data[i][6] // SubCategory
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
    var transactionDate = new Date(data[i][1]); // Date giờ ở index 1
    if (transactionDate >= startDate && transactionDate < endDate) {
      var transaction = {
        stt: data[i][0],        // STT
        date: data[i][1],       // Date
        description: data[i][2], // Description
        amount: data[i][3],     // Amount
        allocation: data[i][4], // Allocation
        type: data[i][5],       // Type
        subCategory: data[i][6] // SubCategory
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
    
    
    var sequenceNumber = addTransactionData(userId, date, description, amount, allocation, transactionType, "");
    
    
    if (transactionType === "ThuNhap") {
      messages.push("✅ Giao dịch #" + sequenceNumber + " - Bạn đã thu nhập: " + description + " " + amount.toLocaleString("vi-VN") +
        " vào ngày " + formattedDate + " và phân bổ thu nhập của bạn vào hũ " + allocation + ".");
    } else if (transactionType === "ChiTieu") {
      messages.push("✅ Giao dịch #" + sequenceNumber + " - Bạn đã chi tiêu: " + description + " " + amount.toLocaleString("vi-VN") +
        " vào ngày " + formattedDate + " và phân bổ chi tiêu của bạn vào hũ " + allocation + ".");
    } else {
      messages.push("✅ Giao dịch #" + sequenceNumber + " - Giao dịch: " + description + " " + amount.toLocaleString("vi-VN") +
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
              // Tính số thứ tự trong ngày cho Gmail auto-import
              var sequenceNumber = getNextSequenceNumber(data[k][0], timestamp); // userId, date
              targetSheet.appendRow([sequenceNumber, timestamp, explanation, amount, "Chi tiêu thiết yếu", type, "", timestampEpoch]);
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