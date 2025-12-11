'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, Printer, Settings, RefreshCw, Clock, Users, Sheet, Save, Plus, Bluetooth, Wifi, Sun, Moon, Trash2, AlertTriangle } from 'lucide-react'
import { toast, useToast } from '@/hooks/use-toast'
import { io, Socket } from 'socket.io-client'
import { ClientOnly } from '@/components/ui/client-only'
import { SetupGuide } from '@/components/setup-guide'

interface OrderItem {
  id: string
  customerName: string
  items: string[]
  totalAmount: number
  status: 'pending' | 'printing' | 'printed' | 'error'
  timestamp: string
  tableNumber?: string
}

interface NotificationPopup {
  id: string
  order: OrderItem
  isVisible: boolean
}

interface GoogleSheetsConfig {
  id: string
  spreadsheetId: string
  sheetName: string
  lastSyncRow: number
  isActive: boolean
}

interface BluetoothPrinter {
  id: string
  name: string
  isConnected: boolean
  address?: string
}

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [notifications, setNotifications] = useState<NotificationPopup[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [configForm, setConfigForm] = useState({
    spreadsheetId: '',
    sheetName: ''
  })
  const [socket, setSocket] = useState<Socket | null>(null)
  const [showManualOrder, setShowManualOrder] = useState(false)
  const [manualOrderForm, setManualOrderForm] = useState({
    customerName: '',
    tableNumber: '',
    items: [{ name: '', price: 0, quantity: 1 }],
    totalAmount: 0
  })
  const [testingConnection, setTestingConnection] = useState(false)
  const [bluetoothPrinters, setBluetoothPrinters] = useState<BluetoothPrinter[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<BluetoothPrinter | null>(null)
  const [isScanningPrinters, setIsScanningPrinters] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState('google-sheets')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [mounted, setMounted] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<OrderItem | null>(null)
  const { toast } = useToast()

  // Helper function to deduplicate and merge orders
  const mergeOrders = (existingOrders: OrderItem[], newOrders: OrderItem[]) => {
    const orderMap = new Map<string, OrderItem>()
    
    // Add existing orders to map
    existingOrders.forEach(order => {
      orderMap.set(order.id, order)
    })
    
    // Add/overwrite with new orders
    newOrders.forEach(order => {
      orderMap.set(order.id, order)
    })
    
    // Convert back to array and sort by timestamp (newest first)
    return Array.from(orderMap.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  // Generate unique key for React components
  const getUniqueOrderKey = (order: OrderItem, index: number) => {
    // Use order ID plus index to ensure uniqueness within the current render
    return `order-${order.id}-${index}`
  }

  // Load initial data and configuration
  useEffect(() => {
    loadConfig()
    loadInitialData()
    initializeWebSocket()
    const interval = setInterval(checkForNewOrders, 15000) // Check every 15 seconds
    return () => {
      clearInterval(interval)
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  // Load dark mode preference and initialize time
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    }
    
    // Update time every second
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Show setup guide if no config
  useEffect(() => {
    if (!config && !isLoading) {
      toast({
        title: "Google Sheets Not Configured",
        description: "Click Settings to configure Google Sheets integration"
      })
    }
  }, [config, isLoading])

  // Dark mode toggle function
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const initializeWebSocket = () => {
    try {
      const newSocket = io('/?XTransformPort=3003')
      
      newSocket.on('connect', () => {
        console.log('Connected to notification service')
        newSocket.emit('ready', { clientType: 'restaurant-dashboard' })
      })

      newSocket.on('new-order', (notification) => {
        console.log('Received new order notification:', notification)
        showNotification(notification.data)
        setOrders(prev => mergeOrders(prev, [notification.data]))
        toast({
          title: "New Order",
          description: notification.message
        })
      })

      newSocket.on('print-status', (notification) => {
        console.log('Received print status notification:', notification)
        setOrders(prev => 
          prev.map(order => 
            order.id === notification.orderId 
              ? { ...order, status: notification.status as any }
              : order
          )
        )
        toast({
          title: "Print Status",
          description: notification.message
        })
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from notification service')
      })

      setSocket(newSocket)
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
    }
  }

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()
      
      if (data.configured) {
        setConfig(data.config)
        setConfigForm({
          spreadsheetId: data.config.spreadsheetId,
          sheetName: data.config.sheetName
        })
        setIsConnected(true)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const testCSVConnection = async () => {
    if (!configForm.spreadsheetId) {
      toast({
        title: "Error",
        description: "Please enter Spreadsheet ID first",
        variant: "destructive"
      })
      return
    }

    setTestingConnection(true)
    try {
      const response = await fetch('/api/test-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: configForm.spreadsheetId
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✅ CSV URL Accessible!",
          description: "Your Google Sheet can be read."
        })
        console.log('CSV Test Success:', data.details)
      } else {
        toast({
          title: "❌ CSV URL Failed",
          description: data.error,
          variant: "destructive"
        })
        console.error('CSV Test Failed:', data.details)
      }
    } catch (error) {
      toast({
        title: "❌ CSV Test Failed",
        description: "Could not connect to the CSV URL",
        variant: "destructive"
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const testConnection = async () => {
    if (!configForm.spreadsheetId || !configForm.sheetName) {
      toast({
        title: "Error",
        description: "Please enter Spreadsheet ID and Sheet Name first",
        variant: "destructive"
      })
      return
    }

    setTestingConnection(true)
    try {
      const response = await fetch('/api/test-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: configForm.spreadsheetId,
          sheetName: configForm.sheetName
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✅ Connection Successful!",
          description: "Your Google Sheet is accessible."
        })
      } else {
        toast({
          title: "❌ Connection Failed",
          description: data.error,
          variant: "destructive"
        })
        console.error('Connection test details:', data.details)
      }
    } catch (error) {
      toast({
        title: "❌ Connection Test Failed",
        description: "Could not connect to Google Sheets",
        variant: "destructive"
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const saveConfig = async () => {
    if (!configForm.spreadsheetId || !configForm.sheetName) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
        setIsConnected(true)
        setShowSettings(false)
        toast({
          title: "Success",
          description: "Configuration saved successfully"
        })
      } else {
        throw new Error('Failed to save config')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncGoogleSheets = async () => {
    if (!config) {
      toast({
        title: "Error",
        description: "Please configure Google Sheets first",
        variant: "destructive"
      })
      return
    }

    setSyncInProgress(true)
    try {
      const response = await fetch('/api/google-sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: config.spreadsheetId,
          sheetName: config.sheetName
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.newOrders.length > 0) {
          setOrders(prev => mergeOrders(prev, data.newOrders))
          data.newOrders.forEach((order: OrderItem) => {
            showNotification(order)
          })
          toast({
            title: "Sync Complete",
            description: `Synced ${data.newOrders.length} new orders`
          })
        } else {
          toast({
            title: "No New Orders",
            description: "No new orders found"
          })
        }
        setLastSync(new Date())
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync Google Sheets",
        variant: "destructive"
      })
    } finally {
      setSyncInProgress(false)
    }
  }

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      } else {
        // Fallback to mock data if API fails
        const mockOrders: OrderItem[] = [
          {
            id: '1',
            customerName: 'John Doe',
            items: ['Burger', 'Fries', 'Coke'],
            totalAmount: 15.99,
            status: 'printed',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            tableNumber: 'T5'
          },
          {
            id: '2',
            customerName: 'Jane Smith',
            items: ['Pizza', 'Salad'],
            totalAmount: 22.50,
            status: 'pending',
            timestamp: new Date(Date.now() - 120000).toISOString(),
            tableNumber: 'T3'
          }
        ]
        setOrders(mockOrders)
        setLastSync(new Date())
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkForNewOrders = async () => {
    try {
      // Check for new orders
      const response = await fetch('/api/orders/check-new')
      if (response.ok) {
        const newOrders = await response.json()
        if (newOrders.length > 0) {
          setOrders(prev => mergeOrders(prev, newOrders))
          newOrders.forEach((order: OrderItem) => {
            showNotification(order)
          })
        }
      }
    } catch (error) {
      console.error('Error checking for new orders:', error)
    }
  }

  const showNotification = (order: OrderItem) => {
    const notification: NotificationPopup = {
      id: `notif-${order.id}`,
      order,
      isVisible: true
    }
    
    setNotifications(prev => [...prev, notification])
    toast({
      title: "New Order!",
      description: `New order from ${order.customerName}!`
    })

    // Auto-hide notification after 60 seconds
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isVisible: false } : n)
      )
      
      // Remove notification completely after animation
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 1000)
    }, 60000)
  }

  const hideNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isVisible: false } : n)
    )
    
    // Remove notification completely after animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    }, 1000)
  }

  const handlePrintBill = async (order: OrderItem) => {
    try {
      setOrders(prev => 
        prev.map(o => o.id === order.id ? { ...o, status: 'printing' } : o)
      )

      const response = await fetch('/api/print/bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      })

      if (response.ok) {
        setOrders(prev => 
          prev.map(o => o.id === order.id ? { ...o, status: 'printed' } : o)
        )
        toast({
          title: "Bill Printed",
          description: `Bill printed for ${order.customerName}`
        })
      } else {
        throw new Error('Print failed')
      }
    } catch (error) {
      setOrders(prev => 
        prev.map(o => o.id === order.id ? { ...o, status: 'error' } : o)
      )
      toast({
        title: "Print Failed",
        description: "Failed to print bill",
        variant: "destructive"
      })
    }
  }

  const handleDeleteOrder = (order: OrderItem) => {
    setOrderToDelete(order)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return

    try {
      const response = await fetch('/api/orders/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderToDelete.id })
      })

      if (response.ok) {
        setOrders(prev => prev.filter(o => o.id !== orderToDelete!.id))
        toast({
          title: "Order Deleted",
          description: `Order for ${orderToDelete!.customerName} has been deleted`
        })
        setDeleteConfirmOpen(false)
        setOrderToDelete(null)
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete order",
        variant: "destructive"
      })
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    await checkForNewOrders()
    setLastSync(new Date())
    setIsLoading(false)
    toast({
      title: "Data Refreshed",
      description: "Orders data has been refreshed"
    })
  }

  const getStatusColor = (status: OrderItem['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'printing': return 'bg-blue-100 text-blue-800'
      case 'printed': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateManualOrder = async () => {
    if (!manualOrderForm.customerName || manualOrderForm.items.some(item => !item.name)) {
      toast({
        title: "Error",
        description: "Please fill in customer name and at least one item",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/manual-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualOrderForm)
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success",
          description: data.message
        })
        setShowManualOrder(false)
        setManualOrderForm({
          customerName: '',
          tableNumber: '',
          items: [{ name: '', price: 0, quantity: 1 }],
          totalAmount: 0
        })
      } else {
        throw new Error('Failed to create manual order')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create manual order",
        variant: "destructive"
      })
    }
  }

  const updateManualOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...manualOrderForm.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    setManualOrderForm(prev => ({
      ...prev,
      items: updatedItems,
      totalAmount
    }))
  }

  const addManualOrderItem = () => {
    setManualOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { name: '', price: 0, quantity: 1 }]
    }))
  }

  const removeManualOrderItem = (index: number) => {
    const updatedItems = manualOrderForm.items.filter((_, i) => i !== index)
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    setManualOrderForm(prev => ({
      ...prev,
      items: updatedItems,
      totalAmount
    }))
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  // Bluetooth printer functions
  const scanBluetoothPrinters = async () => {
    setIsScanningPrinters(true)
    try {
      // Simulate Bluetooth scanning (in real implementation, use Web Bluetooth API)
      const mockPrinters: BluetoothPrinter[] = [
        { id: '1', name: 'HP DeskJet 2600', isConnected: false, address: '00:1A:7D:DA:71:13' },
        { id: '2', name: 'Canon PIXMA MG3620', isConnected: false, address: '00:1B:44:11:3A:B7' },
        { id: '3', name: 'Epson TM-T88V', isConnected: false, address: '00:13:7B:4A:1F:92' }
      ]
      
      // Simulate scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setBluetoothPrinters(mockPrinters)
      toast({
        title: "Scan Complete",
        description: `Found ${mockPrinters.length} Bluetooth printers`
      })
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: "Could not scan for Bluetooth printers",
        variant: "destructive"
      })
    } finally {
      setIsScanningPrinters(false)
    }
  }

  const connectBluetoothPrinter = async (printer: BluetoothPrinter) => {
    try {
      // Simulate Bluetooth connection
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Update printer connection status
      setBluetoothPrinters(prev => 
        prev.map(p => 
          p.id === printer.id 
            ? { ...p, isConnected: true }
            : { ...p, isConnected: false }
        )
      )
      setSelectedPrinter(printer)
      
      toast({
        title: "Printer Connected",
        description: `Successfully connected to ${printer.name}`
      })
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${printer.name}`,
        variant: "destructive"
      })
    }
  }

  const disconnectBluetoothPrinter = async () => {
    if (!selectedPrinter) return
    
    try {
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setBluetoothPrinters(prev => 
        prev.map(p => ({ ...p, isConnected: false }))
      )
      setSelectedPrinter(null)
      
      toast({
        title: "Printer Disconnected",
        description: "Bluetooth printer disconnected"
      })
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: "Could not disconnect printer",
        variant: "destructive"
      })
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <ClientOnly fallback={<div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 p-4">Loading...</div>}>
      <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'}`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-4xl font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MONDOS PRINTER</h1>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{currentTime}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {lastSync && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-full border ${isDarkMode ? 'text-gray-300 bg-gray-800 border-gray-700' : 'text-gray-600 bg-white border-gray-200'}`}>
                <Clock className="w-4 h-4" />
                Last sync: {formatTime(lastSync.toISOString())}
              </div>
            )}
            {selectedPrinter && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-full border ${isDarkMode ? 'text-gray-300 bg-gray-800 border-gray-700' : 'text-gray-600 bg-white border-gray-200'}`}>
                <Bluetooth className="w-4 h-4 text-blue-400" />
                {selectedPrinter.name}
              </div>
            )}
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="btn-secondary text-xs px-2 py-1 h-7"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={syncGoogleSheets}
              disabled={!config || syncInProgress}
              variant="outline"
              size="sm"
              className="btn-primary text-xs px-2 py-1 h-7"
            >
              <Sheet className={`w-3 h-3 mr-1 ${syncInProgress ? 'animate-spin' : ''}`} />
              {syncInProgress ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              onClick={toggleDarkMode}
              variant="outline"
              size="sm"
              className="btn-secondary text-xs px-2 py-1 h-7"
            >
              {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            </Button>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={`${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700' : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'} text-xs px-2 py-1 h-7`}>
                  <Settings className="w-3 h-3 mr-1" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>
                    Configure your Google Sheets integration and Bluetooth printer settings.
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="google-sheets">Google Sheets</TabsTrigger>
                    <TabsTrigger value="bluetooth">Bluetooth Printer</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="google-sheets" className="space-y-4">
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="spreadsheetId" className="text-right">
                          Spreadsheet ID
                        </Label>
                        <Input
                          id="spreadsheetId"
                          placeholder="your-sheet-id"
                          value={configForm.spreadsheetId}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, spreadsheetId: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="sheetName" className="text-right">
                          Sheet Name
                        </Label>
                        <Input
                          id="sheetName"
                          placeholder="Orders"
                          value={configForm.sheetName}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, sheetName: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={syncGoogleSheets}
                        disabled={!config || syncInProgress}
                      >
                        <Sheet className={`w-4 h-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
                        {syncInProgress ? 'Syncing...' : 'Sync Now'}
                      </Button>
                      <Button onClick={saveConfig} disabled={isLoading}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Config
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="bluetooth" className="space-y-4">
                    <div className="py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Bluetooth Printers</h4>
                          <p className="text-sm text-muted-foreground">Connect a Bluetooth printer for bill printing</p>
                        </div>
                        <Button
                          onClick={scanBluetoothPrinters}
                          disabled={isScanningPrinters}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Bluetooth className={`w-4 h-4 ${isScanningPrinters ? 'animate-pulse' : ''}`} />
                          {isScanningPrinters ? 'Scanning...' : 'Scan Printers'}
                        </Button>
                      </div>
                      
                      {bluetoothPrinters.length > 0 && (
                        <div className="space-y-2">
                          <Label>Available Printers</Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {bluetoothPrinters.map((printer) => (
                              <div key={printer.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${printer.isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  <div>
                                    <p className="font-medium">{printer.name}</p>
                                    <p className="text-sm text-muted-foreground">{printer.address}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {!printer.isConnected ? (
                                    <Button
                                      size="sm"
                                      onClick={() => connectBluetoothPrinter(printer)}
                                      disabled={selectedPrinter?.isConnected}
                                    >
                                      <Wifi className="w-4 h-4 mr-1" />
                                      Connect
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={disconnectBluetoothPrinter}
                                    >
                                      Disconnect
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedPrinter && (
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <div>
                              <p className="font-medium">Connected to {selectedPrinter.name}</p>
                              <p className="text-sm text-muted-foreground">Ready for printing</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showManualOrder} onOpenChange={setShowManualOrder}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                  <Plus className="w-4 h-4 mr-2" />
                  Manual Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Manual Order</DialogTitle>
                  <DialogDescription>
                    Add an order manually for testing or backup purposes.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="customerName" className="text-right">
                      Customer Name
                    </Label>
                    <Input
                      id="customerName"
                      placeholder="Customer name"
                      value={manualOrderForm.customerName}
                      onChange={(e) => setManualOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tableNumber" className="text-right">
                      Table Number
                    </Label>
                    <Input
                      id="tableNumber"
                      placeholder="T1"
                      value={manualOrderForm.tableNumber}
                      onChange={(e) => setManualOrderForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                      className="col-span-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Items</Label>
                    {manualOrderForm.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateManualOrderItem(index, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.price}
                          onChange={(e) => updateManualOrderItem(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateManualOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeManualOrderItem(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addManualOrderItem}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-semibold">
                      Total Amount
                    </Label>
                    <div className="col-span-3 text-lg font-semibold">
                      €{manualOrderForm.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateManualOrder}>
                    Create Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Setup Guide - Show when no Google Sheets configured */}
      {!config && !isLoading && (
        <SetupGuide onOpenSettings={() => setShowSettings(true)} />
      )}

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className={`hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Orders</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{orders.length}</p>
              </div>
              <Users className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={`hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {orders.filter(o => o.status === 'pending').length}
                </p>
              </div>
              <Bell className="w-10 h-10 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={`hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Printed</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {orders.filter(o => o.status === 'printed').length}
                </p>
              </div>
              <Printer className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={`hover:shadow-lg transition-shadow ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Revenue</p>
                <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  €{orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-900 rounded-full flex items-center justify-center">
                <span className="text-green-400 font-bold text-lg">€</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto">
        <Card className={`shadow-lg ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardHeader className="pb-4">
            <CardTitle className={`text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Orders</CardTitle>
            <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Orders from Google Sheets</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {orders.length === 0 ? (
                <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <svg className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No orders found</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Waiting for data from Google Sheets...</p>
                    </div>
                  </div>
                </div>
              ) : (
                orders.map((order, index) => (
                  <div key={getUniqueOrderKey(order, index)} className={`border rounded-lg p-4 hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.customerName}</h3>
                          {order.tableNumber && (
                            <p className={`text-sm flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Table {order.tableNumber}
                            </p>
                          )}
                        </div>
                        <Badge className={`${getStatusColor(order.status)} px-3 py-1 text-xs font-medium`}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>€{order.totalAmount.toFixed(2)}</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatTime(order.timestamp)}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Items:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item, index) => (
                          <Badge key={index} variant="outline" className={`text-xs px-2 py-1 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handlePrintBill(order)}
                            size="sm"
                            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 h-7"
                          >
                            <Printer className="w-3 h-3" />
                            Print Bill
                          </Button>
                          <Button
                            onClick={() => handleDeleteOrder(order)}
                            size="sm"
                            variant="destructive"
                            className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Order
                          </Button>
                        </>
                      )}
                      {order.status === 'error' && (
                        <>
                          <Button
                            onClick={() => handlePrintBill(order)}
                            size="sm"
                            variant="destructive"
                            className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                          >
                            <Printer className="w-3 h-3" />
                            Retry Print
                          </Button>
                          <Button
                            onClick={() => handleDeleteOrder(order)}
                            size="sm"
                            variant="destructive"
                            className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Order
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Popups */}
      {notifications.filter(n => n.isVisible).map((notification) => (
        <div
          key={notification.id}
          className={`fixed top-4 right-4 border rounded-lg shadow-xl p-4 max-w-sm z-50 animate-in slide-in-from-right duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
              <Bell className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>New Order!</h4>
                <button
                  onClick={() => hideNotification(notification.id)}
                  className={`transition-colors p-1 rounded-full ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  aria-label="Close notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6L18 6" />
                  </svg>
                </button>
              </div>
              <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {notification.order.customerName} - €{notification.order.totalAmount.toFixed(2)}
              </p>
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1 h-7"
                onClick={() => handlePrintBill(notification.order)}
              >
                <Printer className="w-3 h-3 mr-1" />
                Print Bill
              </Button>
            </div>
          </div>
        </div>
      ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {orderToDelete && (
            <div className="py-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">Customer:</span>
                  <span className="text-gray-700 dark:text-gray-300">{orderToDelete.customerName}</span>
                </div>
                {orderToDelete.tableNumber && (
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">Table:</span>
                    <span className="text-gray-700 dark:text-gray-300">{orderToDelete.tableNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">Amount:</span>
                  <span className="text-gray-700 dark:text-gray-300">€{orderToDelete.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="font-medium text-gray-900 dark:text-white">Status:</span>
                  <Badge className={`${getStatusColor(orderToDelete.status)} px-2 py-1 text-xs`}>
                    {orderToDelete.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setOrderToDelete(null)
              }}
              className="text-xs px-3 py-1 h-8"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrder}
              className="text-xs px-3 py-1 h-8"
            >
              Delete Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ClientOnly>
  )
}