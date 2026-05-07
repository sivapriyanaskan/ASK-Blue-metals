Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: FREEZE ITEM TO CUSTOMER

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit, View screens using existing ERP style.

Schema Fields:
- freezeId (Unique ID, hidden system)
- customerId* (Lookup Customer, required, only isActive=true)
- itemId* (Lookup Item, required, only isActive=true)
- freezeStartDate* (Date)
- freezeEndDate* (Date)
- reason* (Text / textarea)
- createdBy* (Lookup User, read-only auto)
- isActive* (Boolean, default true)

LIST SCREEN:
Columns:
- Customer (code + name)
- Item (code + name)
- Freeze Start
- Freeze End
- Reason (short)
- Status badge (Active/Inactive)
Filters:
- Customer
- Item
- Status
- Date range (freeze period overlap)
- Search (customer/item/reason)

CREATE/EDIT FORM:
Section 1: Freeze Mapping
- customerId* (searchable dropdown)
- itemId* (searchable dropdown)

Section 2: Freeze Period
- freezeStartDate*
- freezeEndDate*
- validation: end date cannot be before start date

Section 3: Reason & Status
- reason* (textarea)
- isActive* toggle
- createdBy shown as read-only (auto from logged-in user)

DETAILS SCREEN:
- Show all fields grouped
- Show createdBy + system info (createdAt/updatedAt if available)
- Add placeholder “Related Records” section

VALIDATION RULES:
- customerId required
- itemId required
- freezeStartDate required
- freezeEndDate required and must be >= freezeStartDate
- reason required
- Prevent duplicates: if an active freeze exists for same customer+item overlapping dates, show conflict warning.
Do not redesign layout.