import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get orders from the last 5 minutes that haven't been processed
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const newOrders = await db.order.findMany({
      where: {
        timestamp: {
          gte: fiveMinutesAgo
        },
        status: 'PENDING'
      },
      include: {
        items: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    const formattedOrders = newOrders.map(order => ({
      id: order.id,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      items: order.items.map(item => item.name),
      totalAmount: order.totalAmount,
      status: 'pending',
      timestamp: order.timestamp.toISOString()
    }))

    return NextResponse.json(formattedOrders)
  } catch (error) {
    console.error('Error checking for new orders:', error)
    return NextResponse.json({ error: 'Failed to check for new orders' }, { status: 500 })
  }
}