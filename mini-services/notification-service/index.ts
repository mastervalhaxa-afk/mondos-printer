import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'

const PORT = 3003
const server = createServer()
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Store connected clients
const connectedClients = new Set()

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  connectedClients.add(socket.id)

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
    connectedClients.delete(socket.id)
  })

  // Handle client ready event
  socket.on('ready', (data) => {
    console.log(`Client ${socket.id} ready:`, data)
    socket.emit('connected', { 
      message: 'Connected to notification service',
      clientId: socket.id,
      timestamp: new Date().toISOString()
    })
  })

  // Handle custom events
  socket.on('mark-notification-read', (notificationId) => {
    console.log(`Notification ${notificationId} marked as read`)
    // In a real implementation, this would update the database
  })
})

// Function to broadcast new order notifications
export function broadcastNewOrder(orderData: any) {
  const notification = {
    id: `notif-${Date.now()}`,
    type: 'new_order',
    data: orderData,
    timestamp: new Date().toISOString(),
    message: `New order from ${orderData.customerName} - $${orderData.totalAmount.toFixed(2)}`
  }

  io.emit('new-order', notification)
  console.log(`Broadcasted new order notification to ${connectedClients.size} clients`)
}

// Function to broadcast print status updates
export function broadcastPrintStatus(orderId: string, status: string) {
  const notification = {
    id: `print-${Date.now()}`,
    type: 'print_status',
    orderId,
    status,
    timestamp: new Date().toISOString(),
    message: `Order ${orderId} print status: ${status}`
  }

  io.emit('print-status', notification)
  console.log(`Broadcasted print status for order ${orderId}: ${status}`)
}

// HTTP endpoint for broadcasting
server.on('request', async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'healthy',
      connectedClients: connectedClients.size,
      timestamp: new Date().toISOString()
    }))
  } else if (req.url === '/broadcast-new-order' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        const orderData = JSON.parse(body)
        broadcastNewOrder(orderData)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      })
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid request' }))
    }
  } else if (req.url === '/broadcast-print-status' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        const { orderId, status } = JSON.parse(body)
        broadcastPrintStatus(orderId, status)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      })
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid request' }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`)
  console.log(`Health check available at http://localhost:${PORT}/health`)
})