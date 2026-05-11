import { useEffect, useState } from 'react';
import { Save, Building2, MapPin, Phone, Mail, FileText, DollarSign, Settings as SettingsIcon } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { describeError } from '../services/mastersApi';
import { companyProfileApi, systemSettingsApi } from '../services/operationsApi';

export const Settings = () => {
  const [companySettings, setCompanySettings] = useState({
    companyName: 'ASK Blue Metal',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    panNumber: 'AAAAA1234A',
    msmeNumber: '',
    bankName: 'State Bank of India',
    accountNumber: '1234567890',
    ifscCode: 'SBIN0001234',
    upiId: 'bluemetal@sbi',
  });

  const [operationalSettings, setOperationalSettings] = useState({
    financialYearStart: '2026-04-01',
    defaultGSTRate: 18,
    weighbridgePort: 'COM3',
    cameraEnabled: true,
    boomBarrierEnabled: true,
    autoBackupEnabled: true,
    backupTime: '23:00',
    externalEntryRequired: false,
    highValueConfirmationLimit: 750000,
    cancelWeightToleranceKg: 100,
  });

  const [displaySettings, setDisplaySettings] = useState({
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '12-hour',
    currency: 'INR',
    decimalPlaces: 2,
    pageSize: 'A4',
  });

  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingOperational, setSavingOperational] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      companyProfileApi.get(),
      systemSettingsApi.get('tokens.externalEntryRequired'),
      systemSettingsApi.get('billing.highValueConfirmationLimit').catch(() => null),
      systemSettingsApi.get('tokens.cancelWeightToleranceKg').catch(() => null),
    ])
      .then(([profile, externalEntryRequired, highValueConfirmationLimit, cancelWeightToleranceKg]) => {
        setCompanySettings((current) => ({
          ...current,
          companyName: profile.name,
          address: profile.address ?? '',
          phone: profile.phone ?? '',
          email: profile.email ?? '',
          gstNumber: profile.gstin ?? '',
          panNumber: profile.panNumber ?? '',
          msmeNumber: profile.msmeNumber ?? '',
          bankName: profile.bankName ?? '',
          accountNumber: profile.accountNumber ?? '',
          ifscCode: profile.ifscCode ?? '',
          upiId: profile.upiId ?? '',
        }));
        setOperationalSettings((current) => ({
          ...current,
          externalEntryRequired: externalEntryRequired?.value === true,
          highValueConfirmationLimit: Number(highValueConfirmationLimit?.value ?? current.highValueConfirmationLimit),
          cancelWeightToleranceKg: Number(cancelWeightToleranceKg?.value ?? current.cancelWeightToleranceKg),
        }));
      })
      .catch((err) => setNotice({ type: 'error', text: describeError(err, 'Failed to load settings') }))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveCompanySettings = async () => {
    setSavingCompany(true);
    setNotice(null);
    try {
      await companyProfileApi.update({
        name: companySettings.companyName.trim(),
        address: companySettings.address.trim() || null,
        phone: companySettings.phone.trim() || null,
        email: companySettings.email.trim() || null,
        gstin: companySettings.gstNumber.trim() || null,
        panNumber: companySettings.panNumber.trim() || null,
        msmeNumber: companySettings.msmeNumber.trim() || null,
        bankName: companySettings.bankName.trim() || null,
        accountNumber: companySettings.accountNumber.trim() || null,
        ifscCode: companySettings.ifscCode.trim() || null,
        upiId: companySettings.upiId.trim() || null,
      });
      setNotice({ type: 'success', text: 'Company settings saved.' });
    } catch (err) {
      setNotice({ type: 'error', text: describeError(err, 'Failed to save company settings') });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveOperationalSettings = async () => {
    setSavingOperational(true);
    setNotice(null);
    try {
      await Promise.all([
        systemSettingsApi.upsert('tokens.externalEntryRequired', {
          category: 'operations.token',
          value: operationalSettings.externalEntryRequired,
        }),
        systemSettingsApi.upsert('billing.highValueConfirmationLimit', {
          category: 'operations.billing',
          value: Number.isFinite(operationalSettings.highValueConfirmationLimit)
            ? operationalSettings.highValueConfirmationLimit
            : 750000,
        }),
        systemSettingsApi.upsert('tokens.cancelWeightToleranceKg', {
          category: 'operations.token',
          value: Number.isFinite(operationalSettings.cancelWeightToleranceKg) && operationalSettings.cancelWeightToleranceKg >= 0
            ? operationalSettings.cancelWeightToleranceKg
            : 100,
        }),
      ]);
      setNotice({ type: 'success', text: 'Operational settings saved.' });
    } catch (err) {
      setNotice({ type: 'error', text: describeError(err, 'Failed to save operational settings') });
    } finally {
      setSavingOperational(false);
    }
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

      {notice && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-800'}`}>
          {notice.text}
        </div>
      )}

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
                disabled={loading || savingCompany}
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
                disabled={loading || savingCompany}
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
                disabled={loading || savingCompany}
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
                disabled={loading || savingCompany}
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
                disabled={loading || savingCompany}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={companySettings.panNumber}
                onChange={(e) => setCompanySettings({ ...companySettings, panNumber: e.target.value })}
                disabled={loading || savingCompany}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Udayam Certificate No (MSME)</label>
              <input
                type="text"
                value={companySettings.msmeNumber}
                onChange={(e) => setCompanySettings({ ...companySettings, msmeNumber: e.target.value })}
                disabled={loading || savingCompany}
                placeholder="e.g. UDYAM-TN-00-0000000"
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
                    disabled={loading || savingCompany}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={companySettings.accountNumber}
                    onChange={(e) => setCompanySettings({ ...companySettings, accountNumber: e.target.value })}
                    disabled={loading || savingCompany}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={companySettings.ifscCode}
                    onChange={(e) => setCompanySettings({ ...companySettings, ifscCode: e.target.value })}
                    disabled={loading || savingCompany}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={companySettings.upiId}
                    onChange={(e) => setCompanySettings({ ...companySettings, upiId: e.target.value })}
                    disabled={loading || savingCompany}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveCompanySettings}
              disabled={loading || savingCompany}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              {savingCompany ? 'Saving...' : 'Save Company Settings'}
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
                disabled={loading || savingOperational}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                value={operationalSettings.defaultGSTRate}
                onChange={(e) => setOperationalSettings({ ...operationalSettings, defaultGSTRate: parseFloat(e.target.value) })}
                disabled={loading || savingOperational}
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
                disabled={loading || savingOperational}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto Backup Time</label>
              <input
                type="time"
                value={operationalSettings.backupTime}
                onChange={(e) => setOperationalSettings({ ...operationalSettings, backupTime: e.target.value })}
                disabled={loading || savingOperational}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">High Value Confirmation Limit</label>
              <input
                type="number"
                min="0"
                value={operationalSettings.highValueConfirmationLimit}
                onChange={(e) => setOperationalSettings({
                  ...operationalSettings,
                  highValueConfirmationLimit: Number(e.target.value || 0),
                })}
                disabled={loading || savingOperational}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Cancel — Allowed Weight Difference (kg)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={operationalSettings.cancelWeightToleranceKg}
                onChange={(e) => setOperationalSettings({
                  ...operationalSettings,
                  cancelWeightToleranceKg: Number(e.target.value || 0),
                })}
                disabled={loading || savingOperational}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum allowed difference between the vehicle weight captured at cancel time and the original empty weight. Cancels exceeding this are rejected.
              </p>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={operationalSettings.cameraEnabled}
                  onChange={(e) => setOperationalSettings({ ...operationalSettings, cameraEnabled: e.target.checked })}
                  disabled={loading || savingOperational}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Enable Camera Integration</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={operationalSettings.boomBarrierEnabled}
                  onChange={(e) => setOperationalSettings({ ...operationalSettings, boomBarrierEnabled: e.target.checked })}
                  disabled={loading || savingOperational}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Enable Boom Barrier Integration</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={operationalSettings.autoBackupEnabled}
                  onChange={(e) => setOperationalSettings({ ...operationalSettings, autoBackupEnabled: e.target.checked })}
                  disabled={loading || savingOperational}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Enable Automatic Backup</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={operationalSettings.externalEntryRequired}
                  onChange={(e) => setOperationalSettings({ ...operationalSettings, externalEntryRequired: e.target.checked })}
                  disabled={loading || savingOperational}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Require External Entry No on Token Creation</span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleSaveOperationalSettings}
              disabled={loading || savingOperational}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              {savingOperational ? 'Saving...' : 'Save Operational Settings'}
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
