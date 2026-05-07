Only update Figma design.

Create or enhance module: PURCHASE ENTRY BILL (Purchase Bill)

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel
F) Print/Export panel (if purchase bill printing exists)

Use MongoDB ObjectId as hidden id:
- purchaseBillId hidden in UI, visible in admin/audit.

Include ALL schema fields in UI as below:

HEADER
- purchaseNo* (auto, read-only; format like 10211/25)
- purchaseDateTime* (auto default now)
- status* (DRAFT/POSTED/CANCELLED)
- cancelledReason (required if status=CANCELLED)
- createdBy* (auto current user, read-only)

ENTRY PASS LINKAGE
- passNo* (Gate Pass No; show and link)
- entryPassId (lookup optional but recommended; searchable dropdown from Entry Pass where status=OPEN)
- vehicleNo* (snapshot read-only from entry pass)
- driverName (snapshot)
- driverMobile (snapshot)

WORK CENTRE
- workCentreId* (lookup WorkCentre master, searchable)

SUPPLIER SNAPSHOT
- supplierId* (auto from entry pass; locked unless admin override)
- supplierNameSnapshot* (editable, highlight + audit)
- supplierAddressSnapshot
- supplierGstNoSnapshot

WEIGHT CAPTURE (Exit)
- loadWeight* (read-only from entry pass or weighbridge reference)
- lastEmptyWeight (reference display only)
- emptyWeight* (capture at purchase billing exit; Capture button)
- netWeight* (computed loadWeight - emptyWeight)
- cftValue (computed/derived for cubic supplier type)
- weighbridgeReadingId (text)
- weightCapturedAt (timestamp field if used)

ITEMS[] GRID (1+ row required)
Columns:
- itemId* (searchable; raw materials preferred)
- itemNameSnapshot* (auto)
- rate* (from supplier-wise rate)
- qty* (default = netWeight if TON_BASED; else derived from cftValue if CUBIC_BASED)
- amount* (rate*qty computed)
- gstPercent
- gstAmount
- totalAmount* (computed)
- vehicleRent (optional)

TOTALS
- grossAmount* (sum of item amounts)
- additiveAmount
- deductiveAmount
- roundOffAmount
- cgstTotal
- sgstTotal
- igstTotal
- grossPayable* (final payable)

BILL SUNDRIES[] (optional section)
- sundryId (lookup Bill Sundry Master active)
- amount
Note: show as optional and allow enable/disable by configuration

PAYMENT
- paymentMode* (default CREDIT; allow CASH/ONLINE/MIXED only if configured)
- paymentAmount
- paidAmount
- balanceToReceive*
- crReferenceNo (required if paymentMode=CREDIT)
- cashPayment (conditional)
- digitalPayment (conditional)
- bankId (conditional lookup BankMaster active)
- accountNoSnapshot
- transactionNo (conditional)
- denominationDetails (conditional)

OTHER
- remarks
- anprImageRef
- loadImageRef

DETAILS SCREEN must include:
- system fields: createdAt, createdBy, updatedAt, updatedBy
- audit badges for supplierName edits and rate overrides
- Related Records placeholder