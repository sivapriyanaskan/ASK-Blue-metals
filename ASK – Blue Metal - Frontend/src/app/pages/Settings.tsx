import { useState } from 'react';
import { Save, Building2, MapPin, Phone, Mail, FileText, DollarSign, Settings as SettingsIcon } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const Settings = () => {
  const [companySettings, setCompanySettings] = useState({
    companyName: 'Blue Metal Production Unit',
    address: 'Plot No. 123, Industrial Area, Pune - 411001',
    phone: '+91 9876543210',
    email: 'info@bluemetal.com',
    gstNumber: '27AAAAA1234A1Z5',
    panNumber: 'AAAAA1234A',
    bankName: 'State Bank of India',
    accountNumber: '1234567890',
    ifscCode: 'SBIN0001234',
    upiId: 'bluemetal@sbi'
  });

  const [operationalSettings, setOperationalSettings] = useState({
    financialYearStart: '2026-04-01',
    defaultGSTRate: 18,
    weighbridgePort: 'COM3',
    cameraEnabled: true,
    boomBarrierEnabled: true,
    autoBackupEnabled: true,
    backupTime: '23:00'
  });

  const [displaySettings, setDisplaySettings] = useState({
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '12-hour',
    currency: 'INR',
    decimalPlaces: 2,
    pageSize: 'A4'
  });

  const handleSaveCompanySettings = () => {
    alert('Company settings saved successfully!');
  };

  const handleSaveOperationalSettings = () => {
    alert('Operational settings saved successfully!');
  };

  const handleSaveDisplaySettings = () => {
    alert('Display settings saved successfully!');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure system settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Company Information */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companySettings.companyName}
                onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Address
              </label>
              <textarea
                value={companySettings.address}
                onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={companySettings.phone}
                onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={companySettings.email}
                onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                GST Number
              </label>
              <input
                type="text"
                value={companySettings.gstNumber}
                onChange={(e) => setCompanySettings({ ...companySettings, gstNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={companySettings.panNumber}
                onChange={(e) => setCompanySettings({ ...companySettings, panNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2 border-t border-gray-300 pt-4 mt-2">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Bank Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={companySettings.bankName}
                    onChange={(e) => setCompanySettings({ ...companySettings, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={companySettings.accountNumber}
                    onChange={(e) => setCompanySettings({ ...companySettings, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={companySettings.ifscCode}
                    onChange={(e) => setCompanySettings({ ...companySettings, ifscCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={companySettings.upiId}
                    onChange={(e) => setCompanySettings({ ...companySettings, upiId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveCompanySettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              Save Company Settings
            </button>
          </div>
        </div>

        {/* Operational Settings */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Operational Settings</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year Start</label>
              <input
                type="date"
                value={operationalSettings.financialYearStart}
                onChange={(e) => setOperationalSettings({ ...operationalSettings, financialYearStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                value={operationalSettings.defaultGSTRate}
                onChange={(e) => setOperationalSettings({ ...operationalSettings, defaultGSTRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weighbridge Port</label>
              <SearchableDropdown
                options={[
                  { label: 'COM1', value: 'COM1' },
                  { label: 'COM2', value: 'COM2' },
                  { label: 'COM3', value: 'COM3' },
                  { label: 'COM4', value: 'COM4' }
                ]}
                value={operationalSettings.weighbridgePort}
                onValueChange={(val) => setOperationalSettings({ ...operationalSettings, weighbridgePort: val })}
                placeholder="Select Port"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto Backup Time</label>
              <input
                type="time"
                value={operationalSettings.backupTime}
                onChange={(e) => setOperationalSettings({ ...operationalSettings, backupTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={operationalSettings.cameraEnabled}
                  onChange={(e) => setOperationalSettings({ ...operationalSettings, cameraEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Enable Camera Integration</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={operationalSettings.boomBarrierEnabled}
                  onChange={(e) => setOperationalSettings({ ...operationalSettings, boomBarrierEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Enable Boom Barrier Integration</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={operationalSettings.autoBackupEnabled}
                  onChange={(e) => setOperationalSettings({ ...operationalSettings, autoBackupEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Enable Automatic Backup</span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveOperationalSettings}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              Save Operational Settings
            </button>
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Display Settings</h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
              <SearchableDropdown
                options={[
                  { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
                  { label: 'MM-DD-YYYY', value: 'MM-DD-YYYY' },
                  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
                ]}
                value={displaySettings.dateFormat}
                onValueChange={(val) => setDisplaySettings({ ...displaySettings, dateFormat: val })}
                placeholder="Select date format"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
              <SearchableDropdown
                options={[
                  { label: '12-hour', value: '12-hour' },
                  { label: '24-hour', value: '24-hour' }
                ]}
                value={displaySettings.timeFormat}
                onValueChange={(val) => setDisplaySettings({ ...displaySettings, timeFormat: val })}
                placeholder="Select time format"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <SearchableDropdown
                options={[
                  { label: 'INR (₹)', value: 'INR' },
                  { label: 'USD ($)', value: 'USD' },
                  { label: 'EUR (€)', value: 'EUR' }
                ]}
                value={displaySettings.currency}
                onValueChange={(val) => setDisplaySettings({ ...displaySettings, currency: val })}
                placeholder="Select currency"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decimal Places</label>
              <input
                type="number"
                min="0"
                max="4"
                value={displaySettings.decimalPlaces}
                onChange={(e) => setDisplaySettings({ ...displaySettings, decimalPlaces: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Print Page Size</label>
              <SearchableDropdown
                options={[
                  { label: 'A4', value: 'A4' },
                  { label: 'A5', value: 'A5' },
                  { label: 'Letter', value: 'Letter' }
                ]}
                value={displaySettings.pageSize}
                onValueChange={(val) => setDisplaySettings({ ...displaySettings, pageSize: val })}
                placeholder="Select page size"
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveDisplaySettings}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              Save Display Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
