import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { cashVoucherApi, type CashVoucherRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const INR = (n: string | number) => '\u20b9' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDt = (s: string) => s ? new Date(s).toLocaleString('en-IN') : '-';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  POSTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value ?? '-'}</div>
  </div>
);

export const CashVoucherDetails = () => {
  const { id } = useParams();
  const [voucher, setVoucher] = useState<CashVoucherRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    cashVoucherApi.get(id)
      .then(setVoucher)
      .catch(e => setError(describeError(e, 'Failed to load cash voucher')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!voucher) return <div className="p-6 text-gray-500">Cash voucher not found.</div>;

  return (
    <div className="p-6">
      <Link to="/cash-voucher" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Cash Vouchers
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Cash Voucher Details</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium \${statusColor[voucher.status] ?? 'bg-gray-100 text-gray-800'}`}>
              {voucher.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm">Voucher No: <span className="font-mono font-bold">{voucher.voucherNo}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          {voucher.status === 'DRAFT' && (
            <Link to={`/cash-voucher/edit/\${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Voucher Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <Row label="Voucher No" value={voucher.voucherNo} />
            <Row label="Voucher Type" value={voucher.voucherType} />
            <Row label="Doc Date" value={fmtDt(voucher.docDate)} />
            <Row label="Payment Mode" value={voucher.paymentMode} />
            <Row label="Prepared By" value={voucher.preparedBySnapshot} />
            <Row label="Total Amount" value={<span className="text-green-700 font-bold text-base">{INR(voucher.totalAmount)}</span>} />
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Line Items</h3>
          {voucher.lines.length === 0 ? (
            <p className="text-gray-400 text-sm">No line items</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left px-3 py-2">Sl</th>
                  <th className="text-left px-3 py-2">Account Head</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {voucher.lines.map((line, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2">{line.slNo}</td>
                    <td className="px-3 py-2">{line.accountHeadNameSnapshot}</td>
                    <td className="px-3 py-2 text-gray-600">{line.description || '-'}</td>
                    <td className="px-3 py-2 text-right">{INR(line.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-gray-50">
                  <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                  <td className="px-3 py-2 text-right text-green-700">{INR(voucher.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Audit</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Created At" value={fmtDt(voucher.createdAt)} />
            <Row label="Updated At" value={fmtDt(voucher.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashVoucherDetails;
