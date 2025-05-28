---
## MoneyNe Bot


A Telegram-based personal finance bot with AI-driven voice recognition and automatic bank transaction syncing, powered by Google Sheets and Gemini AI.


### 🚀 Features

After evolving into a powerful Telegram finance assistant, MoneyNe Bot now offers:

* 🔊 **Voice Recognition**
  Send a voice message: AI transcribes and logs the transaction automatically—no typing required.
* 🏦 **Auto Bank Sync**
  Bot scans filter-configured emails and records banking transactions to your sheet in real time.
* ✔️ **Expense & Income Management**
  Track money flow, assign amounts to 6 customizable “jars,” and view overall balances.
* ✔️ **History & Edits**
  Browse, modify, or delete past transactions at any time.
* ✔️ **Intuitive Mini App**
  User-friendly interface embedded in Telegram—fast, responsive, and easy to navigate.
* ✔️ **Google Sheets Backend**
  Scalable storage on Google Sheets; supports up to 5,000+ users concurrently.

### 📦 Prerequisites

* A Telegram bot token (via BotFather)
* Google account with access to Google Sheets and Apps Script
* Gemini API keys

### 🔧 Installation & Setup
[![Make a Copy](https://img.shields.io/badge/Make%20a%20Copy-Google%20Sheets-green?logo=google-sheets\&logoColor=white)](https://docs.google.com/spreadsheets/d/1nYvjHarjD7Dfh-noyoC6qjJH6nyigW0preAd-moMPZw/copy)
#### 1. Download

1. Download File
   ```
   Code.GS
   ```
#### 2. Create Your Google Sheet

1. In Google Sheets, create a new spreadsheet (e.g. **MoneyNe-Data**).
2. Add a sheet (tab) named **UserList** (exact match).
3. Copy the **Spreadsheet ID** from the URL.

   * Example URL:

     ```
     https://docs.google.com/spreadsheets/d/1AbCdEfG12345/edit#gid=0
     ```
   * Here, **ID\_MAINSHEET** = `1AbCdEfG12345`.

#### 3. Paste the Apps Script Code

1. Inside your Google Sheet, go to **Extensions → Apps Script**.
2. Remove any sample code and paste in the MoneyNe Bot’s Google Apps Script.
3. Save the project.

#### 4. Deploy as a Web App

1. In the Apps Script editor, click **Deploy → New deployment**.
2. Select **“Web app.”**
3. Under **“Who has access”**, choose **“Anyone”** (even anonymous).
4. Click **Deploy**, then copy the Web App URL.
5. In your bot’s main code, replace:

   ```js
   var webAppUrl = "CHANGE_YOU_URL_APPSCRIP";
   ```

   with the URL you just copied, e.g.:

   ```js
   var webAppUrl = "https://script.google.com/macros/s/ABC123/exec";
   ```

#### 5. Configure Script Properties

1. In the Apps Script editor, click the gear icon **Settings → Script properties**.
2. Add the following keys and their values:

   | Property Key     | Value                                        |
   | ---------------- | -------------------------------------------- |
   | `BOT_TOKEN`      | Your Telegram bot token (from BotFather)     |
   | `GEMINI_LISTKEY` | Comma-separated list of your Gemini API keys |
   | `GEMINI_TOKEN`   | Your Gemini authentication token             |
   | `ID_MAINSHEET`   | The Spreadsheet ID you copied in step 2      |
3. Save your changes.

#### 6. Create a Time-Driven Trigger

1. In the Apps Script editor, open **Triggers** (clock icon) and click **Add Trigger**.
2. Configure:

   * **Function**: `checkEmail`
   * **Deployment**: `Head` (default)
   * **Event source**: `Time-driven`
   * **Type of time-based trigger**: `Hour timer`
   * **Every**: `1 hour`
3. Save the trigger. Now `checkEmail` will run automatically every hour.

### 🎯 Usage

1. Invite your bot to a Telegram chat or channel.
2. Send commands or voice messages as per the bot instructions.
3. Data is stored in Google Sheets; logs are viewable in Apps Script Logs.


### 💰 Donate

[![Donate](https://img.shields.io/badge/Donate-PayPal-blue?logo=paypal)](https://paypal.me/llliz6)

---
