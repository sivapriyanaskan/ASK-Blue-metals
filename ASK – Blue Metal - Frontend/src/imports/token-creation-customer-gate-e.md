Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: TOKEN CREATION (Customer Gate Entry)

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit (restricted), View screens using existing ERP style.

Schema Fields:
- tokenId (Unique ID, hidden system)
- tokenNo* (Day-based running number, resets daily 12:00 AM)
- entryNo* (Item-based yearly running number, format: runningNumber/yearSuffix)
- tokenDateTime* (DateTime, auto default to now)
- vehicleNo* (Text, dropdown from selected customer's vehicles[])
- emptyWeight* (Decimal, auto-captured from weighbridge)
- weightCapturedAt (DateTime)
- customerId* (Lookup Customer, required)
- driverName (Text)
- driverMobile (Text)
- itemId* (Lookup Item, required)
- anprImageRef (File reference)
- anprCapturedAt (DateTime)
- anprNumberPlateText (Text)
- loadImageRef (File reference)
- loadCapturedAt (DateTime)
- barrierEventId (Text)
- status* (Enum: OPEN / BILLED / CANCELLED)
- billedBillId (Lookup Sales Bill)
- cancelledReason (Conditional)
- createdBy* (Lookup User, auto)
- updatedBy* (Lookup User, auto)

LIST SCREEN:
Columns:
- tokenNo
- entryNo
- tokenDateTime
- vehicleNo
- customer
- item
- emptyWeight
- status badge
Filters:
- Date range
- Customer
- Item
- Status
- Search (tokenNo/vehicleNo)

CREATE SCREEN — SECTION LAYOUT:

1) Token Header
- tokenNo (auto, read-only)
- entryNo (auto, read-only)
- tokenDateTime (auto)
- status (default OPEN)

2) Customer & Vehicle
- customerId* (searchable dropdown, active only)
- vehicleNo* (dependent dropdown from customer.vehicles[])
- driverName
- driverMobile

3) Item Selection
- itemId* (searchable dropdown, active only)
- show sellingUnit label
- show GST% tag

4) Weighbridge Section
- emptyWeight* (auto-fetch field)
- weightCapturedAt (auto)
- Capture Weight button

5) ANPR Section
- anprImageRef (preview thumbnail)
- anprCapturedAt
- anprNumberPlateText

6) Load Capture Section
- loadImageRef
- loadCapturedAt

7) Barrier Section
- barrierEventId
- Show status badge (Opened / Closed)

8) Audit
- createdBy
- updatedBy

DETAILS SCREEN:
- Show all sections grouped
- Show linked Sales Bill if billed
- Show system info (createdAt, updatedAt)