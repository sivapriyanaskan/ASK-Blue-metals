Do NOT write explanation. Do NOT summarize. Do NOT write code.
Only update Figma design frames/components.

Update or create module: ITEM SUB GROUP MASTER

If module exists:
- Insert missing fields exactly as per schema.
If not:
- Create List, Create, Edit, View screens using existing ERP style.

Schema Fields:
- itemSubGroupId* (Text/Number, unique identifier)
- subGroupCode* (Text, unique)
- subGroupName* (Text)
- itemGroupId* (Lookup to Item Group Master)
- description (Text)
- isActive* (Boolean)

System Fields in Details (if system supports):
- createdAt, createdBy, updatedAt, updatedBy

LIST SCREEN:
Columns:
- subGroupCode
- subGroupName
- Parent Group (groupCode/groupName)
- description
- Status badge
Filters:
- Parent Group
- Status
- Search (subGroupCode/subGroupName)

CREATE/EDIT FORM:
Section 1: Basic Info
- itemSubGroupId*
- subGroupCode*
- subGroupName*
- itemGroupId* (searchable dropdown from Item Group Master where isActive=true)
- description
- isActive* (default true)

DETAILS SCREEN:
- Show all fields
- Show status badge
- Show system info section
- Add placeholder "Related Records"

Validation:
- itemSubGroupId required + unique
- subGroupCode required + unique
- subGroupName required
- itemGroupId required
- isActive required