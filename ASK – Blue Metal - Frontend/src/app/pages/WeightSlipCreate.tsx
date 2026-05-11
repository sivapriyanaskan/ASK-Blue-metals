import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save, Loader2, Scale, Printer } from 'lucide-react';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { weightSlipApi, type WeightSlipRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { useAppContext } from '../context/AppContext';

const COMPANY_NAME = 'Ask M Sand';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const fmtWeight = (kg: number | string) =>
  Number(kg).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

export const printWeightSlip = (slip: WeightSlipRow) => {
  const capturedAt = slip.capturedAt ? new Date(slip.capturedAt) : new Date();
  const month = capturedAt.toLocaleString('en-GB', { month: 'short' });
  const dateText = `${String(capturedAt.getDate()).padStart(2, '0')}/${month}/${capturedAt.getFullYear()}`;
  const timeText = capturedAt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Weight Slip ${escapeHtml(slip.slipNo)}</title>
    <style>
      @page { size: 80mm 100mm; margin: 4mm; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Times New Roman", Times, serif;
        color: #111;
        font-size: 14px;
        line-height: 1.3;
      }
      .slip { width: 72mm; }
      .header {
        text-align: center;
        padding-bottom: 8px;
        margin-bottom: 12px;
        border-bottom: 1px dashed #555;
      }
      .company {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.3px;
      }
      .subtitle {
        font-size: 11px;
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
      }
      .label { color: #555; }
      .weight-box {
        margin: 12px 0;
        padding: 14px 6px;
        border: 2px solid #111;
        text-align: center;
        border-radius: 4px;
      }
      .weight-value {
        font-size: 30px;
        font-weight: 800;
        font-family: "Courier New", monospace;
        letter-spacing: 1px;
      }
      .weight-unit {
        font-size: 12px;
        margin-top: 2px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .footer {
        margin-top: 14px;
        text-align: center;
        font-size: 10px;
        color: #444;
        border-top: 1px dashed #555;
        padding-top: 6px;
      }
    </style>
  </head>
  <body>
    <div class="slip">
      <div class="header">
        <div class="company">${escapeHtml(COMPANY_NAME)}</div>
        <div class="subtitle">Weighment Slip</div>
      </div>
      <div class="row"><span class="label">Slip No</span><span><strong>${escapeHtml(slip.slipNo)}</strong></span></div>
      <div class="row"><span class="label">Date</span><span>${escapeHtml(dateText)}</span></div>
      <div class="row"><span class="label">Time</span><span>${escapeHtml(timeText)}</span></div>
      ${slip.vehicleNo ? `<div class="row"><span class="label">Vehicle</span><span>${escapeHtml(slip.vehicleNo)}</span></div>` : ''}
      <div class="weight-box">
        <div class="weight-value">${escapeHtml(fmtWeight(slip.weight))}</div>
        <div class="weight-unit">Kilograms</div>
      </div>
      <div class="footer">Thank you</div>
    </div>
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => { window.print(); }, 100);
      });
    </script>
  </body>
</html>`;

  const w = window.open('', '_blank', 'width=420,height=560');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
};

export const WeightSlipCreate = () => {
  const navigate = useNavigate();
  const { currentWeight, isWeightStable } = useAppContext();
  const [vehicleNo, setVehicleNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSlip, setLastSlip] = useState<WeightSlipRow | null>(null);

  const handleCapture = (kg: number) => {
    setCapturedWeight(kg);
  };

  const onSave = async () => {
    setError(null);
    const weightKg = capturedWeight ?? (isWeightStable ? currentWeight : 0);
    if (!weightKg || weightKg <= 0) {
      setError('Weight not captured yet. Please wait for a stable reading.');
      return;
    }
    setSaving(true);
    try {
      const created = await weightSlipApi.create({
        weight: weightKg,
        vehicleNo: vehicleNo.trim() || null,
        remarks: remarks.trim() || null,
      });
      setLastSlip(created);
      printWeightSlip(created);
    } catch (err) {
      setError(describeError(err, 'Failed to save weight slip'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 w-full max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/operations/token')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tokens
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Scale className="h-6 w-6 text-orange-600" />
          Create Weight Slip
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quick gate weighment — no item, no rate. Captures current weighbridge reading.
        </p>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-h-[280px]">
          <WeighbridgeDisplay
            onWeightCapture={handleCapture}
            autoCapture
            hideControls
            externalCapturedWeight={capturedWeight}
            simulationMinWeight={5000}
            simulationMaxWeight={25000}
            allowTestEdit
          />
        </div>

        <div className="bg-card border rounded-md p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vehicle No (optional)</label>
            <input
              type="text"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
              placeholder="e.g. TN65AB1234"
              className="w-full px-3 py-2 border border-input rounded-md bg-background font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Remarks (optional)</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Any notes..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
            <div className="text-xs text-orange-700 mb-1">Captured Weight</div>
            <div className="font-mono font-bold text-2xl text-orange-900">
              {capturedWeight !== null ? fmtWeight(capturedWeight) : '---'} KG
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {lastSlip && (
          <button
            type="button"
            onClick={() => printWeightSlip(lastSlip)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
          >
            <Printer className="h-4 w-4" /> Reprint last slip ({lastSlip.slipNo})
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save & Print Weight Slip
        </button>
      </div>
    </div>
  );
};

export default WeightSlipCreate;
