import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowLeft, Loader2, Receipt, X, Printer } from 'lucide-react';
import { tokenApi, type TokenRow, type TokenStatus } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const STATUS_BADGE: Record<TokenStatus, string> = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BILLED: 'bg-sky-50 text-sky-700 border-sky-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtNum = (s: string | number) => Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const TokenDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<TokenRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try { setRow(await tokenApi.get(id)); }
    catch (err) { setError(describeError(err, 'Failed to load token')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const onCancel = async () => {
    if (!id) return;
    if (reason.trim().length < 3) { setError('Cancellation reason is required (min 3 chars).'); return; }
    setActing(true); setError(null);
    try {
      await tokenApi.cancel(id, reason.trim());
      setShowCancel(false);
      await load();
    } catch (err) { setError(describeError(err, 'Failed to cancel token')); }
    finally { setActing(false); }
  };

  if (loading) return (
    <div className="p-6 flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading token…
    </div>
  );
  if (!row) return (
    <div className="p-6 space-y-3">
      <button onClick={() => navigate('/operations/token')} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="text-muted-foreground">Token not found.</div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/operations/token')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to tokens
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Token #{row.tokenNo}</h1>
          <p className="text-sm text-muted-foreground">Entry #{row.entryNo} · Created {fmtDate(row.tokenDateTime)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded border ${STATUS_BADGE[row.status]}`}>{row.status}</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          {row.status === 'OPEN' && (
            <>
              <Link
                to={`/operations/sales-bill/create?tokenId=${row.id}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm"
              >
                <Receipt className="h-4 w-4" /> Convert to Sales Bill
              </Link>
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-destructive text-destructive hover:bg-destructive/10 text-sm"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Customer">
          <Field label="Name" value={row.customer?.name} />
          <Field label="Code" value={row.customer?.code} />
          <Field label="Bill type" value={row.customer?.billType === 'TAX_INVOICE' ? 'Tax Invoice' : 'Non-GST'} />
          <Field label="GSTIN" value={row.customer?.gstNumber || '—'} />
        </Section>
        <Section title="Vehicle & Driver">
          <Field label="Vehicle #" value={row.vehicleNo} mono />
          <Field label="Driver" value={row.driverName || '—'} />
          <Field label="Mobile" value={row.driverMobile || '—'} />
        </Section>
        <Section title="Item">
          <Field label="Item" value={`${row.item?.code} — ${row.item?.name}`} />
          <Field label="HSN" value={row.item?.hsnCode || '—'} />
          <Field label="Default rate" value={fmtNum(row.item?.sellingPrice ?? 0)} />
          <Field label="GST %" value={fmtNum(row.item?.gstPercent ?? 0)} />
        </Section>
        <Section title="Weight">
          <Field label="Empty (tare)" value={`${fmtNum(row.emptyWeight)} kg`} />
          <Field label="Captured at" value={row.weightCapturedAt ? fmtDate(row.weightCapturedAt) : '—'} />
        </Section>
      </div>

      {row.bill && (
        <div className="border rounded-md bg-card p-4 text-sm">
          <div className="font-medium mb-1">Sales Bill</div>
          <Link to={`/operations/sales-bill/${row.bill.id}`} className="text-primary hover:underline">
            {row.bill.billNo} ({row.bill.status}) · {fmtDate(row.bill.billDate)}
          </Link>
        </div>
      )}

      {row.cancelledReason && (
        <div className="border rounded-md bg-rose-50 border-rose-200 p-4 text-sm">
          <div className="font-medium text-rose-800 mb-1">Cancelled</div>
          <div className="text-rose-700">{row.cancelledReason}</div>
        </div>
      )}

      {showCancel && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-md border shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold">Cancel Token</h2>
            <p className="text-sm text-muted-foreground">This action cannot be undone. The token will not be billable.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation (min 3 chars)"
              className="px-3 py-2 w-full rounded-md border border-input bg-background"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCancel(false); setReason(''); }} className="px-3 py-2 rounded-md border border-input hover:bg-muted text-sm">
                Keep token
              </button>
              <button
                onClick={onCancel}
                disabled={acting}
                className="px-3 py-2 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 text-sm inline-flex items-center gap-2"
              >
                {acting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Cancel token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-md bg-card p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground tracking-wider mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? 'font-mono' : ''}>{value}</span>
    </div>
  );
}

export default TokenDetails;
