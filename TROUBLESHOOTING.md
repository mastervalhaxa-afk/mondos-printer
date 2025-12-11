# 🔧 Google Sheets Sync Troubleshooting Guide

## ❓ **Why Sync Might Not Work**

### **Most Common Issues:**

1. **🔒 Sheet Not Public**
   - Google Sheets must be publicly accessible for CSV export
   - Private sheets require complex authentication

2. **📋 Wrong Column Headers**
   - Headers must match exactly: `customerName`, `tableNumber`, `items`, `totalAmount`, `timestamp`
   - Case-sensitive and no spaces

3. **🆔 Wrong Spreadsheet ID**
   - Must extract from URL correctly
   - Format: `1BxiMVs0XRA5nFMdKvBdBZjgmLvC8g`

4. **🌐 Network/Access Issues**
   - Firewall blocking requests
   - CORS restrictions
   - Rate limiting

---

## 🛠️ **Step-by-Step Troubleshooting**

### **Step 1: Test Connection**
1. Click **"Test Connection"** button in Settings
2. Check the results:
   - ✅ **Success**: Sheet is accessible, proceed to Step 3
   - ❌ **Failed**: Follow the error details

### **Step 2: Make Sheet Public** (If Connection Fails)
1. Open your Google Sheet
2. Click **"Share"** (top right)
3. Under **"General access"**, select **"Anyone with the link"**
4. Under **"Viewer"**, select **"Can view"**
5. Click **"Done"**
6. Try **"Test Connection"** again

### **Step 3: Verify Column Headers**
1. **Row 1** must contain exactly:
   ```
   A1: customerName
   B1: tableNumber  
   C1: items
   D1: totalAmount
   E1: timestamp
   ```

2. **No extra spaces** or special characters
3. **Case-sensitive**: `customerName` (not `CustomerName`)

### **Step 4: Check Spreadsheet ID**
From your sheet URL: `docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID`**`/edit`

- ✅ **Correct**: `1BxiMVs0XRA5nFMdKvBdBZjgmLvC8g`
- ❌ **Wrong**: `d/1BxiMVs0XRA5nFMdKvBdBZjgmLvC8g/edit`

### **Step 5: Test CSV Export Directly**
Try this URL in your browser:
```
https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/export?format=csv&gid=0
```

- ✅ **Downloads CSV**: Sheet is public
- ❌ **Access Denied**: Sheet needs to be made public

---

## 🚨 **Error Messages & Solutions**

### **"Failed to connect to Google Sheets"**
**Causes:**
- Sheet is private
- Wrong spreadsheet ID
- Network issues

**Solutions:**
1. Make sheet public (Step 2)
2. Verify spreadsheet ID (Step 4)
3. Check network connection

### **"No new data found"**
**Causes:**
- Empty rows below header
- All rows already processed
- Wrong sheet name

**Solutions:**
1. Add new test data to Row 2+
2. Check `lastSyncRow` in database
3. Verify sheet name matches exactly

### **"Failed to fetch data from Google Sheets"**
**Causes:**
- CSV parsing errors
- Invalid data format
- Rate limiting

**Solutions:**
1. Check data format in your sheet
2. Wait a few minutes and retry
3. Use manual orders for testing

---

## 🔍 **Debug Information**

### **Check Browser Console**
1. Open Developer Tools (F12)
2. Look for network errors
3. Check API response messages

### **Check Server Logs**
```bash
# Check recent sync attempts
tail -20 /home/z/my-project/dev.log

# Check Google Sheets API calls
grep "Google Sheets" /home/z/my-project/dev.log
```

### **Test with Manual Orders**
1. Click **"Manual Order"** button
2. Create test order
3. Verify it appears immediately
4. This confirms app is working

---

## 📞 **Get Help**

### **Still Not Working?**
1. **Test Manual Orders**: Confirms app works
2. **Check Connection Test**: Shows specific error details
3. **Verify Sheet Setup**: Use the checklist above
4. **Check Network**: Ensure no firewall blocking

### **Alternative Solutions**
1. **Use Manual Orders**: While troubleshooting Google Sheets
2. **Export/Import**: Manual CSV upload feature
3. **Direct API**: Use other order sources

---

## ✅ **Quick Fix Checklist**

Before contacting support, verify:
- [ ] Sheet is publicly accessible
- [ ] Column headers are exact
- [ ] Spreadsheet ID is correct
- [ ] Connection test passes
- [ ] Manual orders work
- [ ] No browser console errors
- [ ] Network connectivity is stable

If all checked and still not working, the issue may be:
- Server-side rate limiting
- Google Sheets API changes
- Network infrastructure issues

**Try again in 10-15 minutes** as many issues are temporary.