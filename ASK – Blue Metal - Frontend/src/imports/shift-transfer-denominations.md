Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Create or enhance module: SHIFT TRANSFER DENOMINATIONS

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel

Use MongoDB ObjectId as hidden id:
- shiftTransferDenomId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER:
- shiftId* (lookup Shift closing)
- denomination* (dropdown: 500/200/100/50/20/10/5/2/1)
- nos* (number of notes transferred)
- amount* (calculated: denomination × nos)

LIST SCREEN:
Columns:
- shiftId (link to Shift Closing)
- denomination
- nos
- amount
- status badge (Transferred)

Filters:
- shiftId (lookup Shift)
- denomination
- status (Transferred)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Shift Reference
- shiftId* (lookup Shift)

2) Denomination Details
- denomination* (dropdown: 500/200/100/50/20/10/5/2/1)
- nos* (number of notes transferred)
- amount* (auto-calculated)

3) Status
- status (read-only, show "Transferred")

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”