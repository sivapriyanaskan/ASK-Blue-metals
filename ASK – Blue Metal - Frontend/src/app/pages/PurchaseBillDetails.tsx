import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, Loader2, XCircle, FileText, CheckCircle } from 'lucide-react';
import { purchaseBillApi, type PurchaseBillRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';
import { BarrierControl } from '../components/BarrierControl';

const INR = (n: string | number) => '\u20b9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWt = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 3 }) + ' T';
const fmtDt = (s: string) => s ? new Date(s).toLocaleString('en-IN') : '-';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    POSTED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  const Icon = status === 'POSTED' ? CheckCircle : status === 'CANCELLED' ? XCircle : FileText;
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

export const PurchaseBillDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState<PurchaseBillRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    purchaseBillApi.get(id)
      .then(setBill)
      .catch(e => setError(describeError(e, 'Failed to load purchase bill')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!id || !reason.trim()) return;
    setCancelling(true);
    try {
      await purchaseBillApi.cancel(id);
      setBill(b => b ? { ...b, status: 'CANCELLED' } : b);
      setShowCancel(false);
    } catch (e) {
      setError(describeError(e, 'Cancel failed'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!bill) return <div className="p-6 text-gray-500">Purchase bill not found.</div>;

  const netWeight = Number(bill.netWeight);
  const grossAmount = Number(bill.grossAmount);
  const gstAmount = Number(bill.gstAmount);
  const grossPayable = Number(bill.grossPayable);

  return (
    <div className="p-6">
      <Link to="/operations/purchase-bill" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Purchase Bills
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Purchase Bill Details</h1>
            <StatusBadge status={bill.status} />
          </div>
          <p className="text-gray-600 text-sm">Bill No: <span className="font-mono font-bold">{bill.purchaseNo}</span></p>
        </div>
        {bill.status !== 'CANCELLED' && (
          <button onClick={() => setShowCancel(true)}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4" /> Cancel Bill
          </button>
        )}
      </div>

      {/* Hardware Components Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="col-span-1">
          <WeighbridgeDisplay
            externalCapturedWeight={Number(bill.emptyWeight) * 1000}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="Front Camera"
            externalCaptured={true}
          />
        </div>
        <div className="col-span-1">
          <CameraCapture
            label="Top Camera"
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
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Bill Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Bill No" value={bill.purchaseNo} />
            <Row label="Date & Time" value={fmtDt(bill.purchaseDateTime)} />
            <Row label="Status" value={<StatusBadge status={bill.status} />} />
            <Row label="Payment Mode" value={bill.paymentMode} />
            {bill.passNoSnapshot && <Row label="Entry Pass No" value={bill.passNoSnapshot} />}
          </div>
        </div>

        {/* Supplier & Vehicle */}
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Supplier & Vehicle</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Supplier" value={bill.supplierNameSnapshot} />
            <Row label="Vehicle No" value={<span className="font-mono">{bill.vehicleNoSnapshot}</span>} />
            <Row label="Work Centre" value={bill.workCentreId} />
            <Row label="Item" value={bill.itemNameSnapshot} />
          </div>
        </div>

        {/* Weight & Amounts */}
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Weight & Billing</h3>
          <div className="grid grid-cols-4 gap-4">
            <Row label="Load Weight" value={fmtWt(bill.loadWeight)} />
            <Row label="Empty Weight" value={fmtWt(bill.emptyWeight)} />
            <Row label="Net Weight" value={<span className="font-semibold text-blue-700">{fmtWt(netWeight)}</span>} />
            <Row label="Rate / Ton" value={INR(bill.rate)} />
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
            <Row label="Gross Amount" value={INR(grossAmount)} />
            <Row label="GST ({bill.gstPercent}%)" value={INR(gstAmount)} />
            <Row label="Gross Payable" value={<span className="text-lg font-bold text-green-700">{INR(grossPayable)}</span>} />
          </div>
        </div>

        {/* Audit */}
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Audit</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Created At" value={fmtDt(bill.createdAt)} />
            <Row label="Updated At" value={fmtDt(bill.updatedAt)} />
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Cancel Purchase Bill</h3>
            <p className="text-sm text-gray-600">This action cannot be undone.</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
              placeholder="Reason for cancellation (required)"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowCancel(false); setReason(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Keep</button>
              <button onClick={handleCancel} disabled={!reason.trim() || cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />} Cancel Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseBillDetails;
