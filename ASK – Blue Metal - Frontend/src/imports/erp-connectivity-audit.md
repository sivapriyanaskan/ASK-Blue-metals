Perform a full ERP system connectivity audit and alignment pass.

Do NOT redesign UI.
Do NOT change navigation.
Only validate, wire, and correct cross-module connectivity.

SYSTEM VALIDATION SCOPE:

1) MASTER → TRANSACTION DROPDOWN WIRING
Ensure the following mappings are correctly implemented:

• Roles → Users
• Menu Master → Role – Menu Access
• Feature Master → Role – Feature Access
• Bank Master → Sales Bill (Online Payment)
• Printer Master → Token Print / Sales Print
• Item Master → Token / Sales Bill / Purchase Bill / Production
• Customer Master → Token / Sales Bill
• Supplier Master → Entry Pass / Purchase Bill
• Bill Sundry Master → Sales Bill
• Vehicle Master → Fuel Consumption / Token / Entry Pass

For each:
- Dropdown must be searchable.
- Only show isActive = true records.
- Required where applicable.
- Proper validation blocking save if missing.

2) TRANSACTION → MASTER RELATED RECORDS
In every Master Details screen, ensure “Related Records” section exists.

Examples:
- Customer → Tokens, Sales Bills
- Supplier → Entry Pass, Purchase Bills
- Item → Sales, Purchase, Production usage
- Bank → Sales Bills (Online payments)
- Role → Users, Menu permissions, Feature permissions

Each Related Records section must:
- Show table view
- Include clickable navigation
- Include date filter

3) STATUS CONSISTENCY
- All Masters must have isActive toggle.
- Transactions must prevent selection of inactive masters.
- Deactivation must show warning if record is already used.

4) SYSTEM FIELDS CONSISTENCY
Every module must show in Details:
- createdAt
- createdBy
- updatedAt
- updatedBy
- ObjectId (Admin only)

5) FILTER ALIGNMENT
Ensure List screen filters include:
- Date range (for transactions)
- Status (for masters)
- Linked master filters (Customer, Supplier, Item, Bank etc.)

6) NUMBERING & AUTO GENERATION VALIDATION
Ensure:
- Token No (daily reset logic shown)
- Entry Pass No (daily reset)
- Bill No format logic displayed
- Entry No item-based yearly increment

7) PERMISSION VALIDATION
Ensure:
- Role permissions reflect correctly in Users
- Menu access controls visibility
- Feature access controls actions

If any wiring or connectivity is missing:
- Fix it.
- Add necessary UI linkage.
- Add Related Records panels.
- Do not redesign layouts.

This is a system alignment pass.
Complete all corrections in one operation.