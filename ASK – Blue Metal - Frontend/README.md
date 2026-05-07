# ASK - Blue Metal ERP System

## Enterprise-Grade Weighbridge Integrated Production & Billing Management System

A complete industrial ERP web application designed for Blue Metal production units, integrating weighbridge hardware, cameras, boom barrier, billing, production, stock, fuel, shift closing, audit logs, and financial reporting.

## Key Features

### 🎯 Core Modules

#### Operations
- **Token Creation** - Empty vehicle entry with weighbridge integration, camera capture, ANPR, and boom barrier control
- **Purchase Entry Pass** - Loaded supplier vehicle entry
- **Sales Bill (Tax Invoice)** - Complete billing with GST, denomination entry, multiple payment modes, and driver BATA
- **Sales Bill (Non-GST)** - Half-quantity billing
- **Purchase Entry Bill** - Supplier billing with credit management
- **Token Cancel** - Supervisor-approved cancellation workflow

#### Masters
- **Customer Master** - Complete customer management with GST, vehicle mapping
- **Supplier Master** - Supplier details, rates, cubic/ton based classification
- **Item Master** - HSN codes, GST rates, selling prices
- **Rate Setting** - Customer-wise and supplier-wise rate matrices
- **Freeze Management** - Item-to-customer freezing with date ranges
- **Vehicle Master** - Owned vehicle management
- **Bill Sundry** - Round-off, driver BATA, and other sundries

#### Production
- Raw material consumption tracking (purchase-wise and item-wise)
- Stock management and balance reporting

#### Finance
- Currency exchange and denomination management
- Cash voucher payments
- Fuel consumption tracking

#### Shift Management
- Comprehensive shift closing with denomination verification
- Cash/Online/Credit reconciliation
- Transaction locking post-shift close
- Automatic shift report generation

#### Reports & Audit
- **Sales Register** - Detailed sales transactions with totals
- **Purchase Register** - Complete purchase tracking
- **Audit Logs** - Field-level change tracking with approval workflow
- **Device Event Logs** - Hardware event monitoring
- Customer/Supplier ledgers
- Stock reports
- Vehicle history
- Driver BATA reports

### 🔧 Hardware Integration

The system simulates integration with:
- **Weighbridge** - Real-time weight display with stability detection
- **Cameras** - Front and top camera image capture
- **ANPR** - Automatic number plate recognition
- **Boom Barrier** - Automated gate control
- **Printers** - Token and bill printing

### 👥 Role-Based Access Control

1. **Admin** - Full system access
2. **Weighbridge Operator** - Token creation, entry pass, cancellation
3. **Billing Staff** - Sales/purchase billing, cash entry
4. **Supervisor** - Override approvals, shift monitoring
5. **Accounts** - Reports, ledgers, audit logs

### 💡 Key Workflows

#### Token Creation Flow
1. Vehicle enters on weighbridge
2. System captures empty weight (auto-stabilization)
3. Front and top camera images captured
4. ANPR reads vehicle number
5. Operator selects customer and item
6. Freeze validation
7. Token printed
8. Boom barrier opens automatically
9. Event logged

#### Sales Billing Flow
1. Search token by number
2. Auto-populate customer, item, empty weight
3. Capture loaded weight
4. Net weight calculation (Load - Empty)
5. Rate fetching (customer-wise or default)
6. GST calculation (5%)
7. Bill sundries application
8. Driver BATA logic
9. Payment mode selection with validation
10. Denomination entry for cash
11. Bill generation and printing
12. Barrier opening
13. Transaction locking

#### Shift Closing Flow
1. Summary of all transactions
2. Cash denomination breakdown entry
3. Cash reconciliation validation
4. Purchase posting confirmation
5. Next shift user assignment
6. Transaction locking
7. Shift report generation

### 📊 Dashboard Features

**Operator Dashboard**
- Live weighbridge status
- Token counts
- Hardware status
- Quick action buttons

**Billing Dashboard**
- Sales/Purchase totals
- Payment mode distribution
- Pending credits
- Item-wise sales charts

**Supervisor Dashboard**
- Manual overrides
- Cancellations
- Approval queue
- Freeze violations

**Accounts Dashboard**
- Cash balance
- Outstanding credits
- Monthly trends
- Quick links to reports

### 🎨 UI/UX Features

- Desktop-first design (1366-1440px optimized)
- Professional, data-dense interface
- Fast operational workflow
- Large buttons for operators
- High contrast for outdoor environment
- Keyboard navigation enabled
- Hardware status always visible
- Real-time validation
- Print preview capabilities
- Error handling for device offline scenarios

### 📈 Technical Stack

- **React** with TypeScript
- **React Router** (Data mode) for multi-page navigation
- **Tailwind CSS v4** for styling
- **Recharts** for data visualization
- **Lucide React** for icons
- **Context API** for state management

## Usage

Navigate through the left sidebar to access different modules. The header shows:
- Current shift status
- Hardware device status
- Global search
- Quick actions
- User information

The system maintains role-based visibility, showing only relevant modules based on user permissions.

## Data Flow

All data is currently mocked for demonstration purposes. In production:
- Hardware integrations would connect to actual weighbridge, cameras, and barrier APIs
- Backend would handle data persistence
- Real-time updates via WebSockets
- Print jobs sent to configured printers
- Automatic backups and audit trails
