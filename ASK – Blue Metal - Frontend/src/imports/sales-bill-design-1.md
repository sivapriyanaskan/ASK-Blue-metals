Only update Figma design.

Create or enhance module: SALES BILL (Tax Invoice + Invoice)

If module does not exist: create these screens using existing ERP layout style:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel
F) Print/Export panel

Use MongoDB ObjectId as hidden system id:
- salesBillId hidden in UI, visible in admin/audit.

Include ALL schema fields in UI as below:

HEADER (read-only/auto where applicable)
- billNo* (auto, read-only; format Inv/Mon/Serial/YY)
- billDateTime* (auto default now)
- status* (DRAFT/POSTED/CANCELLED)
- cancelledReason (required if status=CANCELLED)
- preparedByUserId* (auto current user, read-only)
- createdBy* (auto current user, read-only)

TOKEN & VEHICLE
- tokenId* (searchable dropdown from Token where status=OPEN)
- vehicleNo* (snapshot, read-only, auto from token)

CUSTOMER SNAPSHOT
- customerId* (auto from token/customer, locked unless admin override)
- customerNameSnapshot* (editable, highlight if changed)
- customerCodeSnapshot (read-only snapshot)
- customerAddressSnapshot
- customerGstNoSnapshot (required if Tax Invoice mode)
- placeOfSupply* (required)

WEIGHT CAPTURE
- loadWeight* (auto from weighbridge, with Capture button)
- emptyWeight* (read-only from token)
- netWeight* (computed loadWeight - emptyWeight, read-only)
- weightCapturedAt (auto)

ITEMS[] GRID (must support 1+ rows)
Columns:
- itemId* (searchable dropdown from Item isActive=true)
- itemNameSnapshot* (auto from item)
- hsnCodeSnapshot
- rate* (auto from customer-wise rate else Item.sellingPrice; editable only with override)
- qty* (default = netWeight; editable)
- amount* (rate*qty computed)
- gstPercent* (from Item.gstPercentage)
- gstAmount* (computed)
- totalAmount* (computed)
- vehicleRent (optional)

GST TOTALS
- gstTotal*
- cgstTotal (conditional)
- sgstTotal (conditional)
- igstTotal (conditional)
- tcsTotal (conditional)

BILL SUNDRIES[] GRID (optional)
- sundryId* (lookup Bill Sundry Master active)
- sundryNameSnapshot
- sundryTypeSnapshot
- amount* (respect isEditableAtBilling)
- autoRoundOff
- extraRoundOff

DRIVER BATA
- driverBataAmount
- driverBataMethod (TAKEN_AND_REDUCED / PAID_FULL_AND_TAKEN)
- driverBataLoggedAt

PAYMENT
- paymentMode* (CASH/ONLINE/CREDIT/MIXED)
- receivedAmount*
- receivableAmount*
- balanceAmount*
- cashCollected (conditional)
- digitalPayment (conditional)
- bankId (conditional lookup BankMaster active)
- transactionNo (conditional)
- crRefNo (conditional)
- denominationDetails (conditional object UI)
- balanceToBeGiven

CAMERA
- anprImageRef
- loadImageRef
- cameraCapturedAt

FLAGS/REMARKS
- isCustomerNameEdited
- remarks

BILLING/PRINT MODE (required for without gst flow)
- billingMode* (TAX_INVOICE_FULL / NO_GST_ACCOUNTING)
- printMode* (PRINT_FULL / PRINT_HALF_WITH_GST / PRINT_NO_GST)

DETAILS SCREEN must include:
- system fields: createdAt, createdBy, updatedAt, updatedBy
- audit badges for edited customer name & overridden rates