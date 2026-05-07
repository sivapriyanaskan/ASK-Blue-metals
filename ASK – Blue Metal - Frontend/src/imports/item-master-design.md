Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: ITEM MASTER

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit, View screens using existing ERP style.

Item Schema Fields:
- itemId (ObjectId, hidden system)
- itemCode* (text/number, unique)
- itemName* (text)
- hsnCode (text)
- itemGroupId* (lookup: Item Group master)
- itemSubGroupId* (lookup: Item Sub Group master)
- isRawMaterial (boolean)
- checkStockStatus (boolean)
- purchaseUnit* (enum/text)
- sellingUnit* (enum/text)
- defaultPrinter (lookup: Printer Master)
- gettingPrice (decimal)
- sellingPrice* (decimal)
- mrp (decimal)
- gstPercentage* (decimal)
- isShownInMIS (boolean)
- reorderLevel (decimal)
- minimumLevel (decimal)
- isActive* (boolean)

Note:
- Opening Stock Details: DO NOT include in UI (explicitly not needed).

LIST SCREEN:
Columns:
- itemCode, itemName, itemGroup, itemSubGroup, sellingPrice, gstPercentage, isRawMaterial, isActive
Filters:
- Status (isActive)
- Item Group
- Item Sub Group
- Raw Material toggle
- Search (code/name/hsn)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Basic Details
- itemCode*
- itemName*
- hsnCode
- itemGroupId* (searchable dropdown)
- itemSubGroupId* (searchable dropdown)

2) Units & Type
- purchaseUnit*
- sellingUnit*
- isRawMaterial (toggle)
- isShownInMIS (toggle)

3) Pricing & Tax
- gettingPrice
- sellingPrice*
- mrp
- gstPercentage*

4) Printing
- defaultPrinter (searchable dropdown from Printer Master where isActive=true)
- helper text: “Default printer used for Token printing for this item.”

5) Stock Controls
- checkStockStatus (toggle)
- reorderLevel
- minimumLevel
- helper note: “If checkStockStatus enabled, billing may be blocked when stock is below minimum.”

6) Status
- isActive*

DETAILS SCREEN:
- Show all fields in same groupings
- Show system info (createdAt, createdBy, updatedAt, updatedBy; itemId in admin-only)
- Add placeholder section “Related Records” for wiring next

Validation Rules:
- itemCode required + unique
- itemName required
- itemGroupId + itemSubGroupId required
- purchaseUnit and sellingUnit required
- sellingPrice required
- gstPercentage required
- isActive required
- Prevent selecting inactive printer in defaultPrinter