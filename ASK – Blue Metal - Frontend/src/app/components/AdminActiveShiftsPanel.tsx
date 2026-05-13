import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { shiftApi, type ShiftRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

interface Props {
  /** Page heading. */
  title?: string;
  /** Sub-heading. */
  subtitle?: string;
  /** Action button label (defaults to "View / Close"). */
  actionLabel?: string;
  /**
   * Where the action button should send the admin. Receives the shift id;
   * defaults to the shift-close screen with `?shiftId=` so the admin can
   * inspect totals/denominations and close the shift on behalf of the user.
   */
  buildActionHref?: (shiftId: string) => string;
}

export const AdminActiveShiftsPanel = ({
  title = 'Active Shifts',
  subtitle = 'Currently logged-in operators with an open shift',
  actionLabel = 'View / Close',
  buildActionHref = (id) => `/shift-management/shift-close?shiftId=${id}`,
}: Props) => {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await shiftApi.list({ status: 'OPEN', pageSize: 100 });
      setShifts(res.items);
    } catch (err) {
      setError(describeError(err, 'Failed to load active shifts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Shift No</th>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Opened At</th>
              <th className="px-4 py-3 text-right">Opening Amount</th>
              <th className="px-4 py-3 text-right">Cash In Hand (Live)</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && shifts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No active shifts at the moment.
                </td>
              </tr>
            )}
            {!loading &&
              shifts.map((s) => {
                const live = Array.isArray(s.liveDenominations)
                  ? s.liveDenominations.reduce(
                      (acc, d) => acc + Number(d.amount || 0),
                      0,
                    )
                  : Number(s.openingAmount) || 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{s.shiftNo}</td>
                    <td className="px-4 py-3">{s.openedBySnapshot}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(s.openedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₹{Number(s.openingAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₹{live.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(buildActionHref(s.id))}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        {actionLabel}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
