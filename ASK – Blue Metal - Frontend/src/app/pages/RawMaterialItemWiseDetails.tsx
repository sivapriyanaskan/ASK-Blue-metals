import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { rawMaterialEntryApi, type RawMaterialEntryRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmtTonn = (n: string | number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 3 }) + ' T';
const fmtDt = (s: string) => s ? new Date(s).toLocaleString('en-IN') : '-';

const statusColor: Record<string, string> = {
  SAVED: 'bg-yellow-100 text-yellow-800',
  POSTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value ?? '-'}</div>
  </div>
);

export const RawMaterialItemWiseDetails = () => {
  const { id } = useParams();
  const [entry, setEntry] = useState<RawMaterialEntryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    rawMaterialEntryApi.get(id)
      .then(setEntry)
      .catch(e => setError(describeError(e, 'Failed to load raw material entry')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!entry) return <div className="p-6 text-gray-500">Entry not found.</div>;

  const consumedPct = Number(entry.currentStockTonn) > 0
    ? ((Number(entry.consumedTonn) / Number(entry.currentStockTonn)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-6">
      <Link to="/production/item-wise" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Item-Wise List
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Package className="w-7 h-7 text-blue-600" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{entry.itemNameSnapshot}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium \${statusColor[entry.status] ?? 'bg-gray-100 text-gray-800'}`}>
              {entry.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm">Entry No: <span className="font-mono font-bold">{entry.entryNo}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Entry Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Entry No" value={entry.entryNo} />
            <Row label="Entry Date & Time" value={fmtDt(entry.entryDateTime)} />
            <Row label="Item" value={entry.itemNameSnapshot} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Stock Summary</h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-600 mb-1 font-medium">Current Stock</div>
              <div className="text-2xl font-bold text-blue-700">{fmtTonn(entry.currentStockTonn)}</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-xs text-orange-600 mb-1 font-medium">Consumed ({consumedPct}%)</div>
              <div className="text-2xl font-bold text-orange-700">{fmtTonn(entry.consumedTonn)}</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs text-green-600 mb-1 font-medium">Closing Stock</div>
              <div className="text-2xl font-bold text-green-700">{fmtTonn(entry.closingStockTonn)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Audit</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Created At" value={fmtDt(entry.createdAt)} />
            <Row label="Updated At" value={fmtDt(entry.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawMaterialItemWiseDetails;
