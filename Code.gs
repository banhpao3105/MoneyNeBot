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

function addTransactionData(userId, date, description, amount, allocation, type) {
  var sheet = getSheet(userId); 

  
  sheet.appendRow([date, description, amount, allocation, type]);
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

  
  if (contents.callback_query) {
    chatId = contents.callback_query.from.id;
    userName = contents.callback_query.from.first_name;
    var data = contents.callback_query.data;

    if (data === 'connect_email') {
      sendText(chatId, "Vui lòng nhập email của bạn:");
      return;
    } else if (data.startsWith('bank_')) {
      var bankName = data.split('_')[1]; 
      saveBankToSheet(chatId, bankName); 
      sendText(chatId, "Ngân hàng của bạn đã được kết nối thành công: " + bankName);
      return;
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
  
  var allocations = [
    'Chi tiêu thiết yếu',
    'Hưởng thụ',
    'Tiết kiệm dài hạn',
    'Giáo dục',
    'Tự do tài chính',
    'Cho đi'
  ];
  if (contents.callback_query) {
    var id_callback = chatId;
    var data = contents.callback_query.data;

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
          .trim() || "Thiết yếu";
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
        var allocation = allocationAndDate || getCategoryFromAI(item); // Use AI if no allocation is provided
        var type = "ThuNhap"; 
        var allocations = [
          'Chi tiêu thiết yếu',
          'Hưởng thụ',
          'Tiết kiệm dài hạn',
          'Giáo dục',
          'Tự do tài chính',
          'Cho đi'
        ];
          
          addTransactionData(chatId, date, item, amount, allocation, type);
          sendText(
            id_message,
            "Bạn đã thu nhâp: " + item + " " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " vào ngày " + formatDate(date) + " và phân bổ thu nhập của bạn vào hũ " +
            allocation + "."
          );
          return;
        } else {
          sendText(
            id_message,
            "Vui lòng cung cấp thông tin thu nhập và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Thu nhập:</b>\n   - <code>nội dung + số tiền</code>\n\n<b>2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm + hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>"
          ); return;
        }
      } else {
        sendText(
          id_message,
          "Vui lòng cung cấp thông tin thu nhập và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Thu nhập:</b>\n   - <code>nội dung + số tiền</code>\n\n<b>2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung + số tiền + ngày/tháng/năm + hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>"
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
          .trim() || "Thiết yếu";
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
        var allocation = allocationAndDate || getCategoryFromAI(item); // Use AI if no allocation is provided
        var type = "ChiTieu"; 
        var allocations = [
          'Chi tiêu thiết yếu',
          'Hưởng thụ',
          'Tiết kiệm dài hạn',
          'Giáo dục',
          'Tự do tài chính',
          'Cho đi'
        ];
          
          addTransactionData(chatId, date, item, amount, allocation, type);
          sendText(
            id_message,
            "Bạn đã chi tiêu: " + item + " " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " vào ngày " + formatDate(date) + " và phân bổ chi tiêu của bạn vào hũ " +
            allocation + "."
          );
          return;
        } else {
          sendText(
            id_message,
            "Vui lòng cung cấp thông tin Chi tiêu và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Chi tiêu:</b>\n   - <code>nội dung - số tiền</code>\n\n<b>2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm - hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>"
          ); return;

        }
      } else {
        sendText(
          id_message,
          "Vui lòng cung cấp thông tin Chi tiêu và số tiền theo cú pháp lệnh sau:\n<b>1. Thêm thông tin Chi tiêu:</b>\n   - <code>nội dung - số tiền</code>\n\n<b>2. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm</code>\n\n<b>3. Thêm thông tin Chi tiêu vào ngày/tháng/năm cụ thể và Hũ cụ thể:</b>\n   - <code>nội dung - số tiền - ngày/tháng/năm - hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)</code>"
        ); return;

      }
    }
    
    if (text.startsWith("/history")) {
      var parts = text.split(" ");
      var userId = chatId;
      var startDate, endDate;

      if (parts.length < 2) {
        sendText(
          id_message,
          'Lệnh không hợp lệ. Hãy sử dụng các lệnh sau:\n <b>1. Lịch sử Thu/Chi hôm nay:</b>\n   - <code>/history today</code>\n\n<b>2. Lịch sử Thu/Chi ngày cụ thể:</b>\n   - <code>/history d ngày/tháng/năm</code>\n\n<b>3. Lịch sử Thu/Chi trong tuần:</b>\n   - <code>/history week</code>\n\n<b>4. Lịch sử Thu/Chi trong tuần cụ thể:</b>\n   - <code>/history w 1 (2, 3, 4)</code>\n\n<b>5. Lịch sử Thu/Chi tháng:</b>\n   - <code>/history month tháng/năm</code>\n\n<b>6. Lịch sử Thu/Chi năm:</b>\n   - <code>/history year năm</code>\n'
        );
        return;
      }

      var historyType = parts[1].toLowerCase();

      if (historyType === "today") {
        var today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      } else if (historyType === "week") {
        var today = new Date();
        var dayOfWeek = today.getDay(); // Sunday - 0, Monday - 1, etc.
        var startOfWeek = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
        startDate = new Date(today.getFullYear(), today.getMonth(), startOfWeek);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 7);
      } else if (historyType === "w" && parts.length === 3) {
        var weekNumber = parseInt(parts[2]);
        if (!isNaN(weekNumber) && weekNumber >= 1 && weekNumber <= 4) {
          var currentDate = new Date();
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), (weekNumber - 1) * 7 + 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), weekNumber * 7 + 1);
        } else {
           sendText(id_message, "Vui lòng cung cấp tuần hợp lệ, bạn có thể thử /history w 1, /history w 2, /history w 3, /history w 4.");
           return;
        }
      } else if (historyType === "month" && parts.length === 3) {
        var monthYearStr = parts[2];
        var [month, year] = monthYearStr.split("/");
        if (month && year && !isNaN(parseInt(month)) && !isNaN(parseInt(year))) {
          month = parseInt(month);
          year = parseInt(year);
          startDate = new Date(year, month - 1, 1);
          endDate = new Date(year, month, 1); // Start of next month
        } else {
          sendText(id_message, "Vui lòng cung cấp tháng hợp lệ, ví dụ: /history month MM/YYYY");
          return;
        }
      } else if (historyType === "year" && parts.length === 3) {
        var year = parseInt(parts[2]);
        if (!isNaN(year)) {
          startDate = new Date(year, 0, 1);
          endDate = new Date(year + 1, 0, 1);
        } else {
           sendText(id_message, "Vui lòng cung cấp năm hợp lệ, ví dụ: /history year YYYY");
           return;
        }
      } else if (historyType === 'd' && parts.length >= 3) {
        var dateParts = parts.slice(2).join(" ").split("/");
        if (dateParts.length === 3) {
          var day = parseInt(dateParts[0]);
          var month = parseInt(dateParts[1]) - 1;
          var year = parseInt(dateParts[2]);
          if(!isNaN(day) && !isNaN(month) && !isNaN(year)){
            startDate = new Date(year, month, day);
            endDate = new Date(year, month, day + 1);
          } else {
            sendText(id_message, "Vui lòng cung cấp ngày/tháng/năm hợp lệ, ví dụ: /history d DD/MM/YYYY");
            return;
          }
        } else {
          sendText(id_message, "Vui lòng cung cấp ngày/tháng/năm hợp lệ, ví dụ: /history d DD/MM/YYYY");
          return;
        }
      } else {
        sendText(
          id_message,
          'Lệnh không hợp lệ. Hãy sử dụng các lệnh sau:\n <b>1. Lịch sử Thu/Chi hôm nay:</b>\n   - <code>/history today</code>\n\n<b>2. Lịch sử Thu/Chi ngày cụ thể:</b>\n   - <code>/history d ngày/tháng/năm</code>\n\n<b>3. Lịch sử Thu/Chi trong tuần:</b>\n   - <code>/history week</code>\n\n<b>4. Lịch sử Thu/Chi trong tuần cụ thể:</b>\n   - <code>/history w 1 (2, 3, 4)</code>\n\n<b>5. Lịch sử Thu/Chi tháng:</b>\n   - <code>/history month tháng/năm</code>\n\n<b>6. Lịch sử Thu/Chi năm:</b>\n   - <code>/history year năm</code>\n'
        );
        return;
      }

      sendTransactionHistoryByDateRange(id_message, userId, startDate, endDate);
      return; // Return after sending history
    } else if (text === '/start') {
      
      sendText(id_message, 'Xin chào ' + userName + '! Thư ký Capybara là Bot giúp bạn quản lý Thu/Chi, thu nhập có thể phân bổ ra các hũ và còn các tính năng khác nữa. Để biết thêm chi tiết về các lệnh, bạn có thể sử dụng lệnh /help hoặc cũng có thể xem menu Thư ký Capybara tại đây.',
        keyBoard
      );
    }
    else if (text === '/menu') {
      
      sendText(id_message, 'Xin chào ' + userName + '! Menu Thư ký Capybara tại đây.',
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
  \<code>nội dung - số tiền - ngày/tháng/năm - hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)\</code>

<b>💰 Thu nhập:</b>
1. Thêm thông tin Thu nhập:
  \<code>nội dung + số tiền\</code>

2. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể:
  \<code>nội dung + số tiền + ngày/tháng/năm\</code>

3. Thêm thông tin Thu nhập vào ngày/tháng/năm cụ thể và Hũ cụ thể:
  \<code>nội dung + số tiền + ngày/tháng/năm + hũ (Thiết yếu, Giáo dục, Tiết kiệm, Đầu tư, Tiêu dùng, Khác)\</code>

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


function addTransactionData(
  userId,
  date,
  description,
  amount,
  allocation,
  type
) {
  var sheet = getSheet(userId);
  sheet.appendRow([date, description, amount, allocation, type]);
}

function addIncomeData(userId, date, content, amount, allocation) {
  var sheet = getSheet(userId);
  
  var type = "ThuNhap";
  sheet.appendRow([date, content, amount, allocation, type]);
}

function addExpenseData(userId, date, item, amount, allocation) {
  var sheet = getSheet(userId);
  
  var type = "ChiTieu";
  sheet.appendRow([date, item, amount, allocation, type]);
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
  var allocations = [
    'Chi tiêu thiết yếu',
    'Hưởng thụ',
    'Tiết kiệm dài hạn',
    'Giáo dục',
    'Tự do tài chính',
    'Cho đi'
  ];
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
    
    var folderName = "Money Capybara";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder;
    if (folders.hasNext()) {
      targetFolder = folders.next();
    } else {
      targetFolder = DriveApp.createFolder(folderName);
    }

    var newSpreadsheet = SpreadsheetApp.create('Expense Tracker for ' + userId);
    sheetId = newSpreadsheet.getId();
    
    var newFile = DriveApp.getFileById(sheetId);
    newFile.moveTo(targetFolder);

    
    usersSheet.appendRow([userId, sheetId]);

    
    var sheet = newSpreadsheet.getActiveSheet();
    sheet.getRange('A1:E1').setValues([
      ["Date", "Description", "Amount", "Allocation", "Type"]
    ]);

    
    sheet.deleteColumns(6, 21); 

    
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

function getCategoryFromAI(description) {
  if (!description) {
    return 'Chi tiêu thiết yếu'; // Default if no description
  }

  var apiKey = getRandomGeminiApiKey(); 
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey;

  // Detailed prompt based on user's new categories
  const promptText = `Bạn là một chuyên gia phân loại tài chính. Dựa vào nội dung giao dịch, hãy chọn MỘT danh mục (hũ) phù hợp nhất từ danh sách sau. Chỉ trả về tên danh mục, không giải thích gì thêm.
  
  Danh sách các hũ và ví dụ:
  - **Chi tiêu thiết yếu**: Nhà ở, điện, nước, internet, đi chợ, xăng xe, thuốc men.
  - **Hưởng thụ**: Xem phim, cà phê, ăn nhà hàng, mua sắm đồ xa xỉ, spa, du lịch, thể thao.
  - **Tiết kiệm dài hạn**: Mua xe, mua nhà, sửa nhà, quỹ khẩn cấp, mục tiêu lớn (cưới, du học).
  - **Giáo dục**: Mua sách, khóa học, tham gia hội thảo, workshop.
  - **Tự do tài chính**: Đầu tư cổ phiếu, góp vốn kinh doanh, mua đất, gửi tiết kiệm sinh lời.
  - **Cho đi**: Từ thiện, giúp đỡ người thân, quà tặng, đóng góp cộng đồng.

  Nội dung giao dịch: "${description}"

  Hũ phù hợp nhất là gì?`;

  const payload = JSON.stringify({
    contents: [{
      parts: [{ text: promptText }]
    }],
    generationConfig: {
      temperature: 0, // Set to 0 for deterministic, consistent results
      maxOutputTokens: 50,
      responseMimeType: "text/plain",
    }
  });

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true // Important to handle potential errors
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText().trim();

    if (responseCode === 200) {
      // List of valid categories to check against
      const validCategories = ['Chi tiêu thiết yếu', 'Hưởng thụ', 'Tiết kiệm dài hạn', 'Giáo dục', 'Tự do tài chính', 'Cho đi'];
      if (validCategories.includes(responseText)) {
        return responseText;
      }
    }
    // If AI fails, returns a non-standard category, or if there's an error, default to essential spending
    return 'Chi tiêu thiết yếu';
  } catch (error) {
    Logger.log("Error calling AI for categorization: " + error.message);
    return 'Chi tiêu thiết yếu'; // Default on error
  }
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
    
    
    var allocation = getCategoryFromAI(description);
    
    
    addTransactionData(userId, date, description, amount, allocation, transactionType);
    
    
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
              var allocation = getCategoryFromAI(explanation); // AI-based categorization
              targetSheet.appendRow([timestamp, explanation, amount, allocation, type, timestampEpoch]);
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
