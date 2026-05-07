import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { Power, CheckCircle, AlertCircle, Clock, DollarSign, User } from 'lucide-react';
import { shiftApi } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

export const ShiftOpen = () => {
  const navigate = useNavigate();
  const { user, shiftStatus, setShiftStatus, hardwareDevices } = useAppContext();
  
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Denomination entry for opening balance
  const [denominations, setDenominations] = useState({
    '2000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0
  });

  const handleDenominationChange = (denom: string, value: number) => {
    const newDenominations = { ...denominations, [denom]: value };
    setDenominations(newDenominations);
    
    // Calculate total
    const total = Object.entries(newDenominations).reduce((sum, [key, val]) => {
      return sum + (parseInt(key) * val);
    }, 0);
    setOpeningBalance(total);
  };

  const handleShiftOpen = async () => {
    // Validate hardware status
    const offlineDevices = hardwareDevices.filter((d) => d.status === 'offline');
    if (offlineDevices.length > 0) {
      if (!window.confirm(`Warning: ${offlineDevices.length} device(s) are offline. Do you want to proceed?`)) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      const openingDenominations = Object.entries(denominations)
        .filter(([, nos]) => nos > 0)
        .map(([k, nos]) => ({
          denomination: parseInt(k, 10),
          nos,
          amount: parseInt(k, 10) * nos,
        }));
      const created = await shiftApi.create({
        shiftDate: new Date().toISOString(),
        openedBySnapshot: user.name || user.username || 'system',
        openingAmount: openingBalance,
        remarks: remarks || null,
        openingDenominations,
      });
      setShiftStatus({
        ...shiftStatus,
        isOpen: true,
        shiftNumber: shiftStatus.shiftNumber + 1,
        startedBy: user.name,
        startTime: new Date().toTimeString().slice(0, 8),
      });
      alert(`Shift ${created.shiftNo} opened successfully!\nOpening Balance: ₹${openingBalance.toFixed(2)}\nOperator: ${user.name}`);
      navigate('/');
    } catch (err) {
      alert(describeError(err, 'Failed to open shift'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (shiftStatus.isOpen) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Shift Already Open</h2>
            <p className="text-gray-600 mb-4">
              Shift {shiftStatus.shiftNumber} is currently active. Please close the current shift before opening a new one.
            </p>
            <button
              onClick={() => navigate('/shift-management/shift-close')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Shift Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shift Open</h1>
        <p className="text-gray-600">Start a new operational shift</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Shift Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shift Details Card */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Shift Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">New Shift Number</label>
                <div className="text-2xl font-bold text-blue-600">
                  {shiftStatus.shiftNumber + 1}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Date & Time</label>
                <div className="font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date().toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Operator</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Opening Balance</label>
                <div className="text-xl font-bold text-green-600">
                  ₹{openingBalance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Status Card */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-lg font-bold mb-4">Hardware Status</h2>
            
            <div className="space-y-3">
              {hardwareDevices.map((device, index) => (
                <div key={`device-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      device.status === 'online' ? 'bg-green-500' :
                      device.status === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-700">{device.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    device.status === 'online' ? 'bg-green-100 text-green-700' :
                    device.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {device.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section - Opening Balance Entry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Denomination Entry */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Opening Cash Balance
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Enter the denomination count for opening cash balance. This will be used as the starting point for today's shift operations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.keys(denominations).map((denom) => (
                <div key={`denom-${denom}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-right min-w-[60px]">
                    <div className="text-sm text-gray-600">₹{denom}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-gray-600">×</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations[denom as keyof typeof denominations]}
                      onChange={(e) => handleDenominationChange(denom, parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">=</span>
                    <div className="font-medium text-gray-900 min-w-[80px]">
                      ₹{(parseInt(denom) * denominations[denom as keyof typeof denominations]).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total Opening Balance:</span>
                <span className="text-2xl font-bold text-green-600">₹{openingBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opening Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Any special notes or remarks for this shift..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex justify-end gap-4">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShiftOpen}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Power className="w-5 h-5" />
                    Open Shift {shiftStatus.shiftNumber + 1}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};