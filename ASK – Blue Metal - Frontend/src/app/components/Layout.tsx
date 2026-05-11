import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { roleAccessApi, type RoleMenuItem } from '../services/iamApi';
import {
  LayoutDashboard,
  Truck,
  Database,
  Factory,
  DollarSign,
  FileText,
  Shield,
  Settings,
  Menu,
  Search,
  Bell,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Circle,
  User,
  Clock,
  LogOut
} from 'lucide-react';

interface NavItem {
  label: string;
  code?: string; // Menu code for RBAC
  path?: string;
  icon: any;
  children?: NavItem[];
  roles?: string[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    code: 'DASHBOARD',
    path: '/',
    icon: LayoutDashboard
  },
  {
    label: 'Operations',
    code: 'OPERATIONS',
    icon: Truck,
    children: [
      { label: 'Token', code: 'TOKEN_CREATE', path: '/operations/token', icon: Circle },
      { label: 'Purchase Entry Pass', code: 'PURCHASE_ENTRY', path: '/operations/purchase-entry-pass', icon: Circle },
      { label: 'Sales Bill', code: 'SALES_BILL', path: '/operations/sales-bill', icon: Circle },
      { label: 'Purchase Entry Bill', code: 'PURCHASE_BILL', path: '/operations/purchase-bill', icon: Circle },
      { label: 'Token Cancel', code: 'TOKEN_CANCEL', path: '/operations/token-cancel', icon: Circle }
    ]
  },
  {
    label: 'Masters',
    code: 'MASTERS',
    icon: Database,
    children: [
      { label: 'Customer Master', code: 'CUSTOMER_MASTER', path: '/masters/customer', icon: Circle },
      { label: 'Supplier Master', code: 'SUPPLIER_MASTER', path: '/masters/supplier', icon: Circle },
      { label: 'Item Master', code: 'ITEM_MASTER', path: '/masters/item', icon: Circle },
      { label: 'Item Group Master', code: 'ITEM_GROUP_MASTER', path: '/masters/item-group', icon: Circle },
      { label: 'Item Sub Group Master', code: 'ITEM_SUB_GROUP_MASTER', path: '/masters/item-sub-group', icon: Circle },
      { label: 'Customer-Wise Item Rates', code: 'CUSTOMER_WISE_ITEM_RATES', path: '/masters/customer-wise-item-rates', icon: Circle },
      { label: 'Supplier Rate Setting', code: 'SUPPLIER_RATE_SETTING', path: '/masters/supplier-rate', icon: Circle },
      { label: 'Freeze Item to Customer', code: 'FREEZE_ITEM_TO_CUSTOMER', path: '/masters/freeze', icon: Circle },
      { label: 'Vehicle Master', code: 'VEHICLE_MASTER', path: '/masters/vehicle', icon: Circle },
      { label: 'Work Centre Master', code: 'WORK_CENTRE_MASTER', path: '/masters/work-centre', icon: Circle },
      { label: 'Driver / Labour Master', code: 'DRIVER_LABOUR_MASTER', path: '/masters/driver', icon: Circle },
      { label: 'Bill Sundry Master', code: 'BILL_SUNDRY_MASTER', path: '/masters/bill-sundry', icon: Circle },
      { label: 'Account Master', code: 'ACCOUNT_MASTER', path: '/masters/account-master', icon: Circle },
      { label: 'Bank Master', code: 'BANK_MASTER', path: '/masters/bank-master', icon: Circle },
      { label: 'Printer Master', code: 'PRINTER_MASTER', path: '/masters/printer-master', icon: Circle },
      { label: 'Printer Settings', code: 'PRINTER_SETTINGS', path: '/masters/printer', icon: Circle }
    ]
  },
  {
    label: 'Production',
    code: 'PRODUCTION',
    icon: Factory,
    children: [
      { label: 'Raw Material - Purchase Wise', code: 'RAW_MATERIAL_PURCHASE_WISE', path: '/production/purchase-wise', icon: Circle },
      { label: 'Raw Material - Item Wise', code: 'RAW_MATERIAL_ITEM_WISE', path: '/production/item-wise', icon: Circle }
    ]
  },
  {
    label: 'Finance',
    code: 'FINANCE',
    icon: DollarSign,
    children: [
      { label: 'Currency Exchange', code: 'CURRENCY_EXCHANGE', path: '/finance/currency-exchange', icon: Circle },
      { label: 'Cash Voucher Payment', code: 'CASH_VOUCHER_PAYMENT', path: '/finance/cash-voucher', icon: Circle },
      { label: 'Fuel Consumption', code: 'FUEL_CONSUMPTION', path: '/fuel/consumption', icon: Circle }
    ]
  },
  {
    label: 'Shift Management',
    code: 'SHIFT_MANAGEMENT',
    icon: Clock,
    children: [
      { label: 'Shift Open', code: 'SHIFT_OPEN', path: '/shift-management/shift-open', icon: Circle },
      { label: 'Shift Close', code: 'SHIFT_CLOSE', path: '/shift-management/shift-close', icon: Circle }
    ]
  },
  {
    label: 'Reports',
    code: 'REPORTS',
    icon: FileText,
    children: [
      { label: 'Sales Register', code: 'SALES_REGISTER', path: '/reports/sales-register', icon: Circle },
      { label: 'Sales With GST – Full Qty', code: 'SALES_WITH_GST_FULL_QTY', path: '/reports/sales-with-gst-full-qty', icon: Circle },
      { label: 'Sales Without GST – Full Qty', code: 'SALES_WITHOUT_GST_FULL_QTY', path: '/reports/sales-without-gst-full-qty', icon: Circle },
      { label: 'Sales Without GST – Half Qty', code: 'SALES_WITHOUT_GST_HALF_QTY', path: '/reports/sales-without-gst-half-qty', icon: Circle },
      { label: 'Sales GST Combined', code: 'SALES_GST_COMBINED', path: '/reports/sales-gst-combined', icon: Circle },
      { label: 'Sales Customer Wise', code: 'SALES_CUSTOMER_WISE', path: '/reports/sales-customer-wise', icon: Circle },
      { label: 'Purchase Register', code: 'PURCHASE_REGISTER', path: '/reports/purchase-register', icon: Circle },
      { label: 'Purchase Item Wise', code: 'PURCHASE_ITEM_WISE', path: '/reports/purchase-item-wise', icon: Circle },
      { label: 'Purchase Supplier Wise', code: 'PURCHASE_SUPPLIER_WISE', path: '/reports/purchase-supplier-wise', icon: Circle },
      { label: 'Purchase Bill Wise', code: 'PURCHASE_BILL_WISE', path: '/reports/purchase-bill-wise', icon: Circle },
      { label: 'Production Register', code: 'PRODUCTION_REGISTER', path: '/reports/production-register', icon: Circle },
      { label: 'Production Item Wise', code: 'PRODUCTION_ITEM_WISE', path: '/reports/production-item-wise', icon: Circle },
      { label: 'Production Purchase Wise', code: 'PRODUCTION_PURCHASE_WISE', path: '/reports/production-purchase-wise', icon: Circle },
      { label: 'Fuel Register', code: 'FUEL_REGISTER', path: '/reports/fuel-register', icon: Circle },
      { label: 'Shift Closing Report', code: 'SHIFT_CLOSING_REPORT', path: '/reports/shift-closing', icon: Circle },
      { label: 'Customer Ledger', code: 'CUSTOMER_LEDGER', path: '/reports/customer-ledger', icon: Circle },
      { label: 'Supplier Ledger', code: 'SUPPLIER_LEDGER', path: '/reports/supplier-ledger', icon: Circle },
      { label: 'Item Stock Report', code: 'ITEM_STOCK_REPORT', path: '/reports/item-stock', icon: Circle },
      { label: 'Vehicle History', code: 'VEHICLE_HISTORY', path: '/reports/vehicle-history', icon: Circle },
      { label: 'Driver BATA Report', code: 'DRIVER_BATA_REPORT', path: '/reports/driver-bata', icon: Circle },
      { label: 'Edit Log Report', code: 'EDIT_LOG_REPORT', path: '/reports/edit-log', icon: Circle }
    ]
  },
  {
    label: 'Admin & Audit',
    code: 'ADMIN_AUDIT',
    icon: Shield,
    children: [
      { label: 'Audit Logs', code: 'AUDIT_LOGS', path: '/admin/audit-logs', icon: Circle },
      { label: 'User Management', code: 'USER_MANAGEMENT', path: '/admin/users', icon: Circle },
      { label: 'Role Management', code: 'ROLE_MANAGEMENT', path: '/settings/roles', icon: Circle }
    ],
    roles: ['Admin', 'Accounts']
  },
  {
    label: 'Settings',
    code: 'SETTINGS',
    path: '/settings',
    icon: Settings,
    roles: ['Admin']
  }
];

export const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Operations']);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [allowedMenuCodes, setAllowedMenuCodes] = useState<Set<string>>(new Set());
  const [loadingMenuAccess, setLoadingMenuAccess] = useState(true);
  const { user, shiftStatus, hardwareDevices } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  /* -------------------- Load role menu access -------------------- */
  useEffect(() => {
    const loadMenuAccess = async () => {
      setLoadingMenuAccess(true);
      try {
        // If user has no roles, allow all menus (admin fallback for unauthenticated/dev)
        if (!user.roleCodes || user.roleCodes.length === 0) {
          setAllowedMenuCodes(new Set()); // Empty set means show all
          setLoadingMenuAccess(false);
          return;
        }

        // Fetch the current user's effective (union-of-roles) menu access.
        const menuAccess = await roleAccessApi.myMenus();
        const allowed = new Set(
          menuAccess.items
            .filter((m: RoleMenuItem) => m.canView)
            .map((m: RoleMenuItem) => m.code),
        );
        setAllowedMenuCodes(allowed);
      } catch (err) {
        console.error('Failed to load menu access:', err);
        // On error, hide everything (safer than showing all). Admins will see
        // the dashboard at minimum if their JWT has no roleCodes.
        setAllowedMenuCodes(new Set(['DASHBOARD']));
      } finally {
        setLoadingMenuAccess(false);
      }
    };

    void loadMenuAccess();
  }, [user.roleCodes, user.id]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  const hasOfflineDevice = hardwareDevices.some(d => d.status === 'offline');
  const hasWarningDevice = hardwareDevices.some(d => d.status === 'warning');

  return (
    <div className="flex h-screen bg-gray-50 print:block print:h-auto">
      {/* Left Sidebar */}
      <aside
        className={`bg-gray-900 text-white transition-all duration-300 flex flex-col print:hidden ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {!isSidebarCollapsed && (
            <div>
              <div className="font-bold text-lg">ASK - Blue Metal</div>
              <div className="text-xs text-gray-400">ERP System</div>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-gray-800 rounded"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navigationItems.map((item) => {
            if (item.roles && !item.roles.includes(user.role)) {
              return null;
            }

            // Filter by role-based menu access
            // If allowedMenuCodes is empty, user has admin access (show all)
            // Otherwise, only show items that are in allowedMenuCodes or have allowed children
            const isMenuAllowed = allowedMenuCodes.size === 0 || !item.code || allowedMenuCodes.has(item.code);
            
            if (item.children) {
              // For parent items, check if any child is allowed
              const allowedChildren = item.children.filter(child => 
                allowedMenuCodes.size === 0 || !child.code || allowedMenuCodes.has(child.code)
              );
              
              // Only show parent if there are allowed children
              if (allowedMenuCodes.size > 0 && allowedChildren.length === 0) {
                return null;
              }

              const isExpanded = expandedItems.includes(item.label);
              const Icon = item.icon;

              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isSidebarCollapsed &&
                      (isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      ))}
                  </button>
                  {isExpanded && !isSidebarCollapsed && (
                    <div className="bg-gray-800/50">
                      {allowedChildren.map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path!}
                            className={`flex items-center gap-3 px-4 py-2 pl-12 hover:bg-gray-700 transition-colors ${
                              isActive ? 'bg-blue-600 hover:bg-blue-700' : ''
                            }`}
                          >
                            <ChildIcon className="w-3 h-3" />
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // For single items without children, check if allowed
            if (!isMenuAllowed) {
              return null;
            }

            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path!}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors ${
                  isActive ? 'bg-blue-600 hover:bg-blue-700' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden print:block print:overflow-visible">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-300 flex items-center justify-between px-6 print:hidden">
          <div className="flex items-center gap-4">
            {/* Shift Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border">
              <div
                className={`w-2 h-2 rounded-full ${
                  shiftStatus.isOpen ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm font-medium">
                Shift {shiftStatus.shiftNumber} - {shiftStatus.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Hardware Status */}
            <div className="flex items-center gap-2">
              {hasOfflineDevice && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                  Device Offline
                </div>
              )}
              {hasWarningDevice && !hasOfflineDevice && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                  <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  Warning
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Token / Vehicle / Bill No..."
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5" />
              {hasOfflineDevice && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Quick Actions */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Quick Actions
              </button>
              {showQuickActions && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-300 py-2 z-50">
                  <Link
                    to="/shift-management/shift-open"
                    className="block px-4 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => setShowQuickActions(false)}
                  >
                    Shift Open
                  </Link>
                  <Link
                    to="/operations/token-creation"
                    className="block px-4 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => setShowQuickActions(false)}
                  >
                    Create Token
                  </Link>
                  <Link
                    to="/operations/sales-bill"
                    className="block px-4 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => setShowQuickActions(false)}
                  >
                    Create Sales Bill
                  </Link>
                  <Link
                    to="/shift-management/shift-close"
                    className="block px-4 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => setShowQuickActions(false)}
                  >
                    Shift Close
                  </Link>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.role}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-300 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-300">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.role}</div>
                  </div>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <Link
                    to="/logout"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-sm text-red-600"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 print:overflow-visible print:bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
};