import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Edit, Trash2, Save, X, Eye, Search, Filter, CheckCircle, XCircle, Menu as MenuIcon, Link as LinkIcon, ExternalLink, Shield } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

interface Menu {
  id: string;
  menuCode: string;
  menuName: string;
  parentMenuId: string | null;
  parentMenuName?: string;
  menuIcon: string;
  menuRoute: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

const mockMenus: Menu[] = [
  {
    id: 'MNU001',
    menuCode: 'DASH',
    menuName: 'Dashboard',
    parentMenuId: null,
    menuIcon: 'LayoutDashboard',
    menuRoute: '/',
    displayOrder: 1,
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'MNU002',
    menuCode: 'OPS',
    menuName: 'Operations',
    parentMenuId: null,
    menuIcon: 'Truck',
    menuRoute: '/operations',
    displayOrder: 2,
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'MNU003',
    menuCode: 'TOKEN',
    menuName: 'Token Creation',
    parentMenuId: 'MNU002',
    parentMenuName: 'Operations',
    menuIcon: 'Circle',
    menuRoute: '/operations/token-creation',
    displayOrder: 1,
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'MNU004',
    menuCode: 'PURCHASE_PASS',
    menuName: 'Purchase Entry Pass',
    parentMenuId: 'MNU002',
    parentMenuName: 'Operations',
    menuIcon: 'Circle',
    menuRoute: '/operations/purchase-entry-pass',
    displayOrder: 2,
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'MNU005',
    menuCode: 'MASTERS',
    menuName: 'Masters',
    parentMenuId: null,
    menuIcon: 'Database',
    menuRoute: '/masters',
    displayOrder: 3,
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'MNU006',
    menuCode: 'CUSTOMER',
    menuName: 'Customer Master',
    parentMenuId: 'MNU005',
    parentMenuName: 'Masters',
    menuIcon: 'Circle',
    menuRoute: '/masters/customer',
    displayOrder: 1,
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'MNU007',
    menuCode: 'REPORTS',
    menuName: 'Reports',
    parentMenuId: null,
    menuIcon: 'FileText',
    menuRoute: '/reports',
    displayOrder: 6,
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'MNU008',
    menuCode: 'SETTINGS_OLD',
    menuName: 'Settings (Old)',
    parentMenuId: null,
    menuIcon: 'Settings',
    menuRoute: '/settings-old',
    displayOrder: 8,
    isActive: false,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: '2026-01-15 02:00 PM',
    updatedBy: 'admin'
  }
];

export const MenuMaster = () => {
  const [menus, setMenus] = useState<Menu[]>(mockMenus);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [viewingMenu, setViewingMenu] = useState<Menu | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [parentFilter, setParentFilter] = useState<string>('All');

  const [formData, setFormData] = useState<Menu>({
    id: '',
    menuCode: '',
    menuName: '',
    parentMenuId: null,
    menuIcon: 'Circle',
    menuRoute: '',
    displayOrder: 1,
    isActive: true,
    createdAt: '',
    createdBy: '',
    updatedAt: null,
    updatedBy: null
  });

  const navigate = useNavigate();

  // Mock data for roles using this menu
  const getMockRolesForMenu = (menuCode: string) => {
    const rolesByMenu: { [key: string]: string[] } = {
      'DASH': ['Admin', 'Operator', 'Billing Staff', 'Supervisor', 'Accounts', 'Viewer'],
      'OPS': ['Admin', 'Operator', 'Billing Staff', 'Supervisor'],
      'TOKEN': ['Admin', 'Operator'],
      'PURCHASE_PASS': ['Admin', 'Operator'],
      'MASTERS': ['Admin', 'Billing Staff'],
      'CUSTOMER': ['Admin', 'Billing Staff'],
      'REPORTS': ['Admin', 'Supervisor', 'Accounts', 'Viewer'],
      'SETTINGS_OLD': []
    };
    return rolesByMenu[menuCode] || ['Admin'];
  };

  const handleAdd = () => {
    const newId = 'MNU' + String(menus.length + 1).padStart(3, '0');
    setFormData({
      id: newId,
      menuCode: '',
      menuName: '',
      parentMenuId: null,
      menuIcon: 'Circle',
      menuRoute: '',
      displayOrder: menus.length + 1,
      isActive: true,
      createdAt: new Date().toLocaleString(),
      createdBy: 'admin',
      updatedAt: null,
      updatedBy: null
    });
    setEditingMenu(null);
    setShowForm(true);
  };

  const handleEdit = (menu: Menu) => {
    setFormData(menu);
    setEditingMenu(menu);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.menuCode || !formData.menuName || !formData.menuRoute) {
      alert('Please fill all required fields');
      return;
    }

    if (editingMenu) {
      const updatedMenu = {
        ...formData,
        updatedAt: new Date().toLocaleString(),
        updatedBy: 'admin'
      };
      setMenus(menus.map(m => m.id === formData.id ? updatedMenu : m));
      alert('Menu updated successfully!');
    } else {
      setMenus([...menus, formData]);
      alert('Menu created successfully!');
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this menu?')) {
      setMenus(menus.filter(m => m.id !== id));
      alert('Menu deleted successfully!');
    }
  };

  const handleView = (menu: Menu) => {
    setViewingMenu(menu);
  };

  const parentMenus = menus.filter(m => m.parentMenuId === null);

  const filteredMenus = menus.filter(menu => {
    const matchesSearch =
      menu.menuCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      menu.menuName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      menu.menuRoute.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? menu.isActive : !menu.isActive);
    const matchesParent = parentFilter === 'All' || menu.parentMenuId === parentFilter;
    return matchesSearch && matchesStatus && matchesParent;
  });

  // View Details Screen
  if (viewingMenu) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Details</h1>
            <p className="text-gray-600">View menu configuration and system information</p>
          </div>
          <button
            onClick={() => setViewingMenu(null)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-4xl">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu ID</label>
                <input
                  type="text"
                  value={viewingMenu.id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Code</label>
                <input
                  type="text"
                  value={viewingMenu.menuCode}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Name</label>
                <input
                  type="text"
                  value={viewingMenu.menuName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Menu</label>
                <input
                  type="text"
                  value={viewingMenu.parentMenuName || '(Root Menu)'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input
                  type="text"
                  value={viewingMenu.isActive ? 'Active' : 'Inactive'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Display Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Icon</label>
                <input
                  type="text"
                  value={viewingMenu.menuIcon}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="text"
                  value={viewingMenu.displayOrder}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Route</label>
                <input
                  type="text"
                  value={viewingMenu.menuRoute}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">System Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                <input
                  type="text"
                  value={viewingMenu.createdAt}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <input
                  type="text"
                  value={viewingMenu.createdBy}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
                <input
                  type="text"
                  value={viewingMenu.updatedAt || 'Never'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Updated By</label>
                <input
                  type="text"
                  value={viewingMenu.updatedBy || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Related Records */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Related Records</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Roles using this Menu</span>
                </div>
                <button
                  onClick={() => navigate('/settings/role-menu-access')}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                >
                  Configure Role Access <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              
              {getMockRolesForMenu(viewingMenu.menuCode).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getMockRolesForMenu(viewingMenu.menuCode).map((roleName, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate('/settings/roles')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 text-sm font-medium rounded-full transition-colors"
                    >
                      <Shield className="w-3 h-3" />
                      {roleName}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-blue-400 opacity-50" />
                  <p className="text-blue-700 text-sm mb-3">No roles assigned to this menu</p>
                  <button
                    onClick={() => navigate('/settings/role-menu-access')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                  >
                    Configure Access
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create/Edit Form Screen
  if (showForm) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingMenu ? 'Edit Menu' : 'Add New Menu'}
          </h1>
          <p className="text-gray-600">Configure menu settings and display options</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-3xl">
          {/* Basic Info Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Menu ID
                </label>
                <input
                  type="text"
                  value={formData.id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.menuCode}
                  onChange={(e) => setFormData({ ...formData, menuCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., DASH, OPS, TOKEN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.menuName}
                  onChange={(e) => setFormData({ ...formData, menuName: e.target.value })}
                  placeholder="e.g., Dashboard, Operations"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Menu
                </label>
                <SearchableDropdown
                  options={[
                    { value: '', label: '(Root Menu - No Parent)' },
                    ...parentMenus.map((menu) => ({
                      value: menu.id,
                      label: `${menu.menuName} (${menu.menuCode})`
                    }))
                  ]}
                  value={formData.parentMenuId || ''}
                  onValueChange={(value) => setFormData({ ...formData, parentMenuId: value || null })}
                  placeholder="(Root Menu - No Parent)"
                />
              </div>
            </div>
          </div>

          {/* Display Settings Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Display Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Icon
                </label>
                <input
                  type="text"
                  value={formData.menuIcon}
                  onChange={(e) => setFormData({ ...formData, menuIcon: e.target.value })}
                  placeholder="e.g., LayoutDashboard, Truck, Circle"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Lucide icon name</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Route <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.menuRoute}
                  onChange={(e) => setFormData({ ...formData, menuRoute: e.target.value })}
                  placeholder="e.g., /, /operations, /masters/customer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { value: 'Active', label: 'Active' },
                    { value: 'Inactive', label: 'Inactive' }
                  ]}
                  value={formData.isActive ? 'Active' : 'Inactive'}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value === 'Active' })}
                  placeholder="Select Status"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List Screen
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Master</h1>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Menu
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <MenuIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Menus</div>
              <div className="text-2xl font-bold text-gray-900">{menus.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Menus</div>
              <div className="text-2xl font-bold text-gray-900">
                {menus.filter(m => m.isActive).length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-full">
              <MenuIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Root Menus</div>
              <div className="text-2xl font-bold text-gray-900">
                {menus.filter(m => m.parentMenuId === null).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, name, or route..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' }
              ]}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="All Statuses"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All Parent Menus' },
                { value: '', label: '(Root Menus Only)' },
                ...parentMenus.map((menu) => ({
                  value: menu.id,
                  label: menu.menuName
                }))
              ]}
              value={parentFilter}
              onValueChange={setParentFilter}
              placeholder="All Parent Menus"
            />
          </div>
        </div>
      </div>

      {/* Menus Table */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Menu Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Menu Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Menu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMenus.map((menu) => (
                <tr key={menu.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {menu.menuCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <MenuIcon className="w-4 h-4 text-gray-400" />
                      {menu.menuName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {menu.parentMenuName || '(Root)'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-gray-400" />
                      {menu.menuRoute}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-center text-gray-600">
                    {menu.displayOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {menu.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleView(menu)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(menu)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};