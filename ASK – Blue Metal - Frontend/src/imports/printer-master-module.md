Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: PRINTER MASTER

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit, View screens using existing ERP style.

Printer Schema Fields:
- printerId (Unique ID, auto-generated, hidden system)
- printerName* (Text)
- printerCode (Text)
- printerType* (Enum: TOKEN / BILL / REPORT)
- deviceIdentifier (Text)
- ipAddress (Text)
- port (Number)
- location (Text)
- isDefault (Boolean)
- isActive* (Boolean)

System Fields in Details:
- createdAt
- createdBy
- updatedAt
- updatedBy

LIST SCREEN:
Columns:
- printerName
- printerType
- location
- ipAddress
- isDefault badge
- isActive badge
Filters:
- printerType
- isActive
- Search (printerName/printerCode/location)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Basic Details
- printerName*
- printerCode
- printerType*
- location

2) Device Configuration
- deviceIdentifier
- ipAddress
- port

3) Settings
- isDefault (toggle)
- isActive* (toggle)

DETAILS SCREEN:
- Show all fields grouped
- Show status badges
- Show system info section
- Add placeholder “Related Records” section

Validation Rules:
- printerName required
- printerType required
- Only one printer per printerType can have isDefault=true
- isActive required