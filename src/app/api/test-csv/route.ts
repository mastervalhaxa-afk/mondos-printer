import { NextRequest, NextResponse } from 'next/server'
import { testCSVConnection } from '@/lib/test-csv'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spreadsheetId } = body

    if (!spreadsheetId) {
      return NextResponse.json({ 
        error: 'Spreadsheet ID is required' 
      }, { status: 400 })
    }

    const result = await testCSVConnection(spreadsheetId)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Request parsing error:', error)
    return NextResponse.json({
      success: false,
      error: 'Invalid request format'
    }, { status: 400 })
  }
}