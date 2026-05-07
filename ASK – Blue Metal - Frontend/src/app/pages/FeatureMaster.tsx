import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Edit, Trash2, Save, X, Eye, Search, Filter, CheckCircle, XCircle, Layers, FileText, ExternalLink, Shield, Tag } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

interface Feature {
  id: string;
  featureCode: string;
  featureName: string;
  moduleName: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

const mockFeatures: Feature[] = [
  {
    id: 'FTR001',
    featureCode: 'TOKEN_CREATE',
    featureName: 'Token Creation',
    moduleName: 'Operations',
    description: 'Create new tokens with weighbridge integration, ANPR capture, and boom barrier control',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR002',
    featureCode: 'SALES_BILL',
    featureName: 'Sales Billing',
    moduleName: 'Operations',
    description: 'Generate sales invoices with GST calculation, multiple payment modes, and automatic bill numbering',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR003',
    featureCode: 'CUSTOMER_MASTER',
    featureName: 'Customer Master Management',
    moduleName: 'Masters',
    description: 'Create and manage customer records with GST details, credit limits, and rate assignments',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR004',
    featureCode: 'ITEM_MASTER',
    featureName: 'Item Master Management',
    moduleName: 'Masters',
    description: 'Manage inventory items with HSN codes, unit types, and stock tracking',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR005',
    featureCode: 'SHIFT_CLOSE',
    featureName: 'Shift Closing',
    moduleName: 'Shift Management',
    description: 'Close shifts with denomination verification, cash reconciliation, and handover process',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR006',
    featureCode: 'SALES_REGISTER',
    featureName: 'Sales Register Report',
    moduleName: 'Reports',
    description: 'Comprehensive sales report with filters, export options, and GST summary',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR007',
    featureCode: 'USER_MGMT',
    featureName: 'User Management',
    moduleName: 'Admin',
    description: 'Create and manage user accounts with role-based access control and password management',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR008',
    featureCode: 'AUDIT_LOGS',
    featureName: 'Audit Logs',
    moduleName: 'Admin',
    description: 'Track all system activities, user actions, and data changes for compliance and security',
    isActive: true,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: null,
    updatedBy: null
  },
  {
    id: 'FTR009',
    featureCode: 'WEIGHBRIDGE_OLD',
    featureName: 'Weighbridge Integration (Legacy)',
    moduleName: 'Operations',
    description: 'Old weighbridge integration module - deprecated',
    isActive: false,
    createdAt: '2025-01-01 10:00 AM',
    createdBy: 'admin',
    updatedAt: '2026-01-15 03:00 PM',
    updatedBy: 'admin'
  }
];

const moduleNames = [
  'Operations',
  'Masters',
  'Production',
  'Finance',
  'Shift Management',
  'Reports',
  'Admin',
  'Settings'
];

export const FeatureMaster = () => {
  const [features, setFeatures] = useState<Feature[]>(mockFeatures);
  const [showForm, setShowForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [viewingFeature, setViewingFeature] = useState<Feature | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [formData, setFormData] = useState<Feature>({
    id: '',
    featureCode: '',
    featureName: '',
    moduleName: 'Operations',
    description: '',
    isActive: true,
    createdAt: '',
    createdBy: '',
    updatedAt: null,
    updatedBy: null
  });

  const navigate = useNavigate();

  // Mock data for roles using this feature
  const getMockRolesForFeature = (moduleName: string, featureCode: string) => {
    const rolesByFeature: { [key: string]: string[] } = {
      'TOKEN_CREATE': ['Admin', 'Operator'],
      'SALES_BILL': ['Admin', 'Billing Staff'],
      'CUSTOMER_MASTER': ['Admin', 'Billing Staff'],
      'ITEM_MASTER': ['Admin', 'Billing Staff'],
      'SHIFT_CLOSE': ['Admin', 'Supervisor'],
      'SALES_REGISTER': ['Admin', 'Supervisor', 'Accounts', 'Viewer'],
      'USER_MGMT': ['Admin'],
      'AUDIT_LOGS': ['Admin', 'Accounts'],
      'WEIGHBRIDGE_OLD': []
    };
    return rolesByFeature[featureCode] || ['Admin'];
  };

  const handleAdd = () => {
    const newId = 'FTR' + String(features.length + 1).padStart(3, '0');
    setFormData({
      id: newId,
      featureCode: '',
      featureName: '',
      moduleName: 'Operations',
      description: '',
      isActive: true,
      createdAt: new Date().toLocaleString(),
      createdBy: 'admin',
      updatedAt: null,
      updatedBy: null
    });
    setEditingFeature(null);
    setShowForm(true);
  };

  const handleEdit = (feature: Feature) => {
    setFormData(feature);
    setEditingFeature(feature);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.featureCode || !formData.featureName || !formData.moduleName) {
      alert('Please fill all required fields');
      return;
    }

    if (editingFeature) {
      const updatedFeature = {
        ...formData,
        updatedAt: new Date().toLocaleString(),
        updatedBy: 'admin'
      };
      setFeatures(features.map(f => f.id === formData.id ? updatedFeature : f));
      alert('Feature updated successfully!');
    } else {
      setFeatures([...features, formData]);
      alert('Feature created successfully!');
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this feature?')) {
      setFeatures(features.filter(f => f.id !== id));
      alert('Feature deleted successfully!');
    }
  };

  const handleView = (feature: Feature) => {
    setViewingFeature(feature);
  };

  const filteredFeatures = features.filter(feature => {
    const matchesSearch =
      feature.featureCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.featureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feature.moduleName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === 'All' || feature.moduleName === moduleFilter;
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? feature.isActive : !feature.isActive);
    return matchesSearch && matchesModule && matchesStatus;
  });

  // View Details Screen
  if (viewingFeature) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feature Details</h1>
            <p className="text-gray-600">View feature configuration and system information</p>
          </div>
          <button
            onClick={() => setViewingFeature(null)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-4xl">
          {/* Feature Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Feature Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feature ID</label>
                <input
                  type="text"
                  value={viewingFeature.id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feature Code</label>
                <input
                  type="text"
                  value={viewingFeature.featureCode}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name</label>
                <input
                  type="text"
                  value={viewingFeature.featureName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module Name</label>
                <input
                  type="text"
                  value={viewingFeature.moduleName}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input
                  type="text"
                  value={viewingFeature.isActive ? 'Active' : 'Inactive'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={viewingFeature.description}
                  disabled
                  rows={3}
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
                  value={viewingFeature.createdAt}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                <input
                  type="text"
                  value={viewingFeature.createdBy}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
                <input
                  type="text"
                  value={viewingFeature.updatedAt || 'Never'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Updated By</label>
                <input
                  type="text"
                  value={viewingFeature.updatedBy || 'N/A'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Related Records */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Related Records</h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-800">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Roles allowed for this Feature</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-200 text-purple-900 text-xs font-medium rounded ml-2">
                    <Tag className="w-3 h-3" />
                    {viewingFeature.moduleName}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/settings/role-feature-access')}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
                >
                  Configure Feature Access <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              
              {getMockRolesForFeature(viewingFeature.moduleName, viewingFeature.featureCode).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getMockRolesForFeature(viewingFeature.moduleName, viewingFeature.featureCode).map((roleName, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate('/settings/roles')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 text-sm font-medium rounded-full transition-colors"
                    >
                      <Shield className="w-3 h-3" />
                      {roleName}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-purple-400 opacity-50" />
                  <p className="text-purple-700 text-sm mb-3">No roles allowed for this feature</p>
                  <button
                    onClick={() => navigate('/settings/role-feature-access')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded"
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
            {editingFeature ? 'Edit Feature' : 'Add New Feature'}
          </h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-3xl">
          {/* Feature Details Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Feature Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feature ID
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
                  Feature Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.featureCode}
                  onChange={(e) => setFormData({ ...formData, featureCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., TOKEN_CREATE, SALES_BILL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feature Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.featureName}
                  onChange={(e) => setFormData({ ...formData, featureName: e.target.value })}
                  placeholder="e.g., Token Creation, Sales Billing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={moduleNames.map(module => ({
                    label: module,
                    value: module
                  }))}
                  value={formData.moduleName}
                  onValueChange={(val) => setFormData({ ...formData, moduleName: val })}
                  placeholder="Select module"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { label: 'Active', value: 'Active' },
                    { label: 'Inactive', value: 'Inactive' }
                  ]}
                  value={formData.isActive ? 'Active' : 'Inactive'}
                  onValueChange={(val) => setFormData({ ...formData, isActive: val === 'Active' })}
                  placeholder="Select status"
                  className="w-full"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the feature and its functionality"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
          <h1 className="text-2xl font-bold text-gray-900">Feature Master</h1>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Feature
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Features</div>
              <div className="text-2xl font-bold text-gray-900">{features.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Features</div>
              <div className="text-2xl font-bold text-gray-900">
                {features.filter(f => f.isActive).length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-full">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Modules</div>
              <div className="text-2xl font-bold text-gray-900">
                {new Set(features.map(f => f.moduleName)).size}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Inactive Features</div>
              <div className="text-2xl font-bold text-gray-900">
                {features.filter(f => !f.isActive).length}
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
              placeholder="Search by code, name, or module..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <SearchableDropdown
              options={[
                { label: 'All Modules', value: 'All' },
                ...moduleNames.map(module => ({
                  label: module,
                  value: module
                }))
              ]}
              value={moduleFilter}
              onValueChange={(val) => setModuleFilter(val)}
              placeholder="All Modules"
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <SearchableDropdown
              options={[
                { label: 'All Statuses', value: 'All' },
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' }
              ]}
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val)}
              placeholder="All Statuses"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Features Table */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFeatures.map((feature) => (
                <tr key={feature.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {feature.featureCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-400" />
                      {feature.featureName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      <FileText className="w-3 h-3" />
                      {feature.moduleName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {feature.isActive ? (
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
                        onClick={() => handleView(feature)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(feature)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(feature.id)}
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