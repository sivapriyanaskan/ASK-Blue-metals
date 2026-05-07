Do NOT write explanations, summaries, or code.
Only modify/create Figma frames/components in the existing ERP layout style.

Create or enhance module: CASH VOUCHER

If module does not exist:
Create screens:
A) List
B) Create
C) Edit
D) View/Details (read-only + audit)
E) Filters panel
F) Print/Export panel (if printing required)

Use MongoDB ObjectId as hidden id:
- cashVoucherId hidden in UI; visible in admin/audit.

Include ALL schema fields:

HEADER:
- voucherType* (ENUM: PAYMENT / RECEIPT)
- docDate* (date picker)
- voucherNo* (auto-generated, format like Pay/Apr/2/25 or Rec/Apr/9/25)
- drBalance (decimal, for showing debit balance)
- crTotal (decimal, for showing credit balance)

LINE ITEMS (voucher lines):
- lines.slNo* (auto-numbered)
- lines.accountCode* (text/number, account code)
- lines.accountId* (lookup AccountHead, optional if Account master exists)
- lines.accountHeadNameSnapshot* (snapshot of account head name)
- lines.description (text)
- lines.amount* (decimal, mandatory)
- lines.narration (optional)

SUMMARY FIELDS:
- totalAmount (auto-calculated, sum of all line amounts)

PREPARATION AND APPROVAL:
- preparedBy* (lookup User, current user)
- authorisedBy (lookup User, optional)
- receivedByName (text, optional)

PAYMENT DETAILS:
- paymentMode* (ENUM: CASH / BANK / MIXED)
- bankId* (lookup BankMaster, conditional for BANK/MIXED payment mode)
- transactionNo* (text, conditional for BANK/MIXED)

DENOMINATIONS:
- paidDenominations* (array of denomination details for payment vouchers)
   - denomination* (500/200/100/50/20/10/5/2/1)
   - nos* (number of notes)
   - amount (auto-calculated)
- receivedDenominations* (array of denomination details for receipt vouchers)
   - denomination* (500/200/100/50/20/10/5/2/1)
   - nos* (number of notes)
   - amount (auto-calculated)

STATUS:
- status* (ENUM: DRAFT / POSTED / CANCELLED)
- cancelledReason (text, conditional, required if status=CANCELLED)

REMARKS:
- remarks (text, optional)

LIST SCREEN:
Columns:
- voucherNo
- voucherType
- docDate
- totalAmount
- status badge (DRAFT/POSTED/CANCELLED)
Filters:
- voucherType
- voucherNo
- status (DRAFT/POSTED/CANCELLED)
- date range (docDate)

CREATE/EDIT FORM — SECTION LAYOUT:

1) Voucher Info
- voucherType* (dropdown: PAYMENT / RECEIPT)
- docDate* (date picker)
- voucherNo* (auto-generated)
- drBalance
- crTotal

2) Line Items (at least one required)
- lines.slNo* (auto-number)
- lines.accountCode*
- lines.accountHeadNameSnapshot*
- lines.amount*
- lines.description
- lines.narration

3) Payment Details
- paymentMode* (dropdown: CASH / BANK / MIXED)
- bankId (lookup BankMaster if paymentMode is BANK/MIXED)
- transactionNo (only if paymentMode is BANK/MIXED)
- receivedByName (text, optional)

4) Denominations
- paidDenominations (array of objects)
  - denomination* (dropdown)
  - nos* (number)
  - amount* (auto-calculated)
- receivedDenominations (array of objects)
  - denomination* (dropdown)
  - nos* (number)
  - amount* (auto-calculated)

5) Status & Remarks
- status* (dropdown: DRAFT / POSTED / CANCELLED)
- cancelledReason (conditional)
- remarks (text)

DETAILS SCREEN:
- Show all fields grouped
- Show system info: createdAt, createdBy, updatedAt, updatedBy
- Add placeholder “Related Records”