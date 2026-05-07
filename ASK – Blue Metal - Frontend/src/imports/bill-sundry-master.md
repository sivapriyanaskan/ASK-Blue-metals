Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: BILL SUNDRY MASTER

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit, View screens using existing ERP style.

Schema Fields:
- billSundryId (Unique ID, hidden system)
- sundryName* (Text, unique)
- sundryType* (Enum: ADDITIVE / DEDUCTIVE)
- defaultValue (Decimal)
- calculationMode* (Enum: FIXED / PERCENTAGE)
- isEditableAtBilling* (Boolean)
- status* (Active / Inactive)
- createdBy (Lookup User)
- updatedBy (Lookup User)

System Fields (Details Screen):
- createdAt
- createdBy
- updatedAt
- updatedBy

LIST SCREEN:
Columns:
- sundryName
- sundryType
- calculationMode
- defaultValue
- isEditableAtBilling badge
- Status badge
Filters:
- sundryType
- calculationMode
- Status
- Search (sundryName)

CREATE / EDIT FORM:

SECTION 1: Basic Info
- sundryName*
- sundryType*
- calculationMode*
- defaultValue

SECTION 2: Billing Behavior
- isEditableAtBilling*
- status*

DETAILS SCREEN:
- Show all fields grouped
- Show status badge
- Show system info
- Add placeholder “Related Records”

Validation:
- sundryName required and unique
- sundryType required
- calculationMode required
- isEditableAtBilling required
- status required