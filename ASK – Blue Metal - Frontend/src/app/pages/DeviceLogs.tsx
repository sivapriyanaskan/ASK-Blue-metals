import { useState } from 'react';
import { Search, Filter, Download, Circle, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { deviceLogs } from '../data/mockData';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

export const DeviceLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDevice, setFilterDevice] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredLogs = deviceLogs.filter(log => {
    const matchesSearch = 
      log.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDevice = filterDevice === 'All' || log.deviceType === filterDevice;
    const matchesStatus = filterStatus === 'All' || log.status === filterStatus;
    
    return matchesSearch && matchesDevice && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'Error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success':
        return 'bg-green-100 text-green-800';
      case 'Warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'Error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300">
        <h1 className="text-xl font-bold text-gray-900">Device Event Logs</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-6">
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search device name or message..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All Devices' },
                { value: 'Weighbridge', label: 'Weighbridge' },
                { value: 'Camera', label: 'Camera' },
                { value: 'Barrier', label: 'Barrier' },
                { value: 'Printer', label: 'Printer' },
              ]}
              value={filterDevice}
              onChange={setFilterDevice}
              placeholder="Select Device Type"
              searchPlaceholder="Search devices..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <SearchableDropdown
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'Success', label: 'Success' },
                { value: 'Warning', label: 'Warning' },
                { value: 'Error', label: 'Error' },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Select Status"
              searchPlaceholder="Search status..."
            />
          </div>

          <div className="flex items-end">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Device Log Table */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Device Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Device Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      {log.deviceType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.deviceName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.eventType}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No device logs found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};