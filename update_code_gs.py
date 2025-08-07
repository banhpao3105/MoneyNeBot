
import os

old_code_gs_content = """function getSheet(userId) {
  
  
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
"""

new_code_gs_content = """function getSheet(userId) {
  
  
  const usersSpreadsheet = SpreadsheetApp.openById(main_sheet);
  const usersSheet = usersSpreadsheet.getSheetByName('UserList'); 
  
  
  const userData = usersSheet.getDataRange().getValues();
  let sheetId = null;
  for (let i = 0; i < userData.length; i++) {
    if (userData[i][0] === userId) {
      sheetId = userData[i][1];
      break;
    }
  }

  if (!sheetId) {
    
    const newSpreadsheet = SpreadsheetApp.create('Expense Tracker for ' + userId);
    sheetId = newSpreadsheet.getId();
    
    // Lấy thư mục "Money Capybara"
    const targetFolder = getOrCreateFolder('Money Capybara');
    
    // Di chuyển file vào thư mục
    const file = DriveApp.getFileById(sheetId);
    
    // Thêm file vào thư mục đích
    targetFolder.addFile(file);
    
    // Xóa file khỏi thư mục gốc (My Drive)
    const rootFolder = DriveApp.getRootFolder();
    rootFolder.removeFile(file);

    
    usersSheet.appendRow([userId, sheetId]);

    
    const sheet = newSpreadsheet.getActiveSheet();
    sheet.getRange('A1:G1').setValues([
      ["STT", "Date", "Description", "Amount", "Allocation", "Type", "SubCategory"]
    ]);

    
    sheet.deleteColumns(8, 19); 
    
    const numRows = sheet.getMaxRows();
    if (numRows > 2) {
      sheet.deleteRows(3, numRows - 2); 
    }
  }

  const userSpreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = userSpreadsheet.getActiveSheet();

  // Check for and create 'Budgets' sheet if it doesn't exist
  let budgetsSheet = userSpreadsheet.getSheetByName('Budgets');
  if (!budgetsSheet) {
    budgetsSheet = userSpreadsheet.insertSheet('Budgets');
    budgetsSheet.getRange('A1:D1').setValues([["Tháng", "Loại", "Tên", "Hạn Mức"]]);
  }

  return sheet;
}
"""

file_path = 'Code.gs'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace the old function content with the new one
    modified_content = content.replace(old_code_gs_content, new_code_gs_content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    print(f"File {file_path} updated successfully.")
except Exception as e:
    print(f"Error updating file {file_path}: {e}")
