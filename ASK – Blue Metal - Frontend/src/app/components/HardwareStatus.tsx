import { Circle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const HardwareStatus = () => {
  const { hardwareDevices } = useAppContext();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'offline':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'offline':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4">
      <h3 className="font-semibold mb-3">Hardware Status</h3>
      <div className="space-y-2">
        {hardwareDevices.map((device) => (
          <div
            key={device.name}
            className={`flex items-center justify-between p-2 rounded border ${getStatusColor(
              device.status
            )}`}
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(device.status)}
              <span className="text-sm font-medium">{device.name}</span>
            </div>
            <span className="text-xs text-gray-600 capitalize">{device.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
