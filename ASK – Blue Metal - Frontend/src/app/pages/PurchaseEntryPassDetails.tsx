import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, XCircle, CheckCircle, Clock } from 'lucide-react';
import { purchaseEntryPassApi, type PurchaseEntryPassRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';

const fmtDt = (s: string) => s ? new Date(s).toLocaleString('en-IN') : '-';
const fmtWt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 3 }) + ' T';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-800',
    BILLED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  const Icon = status === 'BILLED' ? CheckCircle : status === 'CANCELLED' ? XCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium \${map[status] ?? 'bg-gray-100 text-gray-800'}`}>
      <Icon className="w-3.5 h-3.5" />{status}
    </span>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value ?? '-'}</div>
  </div>
);

export const PurchaseEntryPassDetails = () => {
  const { id } = useParams();
  const [pass, setPass] = useState<PurchaseEntryPassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    purchaseEntryPassApi.get(id)
      .then(setPass)
      .catch(e => setError(describeError(e, 'Failed to load entry pass')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await purchaseEntryPassApi.cancel(id);
      setPass(p => p ? { ...p, status: 'CANCELLED' } : p);
      setShowCancel(false);
    } catch (e) {
      setError(describeError(e, 'Cancel failed'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!pass) return <div className="p-6 text-gray-500">Entry pass not found.</div>;

  return (
    <div className="p-6">
      <Link to="/operations/purchase-entry-pass" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Entry Passes
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Entry Pass Details</h1>
            <StatusBadge status={pass.status} />
          </div>
          <p className="text-gray-600 text-sm">Pass No: <span className="font-mono font-bold">{pass.passNo}</span></p>
        </div>
        {pass.status === 'OPEN' && (
          <button onClick={() => setShowCancel(true)}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4" /> Cancel Pass
          </button>
        )}
      </div>

      {/* Hardware Components Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-1">
          <WeighbridgeDisplay
            externalCapturedWeight={Number(pass.loadWeight) * 1000}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="ANPR Camera"
            externalCaptured={true}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="Load Camera"
            externalCaptured={true}
          />
        </div>
        <div className="col-span-1">
          <BarrierControl
            externalStatus="Closed"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Pass Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Pass No" value={pass.passNo} />
            <Row label="Date & Time" value={fmtDt(pass.passDateTime)} />
            <Row label="Status" value={<StatusBadge status={pass.status} />} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Supplier & Vehicle</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Supplier" value={pass.supplierNameSnapshot} />
            <Row label="Vehicle No" value={<span className="font-mono">{pass.vehicleNoSnapshot}</span>} />
            <Row label="Driver Name" value={pass.driverNameSnapshot || '-'} />
            <Row label="Item" value={pass.itemNameSnapshot} />
            <Row label="Load Weight" value={fmtWt(pass.loadWeight)} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Audit</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Created At" value={fmtDt(pass.createdAt)} />
            <Row label="Updated At" value={fmtDt(pass.updatedAt)} />
          </div>
        </div>
      </div>

      {showCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Cancel Entry Pass</h3>
            <p className="text-sm text-gray-600">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCancel(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Keep</button>
              <button onClick={handleCancel} disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />} Cancel Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseEntryPassDetails;
