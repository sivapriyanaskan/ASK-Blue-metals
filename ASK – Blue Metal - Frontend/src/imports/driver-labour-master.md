Do NOT write explanations, summaries, or code.
Only create/modify Figma frames/components in the existing ERP layout style.

This module does NOT exist currently. Create it now.

Create module: DRIVER / LABOUR MASTER

Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel

Use MongoDB ObjectId as hidden id:
- driverId hidden in UI; visible in admin/audit.

Include ALL schema fields:
- driverCode* (Text, unique)
- driverName* (Text)
- mobile (Text)
- licenseNo (Text)
- licenseExpiry (Date)
- address (Text multiline)
- isActive* (Boolean, default true)

LIST SCREEN:
Columns:
- driverCode
- driverName
- mobile
- licenseNo
- licenseExpiry
- isActive badge

Filters:
- isActive
- License Expiry (expiring in 30/60/90 days quick filter)
- Search (driverCode/driverName/mobile/licenseNo)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Driver Identity
- driverCode*
- driverName*
- mobile
- isActive*

2) License Details
- licenseNo
- licenseExpiry (date picker)

3) Address
- address

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”

Validation:
- driverCode required + unique
- driverName required
- isActive required
- If licenseExpiry is in past, show warning banner (still allow save).