# Searchable Dropdown - Quick Reference Card

## 🚀 Import
```tsx
import { SearchableDropdown, SearchableDropdownOption } from '../components/ui/searchable-dropdown';
```

## 📝 Basic Usage

### Step 1: Convert Data to Options
```tsx
const customerOptions: SearchableDropdownOption[] = customers
  .filter(c => c.isActive)  // Filter inactive items
  .map(customer => ({
    label: customer.name,              // What user sees
    value: customer.id,                // What you get in onChange
    description: customer.code,        // Optional: secondary text
  }));
```

### Step 2: Use Component
```tsx
<SearchableDropdown
  options={customerOptions}
  value={selectedCustomerId}
  onValueChange={setSelectedCustomerId}
  placeholder="Select Customer"
  searchPlaceholder="Search customers..."
/>
```

## 🎯 Common Patterns

### Customer/Supplier
```tsx
const options = customers.map(c => ({
  label: c.name,
  value: c.id,
  description: `${c.code} - ${c.city}`,
}));
```

### Items
```tsx
const options = items.map(item => ({
  label: item.name,
  value: item.code,
  description: `${item.code} - ${item.itemGroup}`,
}));
```

### Vehicles
```tsx
const options = vehicles.map(v => ({
  label: v.vehicleNo,
  value: v.id,
  description: `${v.vehicleType} - ${v.ownerName}`,
}));
```

### Printers
```tsx
const options = printers.map(p => ({
  label: p.printerName,
  value: p.id,
  description: p.ipAddress || 'Local',
}));
```

### Simple Status/Types
```tsx
const options = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Pending', value: 'pending', description: 'Awaiting approval' },
];
```

## ⚙️ All Props

```tsx
<SearchableDropdown
  // Required
  options={optionsArray}
  
  // Value binding
  value={selectedValue}
  onValueChange={(value) => handleChange(value)}
  
  // Display text
  placeholder="Select..."
  searchPlaceholder="Search..."
  emptyText="No results found"
  
  // Behavior
  disabled={false}
  allowClear={true}
  pageSize={20}
  
  // Styling
  className=""
  dropdownClassName=""
  
  // Advanced (optional)
  renderOption={(option, isSelected) => <div>...</div>}
  renderSelectedValue={(option) => <div>...</div>}
/>
```

## 🔄 Migration: Before → After

### Before (native select)
```tsx
<select
  value={formData.itemCode}
  onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
>
  <option value="">Select Item</option>
  {items.map(item => (
    <option key={item.code} value={item.code}>
      {item.name}
    </option>
  ))}
</select>
```

### After (SearchableDropdown)
```tsx
<SearchableDropdown
  options={itemOptions}
  value={formData.itemCode}
  onValueChange={(value) => setFormData({ ...formData, itemCode: value })}
  placeholder="Select Item"
  searchPlaceholder="Search items..."
  pageSize={20}
/>
```

## 📦 Option Interface
```typescript
interface SearchableDropdownOption {
  label: string;        // Display name (required)
  value: string;        // Selection value (required)
  description?: string; // Secondary text (optional)
  disabled?: boolean;   // Can't be selected (optional)
}
```

## ✨ Features

- ✅ **Instant Search** - Type to filter
- ✅ **Pagination** - Loads 20 items at a time
- ✅ **Keyboard Nav** - ↑↓ arrows, Enter, Esc
- ✅ **Clear Button** - X to clear selection
- ✅ **Mobile Friendly** - Touch optimized
- ✅ **Responsive** - Adapts to screen size
- ✅ **Accessible** - ARIA labels & keyboard support

## 🎨 Styling Tips

### Smaller Height (for tables)
```tsx
<SearchableDropdown
  options={options}
  value={value}
  onValueChange={onChange}
  className="h-8"  // Smaller height
  placeholder="Select"
/>
```

### Custom Width
```tsx
<SearchableDropdown
  options={options}
  value={value}
  onValueChange={onChange}
  className="w-64"  // Fixed width
  placeholder="Select"
/>
```

## 🐛 Common Issues

### Issue: Too many options slow down search
**Solution:** Use `pageSize` prop or switch to `ApiDropdown`
```tsx
pageSize={30}  // Default is 20
```

### Issue: Need to trigger action on selection
**Solution:** Use onValueChange callback
```tsx
onValueChange={(value) => {
  setFormData({ ...formData, itemCode: value });
  // Additional logic here
  const item = items.find(i => i.code === value);
  if (item) {
    calculatePrice(item);
  }
}}
```

### Issue: Want to show extra info
**Solution:** Use `description` field
```tsx
const options = items.map(item => ({
  label: item.name,
  value: item.code,
  description: `Stock: ${item.stock} | Rate: ₹${item.rate}`,
}));
```

## 📍 Demo Page
Navigate to `/searchable-dropdown-demo` to see live examples

## 📖 Full Documentation
See `/SEARCHABLE_DROPDOWN_GUIDE.md` for complete patterns and examples
