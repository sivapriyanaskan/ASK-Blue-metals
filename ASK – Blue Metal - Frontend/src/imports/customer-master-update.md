Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update module: CUSTOMER MASTER
Goal: add the missing fields exactly as per schema and align field names.

Customer Schema Fields:
- customerId (ObjectId, hidden system)
- customerCode* (text/number, unique)
- customerName* (text)
- address (multiline text)
- phone (text)
- mobile (text)
- email (text)
- ulr (text) [Website URL]
- tinNo (text)
- gstNo (text) [Conditional required when billType = Tax Invoice / FULL_GST]
- pinNo (text)
- panNo (text)
- billType* (option: Tax Invoice / Invoice)
- isTCSApplicable (boolean)
- isIGSTBill (boolean)
- creditLimit (number, default 0)
- controlAccountId (lookup: Account/Ledger)
- openingType (enum: Credit/Debit)
- openingAmount (decimal, default 0.00)
- vehicles[] (array grid)
   - vehicles.regNo* (text) [Vehicle registration number]
- isActive* (boolean)

SYSTEM FIELDS (Details only):
- createdAt, createdBy, updatedAt, updatedBy

LIST SCREEN:
- Ensure columns include:
  customerCode, customerName, billType, gstNo, mobile, creditLimit, isActive
- Filters:
  Status (isActive)
  Bill Type
  Search (code/name/mobile/gstNo)

CREATE/EDIT FORM — SECTION LAYOUT:
1) Basic Info
- customerCode*
- customerName*
- billType*
- gstNo* (show only if billType = Tax Invoice; required then)

2) Address & Contact
- address
- pinNo
- phone
- mobile
- email
- ulr

3) Tax & Compliance
- tinNo
- panNo
- isTCSApplicable (checkbox)
- isIGSTBill (checkbox)

4) Accounts & Limits
- controlAccountId (searchable dropdown lookup)
- creditLimit (default 0)
- openingType (Credit/Debit)
- openingAmount (default 0.00)

5) Vehicles
- vehicles[] as repeatable grid/table:
   Reg No* (vehicles.regNo)
   Add row / remove row
- Note: Do NOT include vehicle dimensions for customers.

6) Status
- isActive* toggle

DETAILS SCREEN:
- Show all fields grouped as above
- Show vehicles table
- Show System Info section with ObjectId (admin only) + created/updated fields
- Keep "Related Records" section placeholder for wiring (handled in next prompt)

VALIDATION RULES:
- customerCode required + unique
- customerName required
- billType required
- gstNo required only when billType = Tax Invoice
- vehicles.regNo required for each vehicle row if vehicle row exists
- openingAmount must be >= 0
- creditLimit must be >= 0