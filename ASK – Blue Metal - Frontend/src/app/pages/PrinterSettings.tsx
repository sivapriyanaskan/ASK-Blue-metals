import { useState } from 'react';
import { Printer, Save, TestTube } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

interface PrinterConfig {
  module: string;
  printerName: string;
  printType: 'Crystal Report' | 'Thermal Report';
  paperSize: string;
  orientation: 'Portrait' | 'Landscape';
  copies: number;
  autoprint: boolean;
}

const mockPrinterConfigs: PrinterConfig[] = [
  {
    module: 'Sales Bill (GST)',
    printerName: 'Epson TM-T82',
    printType: 'Thermal Report',
    paperSize: 'A4',
    orientation: 'Portrait',
    copies: 2,
    autoprint: true
  },
  {
    module: 'Sales Bill (Non-GST)',
    printerName: 'Epson TM-T82',
    printType: 'Thermal Report',
    paperSize: 'A5',
    orientation: 'Portrait',
    copies: 1,
    autoprint: true
  },
  {
    module: 'Purchase Entry Pass',
    printerName: 'HP LaserJet',
    printType: 'Crystal Report',
    paperSize: 'A4',
    orientation: 'Portrait',
    copies: 3,
    autoprint: false
  },
  {
    module: 'Purchase Bill',
    printerName: 'HP LaserJet',
    printType: 'Crystal Report',
    paperSize: 'A4',
    orientation: 'Portrait',
    copies: 2,
    autoprint: false
  },
  {
    module: 'Token',
    printerName: 'Thermal Printer',
    printType: 'Thermal Report',
    paperSize: '80mm Roll',
    orientation: 'Portrait',
    copies: 1,
    autoprint: true
  },
  {
    module: 'Shift Closing',
    printerName: 'Epson TM-T82',
    printType: 'Thermal Report',
    paperSize: 'A4',
    orientation: 'Portrait',
    copies: 2,
    autoprint: false
  }
];

export const PrinterSettings = () => {
  const [configs, setConfigs] = useState<PrinterConfig[]>(mockPrinterConfigs);
  const [editingModule, setEditingModule] = useState<string | null>(null);

  const handleEdit = (module: string) => {
    setEditingModule(module);
  };

  const handleSave = (module: string, updatedConfig: PrinterConfig) => {
    setConfigs(configs.map(c => c.module === module ? updatedConfig : c));
    setEditingModule(null);
    alert(`Printer settings saved for ${module}`);
  };

  const handleTestPrint = (module: string) => {
    alert(`Sending test print to printer configured for: ${module}\n\nThis will print a sample document to verify printer connectivity.`);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Printer Settings</h1>
      </div>

      <div className="space-y-4">
        {configs.map((config) => (
          <PrinterConfigCard
            key={config.module}
            config={config}
            isEditing={editingModule === config.module}
            onEdit={() => handleEdit(config.module)}
            onSave={(updated) => handleSave(config.module, updated)}
            onTestPrint={() => handleTestPrint(config.module)}
            onCancel={() => setEditingModule(null)}
          />
        ))}
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Ensure printers are properly connected and drivers are installed</li>
          <li>• Use "Test Print" to verify printer connectivity before going live</li>
          <li>• Auto-print will automatically send documents to printer after generation</li>
          <li>• For thermal printers, select appropriate paper size (80mm or 58mm roll)</li>
          <li>• Multiple copies setting is useful for customer, office, and accounts copies</li>
        </ul>
      </div>
    </div>
  );
};

interface PrinterConfigCardProps {
  config: PrinterConfig;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (config: PrinterConfig) => void;
  onTestPrint: () => void;
  onCancel: () => void;
}

const PrinterConfigCard = ({ config, isEditing, onEdit, onSave, onTestPrint, onCancel }: PrinterConfigCardProps) => {
  const [formData, setFormData] = useState<PrinterConfig>(config);

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border-2 border-blue-500 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded">
            <Printer className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{config.module}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Printer Name
            </label>
            <SearchableDropdown
              options={[
                { value: 'Epson TM-T82', label: 'Epson TM-T82 (Thermal)' },
                { value: 'HP LaserJet', label: 'HP LaserJet' },
                { value: 'Thermal Printer', label: 'Thermal Printer' },
                { value: 'Canon PIXMA', label: 'Canon PIXMA' }
              ]}
              value={formData.printerName}
              onValueChange={(value) => setFormData({ ...formData, printerName: value })}
              placeholder="Select Printer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Print Type
            </label>
            <SearchableDropdown
              options={[
                { value: 'Crystal Report', label: 'Crystal Report' },
                { value: 'Thermal Report', label: 'Thermal Report' }
              ]}
              value={formData.printType}
              onValueChange={(value) => setFormData({ ...formData, printType: value as any })}
              placeholder="Select Print Type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paper Size
            </label>
            <SearchableDropdown
              options={[
                { value: 'A4', label: 'A4 (210 x 297 mm)' },
                { value: 'A5', label: 'A5 (148 x 210 mm)' },
                { value: '80mm Roll', label: '80mm Roll' },
                { value: '58mm Roll', label: '58mm Roll' },
                { value: 'Letter', label: 'Letter (8.5 x 11 in)' }
              ]}
              value={formData.paperSize}
              onValueChange={(value) => setFormData({ ...formData, paperSize: value })}
              placeholder="Select Paper Size"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Orientation
            </label>
            <SearchableDropdown
              options={[
                { value: 'Portrait', label: 'Portrait' },
                { value: 'Landscape', label: 'Landscape' }
              ]}
              value={formData.orientation}
              onValueChange={(value) => setFormData({ ...formData, orientation: value as any })}
              placeholder="Select Orientation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Copies
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.copies}
              onChange={(e) => setFormData({ ...formData, copies: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoprint}
                onChange={(e) => setFormData({ ...formData, autoprint: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Enable Auto-Print (automatically print after document generation)
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-6 hover:border-blue-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded">
            <Printer className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.module}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {config.printerName} • {config.printType} • {config.paperSize} • {config.orientation} • {config.copies} {config.copies > 1 ? 'copies' : 'copy'}
              {config.autoprint && <span className="ml-2 text-green-600">• Auto-print enabled</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onTestPrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            <TestTube className="w-4 h-4" />
            Test Print
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium"
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  );
};