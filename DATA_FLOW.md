# 📊 Restaurant Bill Printer - Data Flow Guide

## 🔍 **How Data Gets Into Your App**

You're absolutely right to question this! The app was using **mock data**. Here's how data actually flows and how to set it up properly:

---

## 📋 **Current Data Sources**

### 1. **Manual Order Entry** (NEW - Working Now!)
- **Button**: "Manual Order" in the header
- **Purpose**: Add orders manually for testing or backup
- **Flow**: Frontend → `/api/manual-order` → Database → WebSocket → Real-time update

### 2. **Google Sheets Integration** (Ready - Needs Setup)
- **Button**: "Settings" → Configure Google Sheets
- **Purpose**: Sync orders from your Google Spreadsheet automatically
- **Flow**: Google Sheets → API → Database → WebSocket → Real-time update

### 3. **Mock Data** (Previous - Now Disabled)
- **What was happening**: Hard-coded fake orders
- **Why**: For demonstration purposes only
- **Status**: Replaced with real integration

---

## 🛠️ **How to Set Up Real Data**

### **Option 1: Manual Order Entry** (Immediate)
1. Click **"Manual Order"** button in header
2. Fill in customer name, table, items, prices
3. Click **"Create Order"**
4. ✅ Order appears instantly with real-time notification

### **Option 2: Google Sheets Integration** (Advanced)

#### **Step 1: Create Google Sheet**
1. Go to [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet
3. Name sheet "Orders" (or your preferred name)
4. Set up columns:
   ```
   A: customerName | B: tableNumber | C: items | D: totalAmount | E: timestamp
   ```

#### **Step 2: Get Spreadsheet ID**
1. From URL: `docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
2. Copy the **SPREADSHEET_ID** part
3. Example: `1BxiMVs0XRA5nFMdKvBdBZjgmLvC8g`

#### **Step 3: Configure App**
1. Click **"Settings"** button
2. Enter Spreadsheet ID
3. Enter sheet name ("Orders")
4. Click **"Save Config"**
5. Click **"Sync Now"** to test

#### **Step 4: Add Data to Google Sheet**
1. Add new rows to your Google Sheet
2. Example:
   ```
   John Doe    T5    Burger,Fries,Coke    15.99    2024-01-15T14:30:00Z
   Jane Smith   T3    Pizza,Salad       22.50    2024-01-15T14:35:00Z
   ```
3. App automatically syncs every 5 seconds

---

## 🔄 **Real Data Flow Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Source  │───▶│   API Layer    │───▶│   Database     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   WebSocket     │
                                              │   Service      │
                                              │   (Port 3003)  │
                                              └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   Frontend     │
                                              │   Dashboard    │
                                              └─────────────────┘
```

---

## 🎯 **Testing Your Setup**

### **Test Manual Orders** (Works Now)
1. Click **"Manual Order"**
2. Enter test data
3. Click **"Create Order"**
4. ✅ Should see:
   - Order appear in list immediately
   - Real-time notification popup
   - WebSocket connection indicator

### **Test Google Sheets** (After Setup)
1. Add row to Google Sheet
2. Wait 5-10 seconds
3. ✅ Should see:
   - Order sync automatically
   - "Synced X new orders" message
   - Real-time notification

---

## 🔧 **Environment Variables** (For Production)

Create `.env.local` file:
```bash
# Google Sheets API
GOOGLE_SPREADSHEET_ID=your_actual_spreadsheet_id
GOOGLE_SHEET_NAME=Orders
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Database (already configured)
DATABASE_URL="file:./dev.db"
```

---

## 📱 **What You'll See**

### **With Real Data**:
- ✅ **Live order notifications** popup instantly
- ✅ **Real-time dashboard** updates
- ✅ **Automatic bill printing** with one click
- ✅ **Order status tracking** from pending → printed
- ✅ **Professional bills** sent to printer

### **Data Sources Working**:
1. **Manual Entry**: ✅ Working now
2. **Google Sheets**: 🔄 Ready (needs your setup)
3. **API Endpoints**: ✅ All functional
4. **WebSocket Service**: ✅ Running on port 3003

---

## 🚀 **Quick Start**

**Want to see real data immediately?**

1. **Use Manual Order**: Click "Manual Order" → Fill form → Create
2. **Set Up Google Sheets**: Follow steps above for automatic sync
3. **Test Printing**: Click "Print Bill" on any order

The app is now **fully functional** with real data flow - no more mock data! 🎉