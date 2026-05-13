import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft, Loader2, XCircle, CheckCircle, Clock,
  FileText, Truck, Package, Scale, Receipt, Camera,
  Printer, Info, ImageOff,
} from 'lucide-react';
import { purchaseEntryPassApi, type PurchaseEntryPassRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';
const API_ORIGIN = new URL(API_BASE, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').origin;

const resolveImageSrc = (ref: string | null | undefined): string | null => {
  if (!ref) return null;
  if (ref.startsWith('data:') || ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  if (ref.startsWith('/')) return `${API_ORIGIN}${ref}`;
  return null;
};

const fmtDt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) : '-';

const fmtWt = (n: string | number) => `${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} TON`;

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { cls: string; Icon: typeof CheckCircle }> = {
    OPEN: { cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Clock },
    BILLED: { cls: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle },
    CANCELLED: { cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle },
  };
  const { cls, Icon } = map[status] ?? { cls: 'bg-gray-50 text-gray-700 border-gray-200', Icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className="w-3.5 h-3.5" />{status}
    </span>
  );
};

const Field = ({ label, value, mono, sub }: { label: string; value: React.ReactNode; mono?: boolean; sub?: React.ReactNode }) => (
  <div>
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value ?? '-'}</div>
    {sub && <div className="text-[11px] font-mono text-gray-500 mt-0.5">{sub}</div>}
  </div>
);

const Card = ({ icon: Icon, title, children, className = '' }: { icon?: typeof FileText; title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-5 ${className}`}>
    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-base">
      {Icon && <Icon className="w-4 h-4 text-gray-700" />}
      {title}
    </h3>
    {children}
  </div>
);

const ImageTile = ({ label, src, plate, capturedAt }: {
  label: string;
  src: string | null;
  plate?: string | null;
  capturedAt?: string | null;
}) => (
  <div>
    <div className="text-xs text-gray-500 mb-2">{label}</div>
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {src ? (
          <a href={src} target="_blank" rel="noreferrer" className="w-full h-full">
            <img src={src} alt={label} className="w-full h-full object-contain" />
          </a>
        ) : (
          <div className="text-center text-gray-400">
            <ImageOff className="w-10 h-10 mx-auto mb-1" />
            <div className="text-xs">{label}</div>
          </div>
        )}
      </div>
    </div>
    <div className="mt-2 space-y-0.5">
      {plate && <div className="text-[11px] text-gray-600">Plate: <span className="font-mono font-semibold">{plate}</span></div>}
      {capturedAt && <div className="text-[11px] text-gray-500">Captured: {fmtDt(capturedAt)}</div>}
    </div>
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

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading...
      </div>
    );
  }
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!pass) return <div className="p-6 text-gray-500">Entry pass not found.</div>;

  const linkedBill = pass.bills?.[0];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back */}
      <Link to="/operations/purchase-entry-pass"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to List
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Entry Pass Details</h1>
            <StatusBadge status={pass.status} />
          </div>
          <p className="text-gray-600 text-sm">Pass No: <span className="font-mono font-bold">{pass.passNo}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          {pass.status === 'OPEN' && (
            <button onClick={() => setShowCancel(true)}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Cancel Pass
            </button>
          )}
        </div>
      </div>

      {/* Billed banner */}
      {pass.status === 'BILLED' && linkedBill && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-green-900">Entry Pass Billed</div>
              <div className="text-sm text-green-800">This entry pass has been converted to a purchase bill. Editing is locked.</div>
            </div>
          </div>
          <Link to={`/operations/purchase-bill/${linkedBill.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Receipt className="w-4 h-4" /> View Purchase Bill
          </Link>
        </div>
      )}

      {/* Cancelled banner */}
      {pass.status === 'CANCELLED' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-900">Entry Pass Cancelled</div>
            <div className="text-sm text-red-800">This entry pass has been cancelled and cannot be billed.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-5">
          <Card icon={FileText} title="Entry Pass Information">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Entry Pass No" value={<span className="font-mono">{pass.passNo}</span>} />
              <Field label="Pass Date/Time" value={fmtDt(pass.passDateTime)} />
              <Field label="Status" value={<StatusBadge status={pass.status} />} />
              <Field label="Work Centre"
                value={pass.workCentre?.name ?? '-'}
                sub={pass.workCentre?.code ? `ID: ${pass.workCentre.code}` : null} />
            </div>
          </Card>

          <Card icon={Truck} title="Supplier & Vehicle Details">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Supplier"
                value={pass.supplierNameSnapshot}
                sub={pass.supplier?.code ? `ID: ${pass.supplier.code}` : null} />
              <Field label="Vehicle Number" value={pass.vehicleNoSnapshot} mono />
              <Field label="Driver Name" value={pass.driverNameSnapshot || '-'} />
              <Field label="Driver Mobile" value={pass.driverMobile ? `+91 ${pass.driverMobile}` : '-'} />
            </div>
          </Card>

          <Card icon={Package} title="Item Details">
            <div className="grid grid-cols-2 gap-5">
              <Field label="Raw Material Item"
                value={pass.itemNameSnapshot}
                sub={pass.item?.code ? `ID: ${pass.item.code}` : null} />
              <div>
                <div className="text-xs text-gray-500 mb-1">Purchase Unit</div>
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">TON</span>
              </div>
            </div>
          </Card>

          <Card icon={Scale} title="Weight Details">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-xs text-gray-500 mb-1">Load Weight</div>
                <div className="text-2xl font-bold text-green-600">{fmtWt(pass.loadWeight)}</div>
              </div>
              <div>
                <Field label="Captured At" value={fmtDt(pass.passDateTime)} />
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-3 h-3" /> Weight Captured
                </span>
              </div>
            </div>
          </Card>

          {pass.crRefNo && (
            <Card icon={FileText} title="Credit Reference">
              <Field label="CR Reference No"
                value={<span className="text-red-600 font-mono font-semibold">{pass.crRefNo}</span>} />
            </Card>
          )}

          <Card icon={Camera} title="Camera Captures">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ImageTile
                label="ANPR Camera"
                src={resolveImageSrc(pass.anprImageRef)}
                plate={pass.anprNumberPlateText || pass.vehicleNoSnapshot}
                capturedAt={pass.passDateTime}
              />
              <ImageTile
                label="Load Camera"
                src={resolveImageSrc(pass.loadImageRef)}
                capturedAt={pass.passDateTime}
              />
            </div>
          </Card>

          {linkedBill && (
            <Card icon={Receipt} title="Linked Purchase Bill">
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div className="text-xs text-gray-600">Purchase Bill No</div>
                  <div className="font-mono font-bold text-blue-700">{linkedBill.purchaseNo}</div>
                </div>
                <Link to={`/operations/purchase-bill/${linkedBill.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  View Bill
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Right: side panel */}
        <div className="space-y-5">
          <Card icon={Info} title="System Information">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500">Created By</div>
                <div className="text-sm font-semibold">{pass.createdById}</div>
                <div className="text-[11px] text-gray-500">{fmtDt(pass.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Last Updated</div>
                <div className="text-[11px] text-gray-500">{fmtDt(pass.updatedAt)}</div>
              </div>
              <div className="pt-3 border-t">
                <div className="text-xs text-gray-500">
                  <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">Internal</span> ID
                </div>
                <div className="text-[11px] font-mono text-gray-600 break-all mt-1">{pass.id}</div>
              </div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <button onClick={() => window.print()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <Printer className="w-4 h-4" /> Print Entry Pass
            </button>
          </Card>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-amber-900 mb-1">Entry Pass Information</div>
                <ul className="text-amber-800 space-y-0.5 list-disc ml-4">
                  <li>All fields are read-only in view mode</li>
                  <li>Edit restricted to OPEN status only</li>
                  <li>Audit logs tracked for all changes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="font-semibold text-lg">Cancel Entry Pass</h3>
            <p className="text-sm text-gray-600">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCancel(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Keep</button>
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
