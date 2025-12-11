import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// WebSocket notification function
async function broadcastPrintStatus(orderId: string, status: string) {
  try {
    const response = await fetch('http://localhost:3003/broadcast-print-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status })
    })
    return response.ok
  } catch (error) {
    console.error('Failed to broadcast print status:', error)
    return false
  }
}

// Simulate printer connection
async function connectToPrinter(printerName?: string) {
  // Simulate printer connection delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { connected: true, printer: printerName || 'Default Printer' }
}

// Generate bill content for printing
function generateBillContent(order: any) {
  const billContent = `
================================
         RESTAURANT BILL
================================

Customer: ${order.customerName}
${order.tableNumber ? `Table: ${order.tableNumber}` : ''}
Date: ${new Date(order.timestamp).toLocaleDateString()}
Time: ${new Date(order.timestamp).toLocaleTimeString()}

--------------------------------
ITEMS:
${order.items.map((item: any) => 
  `${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
).join('\n')}

--------------------------------
TOTAL: $${order.totalAmount.toFixed(2)}

================================
Thank you for dining with us!
================================
  `.trim()
  
  return billContent
}

// Simulate printing
async function printBill(content: string, printerName: string) {
  // Simulate printing delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // In a real implementation, this would:
  // 1. Connect to the actual printer via USB/Network
  // 2. Send the formatted content to the printer
  // 3. Handle printer errors and paper status
  
  console.log('Printing bill:', content)
  return { success: true, message: 'Bill printed successfully' }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, printerName } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Get order details
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true, bills: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status to printing
    await db.order.update({
      where: { id: orderId },
      data: { status: 'PRINTING' }
    })

    // Broadcast printing status
    await broadcastPrintStatus(orderId, 'printing')

    // Create or update bill record
    let bill = order.bills[0]
    if (!bill) {
      bill = await db.bill.create({
        data: {
          orderId,
          printStatus: 'PRINTING',
          printerName,
          printAttempts: 1
        }
      })
    } else {
      bill = await db.bill.update({
        where: { id: bill.id },
        data: {
          printStatus: 'PRINTING',
          printerName,
          printAttempts: bill.printAttempts + 1
        }
      })
    }

    try {
      // Connect to printer
      const printer = await connectToPrinter(printerName)
      
      // Generate bill content
      const billContent = generateBillContent(order)
      
      // Print the bill
      const printResult = await printBill(billContent, printer.printer)
      
      if (printResult.success) {
        // Update bill as printed
        await db.bill.update({
          where: { id: bill.id },
          data: {
            printStatus: 'PRINTED',
            printedAt: new Date()
          }
        })

        // Update order status
        await db.order.update({
          where: { id: orderId },
          data: { status: 'PRINTED' }
        })

        // Broadcast success status
        await broadcastPrintStatus(orderId, 'printed')

        return NextResponse.json({
          success: true,
          message: 'Bill printed successfully',
          billId: bill.id,
          printer: printer.printer
        })
      } else {
        throw new Error('Print failed')
      }
    } catch (printError) {
      console.error('Print error:', printError)
      
      // Update bill as failed
      await db.bill.update({
        where: { id: bill.id },
        data: { printStatus: 'FAILED' }
      })

      // Update order status to error
      await db.order.update({
        where: { id: orderId },
        data: { status: 'ERROR' }
      })

      // Broadcast error status
      await broadcastPrintStatus(orderId, 'error')

      return NextResponse.json(
        { error: 'Failed to print bill', billId: bill.id },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in print bill API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get all bills with their orders
    const bills = await db.bill.findMany({
      include: {
        order: {
          include: {
            items: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(bills)
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}