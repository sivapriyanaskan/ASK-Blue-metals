# API Dropdown Component - Documentation

## Overview

The `ApiDropdown` component is a reusable, enterprise-grade dropdown component designed for the Blue Metal ERP system. It provides server-side search and pagination capabilities, making it ideal for large datasets.

## Features

- ✅ **Server-side search** with configurable debouncing (default 300ms)
- ✅ **Server-side pagination** with infinite scroll
- ✅ **Loading state** with spinner animation
- ✅ **Empty state** with customizable message
- ✅ **Error state** with retry functionality
- ✅ **Selected state** with visual feedback
- ✅ **Clear selection** button
- ✅ **Keyboard accessible** (Tab, Enter, Escape)
- ✅ **Fully typed** with TypeScript generics
- ✅ **Customizable rendering** for items and selected values
- ✅ **Responsive design** matching the ERP light theme

## Installation

The component is already installed in the ERP system:
- Component: `/src/app/components/ui/api-dropdown.tsx`
- Service: `/src/app/services/api-dropdown-service.ts`
- Demo: `/src/app/pages/ApiDropdownDemo.tsx`

## Basic Usage

```tsx
import { useState } from 'react';
import { ApiDropdown } from '../components/ui/api-dropdown';
import { fetchCustomers, type Customer } from '../services/api-dropdown-service';

function MyComponent() {
  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);

  return (
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
      searchPlaceholder="Search customers..."
    />
  );
}
```

## Component Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `fetchData` | `(params: {search: string, page: number, pageSize: number}) => Promise<ApiDropdownResponse<T>>` | Function to fetch data from server |
| `getItemLabel` | `(item: T) => string` | Function to get display label for an item |
| `getItemValue` | `(item: T) => string` | Function to get unique value for an item |

### Selection Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Currently selected value |
| `onValueChange` | `(value: string, item: T \| null) => void` | - | Callback when selection changes |

### Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | `"Select..."` | Placeholder text when nothing is selected |
| `emptyText` | `string` | `"No results found"` | Text shown when no items match search |
| `searchPlaceholder` | `string` | `"Search..."` | Placeholder for search input |
| `loadMoreText` | `string` | `"Load more"` | Text shown in pagination trigger |
| `getItemDescription` | `(item: T) => string` | - | Optional secondary text for items |

### Behavior Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pageSize` | `number` | `20` | Number of items to load per page |
| `debounceMs` | `number` | `300` | Debounce delay for search (ms) |
| `disabled` | `boolean` | `false` | Disable the dropdown |
| `allowClear` | `boolean` | `true` | Show clear button when item is selected |

### Styling Props

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Additional classes for trigger button |
| `dropdownClassName` | `string` | Additional classes for dropdown content |

### Advanced Props

| Prop | Type | Description |
|------|------|-------------|
| `renderItem` | `(item: T, isSelected: boolean) => React.ReactNode` | Custom renderer for dropdown items |
| `renderSelectedValue` | `(item: T \| null) => React.ReactNode` | Custom renderer for selected value |

## Creating API Functions

To use the dropdown with your own data, create a fetch function in `/src/app/services/api-dropdown-service.ts`:

```typescript
// Define your data type
export interface MyEntity {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

// Create fetch function
export async function fetchMyEntities({
  search,
  page,
  pageSize,
}: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiDropdownResponse<MyEntity>> {
  // In production, replace with actual API call
  const response = await fetch(`/api/my-entities?search=${search}&page=${page}&pageSize=${pageSize}`);
  const data = await response.json();
  
  return {
    items: data.items,
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    hasMore: data.hasMore,
  };
}
```

## Examples

### 1. Customer Dropdown

```tsx
<ApiDropdown<Customer>
  fetchData={fetchCustomers}
  getItemLabel={(customer) => customer.name}
  getItemValue={(customer) => customer.code}
  getItemDescription={(customer) => customer.code}
  value={customerId}
  onValueChange={(value, customer) => {
    setCustomerId(value);
    setCustomer(customer);
  }}
  placeholder="Select customer..."
  searchPlaceholder="Search by name, code, phone, GST..."
  pageSize={20}
/>
```

### 2. Item Dropdown

```tsx
<ApiDropdown<Item>
  fetchData={fetchItems}
  getItemLabel={(item) => item.name}
  getItemValue={(item) => item.code}
  getItemDescription={(item) => `${item.code} - HSN: ${item.hsnCode}`}
  value={itemId}
  onValueChange={(value, item) => {
    setItemId(value);
    setItem(item);
  }}
  placeholder="Select item..."
  searchPlaceholder="Search by name, code, HSN..."
/>
```

### 3. Driver Dropdown

```tsx
<ApiDropdown<Driver>
  fetchData={fetchDrivers}
  getItemLabel={(driver) => driver.driverName}
  getItemValue={(driver) => driver.id}
  getItemDescription={(driver) => `${driver.driverCode} - ${driver.licenseNumber}`}
  value={driverId}
  onValueChange={(value, driver) => {
    setDriverId(value);
    setDriver(driver);
  }}
  placeholder="Select driver..."
  searchPlaceholder="Search by name, code, license..."
/>
```

### 4. Custom Rendering

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
  renderItem={(customer, isSelected) => (
    <div className="flex items-center justify-between w-full">
      <div>
        <div className="font-medium">{customer.name}</div>
        <div className="text-xs text-muted-foreground">{customer.code}</div>
      </div>
      {customer.gstNumber && (
        <Badge variant="outline" className="text-xs">GST</Badge>
      )}
      {isSelected && <CheckIcon className="h-4 w-4 text-primary" />}
    </div>
  )}
  renderSelectedValue={(customer) => (
    customer ? (
      <div className="flex items-center gap-2">
        <span>{customer.name}</span>
        <Badge variant="secondary" className="text-xs">{customer.code}</Badge>
      </div>
    ) : (
      <span className="text-muted-foreground">Select customer...</span>
    )
  )}
/>
```

### 5. With Form Integration

```tsx
import { useForm, Controller } from 'react-hook-form';

function MyForm() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="customerId"
        control={control}
        render={({ field }) => (
          <ApiDropdown<Customer>
            fetchData={fetchCustomers}
            getItemLabel={(customer) => customer.name}
            getItemValue={(customer) => customer.code}
            value={field.value}
            onValueChange={(value) => field.onChange(value)}
            placeholder="Select customer..."
          />
        )}
      />
    </form>
  );
}
```

## API Response Format

Your backend API should return data in this format:

```typescript
interface ApiDropdownResponse<T> {
  items: T[];           // Array of items for current page
  total: number;        // Total number of items matching search
  page: number;         // Current page number
  pageSize: number;     // Number of items per page
  hasMore: boolean;     // Whether there are more pages to load
}
```

Example API response:
```json
{
  "items": [
    {"code": "C001", "name": "ABC Constructions", "phone": "9876543210"},
    {"code": "C002", "name": "XYZ Builders", "phone": "9876543211"}
  ],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "hasMore": true
}
```

## Available Fetch Functions

The following fetch functions are already available in the service:

| Function | Entity | Description |
|----------|--------|-------------|
| `fetchCustomers` | Customer | Fetch customers with search by name, code, phone, GST |
| `fetchItems` | Item | Fetch items with search by name, code, group, HSN |
| `fetchDrivers` | Driver | Fetch drivers with search by name, code, license, phone |
| `fetchVehicles` | Vehicle | Fetch vehicles with search by number, name, work centre |
| `fetchBanks` | Bank | Fetch banks with search by name, code, account, IFSC |
| `fetchPrinters` | Printer | Fetch printers with search by name, type, IP |
| `fetchAccounts` | Account | Fetch accounts with search by name, code, group, type |

## Migrating Existing Dropdowns

To migrate existing select dropdowns to the new API dropdown:

### Before (Old Select)
```tsx
<select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
  <option value="">Select customer...</option>
  {customers.map(customer => (
    <option key={customer.code} value={customer.code}>
      {customer.name}
    </option>
  ))}
</select>
```

### After (API Dropdown)
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
/>
```

## Performance Considerations

1. **Debouncing**: The component debounces search input to avoid excessive API calls. Default is 300ms.

2. **Pagination**: Use appropriate `pageSize` based on your data:
   - Small datasets (< 50 items): pageSize 20-30
   - Medium datasets (50-500 items): pageSize 15-20
   - Large datasets (> 500 items): pageSize 10-15

3. **Caching**: Consider implementing client-side caching in your fetch functions for frequently accessed data.

## Accessibility

The component is fully keyboard accessible:
- **Tab**: Focus the dropdown trigger
- **Enter/Space**: Open the dropdown
- **Type**: Start searching automatically
- **Arrow Keys**: Navigate through items (future enhancement)
- **Escape**: Close the dropdown
- **Tab out**: Close dropdown and move to next field

## Demo Page

Visit `/api-dropdown-demo` to see live examples of all dropdown types with interactive demos.

## Troubleshooting

### Dropdown not opening
- Ensure `fetchData` function is properly implemented
- Check console for API errors
- Verify component is not disabled

### Items not loading
- Check API response format matches `ApiDropdownResponse<T>`
- Verify `getItemLabel` and `getItemValue` return correct values
- Check network tab for API errors

### Search not working
- Ensure backend API implements search filtering
- Check that debounce timing is appropriate
- Verify search parameter is being passed to API

### Pagination not working
- Ensure backend implements pagination correctly
- Check `hasMore` flag in API response
- Verify `page` and `pageSize` parameters are handled correctly

## Future Enhancements

Planned improvements:
- [ ] Keyboard navigation with arrow keys
- [ ] Multi-select support
- [ ] Grouping support (categories)
- [ ] Virtual scrolling for very large datasets
- [ ] Cache management
- [ ] Async validation support
- [ ] Rich content support (images, badges)

## Support

For questions or issues with the API Dropdown component:
1. Check this documentation
2. Review the demo page at `/api-dropdown-demo`
3. Examine the source code in `/src/app/components/ui/api-dropdown.tsx`
4. Contact the development team

---

**Last Updated**: March 6, 2026  
**Component Version**: 1.0.0  
**Author**: ERP Development Team
