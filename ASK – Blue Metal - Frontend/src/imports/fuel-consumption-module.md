Only update Figma design.

Create or enhance module: FUEL CONSUMPTION

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel
F) Print/Export panel (Fuel Entry print)

Use MongoDB ObjectId as hidden id:
- fuelEntryId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER
- entryNo* (system generated, read-only)
- entryDateTime* (date+time picker, default now)
- status* (SAVED / POSTED / CANCELLED)
- remarks
- createdBy* (auto current user, read-only)

REFERENCE
- referenceNo* (text)
- indentNo (text)
- billNo (text)

VEHICLE & DRIVER
- vehicleId* (lookup Vehicle Master active)
- vehicleRegNoSnapshot* (auto from vehicle)
- driverId (lookup Driver Master active)
- driverNameSnapshot (auto if driver selected; editable optional)
- workCentreId* (lookup WorkCentre active; auto from vehicle.workCentreId but allow override with reason)
- filledBy (text)

SUPPLIER (Fuel Station)
- supplierId* (lookup Supplier active; supplier type not required here)
- supplierNameSnapshot* (auto from supplier)

METER / HOUR READINGS
- meterStartReading* (decimal)
- meterCurrentReading* (decimal)
- hourStartReading (decimal)
- hourCurrentReading (decimal)
- kmsRun (computed: meterCurrentReading - meterStartReading)
- lastFuelMeterReading (reference display)
- mileageValue (computed: kmsRun / fuelFilledQty)

FUEL DETAILS
- fuelFilledQty* (decimal, liters)
- ratePerLiter* (decimal)
- fuelAmount* (computed: fuelFilledQty × ratePerLiter)

PAYMENT SUMMARY
- paidAmount
- totalExpenseAmount* (computed)
- totalPaidAmount (computed)

EXPENSES[] GRID (optional)
- expenses.slNo* (number)
- expenses.expenseHead* (text)
- expenses.supplierName (text)
- expenses.amount* (decimal)
- expenses.paid (decimal)

OTHER
- preparedBy* (lookup user; default current user)
- entryUserName (snapshot)
- lastFuelMeterReading (reference)
- totalExpenseAmount* (fuelAmount + sum(expenses.amount))
- totalPaidAmount (paidAmount + sum(expenses.paid))

DETAILS SCREEN:
- show all fields grouped
- show system info: createdAt, createdBy, updatedAt, updatedBy
- add Related Records placeholder