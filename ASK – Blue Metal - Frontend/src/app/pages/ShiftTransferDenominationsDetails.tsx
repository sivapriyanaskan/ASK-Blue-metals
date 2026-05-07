import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, AlertCircle, Edit } from 'lucide-react';
import { shiftApi, type ShiftRow, type ShiftDenomination } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const parseId = (raw: string | undefined): string | null => {
  if (!raw) return null;
  const [shiftId] = decodeURIComponent(raw).split(':');
  return shiftId || null;
};

export const ShiftTransferDenominationsDetails = () => {
  const { id } = useParams();
  const shiftId = parseId(id);
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shiftId) {
      setError('Invalid shift transfer id');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await shiftApi.get(shiftId);
        if (!cancelled) setShift(res);
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load shift transfer'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  const denoms: ShiftDenomination[] = (shift?.transferDenominations || []) as ShiftDenomination[];
  const totalAmount = denoms.reduce(
    (sum, d) => sum + (Number(d.amount) || Number(d.denomination) * Number(d.nos) || 0),
    0,
  );
  const totalNotes = denoms.reduce((sum, d) => sum + (Number(d.nos) || 0), 0);

  return (
    <div className="p-6">
      <Link
        to="/shift-management/transfer"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to List
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shift Transfer Denomination Details</h1>
        {shift && shift.status !== 'CLOSED' && (
          <Link
            to={`/shift-management/transfer/edit/${shift.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Edit className="w-4 h-4" /> Edit
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 max-w-lg rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
          Loading…
        </div>
      )}

      {shift && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Shift Reference</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Shift No</div>
                <div className="font-medium text-gray-900">{shift.shiftNo}</div>
              </div>
              <div>
                <div className="text-gray-500">Shift Date</div>
                <div className="font-medium text-gray-900">
                  {shift.shiftDate ? new Date(shift.shiftDate).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      shift.status === 'CLOSED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {shift.status === 'CLOSED' ? 'Transferred' : shift.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-gray-500">Opened By</div>
                <div className="font-medium text-gray-900">{shift.openedBySnapshot || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Closed By</div>
                <div className="font-medium text-gray-900">{shift.closedBySnapshot || '-'}</div>
              </div>
              <div>
                <div className="text-gray-500">Transfer Amount</div>
                <div className="font-semibold text-blue-600">
                  ₹{Number(shift.transferAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Denomination Details</h3>
            {denoms.length === 0 ? (
              <p className="text-sm text-gray-500">No denominations recorded for this shift.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Denomination</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">Nos</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {denoms.map((d, i) => {
                      const amount = Number(d.amount) || Number(d.denomination) * Number(d.nos) || 0;
                      return (
                        <tr key={i}>
                          <td className="px-4 py-2 font-medium">₹{d.denomination}</td>
                          <td className="px-4 py-2 text-right">{d.nos}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr className="font-bold">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right">{totalNotes}</td>
                      <td className="px-4 py-2 text-right text-blue-600">
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftTransferDenominationsDetails;

