import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchGoogleSheetsDataCSV, testGoogleSheetsConnectionCSV } from '@/lib/google-sheets-csv'

// WebSocket notification function
async function broadcastNewOrder(orderData: any) {
  try {
    const response = await fetch('http://localhost:3003/broadcast-new-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    return response.ok
  } catch (error) {
    console.error('Failed to broadcast new order:', error)
    return false
  }
}

async function processSheetData(sheetData: any[]) {
  const newOrders = []
  
  for (const row of sheetData) {
    // Check if this order already exists
    const existingOrder = await db.order.findFirst({
      where: {
        sheetRowId: row.row.toString()
      }
    })
    
    if (!existingOrder) {
      // Parse items from comma-separated string
      const items = row.items.split(',').map((itemName: string) => ({
        name: itemName.trim(),
        price: Math.random() * 20 + 5, // Mock price calculation
        quantity: 1
      }))
      
      // Create new order
      const order = await db.order.create({
        data: {
          customerName: row.customerName,
          tableNumber: row.tableNumber,
          totalAmount: row.totalAmount,
          status: 'PENDING',
          sheetRowId: row.row.toString(),
          timestamp: new Date(row.timestamp),
          items: {
            create: items
          }
        },
        include: {
          items: true
        }
      })
      
      const formattedOrder = {
        id: order.id,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        items: order.items.map(item => item.name),
        totalAmount: order.totalAmount,
        status: 'pending',
        timestamp: order.timestamp.toISOString()
      }
      
      newOrders.push(formattedOrder)
      
      // Broadcast new order via WebSocket
      await broadcastNewOrder(formattedOrder)
    }
  }
  
  return newOrders
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spreadsheetId, sheetName } = body

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json({ 
        error: 'Spreadsheet ID and sheet name are required' 
      }, { status: 400 })
    }

    // Test Google Sheets connection first (using CSV method)
    const isConnected = await testGoogleSheetsConnectionCSV(spreadsheetId, sheetName)
    if (!isConnected) {
      return NextResponse.json({ 
        error: 'Failed to connect to Google Sheets. Please check:',
        details: [
          '1. Spreadsheet ID is correct',
          '2. Sheet is publicly accessible',
          '3. Sheet has correct column headers: customerName, tableNumber, items, totalAmount, timestamp',
          '4. Try making sheet public: File → Share → Publish to web'
        ]
      }, { status: 500 })
    }

    // Get or create Google Sheets config
    let config = await db.googleSheetsConfig.findFirst({
      where: { isActive: true }
    })

    if (!config) {
      config = await db.googleSheetsConfig.create({
        data: {
          spreadsheetId,
          sheetName,
          lastSyncRow: 1,
          isActive: true
        }
      })
    }

    // Fetch data from Google Sheets (using CSV method)
    const sheetData = await fetchGoogleSheetsDataCSV(
      config.spreadsheetId,
      config.sheetName,
      config.lastSyncRow
    )

    if (sheetData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new data found',
        newOrders: []
      })
    }

    // Process the sheet data and create orders
    const newOrders = await processSheetData(sheetData)

    // Update the last sync row
    const newLastSyncRow = Math.max(...sheetData.map(row => row.row))
    await db.googleSheetsConfig.update({
      where: { id: config.id },
      data: { lastSyncRow: newLastSyncRow }
    })

    return NextResponse.json({
      success: true,
      message: `Synced ${newOrders.length} new orders from Google Sheets`,
      newOrders,
      lastSyncRow: newLastSyncRow
    })

  } catch (error) {
    console.error('Error syncing Google Sheets:', error)
    return NextResponse.json({ 
      error: 'Failed to sync Google Sheets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const config = await db.googleSheetsConfig.findFirst({
      where: { isActive: true }
    })

    if (!config) {
      return NextResponse.json({
        configured: false,
        message: 'Google Sheets not configured'
      })
    }

    return NextResponse.json({
      configured: true,
      config: {
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        lastSyncRow: config.lastSyncRow,
        lastSync: config.updatedAt
      }
    })

  } catch (error) {
    console.error('Error getting Google Sheets config:', error)
    return NextResponse.json({ 
      error: 'Failed to get Google Sheets config' 
    }, { status: 500 })
  }
}