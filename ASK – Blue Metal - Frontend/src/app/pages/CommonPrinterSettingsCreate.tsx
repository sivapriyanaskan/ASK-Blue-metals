import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Save, X } from 'lucide-react';
import { getActivePrinters } from '../data/printers';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const CommonPrinterSettingsCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    formName: '',
    printerId: '',
    printEngine: '',
    printFormat: '',
    defaultCopies: 1,
    showPreview: true,
    allowPdfFallback: false,
    isDefault: false,
    isActive: true
  });

  const activePrinters = getActivePrinters();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Printer setting created successfully!');
    navigate('/settings/common-printer');
  };

  return (
    <div className="p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">New Printer Setting</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Form Selection */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Form Selection</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Form Name <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { label: 'Select Form', value: '' },
                    { label: 'Sales Bill', value: 'SALES_BILL' },
                    { label: 'Token', value: 'TOKEN' },
                    { label: 'Purchase Entry Pass', value: 'PURCHASE_ENTRY_PASS' },
                    { label: 'Purchase Bill', value: 'PURCHASE_BILL' },
                    { label: 'Shift Closing', value: 'SHIFT_CLOSING' },
                    { label: 'Weighbridge Slip', value: 'WEIGHBRIDGE_SLIP' },
                    { label: 'Delivery Challan', value: 'DELIVERY_CHALLAN' }
                  ]}
                  value={formData.formName}
                  onValueChange={(val) => setFormData({ ...formData, formName: val })}
                  placeholder="Select Form"
                  className="w-full"
                />
              </div>
            </div>

            {/* Printer Selection */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Printer Selection</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Printer <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { label: 'Select Printer', value: '' },
                    ...activePrinters.map(printer => ({
                      label: `${printer.printerName} (${printer.printerType})`,
                      value: printer.id
                    }))
                  ]}
                  value={formData.printerId}
                  onValueChange={(val) => setFormData({ ...formData, printerId: val })}
                  placeholder="Select Printer"
                  className="w-full"
                />
              </div>
            </div>

            {/* Print Engine */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Print Engine</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Print Engine <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { label: 'Select Engine', value: '' },
                    { label: 'Crystal Reports', value: 'CRYSTAL' },
                    { label: 'Thermal', value: 'THERMAL' }
                  ]}
                  value={formData.printEngine}
                  onValueChange={(val) => setFormData({ ...formData, printEngine: val })}
                  placeholder="Select Engine"
                  className="w-full"
                />
              </div>
            </div>

            {/* Print Format */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Print Format</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Print Format <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { label: 'Select Format', value: '' },
                    { label: 'A4 (210 x 297 mm) - Standard page format', value: 'A4' },
                    { label: 'A5 (148 x 210 mm) - Half-size for smaller printers', value: 'A5' },
                    { label: 'Thermal 3 inch - Thermal printer page format', value: 'THERMAL_3IN' },
                    { label: 'Thermal 4 inch - Thermal printer page format', value: 'THERMAL_4IN' }
                  ]}
                  value={formData.printFormat}
                  onValueChange={(val) => setFormData({ ...formData, printFormat: val })}
                  placeholder="Select Format"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the paper size that matches your printer's capabilities
                </p>
              </div>
            </div>

            {/* Print Behavior */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Print Behavior</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Copies <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.defaultCopies}
                    onChange={(e) => setFormData({ ...formData, defaultCopies: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Show Preview <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showPreview}
                        onChange={(e) => setFormData({ ...formData, showPreview: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable preview screen</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Allow preview before printing
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allow PDF Fallback
                  </label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowPdfFallback}
                        onChange={(e) => setFormData({ ...formData, allowPdfFallback: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Enable PDF fallback</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Fallback to PDF if printer fails (emergency)
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Active */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Status & Active</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Set as Default <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Set as default for this form (only one can be default)
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Only one printer setting can be default per form
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Active Status <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active (available for use)</span>
                    </label>
                  </div>
                  {!formData.isActive && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Inactive configuration will not be selectable in forms
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Printer Setting
            </button>
            <Link
              to="/settings/common-printer"
              className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};