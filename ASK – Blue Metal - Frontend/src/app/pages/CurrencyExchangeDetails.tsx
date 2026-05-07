import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { currencyExchangeApi, type CurrencyExchangeRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const INR = (n: string | number) => '\u20b9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDt = (s: string) => s ? new Date(s).toLocaleString('en-IN') : '-';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value ?? '-'}</div>
  </div>
);

export const CurrencyExchangeDetails = () => {
  const { id } = useParams();
  const [exchange, setExchange] = useState<CurrencyExchangeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    currencyExchangeApi.get(id)
      .then(setExchange)
      .catch(e => setError(describeError(e, 'Failed to load currency exchange')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!exchange) return <div className="p-6 text-gray-500">Currency exchange not found.</div>;

  const isBalanced = Number(exchange.totalAmountPaid) === Number(exchange.totalAmountReceived);

  return (
    <div className="p-6">
      <Link to="/currency-exchange" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Currency Exchanges
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Currency Exchange Details</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium \${
              exchange.status === 'CLOSED' ? 'bg-green-100 text-green-800'
              : exchange.status === 'CANCELLED' ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
            }`}>{exchange.status}</span>
          </div>
          <p className="text-gray-600 text-sm">Entry No: <span className="font-mono font-bold">{exchange.entryNo}</span></p>
        </div>
        {isBalanced && (
          <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
            Balanced
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Exchange Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Entry No" value={exchange.entryNo} />
            <Row label="Date & Time" value={fmtDt(exchange.billDateTime)} />
            <Row label="Status" value={exchange.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Cash OUT (paid out) */}
          <div className="bg-white rounded-lg border border-gray-300 p-5">
            <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">
              Cash Given Out
            </h3>
            {exchange.outDetails.length === 0 ? (
              <p className="text-gray-400 text-sm">No denominations</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="text-left pb-2">Denomination</th>
                    <th className="text-right pb-2">Nos</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {exchange.outDetails.map((d, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5">₹{d.denomination}</td>
                      <td className="py-1.5 text-right">{d.nos}</td>
                      <td className="py-1.5 text-right">{INR(d.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td colSpan={2} className="pt-2">Total</td>
                    <td className="pt-2 text-right text-blue-700">{INR(exchange.totalAmountPaid)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Cash IN (received) */}
          <div className="bg-white rounded-lg border border-gray-300 p-5">
            <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">
              Cash Received In
            </h3>
            {exchange.inDetails.length === 0 ? (
              <p className="text-gray-400 text-sm">No denominations</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b">
                    <th className="text-left pb-2">Denomination</th>
                    <th className="text-right pb-2">Nos</th>
                    <th className="text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {exchange.inDetails.map((d, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5">₹{d.denomination}</td>
                      <td className="py-1.5 text-right">{d.nos}</td>
                      <td className="py-1.5 text-right">{INR(d.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td colSpan={2} className="pt-2">Total</td>
                    <td className="pt-2 text-right text-green-700">{INR(exchange.totalAmountReceived)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Audit</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Created At" value={fmtDt(exchange.createdAt)} />
            <Row label="Updated At" value={fmtDt(exchange.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyExchangeDetails;
