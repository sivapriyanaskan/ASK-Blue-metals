Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Create or enhance module: RAW MATERIAL - PURCHASE WISE

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel
F) Print/Export panel (if printing required)

Use MongoDB ObjectId as hidden id:
- productionPurchaseWiseId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER:
- entryNo* (auto-generated, running number)
- entryDateTime* (date picker + time picker)
- status* (ENUM: SAVED / POSTED / CANCELLED)
- remarks (text)

LINES (Purchase-wise allocation details):
- lines.isSelected* (checkbox, for selecting rows for production)
- lines.purchaseBillId* (lookup Purchase Entry Bill)
- lines.purchaseNoSnapshot* (text, snapshot of purchase number)
- lines.purchaseDateSnapshot* (date, snapshot of purchase date)
- lines.supplierNameSnapshot* (text, snapshot of supplier name)
- lines.itemNameSnapshot* (text, snapshot of item name)
- lines.purchaseQty* (decimal, quantity purchased for the item)
- lines.productionQty* (decimal, quantity consumed in production, editable)
- lines.balanceQty* (decimal, remaining quantity after production allocation, auto-calculated)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”

LIST SCREEN:
Columns:
- entryNo
- purchaseNoSnapshot
- itemNameSnapshot
- purchaseQty
- productionQty
- balanceQty
- status badge (SAVED/POSTED/CANCELLED)

Filters:
- purchaseNoSnapshot
- itemNameSnapshot
- status (SAVED/POSTED/CANCELLED)
- date range (entryDateTime)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Basic Info
- entryNo* (auto)
- entryDateTime* (date picker + time picker)
- remarks

2) Purchase-Wise Allocation Details
- lines.isSelected* (checkbox)
- lines.purchaseBillId* (lookup Purchase Entry Bill)
- lines.purchaseNoSnapshot* (auto)
- lines.purchaseDateSnapshot* (auto)
- lines.supplierNameSnapshot* (auto)
- lines.itemNameSnapshot* (auto)
- lines.purchaseQty* (decimal)
- lines.productionQty* (decimal, editable)
- lines.balanceQty (auto-calculated)

3) Status & Remarks
- status* (dropdown: SAVED/POSTED/CANCELLED)
- remarks (text area)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy