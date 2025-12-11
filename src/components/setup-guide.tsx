import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, Settings, ArrowRight, Check } from 'lucide-react'

interface SetupGuideProps {
  onOpenSettings: () => void
}

export function SetupGuide({ onOpenSettings }: SetupGuideProps) {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Settings className="w-5 h-5" />
          Google Sheets Setup Required
        </CardTitle>
        <CardDescription>
          Connect your Google Spreadsheet to start receiving live orders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-800">Step 1: Create Google Sheet</h4>
            <ul className="text-sm text-blue-700 space-y-1 ml-4">
              <li>• Go to <a href="https://sheets.google.com" target="_blank" className="underline hover:text-blue-900">Google Sheets</a></li>
              <li>• Create a new spreadsheet</li>
              <li>• Name the sheet "Orders" (or your preferred name)</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-800">Step 2: Set Up Columns</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>Set up these columns in your sheet:</p>
              <div className="bg-white p-3 rounded border border-blue-200 font-mono text-xs">
                A: customerName | B: tableNumber | C: items | D: totalAmount | E: timestamp
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-800">Step 3: Get Spreadsheet ID</h4>
            <ul className="text-sm text-blue-700 space-y-1 ml-4">
              <li>• From your sheet URL: <code className="bg-white px-1 rounded">docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit</code></li>
              <li>• Copy the <strong>SPREADSHEET_ID</strong> part</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-800">Step 4: Configure App</h4>
            <ul className="text-sm text-blue-700 space-y-1 ml-4">
              <li>• Click the Settings button below</li>
              <li>• Enter your Spreadsheet ID</li>
              <li>• Enter your sheet name</li>
              <li>• Click "Save Config"</li>
            </ul>
          </div>
        </div>
        
        <Button 
          onClick={onOpenSettings}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Settings className="w-4 h-4 mr-2" />
          Open Settings to Configure
        </Button>
      </CardContent>
    </Card>
  )
}