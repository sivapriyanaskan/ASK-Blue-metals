Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: SUPPLIER MASTER

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit, View screens using existing ERP style.

Supplier Schema Fields:

Primary:
- supplierId* (Unique ID, auto-generated, hidden in UI)
- supplierCode* (Text/Number, unique)
- supplierName* (Text)

Contact & Address:
- address (Multiline Text)
- phone (Text)
- mobile (Text)
- email (Text)
- ulr (Text)
- pinNo (Text)

Tax:
- tinNo (Text)
- gstNo (Text, conditional required based on business rule)

Accounting:
- controlAccountId* (Lookup: Ledger Master where accountType = Supplier AND isActive=true)
- openingType (Enum: Credit / Debit)
- openingAmount (Decimal, default 0.00)

Supplier Type:
- supplierType* (Enum: CUBIC_BASED / TON_BASED)

Vehicles[] (Repeatable Grid Section):
- regNo* (Text)
- height (Number, required if supplierType = CUBIC_BASED)
- length (Number, required if supplierType = CUBIC_BASED)
- breadth (Number, required if supplierType = CUBIC_BASED)
- adjustmentValue (Decimal, can be + or -)
- cuftTotal (Number, auto-calculated and read-only)
- emptyWeight (Number)

Status:
- isActive* (Yes/No)

System Fields (Details only):
- createdAt
- createdBy
- updatedAt
- updatedBy

LIST SCREEN:
Columns:
- supplierCode
- supplierName
- supplierType
- mobile
- gstNo
- Status badge
Filters:
- supplierType
- Status
- Search (code/name/mobile)

CREATE / EDIT FORM — SECTION LAYOUT:

1) Basic Info
- supplierCode*
- supplierName*
- supplierType*

2) Address & Contact
- address
- pinNo
- phone
- mobile
- email
- ulr

3) Tax & Compliance
- tinNo
- gstNo

4) Accounting
- controlAccountId* (searchable dropdown)
- openingType
- openingAmount

5) Vehicles (Repeatable Grid)
Columns:
- Reg No*
- Length (conditional)
- Breadth (conditional)
- Height (conditional)
- Adjustment (+/-)
- Calculated CUFT Total (read-only)
- Empty Weight

Behavior:
- If supplierType = TON_BASED:
  - Hide length/breadth/height/adjustment/cuftTotal
- If supplierType = CUBIC_BASED:
  - Show dimension fields
  - cuftTotal auto-calculates as:
    (length × breadth × height) + adjustmentValue
  - cuftTotal field read-only

6) Status
- isActive*

DETAILS SCREEN:
- Show grouped sections
- Show vehicles table
- Show system info
- Add placeholder "Related Records" section (to be wired next)

Validation Rules:
- supplierCode required + unique
- supplierName required
- supplierType required
- controlAccountId required
- vehicles.regNo required for each row
- If CUBIC_BASED:
   - length, breadth, height required
   - cuftTotal auto-calculated