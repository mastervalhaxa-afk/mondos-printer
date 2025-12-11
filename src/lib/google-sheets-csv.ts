import { NextRequest, NextResponse } from 'next/server'

// Simple Google Sheets reader using CSV export (no auth required)
export async function fetchGoogleSheetsDataCSV(
  spreadsheetId: string, 
  sheetName: string, 
  startRow: number = 1
) {
  try {
    // Convert to CSV export URL
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
    
    const response = await fetch(csvExportUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheets CSV')
    }
    
    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return []
    }
    
    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const dataStartRow = startRow === 1 && headers[0] === 'customerName' ? 1 : 0
    
    return lines.slice(dataStartRow).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      
      return {
        row: startRow + dataStartRow + index + 1,
        customerName: values[0] || '',
        tableNumber: values[1] || undefined,
        items: values[2] || '',
        totalAmount: parseFloat(values[3]) || 0,
        timestamp: values[4] || new Date().toISOString()
      }
    }).filter(order => order.customerName && order.items && order.totalAmount > 0)
    
  } catch (error) {
    console.error('Error fetching Google Sheets CSV:', error)
    throw new Error('Failed to fetch data from Google Sheets')
  }
}

export async function testGoogleSheetsConnectionCSV(
  spreadsheetId: string, 
  sheetName: string
): Promise<boolean> {
  try {
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
    const response = await fetch(csvExportUrl)
    return response.ok
  } catch (error) {
    console.error('Google Sheets CSV connection test failed:', error)
    return false
  }
}