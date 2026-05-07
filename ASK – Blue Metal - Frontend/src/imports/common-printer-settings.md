Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Create or enhance module: COMMON PRINTER SETTINGS

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel

Use MongoDB ObjectId as hidden id:
- commonPrintSettingId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER
- formName* (ENUM: SALES_BILL, TOKEN, etc.)
- printerId* (lookup PrinterMaster, active printers only)
- printEngine* (ENUM: CRYSTAL / THERMAL)
- printFormat* (ENUM: A4 / A5 / THERMAL_3IN / THERMAL_4IN)
- defaultCopies* (number of copies)
- showPreview* (Boolean, true=show preview screen)
- allowPdfFallback (Boolean, optional)
- isDefault* (Boolean, only one TRUE per formName)
- isActive* (Boolean, only active configs available)

LIST SCREEN:
Columns:
- formName
- printerId
- printEngine
- printFormat
- defaultCopies
- isDefault badge
- isActive badge

Filters:
- formName
- printerId
- isActive
- Search (formName/printerId)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Form Selection
- formName* (dropdown ENUM)

2) Printer Selection
- printerId* (lookup PrinterMaster active)

3) Print Engine
- printEngine* (dropdown ENUM: CRYSTAL / THERMAL)

4) Print Format
- printFormat* (dropdown ENUM: A4 / A5 / THERMAL_3IN / THERMAL_4IN)

5) Print Behavior
- defaultCopies* (number)
- showPreview* (toggle)
- allowPdfFallback (toggle)

6) Status & Active
- isDefault* (toggle)
- isActive* (toggle)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records” (optional, if relevant)