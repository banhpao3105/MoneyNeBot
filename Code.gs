var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
var gemini_token = PropertiesService.getScriptProperties().getProperty('GEMINI_TOKEN');
var main_sheet = PropertiesService.getScriptProperties().getProperty('ID_MAINSHEET');

function getApiKeys() {
  var keysString = PropertiesService.getScriptProperties().getProperty('GEMINI_LISTKEY');
  if (!keysString) return [];
  return JSON.parse(keysString);
}


const telegramUrl = "https://api.telegram.org/bot" + token;

// =================== AUTO WEB APP URL ===================
function getWebAppUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    Logger.log("Error getting auto Web App URL: " + error.toString());
    return "CHANGE_YOU_URL_APPSCRIP"; // Fallback
  }
}

const webAppUrl = getWebAppUrl();


function setWebhook() {
  const url = `${telegramUrl}/setWebhook?url=${webAppUrl}`;
  const response = UrlFetchApp.fetch(url);
  Logger.log("Webhook response: " + response.getContentText());
  return response.getContentText();
}

// Function để set webhook với URL cụ thể
function setWebhookWithURL(newWebAppUrl) {
  const url = telegramUrl + "/setWebhook?url=" + newWebAppUrl;
  const response = UrlFetchApp.fetch(url);
  Logger.log("Webhook set to: " + newWebAppUrl);
  Logger.log("Response: " + response.getContentText());
  return response.getContentText();
}

function formatNumberWithSeparator(number) {
  return number
    .toString()
}

// =================== CONSTANTS ===================
const TRANSACTION_TYPE = {
  EXPENSE: 'ChiTieu',
  INCOME: 'ThuNhap'
};

const CALLBACK_PREFIX = {
  EDIT_TRANSACTION: 'edit_transaction_',
  EDIT_ALLOCATION: 'edit_allocation_',
  EDIT_ALLOC: 'edit_alloc_',
  EDIT_SUBCATEGORY: 'edit_subcategory_',
  EDIT_SUB: 'edit_sub_',
  CANCEL_EDIT: 'cancel_edit_',
  SUBCATEGORY: 'subcategory_',
  SUB: 'sub_',
  ALLOCATION: 'allocation_',
  BANK: 'bank_',
  VIEW_ALLOCATION_DETAIL: 'view_allocation_detail_',
  VIEW_ALLOCATION_TRANSACTIONS: 'view_allocation_transactions_',
  VIEW_SUBCATEGORY: 'view_subcategory_',
  VIEW_ALLOCATION_SUBS: 'view_allocation_subs_'
};

// Global allocations array (sử dụng cho toàn bộ ứng dụng)
const allocations = [
  'Chi tiêu thiết yếu',
  'Hưởng thụ',
  'Tiết kiệm dài hạn',
  'Giáo dục',
  'Tự do tài chính',
  'Cho đi'
];

// Global subcategories object
const subCategories = {
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

/**
 * OPTIMIZED: Only read Date column (B) instead of entire sheet
 */
function getNextSequenceNumber(userId, date) {
  const sheet = getSheet(userId);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return 1; // No data rows, start with 1
  
  // Chuyển date thành chuỗi để so sánh (format: DD/MM/YYYY)
  const targetDate = new Date(date);
  const targetDateStr = formatDate(targetDate);
  
  // Only read Date column (B) from row 2 to last row
  const dateData = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Column B only
  
  let count = 0;
  // Bắt đầu từ dòng 2 (bỏ qua header)
  for (let i = 0; i < dateData.length; i++) {
    if (dateData[i][0]) { // Kiểm tra cột Date
      const rowDate = new Date(dateData[i][0]);
      const rowDateStr = formatDate(rowDate);
      
      if (rowDateStr === targetDateStr) {
        count++;
      }
    }
  }
  
  return count + 1; // Trả về số thứ tự tiếp theo
}

function addTransactionData(entityId, date, description, amount, allocation, type, subCategory, chatType = 'private', senderName = null) {
  const sheet = getSheet(entityId, chatType, senderName);
  subCategory = subCategory || ""; // Mặc định rỗng nếu không có
  
  // Tính số thứ tự trong ngày
  var sequenceNumber = getNextSequenceNumber(entityId, date);
  
  const rowData = [sequenceNumber, date, description, amount, allocation, type, subCategory];

  if (chatType === 'group' || chatType === 'supergroup') {
    rowData.unshift(senderName || 'Unknown'); // Add senderName at the beginning for group transactions
  }

  sheet.appendRow(rowData);
  
  // Check for budget alerts after adding transaction
  checkAndSendBudgetAlerts(entityId, allocation, subCategory, amount, type);
  
  // Trả về sequence number để hiển thị trong telegram
  return sequenceNumber;
}


/**
 * IMPROVED: Now returns message object for loading message updates
 */
function sendText(chatId, text, keyBoard) {
  const formattedText = formatNumberWithSeparator(text);
  const data = {
    method: "post",
    payload: {
      method: "sendMessage",
      chat_id: String(chatId),
      text: formattedText,
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyBoard)
    }
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/', data);
    const result = JSON.parse(response.getContentText());
    
    if (result.ok && result.result) {
      return result.result; // Trả về object chứa message_id
    }
    return null;
  } catch (err) {
    Logger.log("Error in sendText: " + err.toString());
    return null;
  }
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

const keyBoard = {
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
        text: '📈 Xem Tỉ Lệ %',
        callback_data: 'show_percentage_menu'
      },
      {
        text: '📊 Xem Biểu Đồ',
        callback_data: 'show_chart_menu'
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
const menuchi = {
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

// =================== LEGACY FUNCTIONS REMOVED ===================
// doPostOld function (1063 lines) was removed during Router Pattern refactoring

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

function sendTotalPhanboSummary(context) {
  const allocations = getTotalAllocationBalances(context.chatId);
  let message = "🏺 <b>Số tiền phân bổ theo hũ:</b>\n\n";
  
  let totalBalance = 0;
  let hasData = false;
  
  for (const allocation in allocations) {
    if (allocations[allocation] !== 0) {
      hasData = true;
      const balanceStr = formatNumberWithSeparator(allocations[allocation]);
      const icon = allocations[allocation] >= 0 ? "💰" : "💸";
      message += icon + " <b>" + allocation + ":</b> " + balanceStr + "\n";
      totalBalance += allocations[allocation];
    }
  }
  
  if (hasData) {
    message += "\n<b>💹 Tổng số dư tất cả hũ: " + formatNumberWithSeparator(totalBalance) + "</b>";
  } else {
    message = "Chưa có giao dịch nào được phân bổ vào các hũ.";
  }
  
  const allocationMenu = {
    inline_keyboard: [
      [
        { text: '📋 Xem lịch sử theo hũ', callback_data: 'view_by_allocation' }
      ],
      [
        { text: '🏷️ Xem theo nhãn', callback_data: 'view_subcategory_summary' },
        { text: '📊 Tổng quan', callback_data: 'currentbalance' }
      ],
      [
        { text: '📈 Xem tỉ lệ %', callback_data: 'show_percentage_menu' },
        { text: '📊 Xem biểu đồ', callback_data: 'show_chart_menu' }
      ]
    ]
  };
  
  if (context.messageId) {
    editText(context.chatId, context.messageId, message, allocationMenu);
  } else {
    sendText(context.chatId, message, allocationMenu);
  }
}

// =================== MENU SELECTION CHO TỈ LỆ % VÀ BIỂU ĐỒ ===================

// Hiển thị menu chọn loại tỉ lệ % (hũ hoặc nhãn)
function sendPercentageSelectionMenu(chatId, userId, messageId) {
  var message = "📈 <b>Chọn loại tỉ lệ % bạn muốn xem:</b>\n\n" +
    "🏺 <b>Theo Hũ:</b> Xem tỉ lệ % chi tiêu và thu nhập theo 6 hũ tài chính\n" +
    "🏷️ <b>Theo Nhãn:</b> Xem tỉ lệ % chi tiêu theo từng nhãn cụ thể\n\n" +
    "💡 <i>Chọn một tùy chọn bên dưới:</i>";
  
  var percentageMenu = {
    "inline_keyboard": [
      [
        {
          text: '🏺 Tỉ lệ % Chi tiêu theo Hũ',
          callback_data: 'percentage_allocation_expense'
        }
      ],
      [
        {
          text: '💰 Tỉ lệ % Thu nhập theo Hũ',
          callback_data: 'percentage_allocation_income'
        }
      ],
      [
        {
          text: '🏷️ Tỉ lệ % Chi tiêu theo Nhãn',
          callback_data: 'percentage_subcategory'
        }
      ],
      [
        {
          text: '📊 Xem Biểu đồ',
          callback_data: 'show_chart_menu'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, percentageMenu);
  } else {
    sendText(chatId, message, percentageMenu);
  }
}

// Hiển thị menu chọn loại biểu đồ (hũ hoặc nhãn)
function sendChartSelectionMenu(chatId, userId, messageId) {
  var message = "📊 <b>Chọn loại biểu đồ bạn muốn xem:</b>\n\n" +
    "🏺 <b>Theo Hũ:</b> Biểu đồ cột ASCII cho chi tiêu và thu nhập theo hũ\n" +
    "🏷️ <b>Theo Nhãn:</b> Biểu đồ top nhãn chi tiêu với ranking\n\n" +
    "💡 <i>Chọn một tùy chọn bên dưới:</i>";
  
  var chartMenu = {
    "inline_keyboard": [
      [
        {
          text: '🏺 Biểu đồ Chi tiêu theo Hũ',
          callback_data: 'chart_allocation_expense'
        }
      ],
      [
        {
          text: '💰 Biểu đồ Thu nhập theo Hũ',
          callback_data: 'chart_allocation_income'
        }
      ],
      [
        {
          text: '🏷️ Biểu đồ Chi tiêu theo Nhãn',
          callback_data: 'chart_subcategory'
        }
      ],
      [
        {
          text: '📈 Xem Tỉ lệ %',
          callback_data: 'show_percentage_menu'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, chartMenu);
  } else {
    sendText(chatId, message, chartMenu);
  }
}

// =================== KẾT THÚC MENU SELECTION ===================

// =================== TỈ LỆ % VÀ BIỂU ĐỒ CHO SUBCATEGORIES ===================

// Tính tỉ lệ % cho subcategories
function calculateSubCategoryPercentages(userId) {
  var subCategoryBalances = getTotalSubCategoryBalances(userId);
  var percentages = {};
  var totalAmount = 0;
  var allocationTotals = {};
  
  // Tính tổng cho từng allocation và tổng grand total
  for (var allocation in subCategories) {
    allocationTotals[allocation] = 0;
    for (var i = 0; i < subCategories[allocation].length; i++) {
      var subCategory = subCategories[allocation][i];
      if (subCategoryBalances[subCategory] > 0) {
        allocationTotals[allocation] += subCategoryBalances[subCategory];
        totalAmount += subCategoryBalances[subCategory];
      }
    }
  }
  
  // Tính tỉ lệ % cho từng subcategory
  for (var allocation in subCategories) {
    for (var i = 0; i < subCategories[allocation].length; i++) {
      var subCategory = subCategories[allocation][i];
      if (subCategoryBalances[subCategory] > 0 && totalAmount > 0) {
        percentages[subCategory] = (subCategoryBalances[subCategory] / totalAmount) * 100;
      } else {
        percentages[subCategory] = 0;
      }
    }
  }
  
  return {
    percentages: percentages,
    balances: subCategoryBalances,
    totalAmount: totalAmount,
    allocationTotals: allocationTotals
  };
}

// Hiển thị tỉ lệ % chi tiêu theo subcategory
function sendSubCategoryPercentages(chatId, userId, messageId) {
  var data = calculateSubCategoryPercentages(userId);
  var percentages = data.percentages;
  var balances = data.balances;
  var totalAmount = data.totalAmount;
  var allocationTotals = data.allocationTotals;
  
  var message = "📈 <b>Tỉ lệ % chi tiêu theo nhãn:</b>\n\n";
  
  if (totalAmount > 0) {
    // Hiển thị theo từng allocation
    for (var allocation in subCategories) {
      if (allocationTotals[allocation] > 0) {
        message += "📁 <b>" + allocation + ":</b>\n";
        
        // Sắp xếp subcategories theo % giảm dần trong allocation này
        var subCategoriesInAllocation = subCategories[allocation].filter(function(subCat) {
          return percentages[subCat] > 0;
        }).sort(function(a, b) {
          return percentages[b] - percentages[a];
        });
        
        for (var i = 0; i < subCategoriesInAllocation.length; i++) {
          var subCategory = subCategoriesInAllocation[i];
          var percentage = percentages[subCategory];
          var amount = balances[subCategory];
          
          message += "  🏷️ <b>" + subCategory + ":</b>\n";
          message += "     💰 " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
                     " (" + percentage.toFixed(1) + "%)\n";
          message += "     " + createPercentageBar(percentage) + "\n";
        }
        
        var allocationPercentage = (allocationTotals[allocation] / totalAmount) * 100;
        message += "  <i>📊 Tổng " + getShortAllocationName(allocation) + ": " + 
                   allocationTotals[allocation].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
                   " (" + allocationPercentage.toFixed(1) + "%)</i>\n\n";
      }
    }
    
    message += "<b>💹 Tổng tất cả nhãn: " + totalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  } else {
    message = "📭 Chưa có chi tiêu nào được gắn nhãn để hiển thị tỉ lệ %.";
  }
  
  var subCategoryPercentageMenu = {
    "inline_keyboard": [
      [
        {
          text: '📊 Biểu đồ nhãn',
          callback_data: 'view_subcategory_chart'
        },
        {
          text: '🏷️ Xem số dư nhãn',
          callback_data: 'view_subcategory_summary'
        }
      ],
      [
        {
          text: '📈 Tỉ lệ % hũ',
          callback_data: 'view_percentage'
        },
        {
          text: '🏺 Xem hũ',
          callback_data: 'getTotalAllocationBalances'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, subCategoryPercentageMenu);
  } else {
    sendText(chatId, message, subCategoryPercentageMenu);
  }
}

// Hiển thị biểu đồ subcategories
function sendSubCategoryChart(chatId, userId, messageId) {
  var data = calculateSubCategoryPercentages(userId);
  var percentages = data.percentages;
  var balances = data.balances;
  var totalAmount = data.totalAmount;
  var allocationTotals = data.allocationTotals;
  
  var message = "📊 <b>Biểu đồ chi tiêu theo nhãn:</b>\n\n";
  
  if (totalAmount > 0) {
    // Tạo biểu đồ cho top subcategories
    var topSubCategories = getTopSubCategories(percentages, 8); // Top 8 để không quá dài
    
    if (topSubCategories.length > 0) {
      message += createSubCategoryBarChart(topSubCategories, percentages, balances);
      
      message += "\n<b>📈 Top nhãn chi tiêu:</b>\n";
      for (var i = 0; i < Math.min(5, topSubCategories.length); i++) {
        var subCategory = topSubCategories[i];
        var percentage = percentages[subCategory];
        var amount = balances[subCategory];
        
        var rank = "";
        switch(i) {
          case 0: rank = "🥇"; break;
          case 1: rank = "🥈"; break;
          case 2: rank = "🥉"; break;
          default: rank = (i + 1) + ".";
        }
        
        message += rank + " <b>" + subCategory + "</b>: " + 
                   amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
                   " (" + percentage.toFixed(1) + "%)\n";
      }
      
      // Phân tích allocation dominance
      message += "\n<b>🏺 Phân tích theo hũ:</b>\n";
      var sortedAllocations = Object.keys(allocationTotals).filter(function(alloc) {
        return allocationTotals[alloc] > 0;
      }).sort(function(a, b) {
        return allocationTotals[b] - allocationTotals[a];
      });
      
      if (sortedAllocations.length > 0) {
        var topAllocation = sortedAllocations[0];
        var topAllocationPercentage = (allocationTotals[topAllocation] / totalAmount) * 100;
        message += "🔴 Hũ chi nhiều nhất: <b>" + topAllocation + "</b> (" + topAllocationPercentage.toFixed(1) + "%)\n";
      }
    }
    
    message += "\n<b>💹 Tổng tất cả nhãn: " + totalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  } else {
    message = "📭 Chưa có dữ liệu nhãn để tạo biểu đồ.";
  }
  
  var subCategoryChartMenu = {
    "inline_keyboard": [
      [
        {
          text: '📈 Tỉ lệ % nhãn',
          callback_data: 'view_subcategory_percentage'
        },
        {
          text: '🏷️ Xem số dư nhãn',
          callback_data: 'view_subcategory_summary'
        }
      ],
      [
        {
          text: '📊 Biểu đồ hũ',
          callback_data: 'view_chart'
        },
        {
          text: '🏺 Xem hũ',
          callback_data: 'getTotalAllocationBalances'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, subCategoryChartMenu);
  } else {
    sendText(chatId, message, subCategoryChartMenu);
  }
}

// Lấy top subcategories theo percentage
function getTopSubCategories(percentages, limit) {
  return Object.keys(percentages)
    .filter(function(subCat) { return percentages[subCat] > 0; })
    .sort(function(a, b) { return percentages[b] - percentages[a]; })
    .slice(0, limit);
}

// Tạo biểu đồ cho subcategories
function createSubCategoryBarChart(topSubCategories, percentages, balances) {
  var chart = "";
  var maxHeight = 8; // Chiều cao tối đa
  
  // Tạo biểu đồ dọc
  for (var row = maxHeight; row >= 0; row--) {
    var line = "";
    
    for (var i = 0; i < topSubCategories.length; i++) {
      var subCategory = topSubCategories[i];
      var percentage = percentages[subCategory];
      
      var barHeight = Math.round((percentage / 100) * maxHeight);
      
      if (row <= barHeight) {
        line += "█";
      } else if (row === 0) {
        // Hiển thị số thứ tự
        line += String(i + 1);
      } else {
        line += " ";
      }
      line += " ";
    }
    
    if (line.trim()) {
      chart += line + "\n";
    }
  }
  
  // Thêm legend
  chart += "\n<b>📋 Chú giải:</b>\n";
  for (var i = 0; i < Math.min(topSubCategories.length, 5); i++) {
    var subCategory = topSubCategories[i];
    var percentage = percentages[subCategory];
    
    chart += (i + 1) + ". <b>" + getShortSubCategoryName(subCategory) + "</b>: " + percentage.toFixed(1) + "%\n";
  }
  
  return chart;
}

// Rút gọn tên subcategory cho biểu đồ
function getShortSubCategoryName(subCategory) {
  var shortNames = {
    // Chi tiêu thiết yếu
    'Nhà ở': 'Nhà ở',
    'Ăn ngoài': 'Ăn ngoài',
    'Hóa đơn': 'Hóa đơn',
    'Đi chợ siêu thị': 'Siêu thị',
    'Di chuyển': 'Di chuyển',
    'Sức khỏe': 'Sức khỏe',
    
    // Hưởng thụ
    'Giải trí': 'Giải trí',
    'Thức uống': 'Đồ uống',
    'Nhà hàng': 'Nhà hàng',
    'Mua sắm': 'Mua sắm',
    'Chăm sóc bản thân': 'Chăm sóc',
    'Du lịch': 'Du lịch',
    'Thể thao': 'Thể thao',
    
    // Tiết kiệm dài hạn
    'Mua sắm những món đồ giá trị': 'Đồ giá trị',
    'Những kỳ nghỉ lớn': 'Kỳ nghỉ lớn',
    'Các mục tiêu cá nhân khác': 'Mục tiêu khác',
    'Quỹ dự phòng khẩn cấp': 'Dự phòng',
    
    // Giáo dục
    'Sách': 'Sách',
    'Khóa học': 'Khóa học',
    'Sự kiện': 'Sự kiện',
    
    // Tự do tài chính
    'Đầu tư': 'Đầu tư',
    'Kinh doanh': 'Kinh doanh',
    'Bất động sản': 'BĐS',
    'Gửi tiết kiệm sinh lời': 'Tiết kiệm',
    
    // Cho đi
    'Từ thiện': 'Từ thiện',
    'Giúp đỡ người thân': 'Giúp đỡ',
    'Quà tặng': 'Quà tặng',
    'Đóng góp cho cộng đồng': 'Cộng đồng'
  };
  
  return shortNames[subCategory] || subCategory.substring(0, 8);
}

// =================== KẾT THÚC SUBCATEGORY % VÀ BIỂU ĐỒ ===================

// =================== TỈ LỆ % VÀ BIỂU ĐỒ FUNCTIONS ===================

// Tính tỉ lệ % cho các hũ
function calculateAllocationPercentages(userId) {
  var allocations = getTotalAllocationBalances(userId);
  var percentages = {};
  var totalAmount = 0;
  
  // Tính tổng số tiền đã chi (chỉ tính chi tiêu, bỏ qua số âm)
  for (var allocation in allocations) {
    if (allocations[allocation] < 0) { // Chi tiêu (số âm)
      totalAmount += Math.abs(allocations[allocation]);
    }
  }
  
  // Tính tỉ lệ % cho từng hũ
  for (var allocation in allocations) {
    if (allocations[allocation] < 0 && totalAmount > 0) {
      percentages[allocation] = (Math.abs(allocations[allocation]) / totalAmount) * 100;
    } else {
      percentages[allocation] = 0;
    }
  }
  
  return {
    percentages: percentages,
    totalAmount: totalAmount,
    allocations: allocations
  };
}

// Hiển thị tỉ lệ % chi tiêu theo hũ
function sendAllocationPercentages(chatId, userId, messageId) {
  var data = calculateAllocationPercentages(userId);
  var percentages = data.percentages;
  var totalAmount = data.totalAmount;
  var allocations = data.allocations;
  
  var message = "📈 <b>Tỉ lệ chi tiêu theo hũ:</b>\n\n";
  
  if (totalAmount > 0) {
    // Sắp xếp theo tỉ lệ % giảm dần
    var sortedAllocations = Object.keys(percentages).sort(function(a, b) {
      return percentages[b] - percentages[a];
    });
    
    for (var i = 0; i < sortedAllocations.length; i++) {
      var allocation = sortedAllocations[i];
      var percentage = percentages[allocation];
      
      if (percentage > 0) {
        var amount = Math.abs(allocations[allocation]);
        var amountStr = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        message += "💸 <b>" + allocation + ":</b>\n";
        message += "   💰 " + amountStr + " (" + percentage.toFixed(1) + "%)\n";
        message += "   " + createPercentageBar(percentage) + "\n\n";
      }
    }
    
    message += "<b>💹 Tổng chi tiêu: " + totalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  } else {
    message = "📭 Chưa có chi tiêu nào để hiển thị tỉ lệ %.";
  }
  
  var percentageMenu = {
    "inline_keyboard": [
      [
        {
          text: '📊 Biểu đồ chi tiêu hũ',
          callback_data: 'chart_allocation_expense'
        },
        {
          text: '🏺 Xem số dư hũ',
          callback_data: 'getTotalAllocationBalances'
        }
      ],
      [
        {
          text: '� Tỉ lệ % thu nhập',
          callback_data: 'percentage_allocation_income'
        },
        {
          text: '🏷️ Tỉ lệ % nhãn',
          callback_data: 'percentage_subcategory'
        }
      ],
      [
        {
          text: '📈 Menu tỉ lệ %',
          callback_data: 'show_percentage_menu'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, percentageMenu);
  } else {
    sendText(chatId, message, percentageMenu);
  }
}

// Tạo thanh % bằng ký tự
function createPercentageBar(percentage) {
  var maxBars = 20; // Độ dài tối đa của thanh
  var filledBars = Math.round((percentage / 100) * maxBars);
  var emptyBars = maxBars - filledBars;
  
  var bar = "";
  for (var i = 0; i < filledBars; i++) {
    bar += "█";
  }
  for (var i = 0; i < emptyBars; i++) {
    bar += "░";
  }
  
  return bar + " " + percentage.toFixed(1) + "%";
}

// Hiển thị biểu đồ phân bổ chi tiêu
function sendAllocationChart(chatId, userId, messageId) {
  var data = calculateAllocationPercentages(userId);
  var percentages = data.percentages;
  var totalAmount = data.totalAmount;
  var allocations = data.allocations;
  
  var message = "📊 <b>Biểu đồ chi tiêu theo hũ:</b>\n\n";
  
  if (totalAmount > 0) {
    // Tạo biểu đồ dạng cột
    message += createBarChart(percentages, allocations);
    message += "\n<b>📈 Phân tích:</b>\n";
    
    // Tìm hũ chi tiêu nhiều nhất và ít nhất
    var maxAllocation = "";
    var minAllocation = "";
    var maxPercentage = 0;
    var minPercentage = 100;
    
    for (var allocation in percentages) {
      if (percentages[allocation] > maxPercentage) {
        maxPercentage = percentages[allocation];
        maxAllocation = allocation;
      }
      if (percentages[allocation] > 0 && percentages[allocation] < minPercentage) {
        minPercentage = percentages[allocation];
        minAllocation = allocation;
      }
    }
    
    if (maxAllocation) {
      message += "🔴 Hũ chi nhiều nhất: <b>" + maxAllocation + "</b> (" + maxPercentage.toFixed(1) + "%)\n";
    }
    if (minAllocation) {
      message += "🟢 Hũ chi ít nhất: <b>" + minAllocation + "</b> (" + minPercentage.toFixed(1) + "%)\n";
    }
    
    message += "\n<b>💹 Tổng chi tiêu: " + totalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  } else {
    message = "📭 Chưa có dữ liệu chi tiêu để tạo biểu đồ.";
  }
  
  var chartMenu = {
    "inline_keyboard": [
      [
        {
          text: '📈 Xem tỉ lệ %',
          callback_data: 'view_percentage'
        },
        {
          text: '🏺 Xem số dư hũ',
          callback_data: 'getTotalAllocationBalances'
        }
      ],
      [
        {
          text: '📊 Biểu đồ thu nhập',
          callback_data: 'view_income_chart'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, chartMenu);
  } else {
    sendText(chatId, message, chartMenu);
  }
}

// Tạo biểu đồ cột bằng ký tự
function createBarChart(percentages, allocations) {
  var chart = "";
  var maxHeight = 10; // Chiều cao tối đa của cột
  
  // Sắp xếp theo tỉ lệ % giảm dần
  var sortedAllocations = Object.keys(percentages).sort(function(a, b) {
    return percentages[b] - percentages[a];
  });
  
  // Tạo biểu đồ theo chiều dọc
  for (var row = maxHeight; row >= 0; row--) {
    var line = "";
    
    for (var i = 0; i < sortedAllocations.length; i++) {
      var allocation = sortedAllocations[i];
      var percentage = percentages[allocation];
      
      if (percentage > 0) {
        var barHeight = Math.round((percentage / 100) * maxHeight);
        
        if (row <= barHeight) {
          line += "█";
        } else if (row === 0) {
          // Hiển thị tên hũ (rút gọn)
          var shortName = getShortAllocationName(allocation);
          line += shortName.charAt(0);
        } else {
          line += " ";
        }
        line += " ";
      }
    }
    
    if (line.trim()) {
      chart += line + "\n";
    }
  }
  
  // Thêm tên hũ và %
  chart += "\n";
  for (var i = 0; i < sortedAllocations.length; i++) {
    var allocation = sortedAllocations[i];
    var percentage = percentages[allocation];
    
    if (percentage > 0) {
      var shortName = getShortAllocationName(allocation);
      chart += "<b>" + shortName + "</b>: " + percentage.toFixed(1) + "%\n";
    }
  }
  
  return chart;
}

// Rút gọn tên hũ cho biểu đồ
function getShortAllocationName(allocation) {
  var shortNames = {
    'Chi tiêu thiết yếu': 'Thiết yếu',
    'Hưởng thụ': 'Hưởng thụ',
    'Tiết kiệm dài hạn': 'Tiết kiệm',
    'Giáo dục': 'Giáo dục',
    'Tự do tài chính': 'Tự do TC',
    'Cho đi': 'Cho đi'
  };
  
  return shortNames[allocation] || allocation;
}

// Tính tỉ lệ % thu nhập theo hũ
function sendIncomePercentages(chatId, userId, messageId) {
  var allocations = getTotalAllocationBalances(userId);
  var percentages = {};
  var totalIncome = 0;
  
  // Tính tổng thu nhập (số dương)
  for (var allocation in allocations) {
    if (allocations[allocation] > 0) {
      totalIncome += allocations[allocation];
    }
  }
  
  // Tính tỉ lệ % cho từng hũ
  for (var allocation in allocations) {
    if (allocations[allocation] > 0 && totalIncome > 0) {
      percentages[allocation] = (allocations[allocation] / totalIncome) * 100;
    } else {
      percentages[allocation] = 0;
    }
  }
  
  var message = "💰 <b>Tỉ lệ thu nhập theo hũ:</b>\n\n";
  
  if (totalIncome > 0) {
    // Sắp xếp theo tỉ lệ % giảm dần
    var sortedAllocations = Object.keys(percentages).sort(function(a, b) {
      return percentages[b] - percentages[a];
    });
    
    for (var i = 0; i < sortedAllocations.length; i++) {
      var allocation = sortedAllocations[i];
      var percentage = percentages[allocation];
      
      if (percentage > 0) {
        var amount = allocations[allocation];
        var amountStr = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        message += "💎 <b>" + allocation + ":</b>\n";
        message += "   💰 " + amountStr + " (" + percentage.toFixed(1) + "%)\n";
        message += "   " + createPercentageBar(percentage) + "\n\n";
      }
    }
    
    message += "<b>💹 Tổng thu nhập: " + totalIncome.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  } else {
    message = "📭 Chưa có thu nhập nào để hiển thị tỉ lệ %.";
  }
  
  var incomeMenu = {
    "inline_keyboard": [
      [
        {
          text: '📊 Biểu đồ thu nhập',
          callback_data: 'view_income_chart'
        },
        {
          text: '📈 Chi tiêu %',
          callback_data: 'view_percentage'
        }
      ],
      [
        {
          text: '🏺 Xem số dư hũ',
          callback_data: 'getTotalAllocationBalances'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, incomeMenu);
  } else {
    sendText(chatId, message, incomeMenu);
  }
}

// Hiển thị biểu đồ thu nhập
function sendIncomeChart(chatId, userId, messageId) {
  var allocations = getTotalAllocationBalances(userId);
  var percentages = {};
  var totalIncome = 0;
  
  // Tính tổng thu nhập
  for (var allocation in allocations) {
    if (allocations[allocation] > 0) {
      totalIncome += allocations[allocation];
    }
  }
  
  // Tính tỉ lệ %
  for (var allocation in allocations) {
    if (allocations[allocation] > 0 && totalIncome > 0) {
      percentages[allocation] = (allocations[allocation] / totalIncome) * 100;
    } else {
      percentages[allocation] = 0;
    }
  }
  
  var message = "💎 <b>Biểu đồ thu nhập theo hũ:</b>\n\n";
  
  if (totalIncome > 0) {
    message += createBarChart(percentages, allocations);
    message += "\n<b>💰 Phân tích thu nhập:</b>\n";
    
    // Tìm hũ thu nhập nhiều nhất
    var maxAllocation = "";
    var maxPercentage = 0;
    
    for (var allocation in percentages) {
      if (percentages[allocation] > maxPercentage) {
        maxPercentage = percentages[allocation];
        maxAllocation = allocation;
      }
    }
    
    if (maxAllocation) {
      message += "🌟 Hũ thu nhiều nhất: <b>" + maxAllocation + "</b> (" + maxPercentage.toFixed(1) + "%)\n";
    }
    
    message += "\n<b>💹 Tổng thu nhập: " + totalIncome.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  } else {
    message = "📭 Chưa có dữ liệu thu nhập để tạo biểu đồ.";
  }
  
  var incomeChartMenu = {
    "inline_keyboard": [
      [
        {
          text: '💰 Tỉ lệ thu nhập',
          callback_data: 'view_income_percentage'
        },
        {
          text: '📊 Biểu đồ chi tiêu',
          callback_data: 'view_chart'
        }
      ],
      [
        {
          text: '🏺 Xem số dư hũ',
          callback_data: 'getTotalAllocationBalances'
        }
      ]
    ]
  };
  
  if (messageId) {
    editText(chatId, messageId, message, incomeChartMenu);
  } else {
    sendText(chatId, message, incomeChartMenu);
  }
}

// =================== KẾT THÚC TỈ LỆ % VÀ BIỂU ĐỒ FUNCTIONS ===================

// Lấy lịch sử giao dịch theo allocation
function getTransactionHistoryByAllocation(userId, allocation) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  var transactions = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][4] === allocation) { // Allocation ở cột E (index 4)
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

// Hiển thị lịch sử giao dịch theo allocation với breakdown subcategories
function sendTransactionHistoryByAllocation(chatId, messageId, userId, allocation) {
  var transactions = getTransactionHistoryByAllocation(userId, allocation);
  
  if (transactions.length === 0) {
    var emptyMessage = "📭 <b>Hũ trống:</b> " + allocation + "\n\n" +
      "Chưa có giao dịch nào trong hũ này.";
    
    var emptyKeyboard = {
      "inline_keyboard": [
        [
          {
            text: "⬅️ Chọn hũ khác",
            callback_data: "view_by_allocation"
          },
          {
            text: "🏺 Tổng tất cả hũ",
            callback_data: "getTotalAllocationBalances"
          }
        ],
        [
          {
            text: "🏷️ Xem theo nhãn",
            callback_data: "view_subcategory_summary"
          },
          {
            text: "📊 Tổng quan",
            callback_data: "currentbalance"
          }
        ]
      ]
    };
    
    editText(chatId, messageId, emptyMessage, emptyKeyboard);
    return;
  }
  
  var message = "🏺 <b>Lịch sử hũ: " + allocation + "</b>\n\n";
  var totalIncome = 0;
  var totalExpense = 0;
  var subCategoryBreakdown = {};
  
  // Tính breakdown theo subcategory
  for (var i = 0; i < transactions.length; i++) {
    var transaction = transactions[i];
    var subCat = transaction.subCategory || "Chưa phân loại";
    
    if (!subCategoryBreakdown[subCat]) {
      subCategoryBreakdown[subCat] = { income: 0, expense: 0, count: 0 };
    }
    
    if (transaction.type === "ThuNhap") {
      totalIncome += transaction.amount;
      subCategoryBreakdown[subCat].income += transaction.amount;
    } else if (transaction.type === "ChiTieu") {
      totalExpense += transaction.amount;
      subCategoryBreakdown[subCat].expense += transaction.amount;
    }
    subCategoryBreakdown[subCat].count++;
  }
  
  // Hiển thị breakdown theo subcategory
  message += "<b>📊 Phân tích theo nhãn:</b>\n";
  for (var subCat in subCategoryBreakdown) {
    var data = subCategoryBreakdown[subCat];
    var net = data.income - data.expense;
    var netStr = net.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var icon = net >= 0 ? "💰" : "💸";
    
    message += "• " + subCat + " (" + data.count + " giao dịch): " + icon + " " + netStr + "\n";
  }
  
  var balance = totalIncome - totalExpense;
  var balanceStr = balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  var balanceIcon = balance >= 0 ? "💰" : "💸";
  
  message += "\n<b>" + balanceIcon + " Số dư hũ '" + allocation + "': " + balanceStr + "</b>\n";
  message += "<i>💵 Thu nhập: +" + totalIncome.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</i>\n";
  message += "<i>💸 Chi tiêu: -" + totalExpense.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</i>";
  
  var backKeyboard = {
    "inline_keyboard": [
      [
        {
          text: "📋 Chi tiết giao dịch",
          callback_data: "view_allocation_transactions_" + allocation
        }
      ],
      [
        {
          text: "⬅️ Chọn hũ khác",
          callback_data: "view_by_allocation"
        },
        {
          text: "🏺 Tổng tất cả hũ",
          callback_data: "getTotalAllocationBalances"
        }
      ]
    ]
  };
  
  editText(chatId, messageId, message, backKeyboard);
}

// Hiển thị chi tiết từng giao dịch trong allocation
function sendAllocationTransactionDetails(chatId, messageId, userId, allocation) {
  var transactions = getTransactionHistoryByAllocation(userId, allocation);
  
  if (transactions.length === 0) {
    var emptyMessage = "📭 <b>Hũ trống:</b> " + allocation + "\n\n" +
      "Chưa có giao dịch nào trong hũ này.";
    
    var emptyKeyboard = {
      "inline_keyboard": [
        [
          {
            text: "📊 Phân tích theo nhãn",
            callback_data: "view_allocation_detail_" + allocation
          }
        ],
        [
          {
            text: "⬅️ Chọn hũ khác",
            callback_data: "view_by_allocation"
          },
          {
            text: "🏺 Tổng tất cả hũ",
            callback_data: "getTotalAllocationBalances"
          }
        ]
      ]
    };
    
    editText(chatId, messageId, emptyMessage, emptyKeyboard);
    return;
  }
  
  var message = "🏺 <b>Chi tiết giao dịch - " + allocation + "</b>\n\n";
  var totalIncome = 0;
  var totalExpense = 0;
  
  // Sắp xếp theo date mới nhất trước
  transactions.sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });
  
  // Hiển thị tối đa 20 giao dịch gần nhất
  var displayCount = Math.min(transactions.length, 20);
  
  for (var i = 0; i < displayCount; i++) {
    var transaction = transactions[i];
    var formattedDate = formatDate(transaction.date);
    var formattedAmount = transaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var typeIcon = transaction.type === "ThuNhap" ? "💵" : "💸";
    var subCatDisplay = transaction.subCategory ? " • " + transaction.subCategory : "";
    
    message += transaction.stt + ". " + formattedDate + " " + typeIcon + "\n";
    message += "   " + transaction.description + "\n";
    message += "   " + formattedAmount + subCatDisplay + "\n\n";
    
    if (transaction.type === "ThuNhap") {
      totalIncome += transaction.amount;
    } else {
      totalExpense += transaction.amount;
    }
  }
  
  if (transactions.length > 20) {
    message += "<i>... và " + (transactions.length - 20) + " giao dịch khác\n\n</i>";
  }
  
  var balance = totalIncome - totalExpense;
  var balanceStr = balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  var balanceIcon = balance >= 0 ? "💰" : "💸";
  
  message += "<b>" + balanceIcon + " Tổng " + allocation + ": " + balanceStr + "</b>";
  
  var backKeyboard = {
    "inline_keyboard": [
      [
        {
          text: "📊 Phân tích theo nhãn",
          callback_data: "view_allocation_detail_" + allocation
        }
      ],
      [
        {
          text: "⬅️ Chọn hũ khác",
          callback_data: "view_by_allocation"
        },
        {
          text: "🏺 Tổng tất cả hũ",
          callback_data: "getTotalAllocationBalances"
        }
      ]
    ]
  };
  
  editText(chatId, messageId, message, backKeyboard);
}

// Tạo keyboard để chọn allocation xem chi tiết
function createAllocationViewKeyboard() {
  var keyboard = [];
  
  // Tạo buttons cho mỗi allocation, 2 buttons per row
  for (var i = 0; i < allocations.length; i += 2) {
    var row = [];
    
    row.push({
      text: "🏺 " + allocations[i],
      callback_data: "view_allocation_detail_" + allocations[i]
    });
    
    if (i + 1 < allocations.length) {
      row.push({
        text: "🏺 " + allocations[i + 1],
        callback_data: "view_allocation_detail_" + allocations[i + 1]
      });
    }
    
    keyboard.push(row);
  }
  
  // Thêm nút quay lại
  keyboard.push([{
    text: "⬅️ Quay lại",
    callback_data: "back_to_main_view"
  }]);
  
  return {
    "inline_keyboard": keyboard
  };
}

/**
 * OPTIMIZED: Only read Amount, Type, and SubCategory columns instead of entire sheet
 */
function getTotalSubCategoryBalances(userId) {
  const sheet = getSheet(userId);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return {}; // No data rows
  
  const balances = {};
  
  // Initialize balances cho tất cả subcategories
  for (const allocation in subCategories) {
    for (let i = 0; i < subCategories[allocation].length; i++) {
      const subCategory = subCategories[allocation][i];
      balances[subCategory] = 0;
    }
  }
  
  // Only read columns D, F, G (Amount, Type, SubCategory) from row 2 to last row
  const data = sheet.getRange(2, 4, lastRow - 1, 4).getValues(); // D, E, F, G columns
  
  // Đọc data từ sheet và tính tổng
  for (let i = 0; i < data.length; i++) {
    const amount = data[i][0];        // Amount ở cột D (index 0 trong range)
    const type = data[i][2];          // Type ở cột F (index 2 trong range)
    const subCategory = data[i][3];   // SubCategory ở cột G (index 3 trong range)
    
    if (subCategory && balances.hasOwnProperty(subCategory)) {
      if (type === TRANSACTION_TYPE.EXPENSE) {
        balances[subCategory] += amount;
      }
      // Chỉ tính chi tiêu, không tính thu nhập cho subcategories
    }
  }
  
  return balances;
}

/**
 * OPTIMIZED: Only read needed columns for specific allocation
 */
function getTotalSubCategoryBalancesByAllocation(userId, allocation) {
  const sheet = getSheet(userId);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return {}; // No data rows
  
  const balances = {};
  
  // Initialize balances cho subcategories của allocation này
  if (subCategories[allocation]) {
    for (let i = 0; i < subCategories[allocation].length; i++) {
      const subCategory = subCategories[allocation][i];
      balances[subCategory] = 0;
    }
  }
  
  // Only read columns D, E, F, G (Amount, Allocation, Type, SubCategory) from row 2 to last row
  const data = sheet.getRange(2, 4, lastRow - 1, 4).getValues(); // D, E, F, G columns
  
  // Đọc data và tính tổng cho allocation cụ thể
  for (let i = 0; i < data.length; i++) {
    const amount = data[i][0];           // Amount ở cột D (index 0 trong range)
    const itemAllocation = data[i][1];   // Allocation ở cột E (index 1 trong range)
    const type = data[i][2];             // Type ở cột F (index 2 trong range)
    const subCategory = data[i][3];      // SubCategory ở cột G (index 3 trong range)
    
    if (itemAllocation === allocation && subCategory && balances.hasOwnProperty(subCategory)) {
      if (type === TRANSACTION_TYPE.EXPENSE) {
        balances[subCategory] += amount;
      }
    }
  }
  
  return balances;
}

// Hiển thị tổng chi tiêu theo nhãn
function sendTotalSubCategorySummary(chatId, userId, messageId) {
  var subCategoryBalances = getTotalSubCategoryBalances(userId);
  var message = "🏷️ <b>Tổng chi tiêu theo nhãn:</b>\n\n";
  
  var totalByAllocation = {};
  
  // Tính tổng theo allocation để group hiển thị
  for (var allocation in subCategories) {
    totalByAllocation[allocation] = 0;
    var hasData = false;
    
    for (var i = 0; i < subCategories[allocation].length; i++) {
      var subCategory = subCategories[allocation][i];
      if (subCategoryBalances[subCategory] > 0) {
        hasData = true;
        totalByAllocation[allocation] += subCategoryBalances[subCategory];
      }
    }
    
    if (hasData) {
      message += "<b>📁 " + allocation + ":</b>\n";
      for (var i = 0; i < subCategories[allocation].length; i++) {
        var subCategory = subCategories[allocation][i];
        if (subCategoryBalances[subCategory] > 0) {
          message += "  • " + subCategory + ": " + 
            subCategoryBalances[subCategory].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "\n";
        }
      }
      message += "  <i>Tổng " + allocation + ": " + 
        totalByAllocation[allocation].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</i>\n\n";
    }
  }
  
  // Tính tổng toàn bộ
  var grandTotal = 0;
  for (var subCategory in subCategoryBalances) {
    grandTotal += subCategoryBalances[subCategory];
  }
  
  if (grandTotal > 0) {
    message += "<b>💸 Tổng tất cả nhãn: " + grandTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  } else {
    message = "Chưa có chi tiêu nào được gắn nhãn.";
  }
  
  var subCategoryMenu = {
    "inline_keyboard": [
      [
        {
          text: '📋 Xem lịch sử theo nhãn',
          callback_data: 'view_by_subcategory'
        }
      ],
      [
        {
          text: '📈 Tỉ lệ % nhãn',
          callback_data: 'percentage_subcategory'
        },
        {
          text: '📊 Biểu đồ nhãn',
          callback_data: 'chart_subcategory'
        }
      ],
      [
        {
          text: '🏺 Xem theo hũ',
          callback_data: 'getTotalAllocationBalances'
        },
        {
          text: '📊 Tổng quan',
          callback_data: 'currentbalance'
        }
      ]
    ]
  };
  
  // Sử dụng editText nếu có messageId, ngược lại dùng sendText
  if (messageId) {
    editText(chatId, messageId, message, subCategoryMenu);
  } else {
    sendText(chatId, message, subCategoryMenu);
  }
}

// Lấy lịch sử giao dịch theo subcategory
function getTransactionHistoryBySubCategory(userId, subCategory) {
  var sheet = getSheet(userId);
  var data = sheet.getDataRange().getValues();
  var transactions = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][6] === subCategory) { // SubCategory ở cột G (index 6)
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

// Tạo keyboard để chọn subcategory xem lịch sử
function createSubCategoryViewKeyboard() {
  var keyboard = [];
  
  for (var allocation in subCategories) {
    // Thêm header cho mỗi allocation
    keyboard.push([{
      text: "📁 " + allocation,
      callback_data: "view_allocation_subs_" + allocation
    }]);
    
    // Thêm các subcategories của allocation này
    var subCats = subCategories[allocation];
    for (var i = 0; i < subCats.length; i += 2) {
      var row = [];
      
      row.push({
        text: subCats[i],
        callback_data: "view_subcategory_" + subCats[i]
      });
      
      if (i + 1 < subCats.length) {
        row.push({
          text: subCats[i + 1],
          callback_data: "view_subcategory_" + subCats[i + 1]
        });
      }
      
      keyboard.push(row);
    }
  }
  
  // Thêm nút quay lại
  keyboard.push([{
    text: "⬅️ Quay lại",
    callback_data: "back_to_main_view"
  }]);
  
  return {
    "inline_keyboard": keyboard
  };
}

// Hiển thị lịch sử giao dịch theo subcategory
function sendTransactionHistoryBySubCategory(chatId, messageId, userId, subCategory) {
  var transactions = getTransactionHistoryBySubCategory(userId, subCategory);
  
  if (transactions.length === 0) {
    var emptyMessage = "🏷️ <b>Nhãn trống:</b> " + subCategory + "\n\n" +
      "Chưa có giao dịch nào với nhãn này.";
    
    var emptyKeyboard = {
      "inline_keyboard": [
        [
          {
            text: "⬅️ Chọn nhãn khác",
            callback_data: "view_by_subcategory"
          },
          {
            text: "🏷️ Tổng theo nhãn", 
            callback_data: "view_subcategory_summary"
          }
        ],
        [
          {
            text: "🏺 Xem theo hũ",
            callback_data: "getTotalAllocationBalances"
          },
          {
            text: "📊 Tổng quan",
            callback_data: "currentbalance"
          }
        ]
      ]
    };
    
    editText(chatId, messageId, emptyMessage, emptyKeyboard);
    return;
  }
  
  var message = "🏷️ <b>Lịch sử nhãn: " + subCategory + "</b>\n\n";
  var total = 0;
  
  for (var i = 0; i < transactions.length; i++) {
    var transaction = transactions[i];
    var formattedDate = formatDate(transaction.date);
    var formattedAmount = transaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    message += transaction.stt + ". " + formattedDate + "\n";
    message += "• " + transaction.description + "\n";
    message += "• " + formattedAmount + " (" + transaction.allocation + ")\n\n";
    
    if (transaction.type === "ChiTieu") {
      total += transaction.amount;
    }
  }
  
  message += "<b>💸 Tổng chi tiêu nhãn '" + subCategory + "': " + 
    total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "</b>";
  
  var backKeyboard = {
    "inline_keyboard": [
      [
        {
          text: "⬅️ Chọn nhãn khác",
          callback_data: "view_by_subcategory"
        },
        {
          text: "🏷️ Tổng theo nhãn", 
          callback_data: "view_subcategory_summary"
        }
      ]
    ]
  };
  
  editText(chatId, messageId, message, backKeyboard);
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
xemnhan - Xem chi tiêu theo nhãn
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
    "🏷️ <code>/xemnhan</code> - Xem chi tiêu theo nhãn\n" +
    "📋 <code>/lichsu</code> - Xem lịch sử giao dịch\n\n" +
    
    "📈 <b>PHÂN TÍCH & BIỂU ĐỒ:</b>\n" +
    "📊 <code>/tile</code> - Menu xem tỉ lệ % (hũ & nhãn)\n" +
    "� <code>/bieudo</code> - Menu xem biểu đồ (hũ & nhãn)\n\n" +
    
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


function sendTotalIncomeSummary(context) {
  const totalIncome = getTotalAmountByType(context.chatId, TRANSACTION_TYPE.INCOME);
  const totalExpenses = getTotalAmountByType(context.chatId, TRANSACTION_TYPE.EXPENSE);
  const currentBalance = getCurrentBalance(context.chatId);

  let message = `💰 Tổng thu nhập của bạn là: ${formatNumberWithSeparator(totalIncome)}đ\n`;
  message += `💹 Số tiền hiện tại của bạn là: ${formatNumberWithSeparator(currentBalance)}đ\n`;

  const menu = {
    inline_keyboard: [
      [
        { text: '💸 Xem Tổng Chi Tiêu', callback_data: 'totalchi' },
        { text: '🏺 Xem Chi Tiết Các Hũ', callback_data: 'getTotalAllocationBalances' }
      ]
    ]
  };

  sendText(context.chatId, message, menu);
}

/**
 * OPTIMIZED: Only read Amount (D) and Type (F) columns instead of entire sheet
 */
function getTotalAmountByType(userId, type) {
  const sheet = getSheet(userId);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return 0; // No data rows
  
  // Only read columns D and F (Amount and Type) from row 2 to last row
  const data = sheet.getRange(2, 4, lastRow - 1, 1).getValues(); // Amount column (D)
  const typeData = sheet.getRange(2, 6, lastRow - 1, 1).getValues(); // Type column (F)
  
  let total = 0;
  for (let i = 0; i < data.length; i++) {
    if (typeData[i][0] === type) {
      total += data[i][0];
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




function processVoiceMessage(fileId, context) {
  var telegramUrl = "https://api.telegram.org/bot" + token;

  
  var getFileUrl = telegramUrl + "/getFile?file_id=" + fileId;
  var getFileResponse = UrlFetchApp.fetch(getFileUrl);
  var fileInfo = JSON.parse(getFileResponse.getContentText());
  if (!fileInfo.ok) {
    Logger.log("Không lấy được file từ Telegram.");
    sendText(context.chatId, "Xin lỗi, không thể xử lý tin nhắn voice của bạn.");
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
    sendText(context.chatId, "Lỗi khi xử lý file voice.");
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
    sendText(context.chatId, "Upload file voice thất bại.");
    return;
  }
  Logger.log("File URI: " + fileUri);

  
  var generateUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey;
  var generatePayload = JSON.stringify({
    contents: [{
      parts: [
        { "text": 'Bạn là một AI Chi tiêu. Hãy trích xuất thông tin về số tiền, nội dung và loại giao dịch (type luôn đặt là: Thu nhập hoặc Chi tiêu) từ giọng nói. Lưu ý: nhận diện các biểu thức rút gọn và các từ lóng/địa phương liên quan đến tiền tệ. Ví dụ: "củ" tương đương với "triệu", "k hoặc ca hoặc ka" tương đương với "trăm", "nghìn" hoặc "ngàn" tương đương với "nghìn", "ty" hoặc "tỉ" tương đương với "tỷ", "lít" tương đương với "trăm" (các từ rút gọn này chỉ áp dụng khi đi kèm với giá tiền). Nếu không nghe rõ hoặc không nhận diện được số tiền, hãy trả về rỗng {}. Tuyệt đối không được tự suy đoán hay chế thông tin.' },
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

        
        recordTransactionsFromAI(context.chatId, transactions, context.chatType, context.userName);
      } else {
        sendText(context.chatId, "Không nhận được nội dung phản hồi từ hệ thống AI.");
      }
    } else {
      sendText(context.chatId, "AI không nghe rõ được Voice, vui lòng thử lại.");
    }
  } catch (err) {
    Logger.log("Lỗi khi xử lý phản hồi: " + err);
    sendText(context.chatId, "AI không nghe rõ được Voice, vui lòng thử lại.");
  }
}

function recordTransactionsFromAI(chatId, transactions, chatType = 'private', senderName = null) {
  
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
    
    
    var sequenceNumber = addTransactionData(userId, date, description, amount, allocation, transactionType, "", chatType, senderName);
    
    
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

// =================== NEW REFACTORED HANDLER FUNCTIONS ===================

/**
 * Main entry point - Router pattern (NEW VERSION)
 */
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    Logger.log("=== DOPOST DEBUG ===");
    Logger.log("Request contents: " + JSON.stringify(contents));

    if (contents.callback_query) {
      const chatType = contents.callback_query.message.chat.type;
      handleCallbackQuery({ ...contents.callback_query, chatType: chatType });
    } else if (contents.message) {
      const chatType = contents.message.chat.type;
      handleMessage({ ...contents.message, chatType: chatType });
    }
  } catch (err) {
    Logger.log("Error in doPost: " + err.toString());
  }
}

/**
 * Handle all callback queries with improved context pattern
 */
function handleCallbackQuery(callbackQuery) {
  const context = {
    chatId: callbackQuery.from.id, // User ID for temp transaction storage
    groupChatId: callbackQuery.message.chat.id, // Group ID for sending messages
    userName: callbackQuery.from.first_name,
    data: callbackQuery.data,
    messageId: callbackQuery.message.message_id,
    chatType: callbackQuery.chatType // Add chatType to context
  };
  
  Logger.log("CALLBACK QUERY: " + context.data + " from user " + context.chatId + " in chat type: " + context.chatType + " group: " + context.groupChatId);

  // Route to specific handlers based on callback data
  if (context.data === 'connect_email') {
    processConnectEmail(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.BANK)) {
    processBankSelection(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.SUBCATEGORY) || context.data.startsWith(CALLBACK_PREFIX.SUB)) {
    processSubcategorySelection(context);
  } else if (context.data === 'edit_transaction' || context.data.startsWith(CALLBACK_PREFIX.EDIT_TRANSACTION)) {
    processEditTransaction(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.EDIT_ALLOCATION) || context.data.startsWith(CALLBACK_PREFIX.EDIT_ALLOC)) {
    processEditAllocation(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.EDIT_SUBCATEGORY) || context.data.startsWith(CALLBACK_PREFIX.EDIT_SUB)) {
    processEditSubcategory(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.ALLOCATION)) {
    processAllocationSelection(context);
  } else if (context.data === 'back_to_allocation') {
    processBackToAllocation(context);
  } else if (context.data === 'cancel_new') {
    processCancelNew(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.CANCEL_EDIT)) {
    processCancelEdit(context);
  } else if (context.data === 'totalchi') {
    processShowTotalExpenses(context);
  } else if (context.data === 'totalthunhap') {
    processShowTotalIncome(context);
  } else if (context.data === 'currentbalance') {
    processShowCurrentBalance(context);
  } else if (context.data === 'getTotalAllocationBalances') {
    processShowAllocationBalances(context);
  } else if (context.data === 'show_percentage_menu') {
    sendPercentageSelectionMenu(context.chatId, null, context.messageId);
  } else if (context.data === 'show_chart_menu') {
    sendChartSelectionMenu(context.chatId, null, context.messageId);
  } else if (context.data === 'percentage_allocation_expense') {
    sendAllocationPercentages(context.chatId, null, context.messageId);
  } else if (context.data === 'percentage_allocation_income') {
    sendIncomePercentages(context.chatId, null, context.messageId);
  } else if (context.data === 'percentage_subcategory') {
    sendSubCategoryPercentages(context.chatId, null, context.messageId);
  } else if (context.data === 'chart_allocation_expense') {
    sendAllocationChart(context.chatId, null, context.messageId);
  } else if (context.data === 'chart_allocation_income') {
    sendIncomeChart(context.chatId, null, context.messageId);
  } else if (context.data === 'chart_subcategory') {
    sendSubCategoryChart(context.chatId, null, context.messageId);
  } else if (context.data === 'history') {
    processTransactionHistoryWithPagination(context, 1); // Default to page 1
  } else if (context.data.startsWith('history_page_')) {
    const page = parseInt(context.data.replace('history_page_', ''));
    processTransactionHistoryWithPagination(context, page);
  } else if (context.data === 'view_subcategory_summary') {
    sendTotalSubCategorySummary(context.chatId, null, context.messageId);
  } else if (context.data === 'view_by_subcategory') {
    processViewBySubcategory(context);
  } else if (context.data === 'view_by_allocation') {
    processViewByAllocation(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.VIEW_ALLOCATION_DETAIL)) {
    processViewAllocationDetail(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.VIEW_ALLOCATION_TRANSACTIONS)) {
    processViewAllocationTransactions(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.VIEW_SUBCATEGORY)) {
    processViewSubcategory(context);
  } else if (context.data.startsWith(CALLBACK_PREFIX.VIEW_ALLOCATION_SUBS)) {
    processViewAllocationSubs(context);
  } else if (context.data === 'back_to_main_view') {
    processBackToMainView(context);
  } else if (context.data === 'export_this_month') {
    processExportRequest(context, 'this_month');
  } else if (context.data === 'export_last_month') {
    processExportRequest(context, 'last_month');
  } else if (context.data === 'export_all_time') {
    processExportRequest(context, 'all_time');
  } else if (context.data === 'view_budget_status') {
    processViewBudgetStatus(context);
  } else if (context.data === 'add_edit_budget') {
    processAddEditBudget(context);
  } else if (context.data === 'delete_budget') {
    processDeleteBudget(context);
  } else {
    Logger.log("Unhandled callback: " + context.data);
  }
}

/**
 * Handle all text messages and commands
 */
/**
 * Handle all text messages and commands - IMPROVED with Context & Unified Parser
 */
function handleMessage(message) {
  const context = {
    chatId: message.chat.id,
    userName: message.from.first_name,
    text: message.text,
    message: message, // Pass full message object if needed
    chatType: message.chat.type // Add chatType to context
  };

  Logger.log("MESSAGE: " + context.text + " from user " + context.chatId + " in chat type: " + context.chatType);

  // Handle voice messages with loading indicator
  if (message.voice) {
    sendLoadingMessage(context.chatId, "xử lý tin nhắn voice");
    // Schedule the long-running task to run asynchronously
    ScriptApp.newTrigger('triggerProcessVoiceMessage')
      .timeBased()
      .after(1000) // Run after 1 second
      .create();
    
    // Store context and fileId temporarily for the triggered function to access
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty('VOICE_MESSAGE_FILE_ID', message.voice.file_id);
    properties.setProperty('VOICE_MESSAGE_CONTEXT', JSON.stringify(context));

    return;
  }

  // Handle email validation
  if (isValidEmail(context.text)) {
    saveEmailToSheet(context.chatId, context.text);
    sendBankOptions(context.chatId);
    return;
  }

  // Route commands and text
  if (context.text === '/start') {
    processStartCommand(context);
  } else if (context.text === '/startgroup') {
    processStartGroupCommand(context);
  } else if (context.text === '/menu') {
    processMenuCommand(context);
  } else if (context.text === '/help' || context.text === '/commands') {
    sendCommandsList(context.chatId);
  } else if (context.text === '/tongtien') {
    processShowTotalMoney(context.chatId);
  } else if (context.text === '/tongchi') {
    processShowTotalExpenseCommand(context);
  } else if (context.text === '/tongthunhap') {
    sendTotalIncomeSummary(context);
  } else if (context.text === '/xemhu') {
    sendLoadingMessage(context.chatId, "tính toán số dư các hũ");
    sendTotalPhanboSummary(context);
  } else if (context.text === '/xemnhan') {
    sendLoadingMessage(context.chatId, "tính toán chi tiêu theo nhãn");
    sendTotalSubCategorySummary(context);
  } else if (context.text === '/tile' || context.text === '/tylе') {
    sendPercentageSelectionMenu(context.chatId, context.chatId);
  } else if (context.text === '/biеudo' || context.text === '/chart') {
    sendChartSelectionMenu(context.chatId, context.chatId);
  } else if (context.text === '/lichsu') {
    processTransactionHistoryCommand(context);
  } else if (context.text.startsWith('/chi ')) {
    processQuickExpenseCommand(context);
  } else if (context.text.startsWith('/thu ')) {
    processQuickIncomeCommand(context);
  } else if (context.text.startsWith('/del')) {
    processDeleteCommand(context.chatId, context.text);
  } else if (context.text === '/xoathunhap') {
    processDeleteIncome(context.chatId);
  } else if (context.text === '/xoachitieu') {
    processDeleteExpenses(context.chatId);
  } else if (context.text === '/xoatatca') {
    processDeleteAll(context.chatId);
  } else if (context.text.startsWith("/history")) {
    processHistoryCommand(context.chatId, context.text);
  } else if (context.text === '/export') {
    processExportCommand(context);
  } else if (context.text === '/budget' || context.text === '/ngansach') {
    processBudgetCommand(context);
  } else if (context.text.includes(" + ") || context.text.includes(" - ")) {
    processTransactionText(context);
  } else {
    processDefaultMessage(context);
  }
}

// =================== UX HELPERS ===================

/**
 * Send loading message for long-running operations
 */
function sendLoadingMessage(chatId, operation = "xử lý") {
  sendText(chatId, "⏳ Đang " + operation + ", vui lòng chờ...");
}

/**
 * Edit loading message to show result
 */
function updateLoadingMessage(chatId, messageId, result) {
  if (messageId) {
    editText(chatId, messageId, result, null);
  } else {
    sendText(chatId, result);
  }
}

/**
 * IMPROVED PAGINATION: Create keyboard for transaction history navigation
 */
function createPaginationKeyboard(currentPage, totalPages, commandPrefix = "page") {
  if (totalPages <= 1) return null;
  
  const keyboard = [];
  const buttonsRow = [];
  
  // Previous page button
  if (currentPage > 1) {
    buttonsRow.push({
      text: "⬅️ Trang trước",
      callback_data: commandPrefix + "_" + (currentPage - 1)
    });
  }
  
  // Page indicator
  buttonsRow.push({
    text: `📄 ${currentPage}/${totalPages}`,
    callback_data: "page_info" // Non-functional, just for display
  });
  
  // Next page button  
  if (currentPage < totalPages) {
    buttonsRow.push({
      text: "Trang sau ➡️",
      callback_data: commandPrefix + "_" + (currentPage + 1)
    });
  }
  
  keyboard.push(buttonsRow);
  
  // Back to main menu button
  keyboard.push([{
    text: "🏠 Về menu chính",
    callback_data: "back_to_main_view"
  }]);
  
  return {
    "inline_keyboard": keyboard
  };
}

// =================== OPTIMIZED DATABASE FUNCTIONS ===================

/**
 * OPTIMIZED: Get transaction history page directly from database
 * Avoids loading all transactions for pagination - much faster for large datasets
 * @param {string} userId
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of transactions per page
 * @returns {{transactions: Array, totalTransactions: number}}
 */
function getTransactionHistoryPage(userId, page, pageSize) {
  try {
    const sheet = getSheet(userId);
    const lastRow = sheet.getLastRow();
    const totalTransactions = lastRow > 1 ? lastRow - 1 : 0;
    
    if (totalTransactions === 0) {
      return { transactions: [], totalTransactions: 0 };
    }

    // Calculate range for current page
    const startIndex = (page - 1) * pageSize;
    
    // Get ALL data first for sorting (still need to sort by date)
    // Note: This is a trade-off - we need sorting but want to limit data fetching
    const allData = sheet.getRange("A2:G" + lastRow).getValues();
    
    // Sort by date (column 1, index 1) - newest first
    allData.sort((a, b) => new Date(b[1]) - new Date(a[1]));
    
    // Now get the page slice
    const endIndex = Math.min(startIndex + pageSize, totalTransactions);
    const pageTransactions = allData.slice(startIndex, endIndex);

    return { 
      transactions: pageTransactions, 
      totalTransactions: totalTransactions 
    };
    
  } catch (err) {
    Logger.log("Error in getTransactionHistoryPage: " + err.toString());
    return { transactions: [], totalTransactions: 0 };
  }
}

// =================== TRANSACTION PARSER ===================

/**
 * ENHANCED PARSER: Phân tích cú pháp với smart suggestions
 * Hỗ trợ nhiều định dạng: /chi, /thu, "nội dung + số tiền", "nội dung - số tiền"
 * @param {string} text - Chuỗi văn bản đầu vào
 * @param {string} defaultType - Loại giao dịch mặc định (cho /chi, /thu)
 * @returns {object} - Object chứa {description, amount, type, success, suggestion}
 */
function parseTransactionText(text, defaultType = null) {
  try {
    let type, delimiter, parts;
    
    // Format 1: "nội dung + số tiền" (thu nhập)
    if (text.includes(' + ')) {
      type = TRANSACTION_TYPE.INCOME;
      delimiter = ' + ';
      parts = text.split(delimiter);
    } 
    // Format 2: "nội dung - số tiền" (chi tiêu)
    else if (text.includes(' - ')) {
      type = TRANSACTION_TYPE.EXPENSE;
      delimiter = ' - ';
      parts = text.split(delimiter);
    } 
    // Format 3: "/chi nội dung số tiền" hoặc "/thu nội dung số tiền"
    else {
      const lastSpaceIndex = text.lastIndexOf(' ');
      if (lastSpaceIndex === -1) {
        return { success: false, suggestion: generateSmartSuggestion(text, defaultType) };
      }
      
      parts = [
        text.substring(0, lastSpaceIndex).trim(),
        text.substring(lastSpaceIndex + 1).trim()
      ];
      type = defaultType; // Sử dụng type được truyền vào từ command
    }

    if (parts.length < 2) {
      return { success: false, suggestion: generateSmartSuggestion(text, defaultType) };
    }

    const description = parts[0].trim();
    const amountStr = parts[1].trim();

    // Validation: Kiểm tra định dạng số
    if (!amountStr.match(/^\d+$/)) {
      return { 
        success: false, 
        suggestion: generateAmountSuggestion(text, description, amountStr, defaultType) 
      };
    }
    
    const amount = parseInt(amountStr);
    if (amount <= 0) {
      return { 
        success: false, 
        suggestion: "❌ Số tiền phải lớn hơn 0. Vui lòng nhập lại!" 
      };
    }

    // Validation: Kiểm tra description không rỗng
    if (!description || description.length === 0) {
      return { 
        success: false, 
        suggestion: "❌ Vui lòng nhập mô tả cho giao dịch!" 
      };
    }

    return { 
      description, 
      amount, 
      type,
      success: true
    };
    
  } catch (err) {
    Logger.log("Error in parseTransactionText: " + err.toString());
    return { 
      success: false, 
      suggestion: "❌ Đã có lỗi xảy ra khi xử lý. Vui lòng thử lại!" 
    };
  }
}

/**
 * SMART SUGGESTION: Generate intelligent suggestions for common input mistakes
 */
function generateSmartSuggestion(text, defaultType) {
  try {
    // Case 1: Missing space around + or -
    if (text.includes('+') && !text.includes(' + ')) {
      const corrected = text.replace('+', ' + ');
      return `💡 <b>Gợi ý thông minh:</b> Có phải bạn muốn nhập:\n<code>${corrected}</code>\n\n⚠️ <b>Lưu ý:</b> Cần có dấu cách trước và sau dấu +/-`;
    }
    
    if (text.includes('-') && !text.includes(' - ')) {
      const corrected = text.replace('-', ' - ');
      return `💡 <b>Gợi ý thông minh:</b> Có phải bạn muốn nhập:\n<code>${corrected}</code>\n\n⚠️ <b>Lưu ý:</b> Cần có dấu cách trước và sau dấu +/-`;
    }
    
    // Case 2: Number at beginning instead of end
    const numberAtStart = text.match(/^(\d+)\s+(.+)$/);
    if (numberAtStart && defaultType) {
      const amount = numberAtStart[1];
      const description = numberAtStart[2];
      const typeText = defaultType === TRANSACTION_TYPE.EXPENSE ? 'chi' : 'thu';
      return `💡 <b>Gợi ý thông minh:</b> Có phải bạn muốn nhập:\n<code>/${typeText} ${description} ${amount}</code>\n\n⚠️ <b>Lưu ý:</b> Số tiền nên ở cuối`;
    }
    
    // Case 3: Missing space before amount
    const missingSpace = text.match(/^(.+?)(\d+)$/);
    if (missingSpace && defaultType) {
      const description = missingSpace[1].trim();
      const amount = missingSpace[2];
      const typeText = defaultType === TRANSACTION_TYPE.EXPENSE ? 'chi' : 'thu';
      return `💡 <b>Gợi ý thông minh:</b> Có phải bạn muốn nhập:\n<code>/${typeText} ${description} ${amount}</code>\n\n⚠️ <b>Lưu ý:</b> Cần có dấu cách trước số tiền`;
    }
    
    // Default suggestion based on type
    if (defaultType === TRANSACTION_TYPE.EXPENSE) {
      return `❌ <b>Sai định dạng!</b>\n\n✅ <b>Cách sử dụng đúng:</b>\n• <code>/chi ăn sáng 25000</code>\n• <code>/chi cafe 15000</code>\n• <code>ăn trưa - 50000</code>\n\n📝 <b>Lưu ý:</b> Mô tả + dấu cách + số tiền`;
    } else if (defaultType === TRANSACTION_TYPE.INCOME) {
      return `❌ <b>Sai định dạng!</b>\n\n✅ <b>Cách sử dụng đúng:</b>\n• <code>/thu lương 10000000</code>\n• <code>/thu bonus 500000</code>\n• <code>thưởng + 1000000</code>\n\n📝 <b>Lưu ý:</b> Mô tả + dấu cách + số tiền`;
    } else {
      return `❌ <b>Sai định dạng!</b>\n\n✅ <b>Cách sử dụng đúng:</b>\n• <code>ăn sáng - 25000</code> (chi tiêu)\n• <code>thưởng + 1000000</code> (thu nhập)\n\n📝 <b>Lưu ý:</b> Có dấu cách trước và sau dấu +/-`;
    }
    
  } catch (err) {
    Logger.log("Error in generateSmartSuggestion: " + err.toString());
    return "❌ Định dạng không hợp lệ. Vui lòng thử lại!";
  }
}

/**
 * AMOUNT SUGGESTION: Handle common amount format mistakes
 */
function generateAmountSuggestion(originalText, description, amountStr, defaultType) {
  try {
    // Case 1: Amount has commas or dots
    if (amountStr.includes(',') || amountStr.includes('.')) {
      const cleanAmount = amountStr.replace(/[,\.]/g, '');
      if (cleanAmount.match(/^\d+$/)) {
        const typeText = defaultType === TRANSACTION_TYPE.EXPENSE ? 'chi' : 'thu';
        const corrected = defaultType ? `/${typeText} ${description} ${cleanAmount}` : 
                         (originalText.includes('+') ? `${description} + ${cleanAmount}` : `${description} - ${cleanAmount}`);
        return `💡 <b>Gợi ý thông minh:</b> Có phải bạn muốn nhập:\n<code>${corrected}</code>\n\n⚠️ <b>Lưu ý:</b> Số tiền không được có dấu phẩy hoặc chấm`;
      }
    }
    
    // Case 2: Amount has currency symbols
    const currencyMatch = amountStr.match(/(\d+).*?[đvnd₫]/i);
    if (currencyMatch) {
      const cleanAmount = currencyMatch[1];
      const typeText = defaultType === TRANSACTION_TYPE.EXPENSE ? 'chi' : 'thu';
      const corrected = defaultType ? `/${typeText} ${description} ${cleanAmount}` : 
                       (originalText.includes('+') ? `${description} + ${cleanAmount}` : `${description} - ${cleanAmount}`);
      return `💡 <b>Gợi ý thông minh:</b> Có phải bạn muốn nhập:\n<code>${corrected}</code>\n\n⚠️ <b>Lưu ý:</b> Chỉ nhập số, không cần ký hiệu tiền tệ`;
    }
    
    // Case 3: Non-numeric characters mixed with numbers
    const numbersOnly = amountStr.replace(/\D/g, '');
    if (numbersOnly.length > 0) {
      const typeText = defaultType === TRANSACTION_TYPE.EXPENSE ? 'chi' : 'thu';
      const corrected = defaultType ? `/${typeText} ${description} ${numbersOnly}` : 
                       (originalText.includes('+') ? `${description} + ${numbersOnly}` : `${description} - ${numbersOnly}`);
      return `💡 <b>Gợi ý thông minh:</b> Có phải bạn muốn nhập:\n<code>${corrected}</code>\n\n⚠️ <b>Lưu ý:</b> Số tiền chỉ được chứa các chữ số`;
    }
    
    return `❌ <b>Số tiền không hợp lệ:</b> <code>${amountStr}</code>\n\n✅ <b>Ví dụ đúng:</b> 25000, 1500000, 50000\n\n⚠️ <b>Lưu ý:</b> Chỉ nhập số nguyên, không có dấu phẩy/chấm`;
    
  } catch (err) {
    Logger.log("Error in generateAmountSuggestion: " + err.toString());
    return "❌ Số tiền không hợp lệ. Vui lòng nhập lại!";
  }
}

/**
 * UNIFIED PROCESS: Bắt đầu quy trình ghi nhận giao dịch sau khi parse thành công
 * @param {number} chatId - ID của chat
 * @param {object} transactionData - Dữ liệu giao dịch đã parse
 * @param {number} messageId - ID tin nhắn để edit (optional)
 */
function initiateTransactionProcess(chatId, transactionData, messageId = null, chatType = 'private', senderName = null, userId = null) {
  try {
    // Use userId if provided (for group chat), otherwise use chatId (for private chat)
    const actualUserId = userId || chatId;
    
    const tempTransaction = {
      userId: actualUserId, // Use the correct user ID
      chatId: chatId, // Keep chatId for sending messages
      date: new Date().toISOString().split('T')[0],
      description: transactionData.description,
      amount: transactionData.amount,
      allocation: "Chi tiêu thiết yếu", // Default allocation
      type: transactionData.type,
      chatType: chatType, // Add chatType to tempTransaction
      senderName: senderName // Add senderName to tempTransaction
    };
    
    // Lưu transaction tạm vào cache với actualUserId
    saveTempTransaction(actualUserId, tempTransaction);

    // Tạo keyboard để chọn subcategory
    const allocationIndex = allocations.indexOf(tempTransaction.allocation);
    const keyboard = createSubCategoryKeyboard(tempTransaction.allocation, false, null, allocationIndex);
    
    // Tạo thông báo cho người dùng
    const typeText = transactionData.type === TRANSACTION_TYPE.INCOME ? 'Thu nhập' : 'Chi tiêu';
    let message = `⚡ <b>${typeText} nhanh:</b> ${transactionData.description} ` +
      `<code>${transactionData.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</code>` +
      ` vào hũ <b>${tempTransaction.allocation}</b>.\n\n` +
      `🏷️ Vui lòng chọn nhãn cụ thể:`;
    
    // Add sender name for group chats
    if (chatType === 'group' || chatType === 'supergroup') {
      message = "👤 " + senderName + "\n" + message;
    }
    
    // Gửi hoặc edit message
    if (messageId) {
      editText(chatId, messageId, message, keyboard);
    } else {
      sendText(chatId, message, keyboard);
    }
    
  } catch (err) {
    Logger.log("Error in initiateTransactionProcess: " + err.toString());
    const errorMessage = "❌ Đã có lỗi xảy ra khi xử lý giao dịch. Vui lòng thử lại.";
    
    if (messageId) {
      editText(chatId, messageId, errorMessage, null);
    } else {
      sendText(chatId, errorMessage);
    }
  }
}

// =================== CALLBACK HANDLERS ===================

/**
 * OPTIMIZED: Transaction history with database-level pagination
 */
function processTransactionHistoryWithPagination(context, page = 1) {
  try {
    // Show loading message immediately
    if (context.messageId) {
      editText(context.chatId, context.messageId, "⏳ Đang tải lịch sử giao dịch...", null);
    }
    
    const pageSize = 10; // 10 transactions per page
    
    // ✨ OPTIMIZED: Get only the page we need from database
    const historyData = getTransactionHistoryPage(context.chatId, page, pageSize);
    const { transactions, totalTransactions } = historyData;
    
    if (!transactions || transactions.length === 0) {
      const message = totalTransactions === 0 ? 
        "📭 <b>Chưa có giao dịch nào!</b>\n\n" +
        "Hãy bắt đầu ghi nhận thu chi của bạn bằng cách:\n" +
        "• Gõ <code>/chi ăn sáng 25000</code> cho chi tiêu\n" +
        "• Gõ <code>/thu lương 10000000</code> cho thu nhập" :
        `📭 <b>Trang ${page} không có dữ liệu!</b>\n\nVui lòng chọn trang khác.`;
      
      if (context.messageId) {
        editText(context.chatId, context.messageId, message, null);
      } else {
        sendText(context.chatId, message);
      }
      return;
    }
    
    const totalPages = Math.ceil(totalTransactions / pageSize);
    
    // Build message with pagination info
    let message = `📋 <b>Lịch sử giao dịch (Trang ${page}/${totalPages})</b>\n`;
    message += `📊 Tổng: ${totalTransactions} giao dịch\n\n`;
    
    // Calculate totals for this page
    let pageThuNhap = 0;
    let pageChiTieu = 0;
    
    transactions.forEach((transaction, index) => {
      const sequenceNumber = transaction[0];
      const date = formatDate(transaction[1]);
      const description = transaction[2];
      const amount = transaction[3];
      const allocation = transaction[4];
      const type = transaction[5];
      const subCategory = transaction[6] || '';
      
      const emoji = type === TRANSACTION_TYPE.INCOME ? '💰' : '💸';
      const formattedAmount = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      message += `${emoji} <b>#${sequenceNumber}</b> - ${description}\n`;
      message += `💵 ${formattedAmount} | 🏺 ${allocation}`;
      if (subCategory) {
        message += ` | 🏷️ ${subCategory}`;
      }
      message += `\n📅 ${date}\n\n`;
      
      if (type === TRANSACTION_TYPE.INCOME) {
        pageThuNhap += amount;
      } else {
        pageChiTieu += amount;
      }
    });
    
    // Add page summary
    message += `📈 <b>Trang ${page} - Tóm tắt:</b>\n`;
    message += `💰 Thu nhập: ${pageThuNhap.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n`;
    message += `💸 Chi tiêu: ${pageChiTieu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}\n`;
    message += `💹 Chênh lệch: ${(pageThuNhap - pageChiTieu).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    
    // Create pagination keyboard
    const keyboard = createPaginationKeyboard(page, totalPages, 'history_page');
    
    // Send or edit message
    if (context.messageId) {
      editText(context.chatId, context.messageId, message, keyboard);
    } else {
      sendText(context.chatId, message, keyboard);
    }
    
  } catch (err) {
    Logger.log("Error in processTransactionHistoryWithPagination: " + err.toString());
    const errorMessage = "❌ Đã có lỗi xảy ra khi tải lịch sử giao dịch. Vui lòng thử lại sau.";
    
    if (context.messageId) {
      editText(context.chatId, context.messageId, errorMessage, null);
    } else {
      sendText(context.chatId, errorMessage);
    }
  }
}

function processConnectEmail(context) {
  sendText(context.chatId, "Vui lòng nhập email của bạn:");
}

function processBankSelection(context) {
  try {
    const bankName = context.data.split('_')[1]; 
    saveBankToSheet(context.chatId, bankName); 
    sendText(context.chatId, "Ngân hàng của bạn đã được kết nối thành công: " + bankName);
  } catch (err) {
    Logger.log("Error in processBankSelection: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi kết nối ngân hàng. Vui lòng thử lại.");
  }
}

function processSubcategorySelection(context) {
  try {
    let allocation = '';
    let subCategory = '';
    
    if (context.data.startsWith(CALLBACK_PREFIX.SUB)) {
      // Format mới ngắn: sub_0_1 (allocationIndex_subIndex)
      const parts = context.data.split('_');
      if (parts.length >= 3) {
        const allocationIndex = parseInt(parts[1]);
        const subCategoryIndex = parseInt(parts[2]);
        
        if (!isNaN(allocationIndex) && !isNaN(subCategoryIndex) && allocationIndex >= 0 && subCategoryIndex >= 0) {
          allocation = allocations[allocationIndex];
          if (allocation && subCategories[allocation] && subCategories[allocation][subCategoryIndex]) {
            subCategory = subCategories[allocation][subCategoryIndex];
          }
        }
      }
    } else {
      // Format cũ dài: subcategory_AllocationName_SubCategoryName
      const parts = context.data.split('_');
      allocation = parts[1];
      subCategory = parts.slice(2).join('_');
    }
    
    // Validation: Đảm bảo allocation và subCategory được parse thành công
    if (!allocation || !subCategory) {
      const targetChatId = context.groupChatId || context.chatId; // Use group chat for groups, user chat for private
      editText(targetChatId, context.messageId, "❌ Lỗi xử lý lựa chọn. Vui lòng thử lại.", null);
      return;
    }
    
    // Lấy thông tin giao dịch tạm từ cache (sử dụng user ID)
    const tempTransaction = getTempTransaction(context.chatId);
    if (tempTransaction) {
      // Use the correct entity ID for transaction storage
      const entityId = tempTransaction.chatId || context.groupChatId || context.chatId;
      
      // Lưu giao dịch với subcategory và lấy sequence number
      const sequenceNumber = addTransactionData(
        entityId, 
        tempTransaction.date, 
        tempTransaction.description, 
        tempTransaction.amount, 
        allocation, 
        tempTransaction.type,
        subCategory,
        context.chatType,
        context.userName
      );
      
      // Lưu thông tin giao dịch vừa tạo để có thể chỉnh sửa
      const transactionId = 'tx_' + Date.now(); // Unique ID cho transaction
      const transactionInfo = {
        userId: context.chatId,
        transactionId: transactionId,
        date: tempTransaction.date,
        description: tempTransaction.description,
        amount: tempTransaction.amount,
        allocation: allocation,
        type: tempTransaction.type,
        subCategory: subCategory,
        sequenceNumber: sequenceNumber, // Thêm STT vào transaction info
        rowIndex: getLastRowIndex(entityId) // Lấy index của row vừa thêm
      };
      saveTransactionForEdit(context.chatId, transactionInfo, transactionId);
      
      // Xóa cache tạm
      clearTempTransaction(context.chatId);
      
      // Thông báo thành công với keyboard chỉnh sửa (bao gồm STT)
      const typeText = tempTransaction.type === TRANSACTION_TYPE.INCOME ? "thu nhập" : "chi tiêu";
      const editKeyboard = createEditKeyboard(transactionId);
      
      // Use the correct chat ID for sending message
      const targetChatId = context.groupChatId || context.chatId; // Use group chat for groups, user chat for private
      
      let successMessage = "✅ Giao dịch #" + sequenceNumber + " - Đã ghi nhận " + typeText + ": " + tempTransaction.description + 
        " " + tempTransaction.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
        " vào hũ " + allocation + " với nhãn " + subCategory;
      
      // Add sender name for group chats
      if (context.chatType === 'group' || context.chatType === 'supergroup') {
        successMessage = "👤 " + context.userName + "\n" + successMessage;
      }
      
      editText(targetChatId, context.messageId, successMessage, editKeyboard
      );
    } else {
      // No temp transaction found
      const targetChatId = context.groupChatId || context.chatId;
      editText(targetChatId, context.messageId, "❌ Không tìm thấy giao dịch tạm. Vui lòng thử lại.", null);
    }
  } catch (err) {
    Logger.log("Error in processSubcategorySelection: " + err.toString());
    const targetChatId = context.groupChatId || context.chatId;
    editText(targetChatId, context.messageId, "❌ Đã có lỗi xảy ra khi xử lý lựa chọn. Vui lòng thử lại.", null);
  }
}

function processEditTransaction(context) {
  try {
    Logger.log("DEBUG: edit_transaction callback received for user: " + context.chatId);
    const transactionId = context.data.startsWith(CALLBACK_PREFIX.EDIT_TRANSACTION) ? context.data.replace(CALLBACK_PREFIX.EDIT_TRANSACTION, '') : null;
    Logger.log("DEBUG: Transaction ID: " + transactionId);
    const transactionInfo = getTransactionForEdit(context.chatId, transactionId);
    Logger.log("DEBUG: transactionInfo from cache: " + JSON.stringify(transactionInfo));
    
    if (transactionInfo) {
      // Hiển thị keyboard chọn hũ mới với transactionId
      const allocationKeyboard = createAllocationKeyboard(transactionInfo.transactionId);
      Logger.log("DEBUG: Allocation keyboard created with " + allocationKeyboard.inline_keyboard.length + " rows");
      
      editText(context.chatId, context.messageId,
        "🔄 Chỉnh sửa giao dịch: " + transactionInfo.description + 
        " " + transactionInfo.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + 
        "\n\nVui lòng chọn hũ mới:",
        allocationKeyboard
      );
      Logger.log("DEBUG: Edit message sent");
    } else {
      Logger.log("DEBUG: No transaction info found in cache");
      editText(context.chatId, context.messageId, "❌ Không tìm thấy thông tin giao dịch để chỉnh sửa. Vui lòng thử lại.", null);
    }
  } catch (err) {
    Logger.log("Error in processEditTransaction: " + err.toString());
    editText(context.chatId, context.messageId, "❌ Rất tiếc, đã có lỗi xảy ra khi cố gắng chỉnh sửa giao dịch. Vui lòng thử lại sau.", null);
  }
}

function processShowTotalExpenses(context) {
  try {
    const totalExpenses = getTotalAmountByType(context.chatId, TRANSACTION_TYPE.EXPENSE);
    sendText(context.chatId, "Tổng chi tiêu của bạn là: " + totalExpenses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), menuchi);
  } catch (err) {
    Logger.log("Error in processShowTotalExpenses: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi tính tổng chi tiêu. Vui lòng thử lại.");
  }
}

function processShowTotalIncome(context) {
  try {
    sendTotalIncomeSummary(context);
  } catch (err) {
    Logger.log("Error in processShowTotalIncome: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi tính tổng thu nhập. Vui lòng thử lại.");
  }
}

function processShowCurrentBalance(context) {
  try {
    const currentBalance = getCurrentBalance(context.chatId);
    const balanceMessage = "💰 <b>Tổng quan tài chính:</b>\n\n" +
      "💹 Số tiền hiện tại của bạn là: " + currentBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    const overviewKeyboard = {
      "inline_keyboard": [
        [
          {
            text: "🏺 Xem theo hũ",
            callback_data: "getTotalAllocationBalances"
          },
          {
            text: "🏷️ Xem theo nhãn",
            callback_data: "view_subcategory_summary"
          }
        ],
        [
          {
            text: "📋 Lịch sử giao dịch",
            callback_data: "history"
          }
        ]
      ]
    };
    
    editText(context.chatId, context.messageId, balanceMessage, overviewKeyboard);
  } catch (err) {
    Logger.log("Error in processShowCurrentBalance: " + err.toString());
    editText(context.chatId, context.messageId, "❌ Đã có lỗi xảy ra khi tính số dư. Vui lòng thử lại.", null);
  }
}

function processShowAllocationBalances(context) {
  try {
    // Send loading message before heavy calculation
    if (context.messageId) {
      editText(context.chatId, context.messageId, "⏳ Đang tính toán số dư các hũ...", null);
    }
    sendTotalPhanboSummary(context); // Updated to pass context directly
  } catch (err) {
    Logger.log("Error in processShowAllocationBalances: " + err.toString());
    editText(context.chatId, context.messageId, "❌ Đã có lỗi xảy ra khi tính số dư các hũ. Vui lòng thử lại.", null);
  }
}

// =================== MESSAGE HANDLERS ===================

/**
 * IMPROVED: Start command with context pattern
 */
function processStartCommand(context) {
  try {
    sendText(context.chatId, 
      '🎯 Chào ' + context.userName + '! Tôi là <b>MoneyNe Bot</b> - trợ lý tài chính thông minh của bạn!\n\n' +
      '🔥 <b>Cách sử dụng nhanh:</b>\n' +
      '• <code>/chi ăn sáng 25000</code> - Ghi nhận chi tiêu\n' +
      '• <code>/thu lương 10000000</code> - Ghi nhận thu nhập\n' +
      '• <code>ăn trưa - 50000</code> - Chi tiêu nhanh\n' +
      '• <code>bonus + 2000000</code> - Thu nhập nhanh\n\n' +
      '📊 <b>Xem báo cáo:</b>\n' +
      '• <code>/xemhu</code> - Số dư từng hũ\n' +
      '• <code>/lichsu</code> - Lịch sử giao dịch\n' +
      '• <code>/menu</code> - Toàn bộ chức năng\n\n' +
      '✨ Hãy bắt đầu ghi nhận tài chính của bạn ngay nhé!',
      menuchi
    );
  } catch (err) {
    Logger.log("Error in processStartCommand: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra. Vui lòng thử lại sau.");
  }
}

/**
 * IMPROVED: Menu command with context pattern
 */
function processMenuCommand(context) {
  try {
    sendText(context.chatId, "Chào " + context.userName + "! Chọn chức năng:", menuchi);
  } catch (err) {
    Logger.log("Error in processMenuCommand: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra. Vui lòng thử lại sau.");
  }
}

function processShowTotalMoney(context) {
  const currentBalance = getCurrentBalance(context.chatId);
  sendText(context.chatId, "💰 Số tiền hiện tại của bạn là: " + formatNumberWithSeparator(currentBalance));
}

function processShowTotalExpenseCommand(context) {
  const totalExpenses = getTotalAmountByType(context.chatId, TRANSACTION_TYPE.EXPENSE);
  sendText(context.chatId, "💸 Tổng chi tiêu của bạn là: " + formatNumberWithSeparator(totalExpenses));
}

/**
 * IMPROVED: Default message with context pattern
 */
function processDefaultMessage(context) {
  try {
    sendText(context.chatId, 
      "Xin chào " + context.userName + "! Tôi là MoneyNe Bot, trợ lý tài chính của bạn.\n\n" +
      "🔥 <b>Ghi nhận nhanh:</b>\n" +
      "• <code>/chi ăn sáng 25000</code>\n" +
      "• <code>cafe - 15000</code>\n" +
      "• <code>/thu bonus 500000</code>\n\n" +
      "Gõ <code>/menu</code> để xem đầy đủ chức năng!", 
      menuchi
    );
  } catch (err) {
    Logger.log("Error in processDefaultMessage: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra. Vui lòng thử lại sau.");
  }
}

/**
 * ENHANCED: Quick expense command with smart suggestions
 */
function processQuickExpenseCommand(context) {
  try {
    const input = context.text.substring(5); // Remove '/chi '
    const parseResult = parseTransactionText(input, TRANSACTION_TYPE.EXPENSE);
    
    if (parseResult.success) {
      // For group chat, we need both chat ID (group) and user ID (sender)
      const userId = context.chatType === 'private' ? context.chatId : context.message.from.id;
      const chatId = context.chatId; // Always use this for sending messages
      
      // Pass all needed parameters to initiateTransactionProcess
      initiateTransactionProcess(chatId, parseResult, null, context.chatType, context.userName, userId);
    } else {
      // ✨ SMART SUGGESTION: Send intelligent error message
      sendText(context.chatId, parseResult.suggestion);
    }
  } catch (err) {
    Logger.log("Error in processQuickExpenseCommand: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi xử lý chi tiêu. Vui lòng thử lại.");
  }
}

/**
 * ENHANCED: Quick income command with smart suggestions
 */
function processQuickIncomeCommand(context) {
  try {
    const input = context.text.substring(5); // Remove '/thu '
    const parseResult = parseTransactionText(input, TRANSACTION_TYPE.INCOME);
    
    if (parseResult.success) {
      // For group chat, we need both chat ID (group) and user ID (sender)
      const userId = context.chatType === 'private' ? context.chatId : context.message.from.id;
      const chatId = context.chatId; // Always use this for sending messages
      
      // Pass all needed parameters to initiateTransactionProcess
      initiateTransactionProcess(chatId, parseResult, null, context.chatType, context.userName, userId);
    } else {
      // ✨ SMART SUGGESTION: Send intelligent error message
      sendText(context.chatId, parseResult.suggestion);
    }
  } catch (err) {
    Logger.log("Error in processQuickIncomeCommand: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi xử lý thu nhập. Vui lòng thử lại.");
  }
}

/**
 * ENHANCED: Process transaction text with smart suggestions
 */
function processTransactionText(context) {
  try {
    const parseResult = parseTransactionText(context.text);
    
    if (parseResult.success) {
      // For group chat, we need both chat ID (group) and user ID (sender)
      const userId = context.chatType === 'private' ? context.chatId : context.message.from.id;
      const chatId = context.chatId; // Always use this for sending messages
      
      // Pass all needed parameters to initiateTransactionProcess
      initiateTransactionProcess(chatId, parseResult, null, context.chatType, context.userName, userId);
    } else {
      // ✨ SMART SUGGESTION: Send intelligent error message
      sendText(context.chatId, parseResult.suggestion);
    }
  } catch (err) {
    Logger.log("Error in processTransactionText: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi xử lý giao dịch. Vui lòng thử lại.");
  }
}

/**
 * IMPROVED: Transaction history command with pagination
 */
function processTransactionHistoryCommand(context) {
  try {
    // Create a pseudo message context for pagination that doesn't require messageId initially
    const paginationContext = {
      chatId: context.chatId,
      userName: context.userName,
      data: 'history',
      messageId: null, // Will start fresh
      chatType: context.chatType // Add chatType to pagination context
    };
    
    // Call pagination function directly
    processTransactionHistoryWithPagination(paginationContext, 1);
  } catch (err) {
    Logger.log("Error in processTransactionHistoryCommand: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi tải lịch sử. Vui lòng thử lại.");
  }
}

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

/**
 * Handle the /export command to show export options.
 */
function processExportCommand(context) {
  try {
    const keyboard = {
      inline_keyboard: [
        [{ text: "Tháng này", callback_data: "export_this_month" }],
        [{ text: "Tháng trước", callback_data: "export_last_month" }],
        [{ text: "Toàn bộ lịch sử", callback_data: "export_all_time" }],
        [{ text: "⬅️ Quay lại menu chính", callback_data: "back_to_main_menu" }]
      ]
    };
    sendText(context.chatId, "Bạn muốn xuất báo cáo trong khoảng thời gian nào?", keyboard);
  } catch (err) {
    Logger.log("Error in processExportCommand: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi hiển thị tùy chọn xuất báo cáo. Vui lòng thử lại.");
  }
}

/**
 * Handles the export request based on the selected period.
 */
function processExportRequest(context, period) {
  try {
    sendLoadingMessage(context.chatId, `xuất báo cáo ${period === 'this_month' ? 'tháng này' : period === 'last_month' ? 'tháng trước' : 'toàn bộ lịch sử'}`);
    generateAndSendReport(context, period);
  } catch (err) {
    Logger.log("Error in processExportRequest: " + err.toString());
    updateLoadingMessage(context.chatId, context.messageId, `❌ Đã có lỗi xảy ra khi xuất báo cáo ${period === 'this_month' ? 'tháng này' : period === 'last_month' ? 'tháng trước' : 'toàn bộ lịch sử'}. Vui lòng thử lại.`);
  }
}

/**
 * Generates a CSV report and sends it to the user via Telegram.
 */
function generateAndSendReport(context, period) {
  const sheet = getSheet(context.chatId);
  const allData = sheet.getDataRange().getValues();

  if (allData.length < 2) {
    updateLoadingMessage(context.chatId, context.messageId, "📊 Không có dữ liệu giao dịch để xuất báo cáo.");
    return;
  }

  const header = allData[0];
  let transactions = allData.slice(1); // Exclude header row

  // Filter by period
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (period === 'this_month') {
    transactions = transactions.filter(row => {
      const date = new Date(row[1]); // Assuming date is in column B (index 1)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  } else if (period === 'last_month') {
    let lastMonth = currentMonth - 1;
    let lastMonthYear = currentYear;
    if (lastMonth < 0) {
      lastMonth = 11; // December
      lastMonthYear -= 1;
    }
    transactions = transactions.filter(row => {
      const date = new Date(row[1]);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
  }

  if (transactions.length === 0) {
    updateLoadingMessage(context.chatId, context.messageId, `📊 Không có giao dịch nào trong khoảng thời gian đã chọn.`);
    return;
  }

  // Format data for CSV
  let csvContent = header.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
  transactions.forEach(row => {
    const formattedRow = row.map((cell, index) => {
      if (index === 1) { // Date column
        return `"${new Date(cell).toLocaleDateString('vi-VN')}"`;
      } else if (typeof cell === 'string') {
        return `"${cell.replace(/"/g, '""')}"`;
      } else {
        return `"${cell}"`;
      }
    });
    csvContent += formattedRow.join(',') + '\n';
  });

  const fileName = `MoneyNe_Report_${context.chatId}_${new Date().getTime()}.csv`;
  let file = DriveApp.createFile(fileName, csvContent, MimeType.CSV);

  const telegramUrl = `https://api.telegram.org/bot${token}`; // Assuming telegramToken is available globally
  const url = telegramUrl + "/sendDocument";
  
  const payload = {
    method: "post",
    payload: {
      chat_id: String(context.chatId),
      document: file.getBlob(),
      caption: `📊 Đây là báo cáo thu chi của bạn (${period === 'this_month' ? 'Tháng này' : period === 'last_month' ? 'Tháng trước' : 'Toàn bộ'})!`,
    }
  };

  UrlFetchApp.fetch(url, payload);

  // Clean up: move the file to trash
  DriveApp.getFileById(file.getId()).setTrashed(true);

  updateLoadingMessage(context.chatId, context.messageId, `✅ Đã gửi báo cáo thành công!`);
}

/**
 * Handles the /budget command to show budget options.
 */
function processBudgetCommand(context) {
  try {
    const keyboard = {
      inline_keyboard: [
        [{ text: "📊 Xem Tình hình Ngân sách", callback_data: "view_budget_status" }],
        [{ text: "✏️ Thêm / Sửa Ngân sách", callback_data: "add_edit_budget" }],
        [{ text: "🗑️ Xóa Ngân sách", callback_data: "delete_budget" }],
        [{ text: "⬅️ Quay lại menu chính", callback_data: "back_to_main_menu" }]
      ]
    };
    sendText(context.chatId, "Bạn muốn làm gì với ngân sách?", keyboard);
  } catch (err) {
    Logger.log("Error in processBudgetCommand: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi hiển thị tùy chọn ngân sách. Vui lòng thử lại.");
  }
}

/**
 * Handles the 'view_budget_status' callback.
 */
function processViewBudgetStatus(context) {
  try {
    sendLoadingMessage(context.chatId, "xem tình hình ngân sách");

    const userSpreadsheet = SpreadsheetApp.openById(getSpreadsheetId(context.chatId));
    const budgetsSheet = userSpreadsheet.getSheetByName('Budgets');

    if (!budgetsSheet || budgetsSheet.getLastRow() < 2) {
      updateLoadingMessage(context.chatId, context.messageId, "📊 Bạn chưa có ngân sách nào được thiết lập. Vui lòng thêm ngân sách trước.");
      return;
    }

    const budgetData = budgetsSheet.getDataRange().getValues(); // ["Tháng", "Loại", "Tên", "Hạn Mức"]
    const mainSheet = getSheet(context.chatId); // Get the main transaction sheet
    const allTransactions = mainSheet.getDataRange().getValues(); // Get all transaction data
    const currentMonthYear = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");

    let budgetReport = `📊 **Tình hình Ngân sách Tháng ${currentMonthYear}:**\n\n`;
    let hasActiveBudgets = false;

    for (let i = 1; i < budgetData.length; i++) {
      const row = budgetData[i];
      const month = row[0];
      const budgetType = row[1];
      const budgetName = row[2];
      const limit = parseFloat(row[3]);

      if (month === currentMonthYear && !isNaN(limit) && limit > 0) {
        hasActiveBudgets = true;
        const spent = calculateSpent(allTransactions, currentMonthYear, budgetType, budgetName);
        const remaining = limit - spent;
        const percentage = (spent / limit) * 100;

        budgetReport += `**${budgetType} ${budgetName}:**\n`;
        budgetReport += `   Hạn mức: ${formatNumberWithSeparator(limit)}đ\n`;
        budgetReport += `   Đã chi: ${formatNumberWithSeparator(spent)}đ (${percentage.toFixed(1)}%)\n`;
        budgetReport += `   Còn lại: ${formatNumberWithSeparator(remaining)}đ\n`;
        budgetReport += `   ${createPercentageBar(percentage)}\n\n`;
      }
    }

    if (!hasActiveBudgets) {
      updateLoadingMessage(context.chatId, context.messageId, `📊 Không có ngân sách hoạt động cho Tháng ${currentMonthYear}.`);
      return;
    }

    updateLoadingMessage(context.chatId, context.messageId, budgetReport);

  } catch (err) {
    Logger.log("Error in processViewBudgetStatus: " + err.toString());
    updateLoadingMessage(context.chatId, context.messageId, "❌ Đã có lỗi xảy ra khi xem tình hình ngân sách. Vui lòng thử lại.");
  }
}

/**
 * Helper function to create a percentage bar for visual representation.
 */
function createPercentageBar(percentage) {
  const barLength = 10; // Length of the bar in characters
  const filledBlocks = Math.round(percentage / 10);
  const emptyBlocks = barLength - filledBlocks;

  let bar = "[";
  for (let i = 0; i < filledBlocks; i++) {
    bar += "█";
  }
  for (let i = 0; i < emptyBlocks; i++) {
    bar += "░";
  }
  bar += "]";

  return bar;
}

/**
 * Handles the 'add_edit_budget' callback.
 */
function processAddEditBudget(context) {
  try {
    sendText(context.chatId, "Chức năng thêm/sửa ngân sách đang được phát triển.");
  } catch (err) {
    Logger.log("Error in processAddEditBudget: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi thêm/sửa ngân sách. Vui lòng thử lại.");
  }
}

/**
 * Handles the 'delete_budget' callback.
 */
function processDeleteBudget(context) {
  try {
    sendText(context.chatId, "Chức năng xóa ngân sách đang được phát triển.");
  } catch (err) {
    Logger.log("Error in processDeleteBudget: " + err.toString());
    sendText(context.chatId, "❌ Đã có lỗi xảy ra khi xóa ngân sách. Vui lòng thử lại.");
  }
}

/**
 * Checks budgets and sends alerts if thresholds are crossed.
 * Only for EXPENSE transactions.
 */
function checkAndSendBudgetAlerts(userId, allocation, subCategory, newAmount, type) {
  if (type !== TRANSACTION_TYPE.EXPENSE) {
    return; // Only check budgets for expenses
  }

  try {
    const userSpreadsheet = SpreadsheetApp.openById(getSpreadsheetId(userId));
    const budgetsSheet = userSpreadsheet.getSheetByName('Budgets');
    if (!budgetsSheet || budgetsSheet.getLastRow() < 2) {
      Logger.log("No budget data found for user " + userId);
      return;
    }

    const budgetData = budgetsSheet.getDataRange().getValues(); // ["Tháng", "Loại", "Tên", "Hạn Mức"]
    const currentMonthYear = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");

    let allocationBudget = 0;
    let subCategoryBudget = 0;

    // Find relevant budgets for current month
    for (let i = 1; i < budgetData.length; i++) {
      const row = budgetData[i];
      const month = row[0];
      const budgetType = row[1];
      const budgetName = row[2];
      const limit = parseFloat(row[3]);

      if (month === currentMonthYear && !isNaN(limit)) {
        if (budgetType === 'Hũ' && budgetName === allocation) {
          allocationBudget = limit;
        } else if (budgetType === 'Nhãn' && budgetName === subCategory) {
          subCategoryBudget = limit;
        }
      }
    }

    const mainSheet = getSheet(userId); // Get the main transaction sheet
    const allTransactions = mainSheet.getDataRange().getValues(); // Get all transaction data

    // Check allocation budget
    if (allocationBudget > 0) {
      const spentOnAllocation = calculateSpent(allTransactions, currentMonthYear, 'Hũ', allocation);
      sendBudgetAlert(userId, allocation, allocationBudget, spentOnAllocation, 'Hũ');
    }

    // Check subCategory budget
    if (subCategoryBudget > 0) {
      const spentOnSubCategory = calculateSpent(allTransactions, currentMonthYear, 'Nhãn', subCategory);
      sendBudgetAlert(userId, subCategory, subCategoryBudget, spentOnSubCategory, 'Nhãn');
    }
  } catch (err) {
    Logger.log("Error in checkAndSendBudgetAlerts: " + err.toString());
  }
}

/**
 * Helper function to calculate total spent for a given budget item.
 */
function calculateSpent(transactionsData, monthYear, budgetType, budgetName) {
  let totalSpent = 0;
  for (let i = 1; i < transactionsData.length; i++) { // Start from 1 to skip header
    const row = transactionsData[i];
    const date = new Date(row[1]); // Date column (index 1)
    const type = row[5]; // Type column (index 5) - "ChiTieu" or "ThuNhap"
    const amount = parseFloat(row[3]); // Amount column (index 3)
    const allocation = row[4]; // Allocation column (index 4)
    const subCategory = row[6]; // SubCategory column (index 6)

    const transactionMonthYear = Utilities.formatDate(date, Session.getScriptTimeZone(), "MM/yyyy");

    if (transactionMonthYear === monthYear && type === TRANSACTION_TYPE.EXPENSE && !isNaN(amount)) {
      if (budgetType === 'Hũ' && allocation === budgetName) {
        totalSpent += amount;
      } else if (budgetType === 'Nhãn' && subCategory === budgetName) {
        totalSpent += amount;
      }
    }
  }
  return totalSpent;
}

/**
 * Helper function to send budget alerts.
 */
function sendBudgetAlert(userId, budgetName, limit, spent, budgetType) {
  const percentage = (spent / limit) * 100;
  let alertMessage = '';

  if (percentage >= 100) {
    alertMessage = `🚨 Báo động: Bạn đã VƯỢT ngân sách cho '${budgetName}' (${budgetType}) tháng này! Đã chi tiêu ${formatNumberWithSeparator(spent)}đ / ${formatNumberWithSeparator(limit)}đ.`;
  } else if (percentage >= 90) {
    alertMessage = `⚠️ Cảnh báo: Bạn đã chi tiêu ${Math.round(percentage)}% ngân sách cho '${budgetName}' (${budgetType}) tháng này! Đã chi tiêu ${formatNumberWithSeparator(spent)}đ / ${formatNumberWithSeparator(limit)}đ.`;
  }

  if (alertMessage) {
    sendText(userId, alertMessage);
  }
}

// Helper to get spreadsheet ID from userId (duplicate logic from getSheet, but necessary for checkAndSendBudgetAlerts)
function getSpreadsheetId(entityId) {
  const cache = CacheService.getScriptCache();
  const cachedId = cache.get(entityId.toString());
  
  if (cachedId) {
    Logger.log("Sheet ID found in cache for: " + entityId);
    return cachedId;
  }

  Logger.log("Sheet ID not in cache, fetching from UserList for: " + entityId);
  const usersSpreadsheet = SpreadsheetApp.openById(main_sheet);
  const usersSheet = usersSpreadsheet.getSheetByName('UserList'); 
  const userData = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < userData.length; i++) { // Start from 1 to skip header
    if (userData[i][0] == entityId) {
      const sheetId = userData[i][1];
      cache.put(entityId.toString(), sheetId, 21600); // Lưu trong 6 tiếng
      return sheetId;
    }
  }
  return null;
}

/**
 * Handles the /startgroup command to initialize bot for a group chat.
 */
function processStartGroupCommand(context) {
  try {
    // Ensure it's a group chat
    if (context.chatType !== 'group' && context.chatType !== 'supergroup') {
      sendText(context.chatId, "Lệnh này chỉ có thể được sử dụng trong nhóm chat.");
      return;
    }

    sendLoadingMessage(context.chatId, "khởi tạo bot cho nhóm của bạn");

    // Use the updated getSheet to create a group spreadsheet
    // getSheet(entityId, entityType, senderId = null)
    const groupSpreadsheet = getSheet(context.chatId, context.chatType, context.message.from.id);

    if (groupSpreadsheet) {
      const welcomeMessage = `🎉 Chào mừng đến với MoneyNe Bot, nhóm **${context.message.chat.title}**!
Tôi sẽ giúp cả nhóm quản lý thu chi chung.

Để bắt đầu, mọi người có thể dùng các lệnh sau:

*   \`/chi nội dung số_tiền\` (VD: \`/chi ăn trưa 50000\`)
*   \`/thu nội dung số_tiền\` (VD: \`/thu góp quỹ 100000\`)

Mỗi giao dịch sẽ được ghi nhận kèm theo tên của người gửi.

Bạn có thể xem tổng quan bằng lệnh \`/tongtien\` hoặc \`/lichsu\`.
Chúc nhóm bạn quản lý tài chính hiệu quả!`;
      updateLoadingMessage(context.chatId, context.messageId, welcomeMessage);
    } else {
      updateLoadingMessage(context.chatId, context.messageId, "❌ Đã có lỗi xảy ra khi khởi tạo bot cho nhóm. Vui lòng thử lại.");
    }

  } catch (err) {
    Logger.log("Error in processStartGroupCommand: " + err.toString());
    updateLoadingMessage(context.chatId, context.messageId, "❌ Đã có lỗi xảy ra khi khởi tạo bot cho nhóm. Vui lòng thử lại.");
  }
}

function triggerProcessVoiceMessage() {
  const properties = PropertiesService.getScriptProperties();
  const fileId = properties.getProperty('VOICE_MESSAGE_FILE_ID');
  const context = JSON.parse(properties.getProperty('VOICE_MESSAGE_CONTEXT'));

  if (fileId && context) {
    processVoiceMessage(fileId, context);
    // Clean up properties after use
    properties.deleteProperty('VOICE_MESSAGE_FILE_ID');
    properties.deleteProperty('VOICE_MESSAGE_CONTEXT');
  } else {
    Logger.log("Error: Missing fileId or context for triggerProcessVoiceMessage.");
  }
}

// Test function to check if bot can send messages
function testBotConnection() {
  try {
    const testChatId = "YOUR_CHAT_ID"; // Replace with your actual chat ID
    const response = sendText(testChatId, "🤖 Bot test - nếu bạn nhận được tin nhắn này thì bot đã hoạt động!");
    Logger.log("Test message result: " + JSON.stringify(response));
    return "Test completed - check logs and Telegram";
  } catch (err) {
    Logger.log("Test failed: " + err.toString());
    return "Test failed: " + err.toString();
  }
}
