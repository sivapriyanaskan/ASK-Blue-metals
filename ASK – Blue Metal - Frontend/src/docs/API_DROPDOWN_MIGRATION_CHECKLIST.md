# API Dropdown Migration Checklist

## 📋 Overview

This checklist helps you migrate existing select/dropdown fields to the new API Dropdown component.

## 🎯 Before You Start

- [ ] Identify all dropdown/select fields in the page
- [ ] Check which entities are being used (Customer, Item, Driver, etc.)
- [ ] Verify if mock API functions exist in `api-dropdown-service.ts`
- [ ] Create new API functions if needed

## 🔄 Migration Steps

### Step 1: Import Required Components
```tsx
// Add these imports
import { ApiDropdown } from '../components/ui/api-dropdown';
import { 
  fetchCustomers, 
  fetchItems,
  // ... other fetch functions
  type Customer, 
  type Item 
} from '../services/api-dropdown-service';
```

### Step 2: Update State Management

#### Before (Old Select)
```tsx
const [customerId, setCustomerId] = useState('');
```

#### After (API Dropdown - Option 1: ID Only)
```tsx
const [customerId, setCustomerId] = useState('');
```

#### After (API Dropdown - Option 2: ID + Object)
```tsx
const [customerId, setCustomerId] = useState('');
const [customer, setCustomer] = useState<Customer | null>(null);
```

### Step 3: Replace Select Component

#### Before (Old Select)
```tsx
<select 
  value={customerId} 
  onChange={(e) => setCustomerId(e.target.value)}
>
  <option value="">Select customer...</option>
  {customers.map(customer => (
    <option key={customer.code} value={customer.code}>
      {customer.name}
    </option>
  ))}
</select>
```

#### After (API Dropdown)
```tsx
<ApiDropdown<Customer>
  fetchData={fetchCustomers}
  getItemLabel={(customer) => customer.name}
  getItemValue={(customer) => customer.code}
  value={customerId}
  onValueChange={(value, customer) => {
    setCustomerId(value);
    setCustomer(customer);
  }}
  placeholder="Select customer..."
  searchPlaceholder="Search by name, code, phone..."
/>
```

### Step 4: Update Event Handlers

#### Before
```tsx
const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const id = e.target.value;
  setCustomerId(id);
  
  // Find customer object manually
  const foundCustomer = customers.find(c => c.code === id);
  if (foundCustomer) {
    // Do something with customer
    loadCustomerRates(foundCustomer.code);
  }
};
```

#### After
```tsx
const handleCustomerChange = (value: string, customer: Customer | null) => {
  setCustomerId(value);
  setCustomer(customer);
  
  // Customer object is already available
  if (customer) {
    loadCustomerRates(customer.code);
  }
};
```

### Step 5: Update Validation

#### Before
```tsx
const validateForm = () => {
  if (!customerId) {
    setError('Customer is required');
    return false;
  }
  return true;
};
```

#### After (Same validation works!)
```tsx
const validateForm = () => {
  if (!customerId) {
    setError('Customer is required');
    return false;
  }
  return true;
};
```

## 📝 Page-Specific Checklists

### Sales Bill Page
- [ ] Customer dropdown
- [ ] Item dropdown  
- [ ] Printer dropdown
- [ ] Token dropdown (if applicable)
- [ ] Update customer change handler
- [ ] Update item change handler
- [ ] Update rate calculation logic
- [ ] Test customer-item rate lookup
- [ ] Test form submission

### Purchase Bill Page
- [ ] Supplier dropdown
- [ ] Item dropdown
- [ ] Printer dropdown
- [ ] Update supplier change handler
- [ ] Update item change handler
- [ ] Test supplier-item rate lookup
- [ ] Test form submission

### Token Creation Page
- [ ] Customer dropdown
- [ ] Item dropdown
- [ ] Driver dropdown
- [ ] Vehicle dropdown
- [ ] Update all change handlers
- [ ] Test validation logic

### Master Pages (Customer, Item, etc.)
- [ ] Dependent dropdown fields
- [ ] Filter dropdowns
- [ ] Update search/filter logic
- [ ] Test CRUD operations

## ✅ Testing Checklist

After migration, test these scenarios:

### Functionality Tests
- [ ] Dropdown opens on click
- [ ] Search works correctly
- [ ] Items load on scroll (pagination)
- [ ] Selected value displays correctly
- [ ] Clear button works (if enabled)
- [ ] Validation messages appear correctly
- [ ] Form submission works
- [ ] Error states display properly

### UX Tests
- [ ] Dropdown is responsive on mobile
- [ ] Search debounce feels natural (not too fast/slow)
- [ ] Loading spinner shows during fetch
- [ ] Empty state shows when no results
- [ ] Keyboard navigation works (Tab, Enter, Escape)

### Integration Tests
- [ ] Dependent dropdowns enable/disable correctly
- [ ] Related data loads when selection changes
- [ ] Rates update based on customer-item combination
- [ ] Form data includes correct IDs
- [ ] API calls use correct parameters

### Edge Cases
- [ ] Works when no items match search
- [ ] Works with very large datasets (> 1000 items)
- [ ] Works when API is slow (> 1 second)
- [ ] Handles API errors gracefully
- [ ] Handles network timeout

## 🐛 Common Issues & Solutions

### Issue: Dropdown not opening
**Solution**: Check if fetchData function is properly passed
```tsx
// ❌ Wrong
<ApiDropdown fetchData={fetchCustomers()} ... />

// ✅ Correct
<ApiDropdown fetchData={fetchCustomers} ... />
```

### Issue: Items not showing
**Solution**: Verify API response format
```tsx
// Must return this structure
{
  items: [...],
  total: 150,
  page: 1,
  pageSize: 20,
  hasMore: true
}
```

### Issue: Selection not working
**Solution**: Ensure getItemValue returns correct field
```tsx
// ❌ Wrong (if code is the ID)
getItemValue={(item) => item.id}

// ✅ Correct
getItemValue={(item) => item.code}
```

### Issue: TypeScript errors
**Solution**: Import and use the correct type
```tsx
import { type Customer } from '../services/api-dropdown-service';

<ApiDropdown<Customer>  // ← Add type here
  fetchData={fetchCustomers}
  ...
/>
```

### Issue: Dependent dropdown not working
**Solution**: Use disabled prop with condition
```tsx
<ApiDropdown<Item>
  fetchData={fetchItems}
  getItemLabel={(item) => item.name}
  getItemValue={(item) => item.code}
  value={itemId}
  onValueChange={(val) => setItemId(val)}
  disabled={!customerId}  // ← Disable until customer selected
/>
```

## 📊 Migration Progress Tracker

Use this table to track your migration progress:

| Page | Dropdowns | Status | Notes |
|------|-----------|--------|-------|
| Sales Bill | Customer, Item, Printer | ✅ Done | - |
| Purchase Bill | Supplier, Item, Printer | 🔄 In Progress | - |
| Token Creation | Customer, Item, Driver, Vehicle | ⏳ Pending | - |
| Customer Master | - | ⏳ Pending | - |
| Item Master | Group, Sub-group | ⏳ Pending | - |

**Status Legend:**
- ✅ Done - Migration complete and tested
- 🔄 In Progress - Currently being migrated
- ⏳ Pending - Not started yet
- ❌ Blocked - Issues need to be resolved

## 🎓 Tips for Smooth Migration

1. **Start with Simple Pages**: Begin with pages that have 1-2 dropdowns
2. **Test Immediately**: Test each dropdown right after migration
3. **Keep Old Code Temporarily**: Comment out old code instead of deleting
4. **Document Custom Logic**: Note any special behavior for future reference
5. **Update in Batches**: Don't migrate all pages at once
6. **Review with Team**: Have another developer review changes

## 📚 Resources

- **Component File**: `/src/app/components/ui/api-dropdown.tsx`
- **Service File**: `/src/app/services/api-dropdown-service.ts`
- **Full Documentation**: `/src/docs/API_DROPDOWN_DOCUMENTATION.md`
- **Quick Reference**: `/src/docs/API_DROPDOWN_QUICK_REFERENCE.md`
- **Demo Page**: `/api-dropdown-demo`
- **Working Example**: `/src/app/pages/SalesBillWithApiDropdown.tsx`

## 🚀 Next Steps

1. [ ] Review this checklist
2. [ ] Choose a page to migrate
3. [ ] Create a branch for migration
4. [ ] Follow migration steps
5. [ ] Test thoroughly
6. [ ] Create pull request
7. [ ] Update progress tracker

---

**Need Help?** Contact the development team or review the documentation.

**Last Updated**: March 6, 2026
