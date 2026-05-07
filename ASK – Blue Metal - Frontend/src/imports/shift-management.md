Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Create or enhance module: SHIFT MANAGEMENT

Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel

Use MongoDB ObjectId as hidden id:
- shiftId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER:
- shiftNo* (system-generated)
- shiftDate* (date picker)
- openedAt* (DateTime, default now)
- openedByUserId* (lookup User, required)
- openingAmount* (decimal)

STATUS:
- status* (OPEN/CLOSED)
- closedAt (DateTime, optional)
- closedByUserId (lookup User, optional)
- nextShiftUserId (lookup User, optional)
- remarks (text)

FINANCIALS:
- weightSlipTotal (auto-calculated)
- invoiceTotal (auto-calculated)
- billingTotal (auto-calculated)
- receiptVoucherTotal (auto-calculated)
- paymentVoucherTotal (auto-calculated)
- bataPaid (auto-calculated)
- purchaseTotal (auto-calculated)

CASH MANAGEMENT:
- totalCashReceived (auto-calculated)
- netAmount (auto-calculated)
- cashInHand (auto-calculated)
- transferAmount (auto-calculated)
- closingAmount (auto-calculated)

LIST SCREEN:
Columns:
- shiftNo
- shiftDate
- openedAt
- openedByUserId
- status badge (OPEN/CLOSED)
- totalCashReceived
- netAmount
- cashInHand
Filters:
- shiftDate range
- status (OPEN/CLOSED)
- Search (shiftNo/remarks)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Shift Start Details
- shiftNo* (auto)
- shiftDate* (date picker)
- openedAt* (auto)
- openedByUserId* (lookup User)
- openingAmount* (decimal)

2) Financials & Cash Management
- weightSlipTotal (auto-calculated)
- invoiceTotal (auto-calculated)
- billingTotal (auto-calculated)
- receiptVoucherTotal (auto-calculated)
- paymentVoucherTotal (auto-calculated)
- bataPaid (auto-calculated)
- purchaseTotal (auto-calculated)
- totalCashReceived (auto-calculated)
- netAmount (auto-calculated)
- cashInHand (auto-calculated)

3) End of Shift / Closing Details
- status* (OPEN/CLOSED)
- closedAt (date and time picker)
- closedByUserId (lookup User)
- nextShiftUserId (lookup User)
- transferAmount (auto-calculated)
- closingAmount (auto-calculated)

4) Remarks Section
- remarks (text area)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”