import { google } from 'googleapis'

// Google Sheets API configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || ''
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Orders'
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || ''

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: SERVICE_ACCOUNT_EMAIL,
    private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

const sheets = google.sheets({ version: 'v4', auth })

export interface GoogleSheetsOrder {
  row: number
  customerName: string
  tableNumber?: string
  items: string
  totalAmount: number
  timestamp: string
}

export async function fetchGoogleSheetsData(
  spreadsheetId: string, 
  sheetName: string, 
  startRow: number = 1
): Promise<GoogleSheetsOrder[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A${startRow}:E`,
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return []
    }

    // Skip header row if present
    const dataStartRow = startRow === 1 && rows[0][0] === 'customerName' ? 1 : 0
    
    return rows.slice(dataStartRow).map((row, index) => ({
      row: startRow + dataStartRow + index + 1,
      customerName: row[0] || '',
      tableNumber: row[1] || undefined,
      items: row[2] || '',
      totalAmount: parseFloat(row[3]) || 0,
      timestamp: row[4] || new Date().toISOString()
    })).filter(order => order.customerName && order.items && order.totalAmount > 0)

  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    throw new Error('Failed to fetch data from Google Sheets')
  }
}

export async function testGoogleSheetsConnection(
  spreadsheetId: string, 
  sheetName: string
): Promise<boolean> {
  try {
    await sheets.spreadsheets.get({ spreadsheetId })
    return true
  } catch (error) {
    console.error('Google Sheets connection test failed:', error)
    return false
  }
}