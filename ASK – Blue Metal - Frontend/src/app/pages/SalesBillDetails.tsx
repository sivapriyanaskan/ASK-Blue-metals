import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowLeft, Loader2, Printer, X } from 'lucide-react';
import { salesBillApi, type SalesBillRow, type SalesBillStatus } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const STATUS_BADGE: Record<SalesBillStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  POSTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtMoney = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (s: string | number) => Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const SalesBillDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<SalesBillRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try { setRow(await salesBillApi.get(id)); }
    catch (err) { setError(describeError(err, 'Failed to load sales bill')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const onCancel = async () => {
    if (!id) return;
    if (reason.trim().length < 3) { setError('Cancellation reason is required (min 3 chars).'); return; }
    setActing(true); setError(null);
    try {
      await salesBillApi.cancel(id, reason.trim());
      setShowCancel(false);
      await load();
    } catch (err) { setError(describeError(err, 'Failed to cancel bill')); }
    finally { setActing(false); }
  };

  if (loading) return (
    <div className="p-6 flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading sales bill…
    </div>
  );

  if (!row) return (
    <div className="p-6 space-y-3">
      <button onClick={() => navigate('/operations/sales-bill')} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="text-muted-foreground">Bill not found.</div>
    </div>
  );

  const isTax = row.customer?.billType === 'TAX_INVOICE';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="print:hidden flex items-start justify-between gap-4 flex-wrap">
        <button onClick={() => navigate('/operations/sales-bill')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to bills
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded border ${STATUS_BADGE[row.status]}`}>{row.status}</span>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input hover:bg-muted text-sm">
            <Printer className="h-4 w-4" /> Print
          </button>
          {row.status === 'POSTED' && (
            <button type="button" onClick={() => setShowCancel(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-destructive text-destructive hover:bg-destructive/10 text-sm">
              <X className="h-4 w-4" /> Cancel bill
            </button>
          )}
        </div>
      </div>

      {error && <div className="print:hidden text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      <div className="border rounded-md bg-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{isTax ? 'Tax Invoice' : 'Bill of Supply'}</div>
            <h1 className="text-2xl font-semibold">{row.billNo}</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>Date: {fmtDate(row.billDate)}</div>
            {row.token && <div>Token: <Link to={`/operations/token/${row.token.id}`} className="text-primary hover:underline">{row.token.tokenNo}</Link> · Entry {row.token.entryNo}</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Bill to</div>
            <div className="font-medium">{row.customer?.name}</div>
            {row.customer?.gstNumber && <div>GSTIN: {row.customer.gstNumber}</div>}
          </div>
          <div>
            <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Vehicle & Driver</div>
            <div className="font-mono">{row.vehicleNo}</div>
            {row.driverName && <div>{row.driverName}{row.driverMobile ? ` · ${row.driverMobile}` : ''}</div>}
          </div>
        </div>

        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">HSN</th>
                <th className="px-3 py-2 font-medium text-right">Net Wt (T)</th>
                <th className="px-3 py-2 font-medium text-right">Rate ₹</th>
                <th className="px-3 py-2 font-medium text-right">Taxable ₹</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-3 py-2">{row.item?.code} — {row.item?.name}</td>
                <td className="px-3 py-2">{row.item?.hsnCode || '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNum(row.netWeight)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(row.rate)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(row.taxableAmount)}</td>
              </tr>
              <tr className="border-t bg-muted/20 text-xs">
                <td colSpan={5} className="px-3 py-2 text-muted-foreground">
                  Empty {fmtNum(row.emptyWeight)} kg · Gross {fmtNum(row.grossWeight)} kg · Net {fmtNum(row.netWeight)} kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="ml-auto max-w-sm space-y-1 text-sm">
          <Row label="Taxable" value={fmtMoney(row.taxableAmount)} />
          {Number(row.cgstAmount) > 0 && <Row label={`CGST (${fmtNum(row.cgstPercent)}%)`} value={fmtMoney(row.cgstAmount)} />}
          {Number(row.sgstAmount) > 0 && <Row label={`SGST (${fmtNum(row.sgstPercent)}%)`} value={fmtMoney(row.sgstAmount)} />}
          {Number(row.igstAmount) > 0 && <Row label={`IGST (${fmtNum(row.igstPercent)}%)`} value={fmtMoney(row.igstAmount)} />}
          {Number(row.tcsAmount) > 0 && <Row label={`TCS (${fmtNum(row.tcsPercent)}%)`} value={fmtMoney(row.tcsAmount)} />}
          {Number(row.roundOff) !== 0 && <Row label="Round off" value={fmtMoney(row.roundOff)} />}
          <div className="border-t pt-1">
            <Row label={<span className="font-semibold">Total ₹</span>} value={<span className="font-semibold">{fmtMoney(row.totalAmount)}</span>} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm border-t pt-4">
          <div>
            <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Payment</div>
            <div>Mode: {row.paymentMode}</div>
            {Number(row.cashAmount) > 0 && <div>Cash: ₹ {fmtMoney(row.cashAmount)}</div>}
            {Number(row.onlineAmount) > 0 && <div>Online: ₹ {fmtMoney(row.onlineAmount)}</div>}
            {Number(row.creditAmount) > 0 && <div>Credit: ₹ {fmtMoney(row.creditAmount)}</div>}
          </div>
          {row.remarks && (
            <div>
              <div className="text-xs uppercase font-medium text-muted-foreground tracking-wider mb-1">Remarks</div>
              <div>{row.remarks}</div>
            </div>
          )}
        </div>

        {row.cancelledReason && (
          <div className="border rounded-md bg-rose-50 border-rose-200 p-3 text-sm">
            <div className="font-medium text-rose-800">Cancelled</div>
            <div className="text-rose-700">{row.cancelledReason}</div>
          </div>
        )}
      </div>

      {showCancel && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-card rounded-md border shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold">Cancel Sales Bill</h2>
            <p className="text-sm text-muted-foreground">The associated token (if any) will return to OPEN.</p>
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Reason for cancellation (min 3 chars)"
              className="px-3 py-2 w-full rounded-md border border-input bg-background"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCancel(false); setReason(''); }} className="px-3 py-2 rounded-md border border-input hover:bg-muted text-sm">
                Keep bill
              </button>
              <button onClick={onCancel} disabled={acting}
                className="px-3 py-2 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 text-sm inline-flex items-center gap-2">
                {acting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Cancel bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return <div className="flex justify-between"><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}

export default SalesBillDetails;
