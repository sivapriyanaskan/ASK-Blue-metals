Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: LEDGER / ACCOUNT MASTER

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit, View screens using existing ERP design style.

Schema Fields:

Primary:
- accountId* (Text/Number, unique ID, required)
- accountCode* (Text, required)
- accountName (Text)
- accountType (Text or Dropdown: Customer / Supplier / Expense)
- isActive* (Yes/No)

System Fields (Details only):
- createdAt
- createdBy
- updatedAt
- updatedBy

LIST SCREEN:
Columns:
- accountId
- accountCode
- accountName
- accountType
- Status badge
Filters:
- accountType
- Status
- Search (accountCode/accountName)

CREATE / EDIT FORM:

Section 1: Basic Information
- accountId*
- accountCode*
- accountName
- accountType (dropdown)
- isActive*

DETAILS SCREEN:
- Show all fields grouped
- Show Status badge
- Show System Info section (createdAt, createdBy, updatedAt, updatedBy)
- Add placeholder section "Related Records" (to be wired next)

Validation Rules:
- accountId required and unique
- accountCode required
- isActive required
- accountType must be one of predefined options

Do not redesign layout.
Use existing ERP form and table components.