Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Create or enhance module: CURRENCY EXCHANGE

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel
F) Print/Export panel (if printing required)

Use MongoDB ObjectId as hidden id:
- currencyExchangeId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER
- entryNo* (auto-generated running number)
- billDateTime* (date & time picker)
  
CASH OUT (Denomination Paid Out)
- outDetails* (array/list of denomination values paid out)
  - denomination* (500/200/100/50/20/10, etc.)
  - nos* (number of notes paid out)
  - amount* (calculated: denomination × nos)

CASH IN (Denomination Received)
- inDetails* (array/list of denomination values received)
  - denomination* (2000/500/200/100/50/20/10/5/2/1)
  - nos* (number of notes/coins received)
  - amount* (calculated: denomination × nos)

TOTALS
- totalAmountPaid* (sum of outDetails.amount)
- totalAmountReceived* (sum of inDetails.amount)

LIST SCREEN:
Columns:
- entryNo
- billDateTime
- totalAmountPaid
- totalAmountReceived
- status badge (Open/Closed/Cancelled)

Filters:
- billDateTime (date range)
- denomination (optional, search for specific denomination values)
- Search (entryNo)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Basic Info
- entryNo* (auto)
- billDateTime* (date & time picker)

2) Denomination Out Details
- outDetails.denomination* (dropdown for denominations)
- outDetails.nos* (number of notes)
- outDetails.amount* (auto-calculated)

3) Denomination In Details
- inDetails.denomination* (dropdown for denominations)
- inDetails.nos* (number of notes/coins)
- inDetails.amount* (auto-calculated)

4) Total Calculation (read-only)
- totalAmountPaid* (auto-calculated)
- totalAmountReceived* (auto-calculated)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”