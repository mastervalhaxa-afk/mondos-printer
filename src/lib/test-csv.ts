// Test CSV connection function
export async function testCSVConnection(spreadsheetId: string) {
  if (!spreadsheetId) {
    return {
      success: false,
      error: 'Please enter Spreadsheet ID first'
    }
  }

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
    
    const response = await fetch(csvUrl, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Restaurant-Bill-Printer/1.0)'
      }
    })

    const contentType = response.headers.get('content-type')
    
    if (response.status === 200 && contentType?.includes('text/csv')) {
      return {
        success: true,
        message: 'Google Sheet is accessible for CSV export',
        details: {
          csvUrl,
          contentType
        }
      }
    } else {
      return {
        success: false,
        error: 'Google Sheet is not accessible for CSV export',
        details: {
          status: response.status,
          contentType,
          csvUrl,
          possibleIssues: [
            'Sheet is not public (not shared with "Anyone with link")',
            'Sheet does not exist',
            'Spreadsheet ID is incorrect'
          ]
        }
      }
    }
    
  } catch (error) {
    console.error('CSV URL test error:', error)
    return {
      success: false,
      error: 'Failed to test CSV export URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}