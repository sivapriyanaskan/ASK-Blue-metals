import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Loader2, Printer, X } from 'lucide-react';
import { salesBillApi, companyProfileApi, type SalesBillRow, type SalesBillStatus, type CompanyProfile } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';
import { useAppContext } from '../context/AppContext';

const STATUS_BADGE: Record<SalesBillStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  POSTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtMoney = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (s: string | number) =>
  Number(s).toLocaleString('en-IN', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

// ── Number to words (Indian English) ───────────────────────────────────────
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + belowThousand(n % 100) : '');
}

function numberToWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const parts: string[] = [];
  if (rupees === 0 && paise === 0) return 'Zero Rupees';
  let r = rupees;
  if (r >= 10000000) { parts.push(belowThousand(Math.floor(r / 10000000)) + ' Crore'); r %= 10000000; }
  if (r >= 100000)  { parts.push(belowThousand(Math.floor(r / 100000))  + ' Lakh');  r %= 100000; }
  if (r >= 1000)    { parts.push(belowThousand(Math.floor(r / 1000))    + ' Thousand'); r %= 1000; }
  if (r > 0)        { parts.push(belowThousand(r)); }
  let result = parts.join(' ') + ' Rupees';
  if (paise > 0) result += ' and ' + belowThousand(paise) + ' Paise';
  return result;
}

export const SalesBillDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const [row, setRow] = useState<SalesBillRow | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
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
  useEffect(() => {
    void load();
    companyProfileApi.get().then(setCompany).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const isIgst = Number(row.igstAmount) > 0;
  const totalGstAmount = Number(row.igstAmount) + Number(row.cgstAmount) + Number(row.sgstAmount);
  const gstPercent = isIgst
    ? Number(row.igstPercent)
    : Number(row.cgstPercent) + Number(row.sgstPercent);
  const inWords = numberToWords(Number(row.totalAmount));

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      {/* ── Toolbar (hidden on print) ────────────────────────────────── */}
      <div className="print:hidden flex items-start justify-between gap-4 flex-wrap">
        <button
          onClick={() => navigate('/operations/sales-bill')}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bills
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded border ${STATUS_BADGE[row.status]}`}>{row.status}</span>
          <button
            type="button"
            onClick={() => {
              const prev = document.title;
              document.title = row.billNo;
              window.print();
              document.title = prev;
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          {row.status === 'POSTED' && (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-destructive text-destructive hover:bg-destructive/10 text-sm"
            >
              <X className="h-4 w-4" /> Cancel bill
            </button>
          )}
        </div>
      </div>

      {error && <div className="print:hidden text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

      {/* ── INVOICE ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-300 p-8 font-sans text-sm print:border-0 print:p-4">

        {/* Company Header */}
        <div className="text-center border-b border-gray-400 pb-3 mb-4">
          <h1 className="text-2xl font-bold text-blue-800 leading-tight">
            {company?.name ?? 'ASK Blue Metal'}
          </h1>
          {company?.address && (
            <p className="text-xs mt-0.5">{company.address}</p>
          )}
          <p className="text-xs mt-0.5">
            {company?.phone ? `Ph: ${company.phone}` : ''}
            {company?.phone && company?.gstin ? ' ; ' : ''}
            {company?.gstin ? `GST No: ${company.gstin}` : ''}
          </p>
          {company?.msmeNumber && (
            <p className="text-xs mt-0.5">Udayam Certificate No: {company.msmeNumber}</p>
          )}
          <h2 className="text-base font-bold mt-2 underline tracking-widest">INVOICE</h2>
        </div>

        {/* Bill Info Grid */}
        <table className="w-full text-xs mb-4 border-collapse">
          <tbody>
            <tr>
              <td className="font-semibold w-32 py-0.5">Invoice No</td>
              <td className="w-2">:</td>
              <td className="pr-8">{row.billNo}</td>
              <td className="font-semibold w-24">Cr.Ref No</td>
              <td className="w-2">:</td>
              <td className="pr-8">{row.token?.tokenNo ?? '—'}</td>
              <td className="font-semibold w-24">Date</td>
              <td className="w-2">:</td>
              <td className="whitespace-nowrap">{fmtDate(row.billDate)}</td>
            </tr>
            <tr>
              <td className="font-semibold align-top py-1">Customer Name</td>
              <td className="align-top">:</td>
              <td className="align-top pr-8">
                <div className="font-medium">{row.customer?.name}</div>
                {(row.billToAddress || row.customer?.address) && (
                  <div className="text-gray-600 whitespace-pre-line">{row.billToAddress || row.customer?.address}</div>
                )}
              </td>
              <td colSpan={3}></td>
              <td className="font-semibold align-top">Time</td>
              <td className="align-top">:</td>
              <td className="align-top whitespace-nowrap">{fmtTime(row.billDate)}</td>
            </tr>
            <tr>
              <td className="font-semibold py-0.5">GST</td>
              <td>:</td>
              <td className="pr-8">{row.customer?.gstNumber ?? '—'}</td>
              <td colSpan={3}></td>
              <td className="font-semibold whitespace-nowrap align-top">Prepared By</td>
              <td className="align-top">:</td>
              <td className="align-top uppercase whitespace-nowrap">{user?.name ?? '—'}</td>
            </tr>
            <tr>
              <td className="font-semibold pt-2">Place Of Supply</td>
              <td className="pt-2">:</td>
              <td className="pt-2 pr-8">{row.placeOfSupply ?? '—'}</td>
              <td colSpan={6}></td>
            </tr>
            <tr>
              <td className="font-semibold whitespace-nowrap">Vehicle No</td>
              <td>:</td>
              <td className="font-mono uppercase whitespace-nowrap pr-8">{row.vehicleNo}</td>
              <td colSpan={6}></td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table className="w-full text-xs border border-gray-400 border-collapse mb-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-left font-semibold">DESCRIPTION OF ITEM</th>
              <th className="border border-gray-400 px-2 py-1 text-center font-semibold">HSN CODE</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-semibold">RATE</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-semibold">QTY</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-semibold">AMOUNT</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-semibold">GST%</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-semibold">GST</th>
              <th className="border border-gray-400 px-2 py-1 text-right font-semibold">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-2 py-1">{row.item?.name}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{row.item?.hsnCode ?? '—'}</td>
              <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">{fmtMoney(row.rate)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">{fmtNum(row.netWeight)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">{fmtMoney(row.taxableAmount)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">{gstPercent > 0 ? `${gstPercent}.00` : '—'}</td>
              <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">{fmtMoney(totalGstAmount)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">{fmtMoney(row.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <table className="text-xs">
            <tbody>
              <tr>
                <td className="font-semibold pr-8 py-0.5">Amount</td>
                <td className="pr-2">:</td>
                <td className="text-right tabular-nums w-28">{fmtMoney(row.taxableAmount)}</td>
              </tr>
              {isIgst && Number(row.igstAmount) > 0 && (
                <tr>
                  <td className="font-semibold pr-8 py-0.5">IGST</td>
                  <td className="pr-2">:</td>
                  <td className="text-right tabular-nums">{fmtMoney(row.igstAmount)}</td>
                </tr>
              )}
              {!isIgst && Number(row.cgstAmount) > 0 && (
                <tr>
                  <td className="font-semibold pr-8 py-0.5">CGST</td>
                  <td className="pr-2">:</td>
                  <td className="text-right tabular-nums">{fmtMoney(row.cgstAmount)}</td>
                </tr>
              )}
              {!isIgst && Number(row.sgstAmount) > 0 && (
                <tr>
                  <td className="font-semibold pr-8 py-0.5">SGST</td>
                  <td className="pr-2">:</td>
                  <td className="text-right tabular-nums">{fmtMoney(row.sgstAmount)}</td>
                </tr>
              )}
              {Number(row.tcsAmount) > 0 && (
                <tr>
                  <td className="font-semibold pr-8 py-0.5">TCS</td>
                  <td className="pr-2">:</td>
                  <td className="text-right tabular-nums">{fmtMoney(row.tcsAmount)}</td>
                </tr>
              )}
              {Number(row.roundOff) !== 0 && (
                <tr>
                  <td className="font-semibold pr-8 py-0.5">Round Off</td>
                  <td className="pr-2">:</td>
                  <td className="text-right tabular-nums">{fmtMoney(row.roundOff)}</td>
                </tr>
              )}
              <tr className="border-t border-gray-400 font-bold">
                <td className="pr-8 py-0.5">NET AMOUNT</td>
                <td className="pr-2">:</td>
                <td className="text-right tabular-nums">{fmtMoney(row.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* In words */}
        <div className="border-t border-gray-300 pt-2 mb-4 text-xs">
          <span className="font-semibold">In words: </span>
          {inWords} Only
        </div>

        {/* Cancelled notice */}
        {row.cancelledReason && (
          <div className="border border-red-400 bg-red-50 rounded px-3 py-2 mb-4 text-xs text-red-700">
            <span className="font-bold">CANCELLED:</span> {row.cancelledReason}
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="border-t border-gray-300 pt-2 text-xs">
          <div className="font-bold mb-1">TERMS &amp; CONDITIONS :</div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Unless otherwise stated all prices are strictly nett.</li>
            <li>Our responsibility ceases on delivery of the goods on Road transport</li>
            <li>Goods supplied to order will not be accepted back.</li>
            {Number(row.customer?.paymentDueDays ?? 0) > 0 && (() => {
              const days = Number(row.customer?.paymentDueDays ?? 0);
              const due = new Date(row.billDate);
              due.setDate(due.getDate() + days);
              const dueText = due.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <li className="font-semibold">
                  Payment due within {days} days — on or before {dueText}.
                </li>
              );
            })()}
          </ol>
        </div>
      </div>

      {/* High-value confirmation reason (view only, not printed) */}
      {row.confirmationReason && (
        <div className="print:hidden border border-amber-300 bg-amber-50 rounded-md px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">High-Value Bill Confirmation Reason: </span>
          {row.confirmationReason}
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-card rounded-md border shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold">Cancel Sales Bill</h2>
            <p className="text-sm text-muted-foreground">The associated token (if any) will return to OPEN.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation (min 3 chars)"
              className="px-3 py-2 w-full rounded-md border border-input bg-background"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCancel(false); setReason(''); }}
                className="px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
              >
                Keep bill
              </button>
              <button
                onClick={onCancel}
                disabled={acting}
                className="px-3 py-2 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 text-sm inline-flex items-center gap-2"
              >
                {acting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Cancel bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesBillDetails;
