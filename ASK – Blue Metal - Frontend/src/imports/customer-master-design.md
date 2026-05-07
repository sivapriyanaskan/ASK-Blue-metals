Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames.

Update or create module: CUSTOMER MASTER

If module exists:
- Insert missing fields from schema.
If not:
- Create List, Create, Edit, View screens using existing ERP style.

Database Fields:

Primary:
- customerId (ObjectId, hidden system)
- customerCode (text, required, unique)
- customerName (text, required)
- billType (enum: Tax Invoice / Without GST, required)
- gstNumber (text, conditional required if billType = Tax Invoice)
- address (textarea)
- phone (text)
- email (text)
- creditLimit (decimal)
- openingBalance (decimal)
- paymentTermsDays (number)
- contactPerson (text)
- isActive (boolean, required)

Embedded Array:
- vehicles[] (repeatable grid section)
  Fields:
    - vehicleNo (text, required)
    - driverName (text)
    - driverMobile (text)
    - isDefaultVehicle (boolean)

System Fields:
- createdAt
- createdBy
- updatedAt
- updatedBy

LIST SCREEN:
Columns:
- Customer Code
- Customer Name
- Bill Type
- GST Number
- Phone
- Status badge
Filters:
- Status
- Bill Type
- Search (code/name/phone)

CREATE / EDIT FORM:

Section 1: Basic Info
- customerCode*
- customerName*
- billType*
- gstNumber* (show only if Tax Invoice selected)

Section 2: Contact Details
- address
- phone
- email
- contactPerson

Section 3: Financial
- creditLimit
- openingBalance
- paymentTermsDays

Section 4: Vehicles
- Repeatable grid:
  Vehicle No*
  Driver Name
  Driver Mobile
  Default checkbox

Section 5: Status
- isActive*

DETAILS SCREEN:
- Show all fields
- Show vehicles in table format
- Show system info
- Add placeholder section titled "Related Records" (to be wired next)

Do not redesign layout.
Use existing component patterns.