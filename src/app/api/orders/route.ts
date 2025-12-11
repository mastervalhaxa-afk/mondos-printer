import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const orders = await db.order.findMany({
      include: {
        items: true,
        bills: true
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50
    })

    const formattedOrders = orders.map(order => ({
      id: order.id,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      items: order.items.map(item => item.name),
      totalAmount: order.totalAmount,
      status: order.status.toLowerCase() as 'pending' | 'printing' | 'printed' | 'error',
      timestamp: order.timestamp.toISOString()
    }))

    return NextResponse.json(formattedOrders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerName, tableNumber, items, totalAmount } = body

    const order = await db.order.create({
      data: {
        customerName,
        tableNumber,
        totalAmount,
        status: 'PENDING',
        items: {
          create: items.map((item: { name: string; price: number; quantity: number }) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        }
      },
      include: {
        items: true
      }
    })

    return NextResponse.json({
      id: order.id,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      items: order.items.map(item => item.name),
      totalAmount: order.totalAmount,
      status: order.status.toLowerCase(),
      timestamp: order.timestamp.toISOString()
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}