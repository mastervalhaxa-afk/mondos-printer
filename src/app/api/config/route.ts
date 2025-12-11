import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
        id: config.id,
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        lastSyncRow: config.lastSyncRow,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    })

  } catch (error) {
    console.error('Error getting config:', error)
    return NextResponse.json({ 
      error: 'Failed to get configuration' 
    }, { status: 500 })
  }
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

    // Deactivate all existing configs
    await db.googleSheetsConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Create new config
    const config = await db.googleSheetsConfig.create({
      data: {
        spreadsheetId,
        sheetName,
        lastSyncRow: 1,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: {
        id: config.id,
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        isActive: config.isActive
      }
    })

  } catch (error) {
    console.error('Error saving config:', error)
    return NextResponse.json({ 
      error: 'Failed to save configuration' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, spreadsheetId, sheetName, isActive } = body

    if (!id) {
      return NextResponse.json({ 
        error: 'Config ID is required' 
      }, { status: 400 })
    }

    const config = await db.googleSheetsConfig.update({
      where: { id },
      data: {
        ...(spreadsheetId && { spreadsheetId }),
        ...(sheetName && { sheetName }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config
    })

  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json({ 
      error: 'Failed to update configuration' 
    }, { status: 500 })
  }
}