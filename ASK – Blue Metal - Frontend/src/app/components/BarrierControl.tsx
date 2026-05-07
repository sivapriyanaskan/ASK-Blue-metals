import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface BarrierControlProps {
  onOpen?: () => void;
  autoOpen?: boolean;
  externalStatus?: 'Closed' | 'Opened' | 'Opening'; // Add external status prop
}

export const BarrierControl = ({ onOpen, autoOpen = false, externalStatus }: BarrierControlProps) => {
  const [status, setStatus] = useState<'closed' | 'opening' | 'open'>('closed');

  // Sync internal state with external status
  useEffect(() => {
    if (externalStatus) {
      if (externalStatus === 'Opened') {
        setStatus('open');
      } else if (externalStatus === 'Opening') {
        setStatus('opening');
      } else if (externalStatus === 'Closed') {
        setStatus('closed');
      }
    }
  }, [externalStatus]);

  const handleOpen = () => {
    setStatus('opening');
    setTimeout(() => {
      setStatus('open');
      if (onOpen) {
        onOpen();
      }
      // Barrier stays open - no auto-close
    }, 2000);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'open':
        return 'bg-green-50 border-green-200';
      case 'opening':
        return 'bg-yellow-50 border-yellow-200';
      case 'closed':
        return 'bg-red-50 border-red-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'open':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'opening':
        return <Activity className="w-5 h-5 text-yellow-600 animate-spin" />;
      case 'closed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  return (
    <div className={`rounded-lg border p-3 h-full flex flex-col ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-xs">Boom Barrier</h3>
        {getStatusIcon()}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-white rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  status === 'closed'
                    ? 'w-0 bg-red-500'
                    : status === 'opening'
                    ? 'w-1/2 bg-yellow-500'
                    : 'w-full bg-green-500'
                }`}
              />
            </div>
          </div>
          <div className="text-xs font-medium capitalize text-center mb-3">
            {status === 'opening' ? 'Opening...' : status}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleOpen}
          disabled={status !== 'closed'}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-1.5 rounded font-medium text-xs transition-colors"
        >
          {status === 'closed' ? 'Open Barrier' : status === 'opening' ? 'Opening...' : 'Barrier Open'}
        </button>

        <div className="text-xs text-transparent text-center">
          &nbsp;
        </div>
      </div>
    </div>
  );
};