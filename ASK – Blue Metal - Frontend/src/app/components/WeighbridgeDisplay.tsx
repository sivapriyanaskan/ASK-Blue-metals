import { useEffect, useState } from 'react';
import { Scale, Activity, Pencil, Check, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface WeighbridgeDisplayProps {
  onWeightCapture?: (weight: number) => void;
  autoCapture?: boolean;
  externalCapturedWeight?: number | null;
  hideControls?: boolean;
  simulationMinWeight?: number;
  simulationMaxWeight?: number;
  /** Test-only: show a pencil to manually override the live reading. */
  allowTestEdit?: boolean;
}

export const WeighbridgeDisplay = ({
  onWeightCapture,
  autoCapture = false,
  externalCapturedWeight = null,
  hideControls = false,
  simulationMinWeight,
  simulationMaxWeight,
  allowTestEdit = false,
}: WeighbridgeDisplayProps) => {
  const { currentWeight, setCurrentWeight, isWeightStable, setIsWeightStable } = useAppContext();
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);
  const [manualWeight, setManualWeight] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Update internal captured weight when external weight is provided.
  // Treat null or 0 as "not captured yet" so that the simulation/auto-capture
  // can resume after the parent resets the weight (e.g. when a new entry pass
  // is selected).
  useEffect(() => {
    if (externalCapturedWeight === null || externalCapturedWeight === 0) {
      if (capturedWeight !== null) setCapturedWeight(null);
      return;
    }
    if (externalCapturedWeight !== capturedWeight) {
      setCapturedWeight(externalCapturedWeight);
    }
  }, [externalCapturedWeight]);

  useEffect(() => {
    // Simulate weighbridge weight fluctuation (test mode):
    // - slower updates
    // - constrained range, optionally driven by screen-provided bounds
    const interval = setInterval(() => {
      if (!capturedWeight && manualWeight === null) {
        // Default baseline empty weight is 7000kg, then show gross as +10..15 tons.
        const minWeight = Number.isFinite(simulationMinWeight as number) ? (simulationMinWeight as number) : 17000;
        const maxWeight = Number.isFinite(simulationMaxWeight as number) ? (simulationMaxWeight as number) : 22000;
        const safeMaxWeight = Math.max(minWeight, maxWeight);
        const baseWeight = minWeight + Math.random() * Math.max(safeMaxWeight - minWeight, 1);
        const fluctuation = Math.random() < 0.8 ? Math.random() * 20 : Math.random() * 60;
        const newWeight = Math.round(baseWeight + fluctuation);
        setCurrentWeight(newWeight);
        
        // Weight is stable if fluctuation is small
        const stable = fluctuation < 35;
        setIsWeightStable(stable);
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [capturedWeight, manualWeight, setCurrentWeight, setIsWeightStable, simulationMinWeight, simulationMaxWeight]);

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
          {allowTestEdit && !editing && (
            <button
              type="button"
              onClick={() => {
                setEditValue(String(manualWeight ?? currentWeight ?? ''));
                setEditing(true);
              }}
              title="Test: manually set weight"
              className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-100 text-[10px] inline-flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" /> TEST
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Activity className={`w-4 h-4 ${isWeightStable ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`} />
          <span className="text-xs">{isWeightStable ? 'Stable' : 'Fluctuating'}</span>
        </div>
      </div>

      <div className="bg-black/30 rounded-lg p-4 mb-3 flex-1 flex items-center justify-center">
        <div className="text-center w-full">
          {editing ? (
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const n = Math.round(Number(editValue));
                    if (Number.isFinite(n) && n >= 0) {
                      setManualWeight(n);
                      setCurrentWeight(n);
                      setIsWeightStable(true);
                      setCapturedWeight(null);
                    }
                    setEditing(false);
                  } else if (e.key === 'Escape') {
                    setEditing(false);
                  }
                }}
                className="w-40 px-3 py-2 rounded bg-white/10 border border-white/30 text-white text-3xl font-mono text-center"
              />
              <button
                type="button"
                onClick={() => {
                  const n = Math.round(Number(editValue));
                  if (Number.isFinite(n) && n >= 0) {
                    setManualWeight(n);
                    setCurrentWeight(n);
                    setIsWeightStable(true);
                    setCapturedWeight(null);
                  }
                  setEditing(false);
                }}
                className="p-2 rounded bg-green-600 hover:bg-green-700"
                aria-label="Apply"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="p-2 rounded bg-rose-600 hover:bg-rose-700"
                aria-label="Cancel edit"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-6xl font-bold font-mono tracking-wider mb-1 leading-none">
                {capturedWeight !== null ? capturedWeight : (manualWeight !== null ? manualWeight : currentWeight)}
              </div>
              <div className="text-sm text-blue-200">
                KG
                {manualWeight !== null && (
                  <button
                    type="button"
                    onClick={() => { setManualWeight(null); setCapturedWeight(null); }}
                    className="ml-2 text-[10px] underline text-amber-200"
                  >
                    clear test
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!hideControls && (
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
      )}
    </div>
  );
};