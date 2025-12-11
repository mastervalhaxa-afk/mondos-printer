import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, tableNumber, items, totalAmount } = body

    if (!customerName || !items || !totalAmount) {
      return NextResponse.json({ 
        error: 'Customer name, items, and total amount are required' 
      }, { status: 400 })
    }

    // Create manual order
    const order = await db.order.create({
      data: {
        customerName,
        tableNumber,
        totalAmount: parseFloat(totalAmount),
        status: 'PENDING',
        items: {
          create: items.map((item: { name: string; price: number; quantity?: number }) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1
          }))
        }
      },
      include: {
        items: true
      }
    })

    // Broadcast to WebSocket
    try {
      const response = await fetch('http://localhost:3003/broadcast-new-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          items: order.items.map(item => item.name),
          totalAmount: order.totalAmount,
          status: 'pending',
          timestamp: order.timestamp.toISOString()
        })
      })
      console.log('Broadcast result:', response.ok)
    } catch (error) {
      console.error('Failed to broadcast manual order:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Manual order created successfully',
      order: {
        id: order.id,
        customerName: order.customerName,
        tableNumber: order.tableNumber,
        items: order.items.map(item => item.name),
        totalAmount: order.totalAmount,
        status: 'pending',
        timestamp: order.timestamp.toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating manual order:', error)
    return NextResponse.json({ 
      error: 'Failed to create manual order' 
    }, { status: 500 })
  }
}