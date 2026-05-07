# API Dropdown - Quick Reference Guide

## 🚀 Quick Start

```tsx
import { ApiDropdown } from '../components/ui/api-dropdown';
import { fetchCustomers, type Customer } from '../services/api-dropdown-service';

<ApiDropdown<Customer>
  fetchData={fetchCustomers}
  getItemLabel={(c) => c.name}
  getItemValue={(c) => c.code}
  value={customerId}
  onValueChange={(val, obj) => {
    setCustomerId(val);
    setCustomer(obj);
  }}
  placeholder="Select customer..."
/>
```

## 📦 Available Entities

| Entity | Type | Fetch Function | Primary Field | Display Field |
|--------|------|----------------|---------------|---------------|
| Customer | `Customer` | `fetchCustomers` | `code` | `name` |
| Item | `Item` | `fetchItems` | `code` | `name` |
| Driver | `Driver` | `fetchDrivers` | `id` | `driverName` |
| Vehicle | `Vehicle` | `fetchVehicles` | `id` | `regNo` |
| Bank | `Bank` | `fetchBanks` | `id` | `bankName` |
| Printer | `Printer` | `fetchPrinters` | `id` | `printerName` |
| Account | `Account` | `fetchAccounts` | `accountId` | `accountName` |

## 🎯 Common Patterns

### Pattern 1: Basic Dropdown
```tsx
const [itemId, setItemId] = useState('');

<ApiDropdown<Item>
  fetchData={fetchItems}
  getItemLabel={(item) => item.name}
  getItemValue={(item) => item.code}
  value={itemId}
  onValueChange={(value) => setItemId(value)}
/>
```

### Pattern 2: With Object Storage
```tsx
const [itemId, setItemId] = useState('');
const [item, setItem] = useState<Item | null>(null);

<ApiDropdown<Item>
  fetchData={fetchItems}
  getItemLabel={(item) => item.name}
  getItemValue={(item) => item.code}
  value={itemId}
  onValueChange={(value, selectedItem) => {
    setItemId(value);
    setItem(selectedItem);
  }}
/>
```

### Pattern 3: With Description
```tsx
<ApiDropdown<Customer>
  fetchData={fetchCustomers}
  getItemLabel={(c) => c.name}
  getItemValue={(c) => c.code}
  getItemDescription={(c) => c.code}
  value={customerId}
  onValueChange={(val, obj) => {
    setCustomerId(val);
    setCustomer(obj);
  }}
/>
```

### Pattern 4: Conditional Enable
```tsx
<ApiDropdown<Item>
  fetchData={fetchItems}
  getItemLabel={(item) => item.name}
  getItemValue={(item) => item.code}
  value={itemId}
  onValueChange={(val) => setItemId(val)}
  disabled={!customerId}  // Disable until customer selected
  placeholder={customerId ? "Select item..." : "Select customer first"}
/>
```

### Pattern 5: React Hook Form Integration
```tsx
import { Controller } from 'react-hook-form';

<Controller
  name="customerId"
  control={control}
  rules={{ required: "Customer is required" }}
  render={({ field }) => (
    <ApiDropdown<Customer>
      fetchData={fetchCustomers}
      getItemLabel={(c) => c.name}
      getItemValue={(c) => c.code}
      value={field.value}
      onValueChange={(value) => field.onChange(value)}
    />
  )}
/>
```

## ⚙️ Configuration Options

### Default Settings
```tsx
{
  pageSize: 20,           // Items per page
  debounceMs: 300,        // Search delay (ms)
  allowClear: true,       // Show clear button
  disabled: false         // Enable/disable dropdown
}
```

### Custom Settings
```tsx
<ApiDropdown<Customer>
  fetchData={fetchCustomers}
  getItemLabel={(c) => c.name}
  getItemValue={(c) => c.code}
  value={customerId}
  onValueChange={(val) => setCustomerId(val)}
  pageSize={15}           // Load 15 items at a time
  debounceMs={500}        // Wait 500ms before searching
  allowClear={false}      // Hide clear button
  placeholder="Choose..."
  searchPlaceholder="Type to search..."
  emptyText="No matches found"
/>
```

## 🎨 Custom Rendering

### Custom Item Display
```tsx
<ApiDropdown<Customer>
  fetchData={fetchCustomers}
  getItemLabel={(c) => c.name}
  getItemValue={(c) => c.code}
  value={customerId}
  onValueChange={(val) => setCustomerId(val)}
  renderItem={(customer, isSelected) => (
    <div className="flex items-center justify-between w-full">
      <div>
        <div className="font-medium">{customer.name}</div>
        <div className="text-xs text-muted-foreground">{customer.phone}</div>
      </div>
      {customer.gstNumber && (
        <Badge variant="outline">GST</Badge>
      )}
    </div>
  )}
/>
```

### Custom Selected Display
```tsx
<ApiDropdown<Customer>
  fetchData={fetchCustomers}
  getItemLabel={(c) => c.name}
  getItemValue={(c) => c.code}
  value={customerId}
  onValueChange={(val) => setCustomerId(val)}
  renderSelectedValue={(customer) => (
    customer ? (
      <div className="flex items-center gap-2">
        <span>{customer.name}</span>
        <Badge>{customer.code}</Badge>
      </div>
    ) : (
      <span className="text-muted-foreground">Select...</span>
    )
  )}
/>
```

## 🔧 Creating New API Functions

### Step 1: Define Type
```typescript
// In /src/app/services/api-dropdown-service.ts

export interface MyEntity {
  id: string;
  name: string;
  code: string;
  // ... other fields
}
```

### Step 2: Create Fetch Function
```typescript
export async function fetchMyEntities({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<MyEntity>> {
  await simulateDelay(300);

  // Filter data
  let filtered = myEntities.filter((entity) => {
    const searchLower = search.toLowerCase();
    return (
      entity.name.toLowerCase().includes(searchLower) ||
      entity.code.toLowerCase().includes(searchLower)
    );
  });

  // Paginate
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = filtered.slice(start, end);
  const hasMore = end < total;

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    hasMore,
  };
}
```

### Step 3: Use in Component
```tsx
import { fetchMyEntities, type MyEntity } from '../services/api-dropdown-service';

<ApiDropdown<MyEntity>
  fetchData={fetchMyEntities}
  getItemLabel={(e) => e.name}
  getItemValue={(e) => e.id}
  value={entityId}
  onValueChange={(val) => setEntityId(val)}
/>
```

## 📝 Form Validation

### Required Field
```tsx
const [customerId, setCustomerId] = useState('');
const [error, setError] = useState('');

const handleSubmit = () => {
  if (!customerId) {
    setError('Customer is required');
    return;
  }
  // Submit form...
};

<div className="space-y-2">
  <Label>Customer *</Label>
  <ApiDropdown<Customer>
    fetchData={fetchCustomers}
    getItemLabel={(c) => c.name}
    getItemValue={(c) => c.code}
    value={customerId}
    onValueChange={(val) => {
      setCustomerId(val);
      setError('');  // Clear error on change
    }}
    className={error ? 'border-destructive' : ''}
  />
  {error && <p className="text-sm text-destructive">{error}</p>}
</div>
```

## 🔍 Search Behavior

The dropdown searches in these fields by default:

| Entity | Searchable Fields |
|--------|------------------|
| Customer | name, code, phone, gstNumber |
| Item | name, code, itemGroup, hsnCode |
| Driver | driverName, driverCode, phoneNumber, licenseNumber |
| Vehicle | regNo, vehicleName, workCentre |
| Bank | bankName, bankCode, accountNumber, ifscCode, branch |
| Printer | printerName, printerType, ipAddress |
| Account | accountName, accountCode, accountGroup, accountType |

## 🎓 Best Practices

### ✅ Do's
- Store both ID and object for easy access to related data
- Use descriptive placeholders and search hints
- Set appropriate page sizes (10-20 for most cases)
- Disable dependent dropdowns until parent is selected
- Provide clear validation messages

### ❌ Don'ts
- Don't use for very small datasets (< 10 items)
- Don't set pageSize too high (causes slow loading)
- Don't set debounceMs too low (causes excessive API calls)
- Don't forget to handle the null case in onValueChange

## 📚 Examples

### Full Example: Sales Bill Form
See `/src/app/pages/SalesBillWithApiDropdown.tsx` for a complete working example.

### Demo Page
Visit `/api-dropdown-demo` to see all dropdown types in action.

### Documentation
Full documentation: `/src/docs/API_DROPDOWN_DOCUMENTATION.md`

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Dropdown not opening | Check fetchData function implementation |
| No items showing | Verify API response format matches `ApiDropdownResponse<T>` |
| Search not working | Ensure backend implements search filtering |
| Slow performance | Reduce pageSize or increase debounceMs |
| Items not clearing | Check that allowClear is true |

## 📞 Support

For help:
1. Check this quick reference
2. Review full documentation
3. See demo page examples
4. Contact development team

---

**Last Updated**: March 6, 2026
