PROJECT NAME:
ASK – Blue Metal
Weighbridge Integrated Production & Billing Management System

OBJECTIVE:
Design a complete enterprise-grade industrial ERP web application for a Blue Metal production unit. The system integrates weighbridge hardware, cameras, boom barrier, billing, production, stock, fuel, shift closing, audit logs, and financial reporting.

The UI must be professional, data-dense, scalable, hardware-integrated, and optimized for fast operational workflow.

---------------------------------------------------------------------

1) GLOBAL APPLICATION STRUCTURE

Create a desktop-first application (1366–1440px optimized).

APP SHELL:
- Left vertical navigation (collapsible)
- Top header bar with:
  - Company name (ASK – Blue Metal)
  - Current Shift Status (Open/Closed)
  - Logged-in User + Role
  - Global Search (Token No / Vehicle No / Bill No / Entry Pass No)
  - Notifications (Device failure, override actions)
  - Quick Actions (Create Token, Create Bill, Shift Close)

Role-based menu visibility.

---------------------------------------------------------------------

2) USER ROLES

Design role-based access system:

1. Admin
   - Full access
2. Weighbridge Operator
   - Token Creation
   - Entry Pass
   - Token Cancel
3. Billing Staff
   - Sales Bill
   - Purchase Bill
   - Cash Entry
4. Supervisor
   - Override approvals
   - Shift monitoring
   - Edit approval
5. Accounts
   - Reports
   - Ledgers
   - Cash voucher
   - Audit logs

Permissions:
- View
- Create
- Edit
- Delete
- Print
- Open/Close Shift
- Override sensitive fields

---------------------------------------------------------------------

3) CORE MODULES (Left Navigation Sections)

A) DASHBOARD
B) OPERATIONS
C) MASTERS
D) PRODUCTION
E) FINANCE
F) REPORTS
G) ADMIN & AUDIT
H) SETTINGS

---------------------------------------------------------------------

4) DASHBOARD DESIGN

Operator Dashboard:
- Live Weighbridge Status (Current Weight + Stable Indicator)
- Today Token Count
- Today Entry Pass Count
- Hardware Status (Weighbridge / Camera / Barrier / Printer)
- Quick Create Buttons

Billing Dashboard:
- Today Sales Total
- Purchase Total
- Cash vs Online vs Credit
- Pending Credits
- Driver BATA Summary

Supervisor Dashboard:
- Shift Status
- Cancellations
- Manual Overrides
- Rounding Adjustments
- Freeze Violations Attempt Log

Accounts Dashboard:
- Shift Summary
- Sales Register Snapshot
- Purchase Register Snapshot
- Cash Balance
- Ledger Summary

---------------------------------------------------------------------

5) MASTER MODULES

5.1 CUSTOMER MASTER
Fields:
- Customer Code (Mandatory, Unique)
- Customer Name (Mandatory)
- Bill Type (Tax Invoice / Non-GST) (Mandatory)
- GST Number (Mandatory if Tax Invoice)
- Address
- Phone
- Credit Limit
- Status (Active/Inactive)

Vehicle Mapping:
- Vehicle Number
- Driver Name
- Driver Phone

Rules:
- Cannot create bill without customer.
- Freeze rule must block token creation.

---------------------------------------------------------------------

5.2 SUPPLIER MASTER
Fields:
- Supplier Code (Mandatory)
- Supplier Name (Mandatory)
- Bill Control A/C (Mandatory)
- Supplier Type (Cubic / Ton Based)
- Vehicle Number
- Length
- Breadth
- Height
- Adjustment Cu Ft
- Empty Weight Reference

Rules:
- Cubic suppliers auto compute volume.
- Supplier rate must exist before purchase billing.

---------------------------------------------------------------------

5.3 ITEM MASTER
Fields:
- Item Code (Mandatory)
- Item Name (Mandatory)
- Item Group
- Item Subgroup
- Raw Material Flag
- Sale Material Flag
- HSN Code
- GST %
- Selling Price
- Default Printer (Mandatory)

Rules:
- Printer required for token print.
- GST % used in tax invoice.

---------------------------------------------------------------------

5.4 CUSTOMER WISE RATE SETTING
Matrix UI:
- Customer
- Item
- Special Rate
- Effective Date

If special rate missing → default selling price used.

---------------------------------------------------------------------

5.5 SUPPLIER WISE RATE SETTING
Matrix UI:
- Supplier
- Item
- Rate
- Effective Date

Used in purchase billing.

---------------------------------------------------------------------

5.6 FREEZE ITEM TO CUSTOMER
Fields:
- Customer
- Freeze All Items (Toggle)
- Item Selection
- From Date
- To Date

Rules:
- Block token creation if frozen.
- Show error message.

---------------------------------------------------------------------

5.7 VEHICLE MASTER (OWNED)
Fields:
- Registration No (Mandatory)
- Vehicle Name
- Work Centre
- Tank Capacity
- Empty Weight
- Meter Reading Opening
- Meter Reading Max
- Hour Reading Opening
- Hour Reading Max

---------------------------------------------------------------------

5.8 BILL SUNDRY MASTER
Fields:
- Sundry Name (Mandatory)
- Type (Additive/Deductive)
- Calculation Mode (Fixed/Percentage)
- Default Value
- Editable at Billing (Yes/No)
- Applicable Modules (Sales/Purchase)
- Status

Default:
- Round Off Add
- Round Off Deduct
- Driver BATA

Rules:
- Must log who applied sundry.

---------------------------------------------------------------------

5.9 PRINTER SETTINGS
- Token Printer
- Sales Bill Printer
- Purchase Bill Printer
Override Item Default if configured.

---------------------------------------------------------------------

6) OPERATIONS MODULES

6.1 TOKEN CREATION (CUSTOMER ENTRY – EMPTY VEHICLE)

Fields:
- Token No (Auto Daily Reset from 001)
- Entry No (Item-wise Yearly Format: 1/25)
- Vehicle No
- Customer (Auto from vehicle)
- Item
- Empty Weight (Auto from Weighbridge)

Right Panel:
- Live Weight Display
- Front Camera Image Capture
- Top Camera Image Capture
- ANPR Plate Text
- Barrier Status

Flow:
1. Vehicle enters gate.
2. Weighbridge captures empty weight.
3. Capture front & top image.
4. Save.
5. Print Token.
6. Boom barrier auto opens.
7. Log event.

---------------------------------------------------------------------

6.2 PURCHASE ENTRY PASS (SUPPLIER – LOADED VEHICLE)

Fields:
- Entry Pass No (Daily Reset)
- Entry No (Item-wise Yearly)
- Vehicle No
- Supplier
- Item
- Load Weight (Auto)

On Save:
- Capture images
- Print Entry Pass
- Open Barrier

---------------------------------------------------------------------

6.3 SALES BILL – TAX INVOICE

Flow:
1. Enter Token No.
2. System fetches:
   - Customer
   - Item
   - Empty Weight
3. Capture Load Weight automatically.
4. Net Weight = Load – Empty.
5. Rate fetched.
6. Total = Net × Rate.
7. GST 5% calculated.
8. Apply Bill Sundries.
9. Driver BATA logic.
10. Payment Mode selection.

Payment Modes:
- Cash (Denomination Entry Required)
- Online (Bank + Transaction No Required)
- Credit (CR.Ref Required)
- Multiple (Split Payment)

Driver BATA:
Scenario 1: Deduct before payment.
Scenario 2: Return after payment.

After Save:
- Capture Loaded Images
- Print Invoice
- Open Barrier
- Lock transaction

Invoice Format:
Inv/Month/Increment/Year

---------------------------------------------------------------------

6.4 SALES BILL WITHOUT GST

Same flow but:
- Print half quantity.
- GST calculated on half quantity.

---------------------------------------------------------------------

6.5 PURCHASE ENTRY BILL

Differences:
- Load weight captured first.
- Empty weight captured on exit.
- Supplier change allowed.
- Only Credit mode.
- CR.Ref mandatory.
- No Bill Sundries.

---------------------------------------------------------------------

6.6 TOKEN CANCEL

Fields:
- Token No
- Capture weight
- Reason
- Supervisor Approval

Barrier opens on cancel.

---------------------------------------------------------------------

7) PRODUCTION MODULE

7.1 RAW MATERIAL PRODUCTION – PURCHASE WISE
- Show purchase shift opening stock.
- Tick = Consumed.
- Untick = In Stock.

7.2 RAW MATERIAL PRODUCTION – ITEM WISE
Fields:
- Date
- Item
- Qty Used
- Balance Stock

Block usage if stock insufficient.

---------------------------------------------------------------------

8) FINANCE MODULE

8.1 CURRENCY EXCHANGE
- Entry No
- Denomination Count
- Total

8.2 CASH VOUCHER PAYMENT
- Staff Name
- Amount
- Date
- Remarks

---------------------------------------------------------------------

9) FUEL CONSUMPTION

Fields:
- Entry No
- Ref No
- Date
- Vehicle Reg No
- Work Centre
- Driver
- Supplier
- Qty
- Rate per Ltr
- Amount
- Hour Meter
- KM Reading

Auto calculate amount.

---------------------------------------------------------------------

10) SHIFT CLOSING

Fields:
- Shift From User
- Shift To User
- Total Sales
- Total Purchase
- Cash Received
- Online Payments
- Credit Bills
- Cash Denomination Breakdown
- Purchase Posted/Nil Purchase Checkbox (Mandatory)

Rules:
- Lock transactions after close.
- Generate Shift Report.
- Next shift transfer record.

---------------------------------------------------------------------

11) REPORTS

- Sales Register
- Sales Combined GST/Non-GST
- Purchase Register
- Production Register
- Fuel Register
- Shift Closing Report
- Customer Ledger
- Supplier Ledger
- Item Stock Report
- Vehicle History
- Driver BATA Report
- Edit Log Report
- Device Event Log

---------------------------------------------------------------------

12) AUDIT & DEVICE LOG

Audit:
- Field Name
- Old Value
- New Value
- User
- Timestamp

Device Log:
- Device Type
- Event Type
- Status
- Error Message

---------------------------------------------------------------------

13) UX GUIDELINES

- Fast entry forms
- Numeric optimized fields
- Hardware status always visible
- Show calculation breakdown
- Highlight manual override
- Print preview before final print
- Confirmation for barrier open
- Error handling for device offline
- High contrast UI for outdoor environment
- Large buttons for operators
- Keyboard navigation enabled

---------------------------------------------------------------------

14) PROTOTYPE FLOWS TO GENERATE

- Token Creation → Save → Print → Barrier Open
- Sales Billing → Weight Capture → Payment → Print → Barrier Open
- Shift Closing → Denomination Entry → Lock → Print Report
- Freeze Attempt → Error Handling
- Token Cancel → Supervisor Approval

---------------------------------------------------------------------

DELIVERABLE:
Generate complete high-fidelity enterprise ERP interface with consistent design system, hardware integration UI, billing workflows, production control, financial controls, audit transparency, and scalable architecture.