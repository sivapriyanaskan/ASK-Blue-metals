import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft, Loader2, XCircle, FileText, CheckCircle,
  User, Truck, Scale, Camera, Download, ImageOff,
} from 'lucide-react';
import { purchaseBillApi, type PurchaseBillRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';
const API_ORIGIN = new URL(API_BASE).origin;

const resolveImageSrc = (ref: string | null | undefined): string | null => {
  if (!ref) return null;
  if (ref.startsWith('data:') || ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  if (ref.startsWith('/')) return `${API_ORIGIN}${ref}`;
  return null;
};

const INR = (n: string | number) =>
  '\u20b9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INR0 = (n: string | number) =>
  '\u20b9' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtTon = (n: string | number) =>
  `${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} TON`;

const fmtDt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) : '-';

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; Icon: typeof CheckCircle }> = {
    DRAFT: { cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', Icon: FileText },
    POSTED: { cls: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle },
    CANCELLED: { cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle },
  };
  const { cls, Icon } = map[status] ?? { cls: 'bg-gray-50 text-gray-700 border-gray-200', Icon: FileText };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className="w-3.5 h-3.5" />{status}
    </span>
  );
};

const Field = ({ label, value, mono, valueClass }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  valueClass?: string;
}) => (
  <div>
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''} ${valueClass ?? ''}`}>{value ?? '-'}</div>
  </div>
);

const Card = ({
  icon: Icon, iconColor = 'text-gray-700', title, children, className = '',
}: {
  icon?: typeof FileText;
  iconColor?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-5 ${className}`}>
    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-base">
      {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
      {title}
    </h3>
    {children}
  </div>
);

const WeightTile = ({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color: 'blue' | 'gray' | 'orange' | 'green' }) => {
  const palette: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };
  const labelColor: Record<string, string> = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    orange: 'text-orange-600',
    green: 'text-green-600',
  };
  return (
    <div className={`border rounded-lg p-4 ${palette[color]}`}>
      <div className={`text-xs ${labelColor[color]} mb-1`}>{label}</div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}
    </div>
  );
};

const ImageBlock = ({ label, src, fallback }: { label: string; src: string | null; fallback?: string | null }) => (
  <div>
    <div className="text-xs text-gray-500 mb-2">{label}</div>
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {src ? (
          <a href={src} target="_blank" rel="noreferrer" className="w-full h-full">
            <img src={src} alt={label} className="w-full h-full object-contain" />
          </a>
        ) : (
          <div className="text-center text-gray-400 px-3">
            <ImageOff className="w-8 h-8 mx-auto mb-1" />
            <div className="text-[11px] font-mono">{fallback || 'No image'}</div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const SummaryLine = ({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-gray-600">{label}</span>
    <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
  </div>
);

export const PurchaseBillDetails = () => {
  const { id } = useParams();
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

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
      </div>
    );
  }
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!bill) return <div className="p-6 text-gray-500">Purchase bill not found.</div>;

  const grossAmount = Number(bill.grossAmount);
  const gstAmount = Number(bill.gstAmount);
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grossPayable = Number(bill.grossPayable);
  const roundOff = grossPayable - (grossAmount + gstAmount);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link to="/operations/purchase-bill" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to List
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Purchase Bill Details</h1>
            <StatusBadge status={bill.status} />
          </div>
          <p className="text-gray-600 text-sm">Purchase No: <span className="font-mono font-bold">{bill.purchaseNo}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" /> Download
          </button>
          {bill.status !== 'CANCELLED' && (
            <button onClick={() => setShowCancel(true)}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Posted banner */}
      {bill.status === 'POSTED' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-green-900">Purchase Bill Posted</div>
            <div className="text-sm text-green-800">This purchase bill has been finalized and posted to accounts.</div>
          </div>
        </div>
      )}

      {/* Cancelled banner */}
      {bill.status === 'CANCELLED' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-900">Purchase Bill Cancelled</div>
            {bill.cancelledReason && (
              <div className="text-sm text-red-800">{bill.cancelledReason}</div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          <Card icon={FileText} title="Bill Header">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Purchase No" value={<span className="font-mono">{bill.purchaseNo}</span>} />
              <Field label="Date/Time" value={fmtDt(bill.purchaseDateTime)} />
              <Field
                label="Pass No"
                value={
                  bill.entryPass ? (
                    <Link to={`/operations/purchase-entry-pass/${bill.entryPass.id}`}
                      className="text-blue-600 hover:underline font-mono">
                      {bill.passNoSnapshot || bill.entryPass.passNo} <span className="text-xs">→</span>
                    </Link>
                  ) : (bill.passNoSnapshot ? <span className="font-mono">{bill.passNoSnapshot}</span> : '-')
                }
              />
              <Field label="Entry Pass" value={bill.passNoSnapshot ? <span className="font-mono">{bill.passNoSnapshot}</span> : '-'} />
              <Field label="Work Centre" value={bill.workCentre?.name ?? '-'} />
              <Field label="Created By" value={bill.createdById} />
            </div>
          </Card>

          <Card icon={User} iconColor="text-purple-600" title="Supplier Details">
            <div className="space-y-3">
              <Field label="Supplier Name" value={bill.supplierNameSnapshot} />
              {bill.supplier?.address && <Field label="Address" value={bill.supplier.address} />}
              {bill.supplier?.gstNumber && (
                <Field label="GST No" value={<span className="font-mono">{bill.supplier.gstNumber}</span>} />
              )}
              {bill.supplier?.phone && <Field label="Phone" value={bill.supplier.phone} />}
            </div>
          </Card>

          <Card icon={Truck} iconColor="text-emerald-600" title="Vehicle & Driver">
            <div className="grid grid-cols-3 gap-5">
              <Field label="Vehicle No" value={bill.vehicleNoSnapshot} mono />
              <Field label="Driver Name" value={bill.driverNameSnapshot || '-'} />
              <Field label="Item" value={bill.itemNameSnapshot} />
            </div>
          </Card>

          <Card icon={Scale} iconColor="text-orange-600" title="Weight Capture (Exit)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <WeightTile color="blue" label="Load Weight" value={fmtTon(bill.loadWeight)} sub="Entry Gate" />
              <WeightTile color="gray" label="Last Empty" value={fmtTon(bill.emptyWeight)} sub="Reference" />
              <WeightTile color="orange" label="Empty Weight" value={fmtTon(bill.emptyWeight)} sub="Exit Gate" />
              <WeightTile color="green" label="Net Weight" value={fmtTon(bill.netWeight)} sub="Computed" />
            </div>
            <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between flex-wrap gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Weighbridge Reading ID:</div>
                <div className="text-xs text-gray-500">Captured At:</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-gray-700">{`WB_${bill.id.slice(-12)}`}</div>
                <div className="text-xs text-gray-700">{fmtDt(bill.purchaseDateTime)}</div>
              </div>
            </div>
          </Card>

          <Card title="Bill Calculation">
            <div className="grid grid-cols-2 gap-5 mb-4">
              <Field label="Rate / Ton" value={INR(bill.rate)} />
              <Field label="GST %" value={`${Number(bill.gstPercent).toFixed(2)}%`} />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Gross Amount" value={INR(grossAmount)} />
              <Field label="GST Amount" value={INR(gstAmount)} />
              <Field label="Net Weight" value={fmtTon(bill.netWeight)} />
              <Field
                label="Gross Payable"
                value={INR(grossPayable)}
                valueClass="text-lg text-green-700"
              />
            </div>
          </Card>

          <Card title="Payment Details">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Payment Mode" value={<span className="font-bold">{bill.paymentMode}</span>} />
              <Field label="Gross Payable" value={INR(grossPayable)} />
              <Field label="Paid Amount" value={INR0(0)} />
              <Field
                label="Balance To Receive"
                value={<span className="text-red-600 font-bold">{INR(grossPayable)}</span>}
              />
            </div>
          </Card>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="space-y-5">
          <Card title="Bill Summary">
            <div className="space-y-1 divide-y divide-gray-100">
              <SummaryLine label="Gross Amount" value={INR(grossAmount)} />
              <SummaryLine label="CGST" value={INR(cgst)} />
              <SummaryLine label="SGST" value={INR(sgst)} />
              <SummaryLine label="Round Off" value={INR(roundOff)} />
            </div>
            <div className="mt-3 pt-3 border-t-2 border-gray-300 flex items-center justify-between">
              <span className="text-base font-bold text-gray-900">Gross Payable</span>
              <span className="text-2xl font-bold text-green-600">{INR0(grossPayable)}</span>
            </div>
          </Card>

          <Card icon={Camera} iconColor="text-gray-700" title="Captured Images">
            <div className="space-y-4">
              <ImageBlock
                label="ANPR Image"
                src={resolveImageSrc(bill.anprImageRef ?? bill.entryPass?.anprImageRef)}
                fallback={bill.entryPass?.anprNumberPlateText || bill.vehicleNoSnapshot}
              />
              <ImageBlock
                label="Load Image"
                src={resolveImageSrc(bill.loadImageRef ?? bill.entryPass?.loadImageRef)}
              />
            </div>
          </Card>

          <Card title="System Fields">
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-gray-500">Bill ID</div>
                <div className="font-mono text-gray-700 break-all">{bill.id}</div>
              </div>
              <div className="pt-3 border-t">
                <div className="text-gray-500">Created By</div>
                <div className="font-semibold text-sm">{bill.createdById}</div>
                <div className="text-gray-500 mt-0.5">{fmtDt(bill.createdAt)}</div>
              </div>
              <div className="pt-3 border-t">
                <div className="text-gray-500">Updated By</div>
                <div className="font-semibold text-sm">{bill.createdById}</div>
                <div className="text-gray-500 mt-0.5">{fmtDt(bill.updatedAt)}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel modal */}
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
              <button onClick={() => { setShowCancel(false); setReason(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Keep</button>
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
