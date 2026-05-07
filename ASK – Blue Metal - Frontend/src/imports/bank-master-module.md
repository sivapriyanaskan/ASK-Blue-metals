Update or create module: BANK MASTER

If the module exists:
- Insert missing fields.
If it does not exist:
- Create List, Create, Edit, and View screens using existing design style.

Database Fields:
- bankId (ObjectId, system, hidden)
- bankCode (text, required, unique)
- bankName (text, required)
- accountNumber (text, required)
- branchName (text)
- ifscCode (text)
- upiId (text, optional)
- isActive (boolean, required)
- createdAt (datetime, system)
- createdBy (lookup to User, system)
- updatedAt (datetime, system)
- updatedBy (lookup to User, system)

LIST SCREEN:
Columns:
- Bank Code
- Bank Name
- Account Number (masked format)
- Branch Name
- IFSC Code
- UPI ID
- Status badge
Filters:
- Status
- Search (Bank Code / Name / Account No)
Bulk actions:
- Activate / Deactivate

CREATE / EDIT FORM:
Section 1: Basic Information
- bankCode* (unique)
- bankName*
- branchName
Section 2: Account Details
- accountNumber*
- ifscCode
- upiId
Section 3: Status
- isActive* (toggle)

DETAILS SCREEN:
Show:
- All fields
- System Info section (bankId, createdAt, createdBy, updatedAt, updatedBy)
- Related Records:
   - Sales Bills using this bank (Online payments)
   - Payment Transactions

VALIDATION RULES:
- bankCode required and unique
- bankName required
- accountNumber required
- isActive required
- Prevent deletion if bank is used in Sales Bills (show warning)

Do not redesign layout.
Only enhance or create module as per ERP style.