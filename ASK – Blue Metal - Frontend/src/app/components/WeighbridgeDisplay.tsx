import { useEffect, useState } from 'react';
import { Scale, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface WeighbridgeDisplayProps {
  onWeightCapture?: (weight: number) => void;
  autoCapture?: boolean;
  externalCapturedWeight?: number | null;
}

export const WeighbridgeDisplay = ({ onWeightCapture, autoCapture = false, externalCapturedWeight = null }: WeighbridgeDisplayProps) => {
  const { currentWeight, setCurrentWeight, isWeightStable, setIsWeightStable } = useAppContext();
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);

  // Update internal captured weight when external weight is provided
  useEffect(() => {
    if (externalCapturedWeight !== null && externalCapturedWeight !== capturedWeight) {
      setCapturedWeight(externalCapturedWeight);
    }
  }, [externalCapturedWeight]);

  useEffect(() => {
    // Simulate weighbridge weight fluctuation
    const interval = setInterval(() => {
      if (!capturedWeight) {
        const baseWeight = 8000 + Math.random() * 15000;
        const fluctuation = Math.random() < 0.7 ? Math.random() * 50 : Math.random() * 200;
        const newWeight = Math.round(baseWeight + fluctuation);
        setCurrentWeight(newWeight);
        
        // Weight is stable if fluctuation is small
        const stable = fluctuation < 100;
        setIsWeightStable(stable);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [capturedWeight, setCurrentWeight, setIsWeightStable]);

  const handleCapture = () => {
    if (isWeightStable) {
      setCapturedWeight(currentWeight);
      if (onWeightCapture) {
        onWeightCapture(currentWeight);
      }
    }
  };

  useEffect(() => {
    if (autoCapture && isWeightStable && !capturedWeight) {
      setTimeout(handleCapture, 1000);
    }
  }, [autoCapture, isWeightStable, capturedWeight]);

  return (
    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-4 text-white h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          <h3 className="font-semibold text-sm">Weighbridge</h3>
        </div>
        <div className="flex items-center gap-1">
          <Activity className={`w-4 h-4 ${isWeightStable ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`} />
          <span className="text-xs">{isWeightStable ? 'Stable' : 'Fluctuating'}</span>
        </div>
      </div>

      <div className="bg-black/30 rounded-lg p-4 mb-3 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold font-mono tracking-wider mb-1">
            {capturedWeight !== null ? capturedWeight : currentWeight}
          </div>
          <div className="text-sm text-blue-200">KG</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleCapture}
            disabled={!isWeightStable || capturedWeight !== null}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-1.5 rounded text-sm font-medium transition-colors"
          >
            {capturedWeight !== null ? 'Captured' : 'Capture'}
          </button>
          {capturedWeight !== null && (
            <button
              onClick={() => setCapturedWeight(null)}
              className="px-3 bg-yellow-600 hover:bg-yellow-700 text-white py-1.5 rounded text-sm font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {!isWeightStable && !capturedWeight && (
          <div className="text-xs text-yellow-200 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Waiting for stabilization...
          </div>
        )}
        {(isWeightStable || capturedWeight) && (
          <div className="text-xs text-transparent">
            &nbsp;
          </div>
        )}
      </div>
    </div>
  );
};