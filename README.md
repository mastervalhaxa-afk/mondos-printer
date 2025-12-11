# Restaurant Bill Printer - Google Sheets Integration

A comprehensive web application that connects to Google Sheets for live restaurant order management and automatic bill printing. Features real-time notifications, WebSocket communication, and seamless printer integration.

## Features

### 🔄 Live Data Synchronization
- **Google Sheets Integration**: Connect to your Google Spreadsheet for real-time order data
- **Automatic Sync**: Continuously monitors for new entries and updates
- **Configuration Management**: Easy setup through the web interface

### 🔔 Real-time Notifications
- **Instant Popups**: Get notified immediately when new orders arrive
- **WebSocket Communication**: Real-time updates without page refresh
- **Visual Status Indicators**: Track order status from pending to printed

### 🖨️ Bill Printing
- **One-Click Printing**: Print restaurant bills with a single click
- **Printer Integration**: Simulated printer connection (easily configurable for real printers)
- **Print Status Tracking**: Monitor printing progress and handle errors
- **Professional Bill Format**: Clean, formatted bill output

### 📊 Dashboard Analytics
- **Order Statistics**: View total orders, pending items, and revenue
- **Real-time Metrics**: Live updates of restaurant performance
- **Order History**: Complete log of all orders and their status

## Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (production-ready)
- **Real-time**: Socket.IO WebSocket service
- **UI Components**: Lucide icons, Sonner toast notifications

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Google account with Google Sheets access
- Printer connected to your system (optional)

### Installation

1. **Clone and Install Dependencies**
   ```bash
   cd /home/z/my-project
   npm install
   ```

2. **Database Setup**
   ```bash
   npm run db:push
   ```

3. **Start Notification Service**
   ```bash
   cd mini-services/notification-service
   npm install
   npm run dev
   ```

4. **Start Main Application**
   ```bash
   cd /home/z/my-project
   npm run dev
   ```

### Configuration

1. **Google Sheets Setup**
   - Open the web application
   - Click on "Settings" button
   - Enter your Google Spreadsheet ID
   - Enter the sheet name (e.g., "Orders")
   - Click "Save Config"

2. **Google Sheets Format**
   Your spreadsheet should have these columns:
   - `customerName`: Customer name
   - `tableNumber`: Table number (optional)
   - `items`: Comma-separated list of items
   - `totalAmount`: Total bill amount
   - `timestamp`: Order timestamp

3. **Sync Data**
   - Use the "Sync Now" button in settings to fetch new orders
   - The system automatically checks for new orders every 5 seconds

## API Endpoints

### Orders Management
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/orders/check-new` - Check for recent orders

### Configuration
- `GET /api/config` - Get Google Sheets configuration
- `POST /api/config` - Save configuration
- `PUT /api/config` - Update configuration

### Google Sheets Integration
- `POST /api/google-sheets/sync` - Sync data from Google Sheets
- `GET /api/google-sheets/sync` - Get sync status

### Printing
- `POST /api/print/bill` - Print bill for specific order
- `GET /api/print/bill` - Get all print jobs

### WebSocket Service
- `ws://localhost:3003` - Real-time notifications
- `GET http://localhost:3003/health` - Service health check

## Database Schema

### Orders
- Customer information and order details
- Status tracking (pending, printing, printed, error)
- Google Sheets row mapping

### Order Items
- Individual items with pricing
- Quantity tracking
- Order relationship

### Bills
- Print job tracking
- Printer information
- Print attempt history

### Configuration
- Google Sheets connection settings
- Sync status and row tracking

## Real-time Features

### WebSocket Events
- `new-order`: Broadcasted when new orders are detected
- `print-status`: Updates on printing progress
- `connected`: Confirmation of WebSocket connection

### Notification Types
- **New Order**: Popup notification for incoming orders
- **Print Status**: Updates on printing success/failure
- **System Alerts**: Configuration and sync status

## Printer Integration

The system includes simulated printer functionality that can be easily extended for real printer integration:

### Current Implementation
- Simulated printer connection with realistic delays
- Professional bill formatting
- Error handling and retry logic
- Print status tracking

### Real Printer Integration
To connect to a real printer, modify the `printBill` function in `/src/app/api/print/bill/route.ts`:

```typescript
// Example for USB printer integration
import { ThermalPrinter } from 'node-thermal-printer'

async function printBill(content: string, printerName: string) {
  const printer = new ThermalPrinter({
    type: 'epson',
    interface: `printer://${printerName}`
  })
  
  await printer.print(content)
  await printer.cut()
  return { success: true }
}
```

## Deployment

### Environment Variables
- `DATABASE_URL`: SQLite database path
- `NEXTAUTH_SECRET`: For authentication (if added)
- `GOOGLE_SHEETS_API_KEY`: For Google Sheets API integration

### Production Considerations
- Set up proper Google Sheets API authentication
- Configure real printer connections
- Set up database backups
- Enable HTTPS for WebSocket connections

## Security Features

- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- CORS configuration for WebSocket service
- Error handling without information leakage

## Monitoring and Logging

- Comprehensive error logging
- Database query logging via Prisma
- WebSocket connection monitoring
- Print job tracking and audit trail

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure notification service is running on port 3003
   - Check firewall settings
   - Verify CORS configuration

2. **Google Sheets Sync Not Working**
   - Verify spreadsheet ID is correct
   - Check sheet name matches exactly
   - Ensure Google Sheets API is accessible

3. **Printer Not Working**
   - Check printer connection and drivers
   - Verify printer name in configuration
   - Check print job status in dashboard

### Health Checks
- Main app: Visit `http://localhost:3000`
- Notification service: `curl http://localhost:3003/health`
- Database: Check Prisma query logs in console

## Future Enhancements

- **Authentication**: User login and role management
- **Multi-restaurant Support**: Multiple locations and printers
- **Advanced Analytics**: Sales reports and insights
- **Mobile App**: Native mobile application
- **Payment Integration**: Connect to payment processors
- **Kitchen Display**: Separate kitchen view for order management

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Check the browser console for errors
4. Verify all services are running correctly

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies**