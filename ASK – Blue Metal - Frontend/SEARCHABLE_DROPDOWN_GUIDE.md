# Searchable Dropdown Implementation Guide

## Overview
All standard HTML `<select>` elements across the ERP system should be replaced with the new `SearchableDropdown` component for improved usability, search capabilities, and pagination support.

## Components Available

### 1. SearchableDropdown (For Local/Static Data)
Located: `/src/app/components/ui/searchable-dropdown.tsx`
- Use for: Master data, status fields, configuration options
- Features: Instant search, pagination, keyboard navigation
- Data: Local arrays, no API calls needed

### 2. ApiDropdown (For Server-Side Data)
Located: `/src/app/components/ui/api-dropdown.tsx`
- Use for: Large dynamic datasets that need server-side search/pagination
- Features: Server-side search, infinite scroll, loading states
- Data: API endpoints with search and pagination

## Migration Pattern

### Before (Native Select):
```tsx
<select
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
>
  <option value="">Select Item</option>
  {items.map(item => (
    <option key={item.id} value={item.id}>
      {item.name}
    </option>
  ))}
</select>
```

### After (SearchableDropdown):
```tsx
import { SearchableDropdown, SearchableDropdownOption } from '../components/ui/searchable-dropdown';

// Convert data to options format
const itemOptions: SearchableDropdownOption[] = items.map(item => ({
  label: item.name,
  value: item.id,
  description: item.code, // Optional: Shows as secondary text
  disabled: !item.isActive, // Optional
}));

// Use the component
<SearchableDropdown
  options={itemOptions}
  value={selectedValue}
  onValueChange={setSelectedValue}
  placeholder="Select Item"
  searchPlaceholder="Search items..."
  pageSize={20}
/>
```

## Common Conversion Patterns

### Pattern 1: Customer/Supplier Dropdowns
```tsx
const customerOptions: SearchableDropdownOption[] = customers
  .filter(c => c.isActive)
  .map(customer => ({
    label: customer.name,
    value: customer.id,
    description: `${customer.code} - ${customer.city}`,
  }));

<SearchableDropdown
  options={customerOptions}
  value={formData.customerId}
  onValueChange={(value) => {
    setFormData({ ...formData, customerId: value });
    // Fetch customer details if needed
    const customer = customers.find(c => c.id === value);
    setSelectedCustomer(customer);
  }}
  placeholder="Select Customer"
  searchPlaceholder="Search customers..."
/>
```

### Pattern 2: Item Dropdowns
```tsx
const itemOptions: SearchableDropdownOption[] = items
  .filter(item => item.isActive)
  .map(item => ({
    label: item.name,
    value: item.code,
    description: `${item.code} - ${item.itemGroup}`,
  }));

<SearchableDropdown
  options={itemOptions}
  value={formData.itemCode}
  onValueChange={(value) => {
    const item = items.find(i => i.code === value);
    setFormData({
      ...formData,
      itemCode: value,
      itemName: item?.name || '',
      // ... other item fields
    });
  }}
  placeholder="Select Item"
  searchPlaceholder="Search items..."
  pageSize={20}
/>
```

### Pattern 3: Vehicle Dropdowns
```tsx
const vehicleOptions: SearchableDropdownOption[] = vehicles.map(vehicle => ({
  label: vehicle.vehicleNo,
  value: vehicle.id,
  description: `${vehicle.vehicleType} - ${vehicle.ownerName}`,
}));

<SearchableDropdown
  options={vehicleOptions}
  value={formData.vehicleId}
  onValueChange={(value) => {
    const vehicle = vehicles.find(v => v.id === value);
    setFormData({
      ...formData,
      vehicleId: value,
      vehicleNo: vehicle?.vehicleNo || '',
      emptyWeight: vehicle?.emptyWeight || 0,
      // ... other vehicle fields
    });
  }}
  placeholder="Select Vehicle"
  searchPlaceholder="Search vehicles..."
/>
```

### Pattern 4: Simple Status/Type Dropdowns
```tsx
const statusOptions: SearchableDropdownOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Pending', value: 'pending' },
];

<SearchableDropdown
  options={statusOptions}
  value={formData.status}
  onValueChange={(value) => setFormData({ ...formData, status: value })}
  placeholder="Select Status"
  searchPlaceholder="Search status..."
  pageSize={10}
/>
```

### Pattern 5: Printer Dropdowns
```tsx
const printerOptions: SearchableDropdownOption[] = getActivePrinters().map(printer => ({
  label: printer.printerName,
  value: printer.id,
  description: printer.ipAddress || 'Local Printer',
}));

<SearchableDropdown
  options={printerOptions}
  value={formData.printerId}
  onValueChange={(value) => setFormData({ ...formData, printerId: value })}
  placeholder="Select Printer"
  searchPlaceholder="Search printers..."
/>
```

### Pattern 6: Denomination Dropdowns (in tables)
```tsx
const denominationOptions: SearchableDropdownOption[] = [
  { label: '₹2000', value: '2000' },
  { label: '₹500', value: '500' },
  { label: '₹200', value: '200' },
  { label: '₹100', value: '100' },
  { label: '₹50', value: '50' },
  { label: '₹20', value: '20' },
  { label: '₹10', value: '10' },
];

<SearchableDropdown
  options={denominationOptions}
  value={String(row.denomination)}
  onValueChange={(value) => handleDenominationChange(row.id, 'denomination', parseInt(value))}
  placeholder="Select"
  className="h-8" // Smaller for table rows
/>
```

## Files to Update (Priority Order)

### High Priority (Most Used)
1. ✅ `/src/app/pages/TokenCreation.tsx` - Vehicle, Item, Customer, Printer dropdowns
2. ✅ `/src/app/pages/SalesBill.tsx` - Customer, Item, Place of Supply, Driver BATA, Billing Mode, Print Mode, Printer
3. `/src/app/pages/CustomerMaster.tsx` - Bill Type, Control Account, Opening Type, Status filters
4. `/src/app/pages/SupplierMaster.tsx` - Supplier Type, Status filters
5. `/src/app/pages/ItemMaster.tsx` - Item Group, Item Sub Group, Unit filters
6. `/src/app/pages/PurchaseBill.tsx` - Supplier, Item, Work Centre
7. `/src/app/pages/PurchaseEntryPassCreate.tsx` - Supplier, Vehicle, Item

### Medium Priority (Forms & Settings)
8. `/src/app/pages/CashVoucherEdit.tsx` - Voucher Type, Payment Mode, Bank, Denominations
9. `/src/app/pages/CommonPrinterSettingsCreate.tsx` - Form Name, Printer, Print Engine
10. `/src/app/pages/CommonPrinterSettingsEdit.tsx` - Form Name, Printer, Print Engine
11. `/src/app/pages/FuelConsumptionCreate.tsx` - Vehicle, Work Centre
12. `/src/app/pages/ShiftClosing.tsx` - Denominations
13. `/src/app/pages/BillSundryMaster.tsx` - Sundry Type, Calculation Mode, Status

### Lower Priority (Reports & Filters)
14. `/src/app/pages/AuditLogs.tsx` - Module filter
15. `/src/app/pages/SalesRegister.tsx` - Payment Mode, Customer filters
16. `/src/app/pages/DeviceLogs.tsx` - Device Type, Status filters
17. `/src/app/pages/AccountMaster.tsx` - Account Type, Status
18. `/src/app/pages/BankMaster.tsx` - Status filter
19. `/src/app/pages/CashVoucherList.tsx` - Voucher Type, Status filters
20. `/src/app/pages/CashVoucherPayment.tsx` - Payment Type, Payment To, Payment Mode

### Component Files
21. `/src/app/components/PaymentSection.tsx` - Payment Mode, Bank

## Key Benefits

1. **Instant Search**: Users can type to filter options immediately
2. **Pagination**: Handles large datasets (500+ items) efficiently
3. **Keyboard Navigation**: Arrow keys, Enter to select, Escape to close
4. **Clear Selection**: Quick X button to clear value
5. **Mobile Friendly**: Touch-optimized and responsive
6. **Consistent UX**: Same behavior across all dropdowns
7. **Better Accessibility**: Proper ARIA labels and keyboard support
8. **Visual Feedback**: Loading, empty, selected states

## Component Props Reference

### SearchableDropdown Props
```typescript
interface SearchableDropdownProps {
  // Required
  options: SearchableDropdownOption[];
  
  // Selection
  value?: string;
  onValueChange?: (value: string) => void;
  
  // Display
  placeholder?: string;           // Default: "Select..."
  emptyText?: string;            // Default: "No results found"
  searchPlaceholder?: string;    // Default: "Search..."
  
  // Behavior
  disabled?: boolean;            // Default: false
  allowClear?: boolean;          // Default: true
  pageSize?: number;             // Default: 20
  
  // Styling
  className?: string;
  dropdownClassName?: string;
  
  // Custom rendering (advanced)
  renderOption?: (option, isSelected) => React.ReactNode;
  renderSelectedValue?: (option) => React.ReactNode;
}

interface SearchableDropdownOption {
  label: string;
  value: string;
  description?: string;    // Shows as secondary text
  disabled?: boolean;      // Grays out and prevents selection
}
```

## Demo Page
View all examples at: `/searchable-dropdown-demo`
- Customer selection
- Item selection
- Vehicle selection
- Printer selection
- Status selection
- Large dataset test (500 items)

## Testing Checklist
- [ ] Search functionality works
- [ ] Pagination loads more items on scroll
- [ ] Keyboard navigation (↑↓ arrows, Enter, Escape)
- [ ] Clear button removes selection
- [ ] Mobile/touch support
- [ ] Selected value displays correctly
- [ ] Empty state shows when no results
- [ ] Disabled state works
- [ ] Form submission includes selected value

## Notes
- Always filter inactive items before converting to options (`.filter(x => x.isActive)`)
- Use meaningful descriptions to help users identify the right option
- Set appropriate `pageSize` based on expected dataset size (20 is good default)
- Consider using ApiDropdown for datasets > 1000 items with server-side search
