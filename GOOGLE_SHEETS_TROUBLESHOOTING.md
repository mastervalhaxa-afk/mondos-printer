# 🔧 Google Sheets Sync Troubleshooting Guide

## ❓ **Complete Diagnosis & Solutions**

### **Step 1: Test Your Google Sheet**
1. **Get Your Spreadsheet ID**: 
   - Open your Google Sheet
   - URL: `docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the **SPREADSHEET_ID** part (after `/d/`)

2. **Test with Our App**:
   - Click **Settings** → **"Test CSV URL"**
   - Enter your Spreadsheet ID
   - Check the detailed response

### **Step 2: Make Sheet Public** (If Test Fails)
If the test shows **"Sheet is not accessible for CSV export"**, make it public:

1. Open your Google Sheet
2. Click **"Share"** (top right)
3. **"General access"** → **"Anyone with link"**
4. **"Viewer"** → **"Can view"**
5. Click **"Done"**

### **Step 3: Verify Column Headers**
Your sheet **Row 1** must have **exactly** these headers:
```
A1: customerName
B1: tableNumber  
C1: items
D1: totalAmount
E1: timestamp
```

**Important**: 
- Headers must be **exact** (case-sensitive)
- No extra spaces or special characters
- Use the format above

### **Step 4: Add Test Data**
Add test data starting from **Row 2**:
```
John Doe    T5    Burger, Fries, Coke    15.99    2024-01-15T14:30:00Z
Jane Smith   T3    Pizza, Salad       22.50    2024-01-15T14:35:00Z
```

### **Step 5: Verify Sync**
1. Add data to your sheet
2. Click **"Sync Now"** in the app
3. Should see orders appear within 5 seconds

---

## 🔍 **What Each Test Result Means**

### ✅ **"Google Sheet is accessible for CSV export"**
- **Status**: Sheet is public and readable
- **Next Steps**: Add your data and test sync
- **Result**: Orders will appear in app with real-time notifications

### ❌ **"Google Sheet is not accessible for CSV export"**
- **Common Causes**:
  - Sheet is private (not shared publicly)
  - Wrong Spreadsheet ID
  - Sheet doesn't exist
  - Network issues

- **Solutions**:
  1. Make sheet public (Step 2 above)
  2. Verify Spreadsheet ID (Step 1)
  3. Check network connection

---

## 🚨 **If Still Not Working**

### **Manual Orders Work** (Always Available)
1. Click **"Manual Order"** button
2. Add test order with customer name, items, and prices
3. **✅ Should appear immediately** with notification
4. **✅ Can test printing** with one click

This confirms the app is working correctly and isolates the Google Sheets issue.

---

## 📞 **App Status Check**
- ✅ **Main App**: Running at `http://localhost:3000`
- ✅ **CSV Test API**: Working at `/api/test-csv`
- ✅ **Manual Orders**: Working for testing
- ✅ **Real-time Notifications**: WebSocket service running
- ✅ **Database**: SQLite with Prisma configured

**The issue is likely with your Google Sheet setup, not the app.**