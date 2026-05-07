Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Create or enhance module: RAW MATERIAL - ITEM WISE

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel
F) Print/Export panel (if printing required)

Use MongoDB ObjectId as hidden id:
- productionItemWiseId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER:
- entryNo* (auto-generated, running number)
- entryDateTime* (date picker)
- itemId* (lookup ItemMaster)
- itemNameSnapshot* (text, item name snapshot)
- status* (ENUM: SAVED / POSTED / CANCELLED)
- remarks (text)

STOCK DETAILS:
- currentStockTonn* (decimal, auto-fetched)
- consumedTonn* (decimal, user enters quantity consumed)
- closingStockTonn* (auto-calculated: currentStockTonn - consumedTonn)
- stockCalcMode (ENUM: AUTO, default AUTO)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”

LIST SCREEN:
Columns:
- entryNo
- itemNameSnapshot
- currentStockTonn
- consumedTonn
- closingStockTonn
- status badge (SAVED/POSTED/CANCELLED)

Filters:
- itemNameSnapshot
- status (SAVED/POSTED/CANCELLED)
- date range (entryDateTime)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Basic Info
- entryNo* (auto)
- entryDateTime* (date picker)
- remarks

2) Raw Material Consumption Details
- itemId* (lookup ItemMaster)
- itemNameSnapshot* (auto)
- currentStockTonn* (auto-fetched)
- consumedTonn* (decimal, editable)
- closingStockTonn* (auto-calculated)

3) Status & Remarks
- status* (dropdown: SAVED/POSTED/CANCELLED)
- remarks (text area)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy