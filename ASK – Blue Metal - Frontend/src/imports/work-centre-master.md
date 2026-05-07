Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Update or create module: WORK CENTRE MASTER

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel

Use MongoDB ObjectId as hidden id:
- workCentreId hidden in UI; visible in admin/audit.

Include ALL schema fields:
- workCentreCode* (Text, unique)
- workCentreName* (Text)
- address (Text multiline)
- contactPerson (Text)
- phone (Text)
- isActive* (Boolean)

LIST SCREEN:
Columns:
- workCentreCode
- workCentreName
- contactPerson
- phone
- isActive badge

Filters:
- isActive
- Search (code/name/contact/phone)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Work Centre Details
- workCentreCode*
- workCentreName*
- isActive* (default true)

2) Location & Contact
- address
- contactPerson
- phone

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”