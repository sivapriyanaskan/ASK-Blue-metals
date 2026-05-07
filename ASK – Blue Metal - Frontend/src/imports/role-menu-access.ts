CONTEXT:
- We already have a Figma design for ASK – Blue Metal ERP (weighbridge + camera + barrier + billing + production + shift + reports).
- Architecture, navigation, and screen layouts must remain the same.
- Task: DO NOT redesign. Only add ALL missing fields from the database structure into the existing screens and components.
- Database: MongoDB (ObjectId primary keys). Use embedded sub-documents/arrays where listed (e.g., customerVehicles[], supplierVehicles[]), but still design as manageable UI grids.

GLOBAL RULES FOR THIS UPDATE:
1) Keep existing page structure and navigation. Only enhance forms, tables, filters, and detail drawers.
2) Add fields in logical groups with section headers (e.g., Basic Info, GST/Tax, Vehicle Info, Rates, Hardware Capture, Payment, Audit).
3) For every module:
   - Update Create/Edit form to include all fields (respect Required/Conditional).
   - Update List page table columns (show key fields; keep “More” column chooser for advanced fields).
   - Update View/Details drawer to display all fields and audit info.
4) Mandatory field handling:
   - Mark Required fields with * and show inline validation.
   - Conditional fields must appear only when their condition is met (e.g., GST No required only for Tax Invoice customers).
5) MongoDB + Audit:
   - Always include createdAt/createdBy/updatedAt/updatedBy fields in Details view (and optionally hidden in create form if auto).
   - Use ObjectId fields as hidden/system fields (not shown to operator unless in admin/audit).
6) Hardware-integrated screens (Token, Entry Pass, Sales, Purchase, Cancel):
   - Include live weighbridge widget + stable indicator.
   - Include camera capture widgets (Front + Top) and store imageRef fields.
   - Include barrier status + “Save & Open Barrier” action.
7) Payments & Cash:
   - Cash denomination capture must match denomination structures.
   - Split payments must support Cash + Online.
8) Bill Sundry:
   - Must appear in Sales Bill screens and log each applied sundry in BillSundryTransaction.
9) Sales Bill Without GST:
   - Use the same fields as Sales Bill (Tax Invoice) but enforce the print and calculation rule: print half quantity, compute GST on half quantity, store billingMode/printMode accordingly.
10) DO NOT remove any existing components; only add missing fields and validation.

NOW APPLY THE FOLLOWING MODULE FIELD LISTS EXACTLY.

MODULE: Login & Users
FIELDS:
- userId (Unique ID; Required: Yes) — Unique ID for the user
- userName (Text; Required: Yes) — Display name
- userLoginName (Text; Required: Yes) — Username for login
- passwordHash (Text; Required: Yes) — Encrypted password
- roleId (Lookup (Role); Required: Yes) — Role assigned to the user
- status (Enum; Required: Yes) — Active/Inactive
- lastLoginAt (DateTime; Required: No) — last login timestamp
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by

MODULE: Roles & Access
FIELDS:
- roleId (Unique ID; Required: Yes) — Unique identifier for role
- roleName (Text; Required: Yes) — Role name
- roleCode (Text; Required: No) — Optional role code
- description (Text; Required: No) — Role description
- status (Enum; Required: Yes) — Active/Inactive
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by

MODULE: Menu Master
FIELDS:
- menuId (Unique ID; Required: Yes) — Unique menu identifier
- menuName (Text; Required: Yes) — Display label
- menuKey (Text; Required: Yes) — Unique key for routing
- parentMenuId (Lookup(Menu); Required: No) — Parent menu
- sortOrder (Number; Required: No) — Menu ordering
- iconName (Text; Required: No) — Icon identifier
- status (Enum; Required: Yes) — Active/Inactive
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by

MODULE: Feature Master
FIELDS:
- featureId (Unique ID; Required: Yes) — Unique feature identifier
- featureName (Text; Required: Yes) — Feature label
- featureKey (Text; Required: Yes) — Feature key used for access
- menuId (Lookup(Menu); Required: Yes) — Related menu/module
- status (Enum; Required: Yes) — Active/Inactive
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by

MODULE: Role – Menu Access
FIELDS:
- roleMenuAccessId (Unique ID; Required: Yes) — Unique mapping id
- roleId (Lookup(Role); Required: Yes) — Role reference
- menuId (Lookup(Menu); Required: Yes) — Menu reference
- canView (Boolean; Required: Yes) — View permission
- canCreate (Boolean; Required: Yes) — Create permission
- canEdit (Boolean; Required: Yes) — Edit permission
- canDelete (Boolean; Required: Yes) — Delete permission
- canPrint (Boolean; Required: Yes) — Print permission
- status (Enum; Required: Yes) — Active/Inactive

MODULE: Role – Feature Access
FIELDS:
- roleFeatureAccessId (Unique ID; Required: Yes) — Unique mapping id
- roleId (Lookup(Role); Required: Yes) — Role reference
- featureId (Lookup(Feature); Required: Yes) — Feature reference
- isEnabled (Boolean; Required: Yes) — Enable/disable feature for role
- status (Enum; Required: Yes) — Active/Inactive

MODULE: Customers
FIELDS:
- customerId (Unique ID; Required: Yes) — Unique identifier
- customerCode (Text/Number; Required: Yes) — Unique customer identifier.
- customerName (Text; Required: Yes) — Customer name
- address (Text (Multiline); Required: No) — address of the customer
- phone (Text; Required: No) — Landline
- mobile (Text; Required: No) — Mobile number
- email (Text; Required: No) — Email
- ulr (Text; Required: No) — Website
- tinNo (Text; Required: No) — TIN Number
- gstNo (Text; Required: Conditional) — GST number required when billType is Tax Invoice.
- billType (Enum; Required: Yes) — Tax Invoice / Without GST
- creditLimit (Decimal; Required: No) — Credit limit allowed
- tcsApplicable (Boolean; Required: No) — Whether TCS applies
- tcsPercentage (Decimal; Required: No) — TCS percentage if applicable
- isActive (Boolean; Required: Yes) — Active/Inactive
- vehicles (Array; Required: No) — Customer vehicle info list (MongoDB embedded array)
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by
UI RULES:
- Show gstNo field only when billType = Tax Invoice (and make it mandatory then).
- vehicles[] must be a grid sub-section with add/edit rows (vehicleNo, driverName, driverMobile).

MODULE: Ledger  Account Master
FIELDS:
- ledgerAccountId (Unique ID; Required: Yes) — Unique ledger identifier
- ledgerName (Text; Required: Yes) — Ledger name
- ledgerCode (Text; Required: No) — Optional ledger code
- ledgerType (Enum; Required: Yes) — Asset/Liability/Income/Expense
- isActive (Boolean; Required: Yes) — Active/Inactive
- remarks (Text; Required: No) — Notes
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by

MODULE: Suppliers
FIELDS:
- supplierId (Unique ID; Required: Yes) — Unique supplier identifier
- supplierCode (Text/Number; Required: Yes) — Supplier code
- supplierName (Text; Required: Yes) — Supplier name
- billControlAC (Lookup(Ledger); Required: Yes) — Bill control A/C reference
- supplierType (Enum; Required: Yes) — Cubic / Ton based
- address (Text (Multiline); Required: No) — Supplier address
- phone (Text; Required: No) — Phone
- mobile (Text; Required: No) — Mobile
- email (Text; Required: No) — Email
- gstNo (Text; Required: No) — GST number if applicable
- vehicles (Array; Required: Yes) — Supplier vehicles with dimensions and empty weight (MongoDB embedded array)
- isActive (Boolean; Required: Yes) — Active/Inactive
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by
UI RULES:
- vehicles[] grid must include length, breadth, height, adjustmentCuFt, computedTotalCuFt, emptyWeightRef, regNo, driver details.
- If supplierType = Cubic, show volume breakdown (L×B×H ± adjustment).

MODULE: Items
FIELDS:
- itemId (Unique ID; Required: Yes) — Unique identifier for item
- itemCode (Text/Number; Required: Yes) — Item code
- itemName (Text; Required: Yes) — Item name
- itemGroupId (Lookup(ItemGroup); Required: Yes) — Group reference
- itemSubGroupId (Lookup(ItemSubGroup); Required: Yes) — Subgroup reference
- purchaseUnit (Enum/Text; Required: Yes) — Unit for purchase
- sellingUnit (Enum/Text; Required: Yes) — Unit for selling
- isRawMaterial (Boolean; Required: No) — Raw material flag
- isSaleProduct (Boolean; Required: No) — Sale product flag
- hsnCode (Text; Required: No) — HSN
- gstPercent (Decimal; Required: No) — GST %
- sellingPrice (Decimal; Required: No) — Default selling price
- defaultPrinterId (Lookup(Printer); Required: Yes) — Default printer for token printing
- isActive (Boolean; Required: Yes) — Active/Inactive
- createdAt (DateTime; Required: Yes) — created time
- createdBy (Lookup(User); Required: Yes) — created by
- updatedAt (DateTime; Required: No) — updated time
- updatedBy (Lookup(User); Required: No) — updated by

MODULE: ItemGroup
FIELDS:
- itemGroupId (Unique ID; Required: Yes) — Item group id
- itemGroupName (Text; Required: Yes) — Group name
- itemGroupCode (Text; Required: No) — Group code
- isActive (Boolean; Required: Yes) — Active/Inactive

MODULE: Item Sub Group Master
FIELDS:
- itemSubGroupId (Unique ID; Required: Yes) — Subgroup id
- itemSubGroupName (Text; Required: Yes) — Subgroup name
- itemSubGroupCode (Text; Required: No) — Subgroup code
- itemGroupId (Lookup(ItemGroup); Required: Yes) — Parent group
- isActive (Boolean; Required: Yes) — Active/Inactive

MODULE: PrinterMaster
FIELDS:
- printerId (Unique ID; Required: Yes) — Printer id
- printerName (Text; Required: Yes) — Printer display name
- printerType (Enum; Required: Yes) — Thermal / A4 / A5
- connectionType (Enum; Required: Yes) — Network/USB/Local
- ipAddress (Text; Required: No) — IP if network
- port (Number; Required: No) — Port if network
- paperSize (Enum; Required: No) — Paper size
- isDefault (Boolean; Required: No) — Default printer
- status (Enum; Required: Yes) — Active/Inactive

MODULE: Customer-wise Rates
FIELDS:
- customerRateId (Unique ID; Required: Yes) — Unique id
- customerId (Lookup(Customer); Required: Yes) — Customer reference
- itemId (Lookup(Item); Required: Yes) — Item reference
- specialRate (Decimal; Required: Yes) — Discounted rate
- effectiveFrom (Date; Required: No) — Effective start
- effectiveTo (Date; Required: No) — Effective end
- isActive (Boolean; Required: Yes) — Active/Inactive
UI RULES:
- Provide matrix/bulk edit view and single edit drawer.

MODULE: Supplier-wise Rates
FIELDS:
- supplierRateId (Unique ID; Required: Yes) — Unique id
- supplierId (Lookup(Supplier); Required: Yes) — Supplier reference
- itemId (Lookup(Item); Required: Yes) — Item reference
- rate (Decimal; Required: Yes) — Purchase rate
- effectiveFrom (Date; Required: No) — Effective start
- effectiveTo (Date; Required: No) — Effective end
- isActive (Boolean; Required: Yes) — Active/Inactive

MODULE: Bill Sundry Master
FIELDS:
- billSundryId (Unique ID; Required: Yes) — Sundry id
- sundryName (Text; Required: Yes) — Name (Round Off Add, Round Off Deduct, Driver BATA)
- sundryType (Enum; Required: Yes) — Additive/Deductive
- calculationMode (Enum; Required: Yes) — Fixed/Percentage
- defaultValue (Decimal; Required: Yes) — Default amount or %
- isEditableAtBilling (Boolean; Required: Yes) — Editable at billing
- applicableModules (Enum/List; Required: Yes) — Sales Tax / Sales Without GST / Purchase (if enabled)
- status (Enum; Required: Yes) — Active/Inactive
- ledgerAccountId (Lookup(Ledger); Required: No) — Optional ledger mapping

MODULE: BillSundryTransaction
FIELDS:
- billSundryTransactionId (Unique ID; Required: Yes) — Unique id
- salesBillId (Lookup(SalesBill); Required: Yes) — Sales bill reference
- billSundryId (Lookup(BillSundry); Required: Yes) — Sundry reference
- sundryValue (Decimal; Required: Yes) — Value entered/applied
- computedAmount (Decimal; Required: Yes) — Calculated effect
- appliedBy (Lookup(User); Required: Yes) — Applied by
- appliedAt (DateTime; Required: Yes) — Applied at

MODULE: Freeze Item to Customer
FIELDS:
- freezeId (Unique ID; Required: Yes) — Unique id
- customerId (Lookup(Customer); Required: Yes) — Customer reference
- freezeAllItems (Boolean; Required: Yes) — Freeze all items toggle
- itemIds (Array; Required: Conditional) — Items list if not freezeAllItems
- fromDate (Date; Required: Yes) — Start date
- toDate (Date; Required: Yes) — End date
- reason (Text; Required: No) — Reason
- isActive (Boolean; Required: Yes) — Active/Inactive
UI RULES:
- If freezeAllItems = true, hide item selection.

MODULE: Company Vehicles
FIELDS:
- companyVehicleId (Unique ID; Required: Yes) — Unique id
- regNo (Text; Required: Yes) — Registration no
- vehicleName (Text; Required: No) — Name
- workCentreId (Lookup(WorkCentre); Required: Yes) — Work centre
- tankCapacity (Decimal; Required: Yes) — Tank capacity
- emptyWeight (Decimal; Required: Yes) — Empty weight
- meterOpening (Decimal; Required: Yes) — Meter opening
- meterMax (Decimal; Required: Yes) — Meter max
- openingWhenLastFuelFilled (Decimal; Required: No) — Opening when last fuel filled
- hourOpening (Decimal; Required: Yes) — Hour opening
- hourMax (Decimal; Required: Yes) — Hour max
- isActive (Boolean; Required: Yes) — Active/Inactive

MODULE: WorkCentreMaster
FIELDS:
- workCentreId (Unique ID; Required: Yes) — Unique id
- workCentreName (Text; Required: Yes) — Name
- workCentreCode (Text; Required: No) — Code
- isActive (Boolean; Required: Yes) — Active/Inactive

MODULE: Driver  Labour Master
FIELDS:
- personId (Unique ID; Required: Yes) — Unique id
- personType (Enum; Required: Yes) — Driver/Labour
- name (Text; Required: Yes) — Name
- mobile (Text; Required: No) — Mobile
- address (Text; Required: No) — Address
- licenseNo (Text; Required: No) — License no (driver)
- isActive (Boolean; Required: Yes) — Active/Inactive
- remarks (Text; Required: No) — Notes

MODULE: Token (Customer Gate Entry)
FIELDS:
- tokenId (Unique ID; Required: Yes) — Unique identifier
- tokenNo (Text/Number; Required: Yes) — Daily reset 001
- entryNo (Text; Required: Yes) — Item-wise yearly increment format 1/25
- tokenDateTime (DateTime; Required: Yes) — Token date/time
- vehicleNo (Text; Required: Yes) — Vehicle number
- customerId (Lookup(Customer); Required: Yes) — Customer reference
- itemId (Lookup(Item); Required: Yes) — Item reference
- emptyWeight (Decimal; Required: Yes) — Weight from weighbridge
- emptyWeightCapturedAt (DateTime; Required: No) — Timestamp weight captured
- frontImageRef (Text; Required: No) — Front image ref
- topImageRef (Text; Required: No) — Top image ref (empty)
- anprText (Text; Required: No) — Number plate text
- barrierOpenStatus (Enum; Required: No) — Open/Closed/Failed
- printStatus (Enum; Required: No) — Printed/Not printed
- status (Enum; Required: Yes) — Active/Cancelled/Completed
- createdBy (Lookup(User); Required: Yes) — Created by
- createdAt (DateTime; Required: Yes) — Created at
UI RULES:
- Show live weighbridge, image capture widgets, barrier widget, and “Save & Open Barrier”.

MODULE: Purchase Entry Pass (Supplier G
FIELDS:
- entryPassId (Unique ID; Required: Yes) — Unique identifier
- entryPassNo (Text/Number; Required: Yes) — Daily reset
- entryNo (Text; Required: Yes) — Item-wise yearly increment
- entryDateTime (DateTime; Required: Yes) — Date/time
- vehicleNo (Text; Required: Yes) — Vehicle number
- supplierId (Lookup(Supplier); Required: Yes) — Supplier
- itemId (Lookup(Item); Required: Yes) — Item
- loadWeight (Decimal; Required: Yes) — Load weight from weighbridge
- loadWeightCapturedAt (DateTime; Required: No) — Timestamp
- frontImageRef (Text; Required: No) — Front image
- topImageRef (Text; Required: No) — Top image (loaded)
- anprText (Text; Required: No) — Number plate text
- crRefNo (Text; Required: No) — Credit reference (if applicable)
- barrierOpenStatus (Enum; Required: No) — Open/Closed/Failed
- printStatus (Enum; Required: No) — Printed/Not printed
- status (Enum; Required: Yes) — Active/Cancelled/Completed
- createdBy (Lookup(User); Required: Yes) — Created by
- createdAt (DateTime; Required: Yes) — Created at

MODULE: Sales Bill (Tax Invoice)
FIELDS:
- salesBillId (Unique ID; Required: Yes) — Unique identifier for the sales bill
- billNo (Text; Required: Yes) — Invoice number
- billDateTime (DateTime; Required: Yes) — Invoice date & time combined
- tokenId (Lookup (Token); Required: Yes) — Reference to the token used for this sale
- vehicleNo (Text; Required: Yes) — Vehicle number snapshot
- customerId (Lookup(Customer); Required: Yes) — Customer reference
- customerName (Text; Required: Yes) — Customer name snapshot
- gstNo (Text; Required: Conditional) — Required when billType is Tax Invoice
- address (Text; Required: No) — Address snapshot
- itemId (Lookup(Item); Required: Yes) — Item reference
- itemName (Text; Required: Yes) — Item name snapshot
- rate (Decimal; Required: Yes) — Applied selling rate
- emptyWeight (Decimal; Required: Yes) — From token
- loadWeight (Decimal; Required: Yes) — From weighbridge (loaded)
- netWeight (Decimal; Required: Yes) — Computed = load - empty
- amount (Decimal; Required: Yes) — NetWeight × rate
- gstPercent (Decimal; Required: Yes) — GST % (default 5)
- gstAmount (Decimal; Required: Yes) — GST computed
- totalAmount (Decimal; Required: Yes) — Amount + GST ± sundries
- driverBata (Decimal; Required: No) — Bata amount
- driverBataMode (Enum; Required: No) — Deduct-before / Return-after
- paymentMode (Enum; Required: Yes) — Cash/Online/Credit/Multiple
- cashReceived (Decimal; Required: No) — Cash received
- cashDenominations (Array; Required: No) — Denomination breakdown
- onlineReceived (Decimal; Required: No) — Online received
- bankId (Lookup(Bank); Required: Conditional) — Required if online involved
- transactionNo (Text; Required: Conditional) — Required if online involved
- creditReceived (Decimal; Required: No) — Credit amount
- crRefNo (Text; Required: Conditional) — Required if credit involved
- roundOff (Decimal; Required: No) — Round-off value
- remarks (Text; Required: No) — remarks
- createdBy (Lookup(User); Required: Yes) — Staff who created the bill
- billingMode (Enum; Required: Yes) — How accounting calculation happens
- printMode (Enum; Required: Yes) — How invoice is printed
- loadedFrontImageRef (Text; Required: No) — Front image (loaded)
- loadedTopImageRef (Text; Required: No) — Top image (loaded)
- anprTextLoaded (Text; Required: No) — Plate text at billing
UI RULES:
- Include Bill Sundry selector panel and store each selection into BillSundryTransaction.
- Payments: show conditional blocks for cash/online/credit and allow split in Multiple.

MODULE: BankMaster
FIELDS:
- bankId (Unique ID; Required: Yes) — Unique id
- bankName (Text; Required: Yes) — Bank name
- accountNo (Text; Required: No) — Account number
- ifsc (Text; Required: No) — IFSC
- branch (Text; Required: No) — Branch
- isActive (Boolean; Required: Yes) — Active/Inactive

MODULE: Common Printer Settings
FIELDS:
- commonPrinterSettingId (Unique ID; Required: Yes) — Unique id
- tokenPrinterId (Lookup(Printer); Required: No) — Token printer override
- salesBillPrinterId (Lookup(Printer); Required: No) — Sales printer override
- purchaseBillPrinterId (Lookup(Printer); Required: No) — Purchase printer override
- isActive (Boolean; Required: Yes) — Active/Inactive
- updatedAt (DateTime; Required: No) — updated at
- updatedBy (Lookup(User); Required: No) — updated by

MODULE: Purchase Entry Bill
FIELDS:
- purchaseBillId (Unique ID; Required: Yes) — Unique identifier
- billNo (Text; Required: Yes) — Purchase bill number
- billDateTime (DateTime; Required: Yes) — Date/time
- entryPassId (Lookup(EntryPass); Required: Yes) — Entry pass reference
- vehicleNo (Text; Required: Yes) — Vehicle snapshot
- supplierId (Lookup(Supplier); Required: Yes) — Supplier
- supplierName (Text; Required: Yes) — Snapshot
- itemId (Lookup(Item); Required: Yes) — Item
- itemName (Text; Required: Yes) — Snapshot
- loadWeight (Decimal; Required: Yes) — From entry pass
- emptyWeight (Decimal; Required: Yes) — Captured at exit
- netWeight (Decimal; Required: Yes) — Computed
- rate (Decimal; Required: Yes) — Supplier-wise rate
- amount (Decimal; Required: Yes) — NetWeight × rate
- paymentMode (Enum; Required: Yes) — Credit only
- crRefNo (Text; Required: Yes) — CR.Ref mandatory
- remarks (Text; Required: No) — Notes
- createdBy (Lookup(User); Required: Yes) — Created by
- createdAt (DateTime; Required: Yes) — Created at
- frontImageRef (Text; Required: No) — Image
- topImageRef (Text; Required: No) — Image
- barrierOpenStatus (Enum; Required: No) — Status

MODULE: Currency Exchange
FIELDS:
- currencyExchangeId (Unique ID; Required: Yes) — Unique id
- entryNo (Text/Number; Required: Yes) — Entry number
- entryDateTime (DateTime; Required: Yes) — Date/time
- denominations (Array; Required: Yes) — Denomination list
- totalAmount (Decimal; Required: Yes) — Total
- createdBy (Lookup(User); Required: Yes) — Created by
- createdAt (DateTime; Required: Yes) — Created at

MODULE: Cash Voucher (Staff Advance)
FIELDS:
- cashVoucherId (Unique ID; Required: Yes) — Unique id
- voucherNo (Text/Number; Required: Yes) — Voucher number
- voucherDateTime (DateTime; Required: Yes) — Date/time
- staffName (Text; Required: Yes) — Staff
- amount (Decimal; Required: Yes) — Amount
- remarks (Text; Required: No) — Remarks
- createdBy (Lookup(User); Required: Yes) — Created by
- createdAt (DateTime; Required: Yes) — Created at

MODULE: Raw Material - Purchase Wise
FIELDS:
- rmPurchaseWiseId (Unique ID; Required: Yes) — Unique id
- shiftId (Lookup(Shift); Required: Yes) — Shift reference
- purchaseBillId (Lookup(PurchaseBill); Required: No) — Purchase bill link
- itemId (Lookup(Item); Required: Yes) — Item
- qtyIn (Decimal; Required: Yes) — Quantity in
- qtyConsumed (Decimal; Required: No) — Consumed qty
- isConsumed (Boolean; Required: Yes) — Tick consumed vs stock
- updatedBy (Lookup(User); Required: Yes) — Updated by
- updatedAt (DateTime; Required: Yes) — Updated at

MODULE: Raw Material - Item Wise
FIELDS:
- rmItemWiseId (Unique ID; Required: Yes) — Unique id
- entryNo (Text/Number; Required: Yes) — Entry no
- entryDateTime (DateTime; Required: Yes) — Date/time
- itemId (Lookup(Item); Required: Yes) — Item
- qtyUsed (Decimal; Required: Yes) — Used qty
- balanceStock (Decimal; Required: Yes) — Balance
- createdBy (Lookup(User); Required: Yes) — Created by
- createdAt (DateTime; Required: Yes) — Created at

MODULE: Fuel Consumption
FIELDS:
- fuelConsumptionId (Unique ID; Required: Yes) — Unique id
- entryNo (Text/Number; Required: Yes) — Entry no
- refNo (Text; Required: Yes) — Reference no
- entryDateTime (DateTime; Required: Yes) — Date/time
- vehicleId (Lookup(CompanyVehicle); Required: Yes) — Vehicle reg no
- workCentreId (Lookup(WorkCentre); Required: Yes) — Work centre
- driverId (Lookup(Driver/Labour); Required: No) — Driver
- supplierId (Lookup(Supplier); Required: No) — Fuel supplier
- qty (Decimal; Required: Yes) — Quantity
- ratePerLtr (Decimal; Required: Yes) — Rate
- amount (Decimal; Required: Yes) — Amount
- hourMeterCurrent (Decimal; Required: No) — Hour meter
- kmReadingCurrent (Decimal; Required: No) — KM reading
- remarks (Text; Required: No) — Remarks
- createdBy (Lookup(User); Required: Yes) — Created by
- createdAt (DateTime; Required: Yes) — Created at

MODULE: Shift
FIELDS:
- shiftId (Unique ID; Required: Yes) — Unique id
- shiftNo (Text/Number; Required: Yes) — Shift number
- shiftDate (Date; Required: Yes) — Date
- shiftStartDateTime (DateTime; Required: Yes) — Start time
- shiftEndDateTime (DateTime; Required: No) — End time
- shiftFromUserId (Lookup(User); Required: Yes) — From
- shiftToUserId (Lookup(User); Required: No) — To
- status (Enum; Required: Yes) — Open/Closed
- totalSales (Decimal; Required: No) — Total sales
- totalPurchase (Decimal; Required: No) — Total purchase
- cashInHand (Decimal; Required: No) — Cash in hand
- onlineTotal (Decimal; Required: No) — Online total
- creditTotal (Decimal; Required: No) — Credit total
- purchasePostedOrNil (Boolean; Required: Yes) — Mandatory checkbox
- createdAt (DateTime; Required: Yes) — created at
- createdBy (Lookup(User); Required: Yes) — created by

MODULE: ShiftOpeningDenominations
FIELDS:
- shiftOpeningDenomId (Unique ID; Required: Yes) — Unique id
- shiftId (Lookup(Shift); Required: Yes) — Shift ref
- denominations (Array; Required: Yes) — Denomination list
- totalAmount (Decimal; Required: Yes) — Total
- createdAt (DateTime; Required: Yes) — created at
- createdBy (Lookup(User); Required: Yes) — created by

MODULE: ShiftClosingDenominations
FIELDS:
- shiftClosingDenomId (Unique ID; Required: Yes) — Unique id
- shiftId (Lookup(Shift); Required: Yes) — Shift ref
- denominations (Array; Required: Yes) — Denomination list
- totalAmount (Decimal; Required: Yes) — Total
- createdAt (DateTime; Required: Yes) — created at
- createdBy (Lookup(User); Required: Yes) — created by

MODULE: ShiftTransferDenominations
FIELDS:
- shiftTransferDenomId (Unique ID; Required: Yes) — Unique id
- shiftId (Lookup(Shift); Required: Yes) — Shift ref
- denominations (Array; Required: Yes) — Denomination list
- totalAmount (Decimal; Required: Yes) — Total
- createdAt (DateTime; Required: Yes) — created at
- createdBy (Lookup(User); Required: Yes) — created by

MODULE: Audit & Device Logs
FIELDS:
- logId (Unique ID; Required: Yes) — Unique id
- logType (Enum; Required: Yes) — AUDIT / DEVICE
- moduleName (Text; Required: Yes) — Module name
- recordId (Text; Required: Yes) — Record id (ObjectId string)
- fieldName (Text; Required: Conditional) — For audit logs
- oldValue (Text; Required: Conditional) — For audit logs
- newValue (Text; Required: Conditional) — For audit logs
- deviceType (Enum; Required: Conditional) — WEIGHBRIDGE/CAMERA/BARRIER/PRINTER
- eventType (Text; Required: Conditional) — Event type
- status (Enum; Required: Yes) — SUCCESS/FAILED
- errorMessage (Text; Required: No) — Error if failed
- createdAt (DateTime; Required: Yes) — created at
- createdBy (Lookup(User); Required: Yes) — created by

MODULE: Sales Bill (Without GST)
FIELDS:
- Use ALL fields from MODULE: Sales Bill (Tax Invoice) (same data capture), plus enforce:
  - billingMode (Enum; Required) set to WITHOUT_GST accounting logic.
  - printMode (Enum; Required) set to WITHOUT_GST print logic (half quantity + GST on half quantity).
UI RULES:
- Show an info banner explaining: “Print shows half quantity; GST calculated on half quantity.”
- Keep tax invoice screen layout; only adjust labels and print preview.