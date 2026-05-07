import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { shiftApi, type ShiftRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const INR = (n: string | number) => '\u20b9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDt = (s: string | null) => s ? new Date(s).toLocaleString('en-IN') : '-';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value ?? '-'}</div>
  </div>
);

export const ShiftManagementDetails = () => {
  const { id } = useParams();
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    shiftApi.get(id)
      .then(setShift)
      .catch(e => setError(describeError(e, 'Failed to load shift')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!shift) return <div className="p-6 text-gray-500">Shift not found.</div>;

  return (
    <div className="p-6">
      <Link to="/shift-management" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Shifts
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Shift Details</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium \${shift.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {shift.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm">Shift No: <span className="font-mono font-bold">{shift.shiftNo}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Shift Opening</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Shift No" value={shift.shiftNo} />
            <Row label="Shift Date" value={shift.shiftDate} />
            <Row label="Opened At" value={fmtDt(shift.openedAt)} />
            <Row label="Opened By" value={shift.openedBySnapshot} />
            <Row label="Opening Amount" value={INR(shift.openingAmount)} />
            <Row label="Status" value={shift.status} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Financial Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Total Cash Received" value={INR(shift.totalCashReceived)} />
            <Row label="Net Amount" value={INR(shift.netAmount)} />
            <Row label="Cash In Hand" value={<span className="text-green-700 font-semibold">{INR(shift.cashInHand)}</span>} />
          </div>
        </div>

        {shift.status === 'CLOSED' && (
          <div className="bg-white rounded-lg border border-gray-300 p-5">
            <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Shift Closing</h3>
            <div className="grid grid-cols-2 gap-4">
              <Row label="Closed At" value={fmtDt(shift.closedAt)} />
              <Row label="Closed By" value={shift.closedBySnapshot} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Audit</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Created At" value={fmtDt(shift.createdAt)} />
            <Row label="Updated At" value={fmtDt(shift.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftManagementDetails;
