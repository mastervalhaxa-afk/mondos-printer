import { NextRequest, NextResponse } from 'next/server'
import { testGoogleSheetsConnectionCSV } from '@/lib/google-sheets-csv'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spreadsheetId, sheetName } = body

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json({ 
        error: 'Spreadsheet ID and sheet name are required' 
      }, { status: 400 })
    }

    console.log('Testing Google Sheets connection...')
    console.log('Spreadsheet ID:', spreadsheetId)
    console.log('Sheet Name:', sheetName)

    // Test connection
    const isConnected = await testGoogleSheetsConnectionCSV(spreadsheetId, sheetName)
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to Google Sheets',
        details: {
          spreadsheetId,
          sheetName,
          csvExportUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Google Sheets',
        details: {
          spreadsheetId,
          sheetName,
          possibleIssues: [
            '1. Spreadsheet ID is incorrect',
            '2. Sheet is not publicly accessible',
            '3. Sheet has wrong column headers',
            '4. Network connectivity issues',
            '5. Sheet is deleted or moved'
          ],
          troubleshooting: [
            'Check the spreadsheet ID matches your URL',
            'Make sure the sheet is shared publicly',
            'Verify column headers: customerName, tableNumber, items, totalAmount, timestamp',
            'Try accessing the CSV export URL directly in browser'
          ]
        }
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}