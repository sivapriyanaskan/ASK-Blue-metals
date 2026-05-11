import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router';
import { ArrowLeft, Loader2, Receipt, X, Printer, Pencil, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { tokenApi, systemSettingsApi, type TokenRow, type TokenStatus } from '../services/operationsApi';
import { itemsApi, describeError, type ItemRow } from '../services/mastersApi';
import { WeighbridgeDisplay } from '../components/WeighbridgeDisplay';
import { CameraCapture } from '../components/CameraCapture';

const STATUS_BADGE: Record<TokenStatus, string> = {
  OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BILLED: 'bg-sky-50 text-sky-700 border-sky-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();
const fmtNum = (s: string | number) => Number(s).toLocaleString(undefined, { maximumFractionDigits: 2 });
// #8 — weights with 3 decimals throughout the operations module.
const fmtWeight = (s: string | number) =>
  Number(s).toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000/api/v1';
const API_ORIGIN = new URL(API_BASE).origin;

/**
 * Resolve a stored image reference for display. Relative `/uploads/...`
 * URLs are anchored to the API origin; absolute URLs and base64 data URLs
 * (legacy tokens captured before disk storage was introduced) pass through.
 */
const resolveImageSrc = (ref: string | null | undefined): string | null => {
  if (!ref) return null;
  if (ref.startsWith('data:') || ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  if (ref.startsWith('/')) return `${API_ORIGIN}${ref}`;
  return null;
};

export const TokenDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [row, setRow] = useState<TokenRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [cancelCapturedWeight, setCancelCapturedWeight] = useState<number | null>(null);
  const [cancelImageRef, setCancelImageRef] = useState<string | null>(null);
  const [cancelTopImageRef, setCancelTopImageRef] = useState<string | null>(null);
  const [barrierMessage, setBarrierMessage] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const printButtonRef = useRef<HTMLButtonElement | null>(null);
  const initialEnterHandledRef = useRef(false);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const printTokenSlip = (token: TokenRow) => {
    setError(null);

    const tokenDate = token.tokenDateTime ? new Date(token.tokenDateTime) : new Date();
    const month = tokenDate.toLocaleString('en-GB', { month: 'short' });
    const dateText = `${String(tokenDate.getDate()).padStart(2, '0')}/${month}/${tokenDate.getFullYear()}`;
    const timeText = tokenDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const tokenNo = token.tokenNo || '—';
    const lorryName = token.customer?.name || '—';
    const registrationNo = token.vehicleNo || '—';
    const material = token.item?.name || '—';
    const emptyWeight = fmtWeight(token.emptyWeight);
    const companyName = 'Ask M Sand';

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Token ${escapeHtml(tokenNo)}</title>
    <style>
      @page { size: 80mm 120mm; margin: 4mm; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Times New Roman", Times, serif;
        color: #111;
        font-size: 13px;
        line-height: 1.2;
      }
      .slip {
        width: 72mm;
      }
      .header {
        text-align: center;
        padding-bottom: 8px;
        margin-bottom: 10px;
        border-bottom: 1px solid #b7b7b7;
      }
      .company {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .meta-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 4px 0;
      }
      .meta-item {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: baseline;
        gap: 4px;
      }
      .meta-item.right {
        justify-self: end;
      }
      .kv-row {
        display: grid;
        grid-template-columns: 26mm 3mm 1fr;
        align-items: baseline;
        column-gap: 6px;
        padding: 6px 0;
      }
      .label {
        font-weight: 600;
        color: #222;
        white-space: nowrap;
      }
      .sep {
        min-width: 8px;
        text-align: center;
      }
      .value {
        font-weight: 600;
        color: #111;
      }
      .rule {
        border-top: 1px solid #c9c9c9;
        margin: 6px 0 4px;
      }
      @media print {
        html, body {
          width: 80mm;
          overflow: hidden;
        }
      }
    </style>
  </head>
  <body>
    <div class="slip">
      <div class="header">
        <div class="company">${escapeHtml(companyName)}</div>
      </div>
      <div class="meta-row">
        <div class="meta-item"><span class="label">Date:</span><span class="value">${escapeHtml(dateText)}</span></div>
        <div class="meta-item right"><span class="label">Time:</span><span class="value">${escapeHtml(timeText)}</span></div>
      </div>
      <div class="rule"></div>
      <div class="kv-row"><span class="label">Token No</span><span class="sep">:</span><span class="value">${escapeHtml(tokenNo)}</span></div>

      <div class="kv-row"><span class="label">Lorry Name</span><span class="sep">:</span><span class="value">${escapeHtml(lorryName)}</span></div>
      <div class="kv-row"><span class="label">Registration No</span><span class="sep">:</span><span class="value">${escapeHtml(registrationNo)}</span></div>
      <div class="kv-row"><span class="label">Empty Weight</span><span class="sep">:</span><span class="value">${escapeHtml(emptyWeight)}</span></div>
      <div class="kv-row"><span class="label">Meterial</span><span class="sep">:</span><span class="value">${escapeHtml(material)}</span></div>
    </div>
  </body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const cleanup = () => {
      iframe.remove();
    };

    const frameWindow = iframe.contentWindow;
    const frameDoc = frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      cleanup();
      setError('Unable to prepare print document. Please try again.');
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const runPrint = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } finally {
        // Fallback cleanup if afterprint does not fire in this browser.
        window.setTimeout(cleanup, 1000);
      }
    };

    frameWindow.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(runPrint, 50);
  };

  // #12 Goley edit — vehicle / driver / item / empty weight, only while OPEN.
  const [showEdit, setShowEdit] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [edit, setEdit] = useState<{
    vehicleNo: string;
    driverName: string;
    driverMobile: string;
    itemId: string;
    emptyWeight: string;
  } | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try { setRow(await tokenApi.get(id)); }
    catch (err) { setError(describeError(err, 'Failed to load token')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  // Auto-open cancel modal when navigated with ?cancel=1 (from Token Cancel list).
  useEffect(() => {
    if (!row) return;
    if (searchParams.get('cancel') === '1' && row.status === 'OPEN' && !showCancel) {
      setShowCancel(true);
      const next = new URLSearchParams(searchParams);
      next.delete('cancel');
      setSearchParams(next, { replace: true });
    }
  }, [row, searchParams, showCancel, setSearchParams]);

  // Keyboard shortcut requested: first Enter on this screen should open print.
  useEffect(() => {
    if (!row) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || initialEnterHandledRef.current) return;
      if (showEdit || showCancel) return;

      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
        if (active.getAttribute('contenteditable') === 'true') return;
      }

      event.preventDefault();
      initialEnterHandledRef.current = true;
      printButtonRef.current?.focus({ preventScroll: true });
      printTokenSlip(row);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [row, showEdit, showCancel]);

  useEffect(() => {
    initialEnterHandledRef.current = false;
  }, [id]);

  const [weightToleranceKg, setWeightToleranceKg] = useState<number>(100);
  const WEIGHT_TOLERANCE_KG = weightToleranceKg;
  // Set to true when operator clicks "Cancel token & open barrier". This
  // programmatically fires both CameraCapture instances; we then wait for
  // both onCapture callbacks before posting the cancel request.
  const [triggerCapture, setTriggerCapture] = useState(false);
  const [capturePending, setCapturePending] = useState(false);
  // When the capture-timeout elapses and at least one camera image is still
  // missing we surface a confirm dialog so the operator can choose to retry
  // the snapshots or proceed without them.
  const [missingCamerasPrompt, setMissingCamerasPrompt] =
    useState<{ front: boolean; top: boolean } | null>(null);

  // Load configurable tolerance from system settings on mount. Falls back
  // to 100 kg when the setting is unset or the user lacks read permission.
  useEffect(() => {
    void systemSettingsApi
      .get('tokens.cancelWeightToleranceKg')
      .then((row) => {
        const raw = row?.value;
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(n) && n >= 0) setWeightToleranceKg(n);
      })
      .catch(() => {/* keep default */});
  }, []);

  const emptyWeightKg = row ? Number(row.emptyWeight) : 0;
  const weightDelta =
    cancelCapturedWeight !== null && emptyWeightKg > 0
      ? Math.abs(cancelCapturedWeight - emptyWeightKg)
      : null;
  const weightMatches = weightDelta !== null && weightDelta <= WEIGHT_TOLERANCE_KG;

  const submitCancel = async (imageRef: string | null, topImageRef: string | null) => {
    if (!id || !row) return;
    setActing(true); setError(null);
    try {
      await tokenApi.cancel(id, {
        cancelledReason: reason.trim(),
        cancelledWeight: cancelCapturedWeight ?? undefined,
        cancelledImageRef: imageRef,
        cancelledTopImageRef: topImageRef,
      });
      setShowCancel(false);
      setReason('');
      setCancelCapturedWeight(null);
      setCancelImageRef(null);
      setCancelTopImageRef(null);
      setTriggerCapture(false);
      setCapturePending(false);
      setBarrierMessage('Token cancelled — barrier opened. Vehicle may exit.');
      await load();
    } catch (err) {
      setError(describeError(err, 'Failed to cancel token'));
    } finally {
      setActing(false);
    }
  };

  // Once both camera captures have completed (or we time out), submit the
  // cancel request. This effect drives the final POST after the operator
  // clicks "Cancel token & open barrier".
  useEffect(() => {
    if (!capturePending) return;
    if (cancelImageRef && cancelTopImageRef) {
      setCapturePending(false);
      void submitCancel(cancelImageRef, cancelTopImageRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturePending, cancelImageRef, cancelTopImageRef]);

  // Live refs so the safety-net timeout below reads the *current* state at
  // fire time instead of the stale closure values from when it was scheduled.
  const cancelImageRefLive = useRef<string | null>(null);
  const cancelTopImageRefLive = useRef<string | null>(null);
  const capturePendingLive = useRef(false);
  useEffect(() => { cancelImageRefLive.current = cancelImageRef; }, [cancelImageRef]);
  useEffect(() => { cancelTopImageRefLive.current = cancelTopImageRef; }, [cancelTopImageRef]);
  useEffect(() => { capturePendingLive.current = capturePending; }, [capturePending]);

  // Safety net: if a camera fails to respond within ~12s, stop waiting and
  // ask the operator whether to proceed without the missing image(s) or
  // retry. We do NOT auto-submit — the user must explicitly confirm.
  useEffect(() => {
    if (!capturePending) return;
    const t = setTimeout(() => {
      if (!capturePendingLive.current) return; // already submitted via the other effect
      const front = !cancelImageRefLive.current;
      const top = !cancelTopImageRefLive.current;
      if (!front && !top) return; // both captured in time
      setCapturePending(false);
      setMissingCamerasPrompt({ front, top });
    }, 12000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturePending]);

  const proceedWithoutMissing = () => {
    setMissingCamerasPrompt(null);
    void submitCancel(cancelImageRef ?? null, cancelTopImageRef ?? null);
  };

  const retryMissingCaptures = () => {
    setMissingCamerasPrompt(null);
    // Flip externalCaptured false → true so the CameraCapture useEffect
    // re-fires its doCapture() call. We reset only the missing side(s) to
    // avoid re-uploading a frame we already have.
    setTriggerCapture(false);
    setCapturePending(true);
    setTimeout(() => setTriggerCapture(true), 50);
  };

  const onCancel = () => {
    if (!id || !row) return;
    if (reason.trim().length < 3) { setError('Cancellation reason is required (min 3 chars).'); return; }
    if (cancelCapturedWeight === null || cancelCapturedWeight <= 0) {
      setError('Weighbridge has not produced a stable weight yet. Please wait a moment and try again.');
      return;
    }
    if (!weightMatches) {
      setError(
        `Captured weight (${fmtWeight(cancelCapturedWeight)} kg) does not match the original empty weight ` +
        `(${fmtWeight(emptyWeightKg)} kg). Difference must be within ${WEIGHT_TOLERANCE_KG} kg to cancel.`,
      );
      return;
    }
    // Fire both cameras and wait for the image URLs to arrive (the effects
    // above complete the submission). The CameraCapture components react
    // to externalCaptured flipping false → true.
    setError(null);
    setCancelImageRef(null);
    setCancelTopImageRef(null);
    setTriggerCapture(true);
    setCapturePending(true);
  };

  // #12 — open edit modal seeded from current row + lazy-load item list.
  const openEdit = async () => {
    if (!row) return;
    setEdit({
      vehicleNo: row.vehicleNo,
      driverName: row.driverName ?? '',
      driverMobile: row.driverMobile ?? '',
      itemId: row.itemId,
      emptyWeight: String(row.emptyWeight),
    });
    setShowEdit(true);
    if (items.length === 0) {
      try {
        const res = await itemsApi.list({ pageSize: 200, isActive: true });
        setItems(res.items);
      } catch (err) {
        setError(describeError(err, 'Failed to load items'));
      }
    }
  };

  const onSaveEdit = async () => {
    if (!id || !edit) return;
    if (!edit.vehicleNo.trim()) {
      setError('Vehicle number is required.');
      return;
    }
    if (!edit.itemId) {
      setError('Item is required.');
      return;
    }
    const wt = Number(edit.emptyWeight);
    if (!Number.isFinite(wt) || wt < 0) {
      setError('Empty weight must be a non-negative number.');
      return;
    }
    setActing(true);
    setError(null);
    try {
      await tokenApi.update(id, {
        vehicleNo: edit.vehicleNo.trim().toUpperCase(),
        driverName: edit.driverName.trim() || null,
        driverMobile: edit.driverMobile.trim() || null,
        itemId: edit.itemId,
        emptyWeight: wt,
      });
      setShowEdit(false);
      setEdit(null);
      await load();
    } catch (err) {
      setError(describeError(err, 'Failed to update token'));
    } finally {
      setActing(false);
    }
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
            ref={printButtonRef}
            type="button"
            onClick={() => printTokenSlip(row)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          {row.status === 'OPEN' && (
            <>
              <button
                type="button"
                onClick={openEdit}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
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
          <Field label="Bill type" value={
            row.customer?.billType === 'TAX_INVOICE'
              ? 'Tax Invoice'
              : row.customer?.billType === 'WEIGHT_SLIP'
              ? 'Weight Slip'
              : 'Non-GST'
          } />
          <Field label="GSTIN" value={row.customer?.gstNumber || '—'} />
        </Section>
        <Section title="Vehicle & Driver">
          <Field label="Vehicle #" value={row.vehicleNo} mono />
          <Field label="External entry #" value={row.externalEntryNo || '—'} mono />
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
          <Field label="Empty (tare)" value={`${fmtWeight(row.emptyWeight)} t`} />
          <Field label="Captured at" value={row.weightCapturedAt ? fmtDate(row.weightCapturedAt) : '—'} />
        </Section>
      </div>

      {/* Entry-time camera snapshots. Always shown so operators can verify
          coverage; tiles say "not available" when no image was captured. */}
      <div className="border rounded-md bg-card p-4">
        <div className="text-xs font-medium uppercase text-muted-foreground tracking-wider mb-3">
          Entry Images
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageTile
            label="Front (ANPR)"
            src={resolveImageSrc(row.anprImageRef)}
            caption={row.anprNumberPlateText || undefined}
            missingMessage="Front not available"
          />
          <ImageTile
            label="Top (Load)"
            src={resolveImageSrc(row.loadImageRef)}
            missingMessage="Top not available"
          />
        </div>
      </div>

      {row.bill && (
        <div className="border rounded-md bg-card p-4 text-sm">
          <div className="font-medium mb-1">Sales Bill</div>
          <Link to={`/operations/sales-bill/${row.bill.id}`} className="text-primary hover:underline">
            {row.bill.billNo} ({row.bill.status}) · {fmtDate(row.bill.billDate)}
          </Link>
        </div>
      )}

      {row.status === 'CANCELLED' && (
        <div className="border rounded-md bg-rose-50 border-rose-200 p-4 space-y-4">
          <div>
            <div className="text-xs font-medium uppercase text-rose-700 tracking-wider mb-1">
              Cancellation Details
            </div>
            <div className="text-sm text-rose-800">
              {row.cancelledReason || <span className="italic text-rose-600">No reason recorded</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="border rounded-md bg-white px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">Out weight</div>
              <div className="font-mono font-semibold">
                {row.cancelledWeight !== null && row.cancelledWeight !== undefined
                  ? `${fmtWeight(row.cancelledWeight)} kg`
                  : '—'}
              </div>
            </div>
            <div className="border rounded-md bg-white px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">Empty (entry)</div>
              <div className="font-mono font-semibold">{fmtWeight(row.emptyWeight)} t</div>
            </div>
            <div className="border rounded-md bg-white px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">Difference</div>
              <div className="font-mono font-semibold">
                {row.cancelledWeight !== null && row.cancelledWeight !== undefined
                  ? `${fmtWeight(Math.abs(Number(row.cancelledWeight) - Number(row.emptyWeight)))} kg`
                  : '—'}
              </div>
            </div>
            <div className="border rounded-md bg-white px-3 py-2">
              <div className="text-[11px] uppercase text-muted-foreground">Cancelled at</div>
              <div className="font-mono">{row.cancelledAt ? fmtDate(row.cancelledAt) : '—'}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-rose-700 tracking-wider mb-2">
              Cancel-time Images
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageTile
                label="Front (cancel)"
                src={resolveImageSrc(row.cancelledImageRef)}
                missingMessage="Front not available"
              />
              <ImageTile
                label="Top (cancel)"
                src={resolveImageSrc(row.cancelledTopImageRef)}
                missingMessage="Top not available"
              />
            </div>
          </div>
        </div>
      )}

      {showEdit && edit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-md border shadow-lg max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold">Edit Token (Goley)</h2>
            <p className="text-sm text-muted-foreground">
              Adjust vehicle, driver, item, or empty weight. Edits are recorded in the audit log.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Vehicle No *</label>
                <input
                  value={edit.vehicleNo}
                  onChange={(e) =>
                    setEdit((prev) => prev && { ...prev, vehicleNo: e.target.value.toUpperCase() })
                  }
                  className="px-3 py-2 w-full rounded-md border border-input bg-background font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Item *</label>
                <select
                  value={edit.itemId}
                  onChange={(e) => setEdit((prev) => prev && { ...prev, itemId: e.target.value })}
                  className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Driver Name</label>
                <input
                  value={edit.driverName}
                  onChange={(e) => setEdit((prev) => prev && { ...prev, driverName: e.target.value })}
                  className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Driver Mobile</label>
                <input
                  value={edit.driverMobile}
                  onChange={(e) =>
                    setEdit((prev) => prev && { ...prev, driverMobile: e.target.value })
                  }
                  className="px-3 py-2 w-full rounded-md border border-input bg-background text-sm"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Empty Weight (T) *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={edit.emptyWeight}
                  onChange={(e) =>
                    setEdit((prev) => prev && { ...prev, emptyWeight: e.target.value })
                  }
                  className="px-3 py-2 w-full rounded-md border border-input bg-background font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowEdit(false);
                  setEdit(null);
                }}
                className="px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                disabled={acting}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-sm inline-flex items-center gap-2"
              >
                {acting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card rounded-md border shadow-lg max-w-6xl w-full p-6 space-y-4 my-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">Cancel Token</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Verify vehicle is still empty by capturing weight & image. Barrier opens after a successful cancel.
                </p>
              </div>
              <button
                onClick={() => { setShowCancel(false); setReason(''); setCancelCapturedWeight(null); setCancelImageRef(null); setCancelTopImageRef(null); setTriggerCapture(false); setCapturePending(false); }}
                className="p-1 rounded hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="min-h-[260px]">
                <WeighbridgeDisplay
                  key={`cancel-wb-${showCancel}`}
                  onWeightCapture={(w) => setCancelCapturedWeight(w)}
                  autoCapture
                  hideControls
                  externalCapturedWeight={cancelCapturedWeight}
                  allowTestEdit
                />
              </div>
              <div className="min-h-[260px]">
                <CameraCapture
                  label="Front Camera"
                  cameraId="front"
                  hideControls
                  externalCaptured={triggerCapture}
                  onCapture={(url) => setCancelImageRef(url)}
                />
              </div>
              <div className="min-h-[260px]">
                <CameraCapture
                  label="Top Camera"
                  cameraId="top"
                  hideControls
                  externalCaptured={triggerCapture}
                  onCapture={(url) => setCancelTopImageRef(url)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Original Empty Weight</div>
                <div className="font-mono font-semibold">{fmtWeight(emptyWeightKg)} kg</div>
              </div>
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Captured Now</div>
                <div className="font-mono font-semibold">
                  {cancelCapturedWeight !== null ? `${fmtWeight(cancelCapturedWeight)} kg` : '—'}
                </div>
              </div>
              <div
                className={
                  'border rounded-md p-3 ' +
                  (weightDelta === null
                    ? 'bg-muted/30'
                    : weightMatches
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200')
                }
              >
                <div className="text-xs text-muted-foreground">Difference (tol. ±{WEIGHT_TOLERANCE_KG} kg)</div>
                <div className="font-mono font-semibold flex items-center gap-1">
                  {weightDelta === null ? '—' : (
                    <>
                      {fmtWeight(weightDelta)} kg
                      {weightMatches ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Reason for cancellation (min 3 chars)"
              className="px-3 py-2 w-full rounded-md border border-input bg-background"
            />

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCancel(false); setReason(''); setCancelCapturedWeight(null); setCancelImageRef(null); setCancelTopImageRef(null); setTriggerCapture(false); setCapturePending(false); setError(null); }}
                className="px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
              >
                Keep token
              </button>
              <button
                onClick={onCancel}
                disabled={acting || capturePending || !weightMatches || reason.trim().length < 3}
                className="px-3 py-2 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 text-sm inline-flex items-center gap-2"
              >
                {(acting || capturePending) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scale className="h-3.5 w-3.5" />}
                {capturePending ? 'Capturing…' : 'Cancel token & open barrier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {missingCamerasPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-card rounded-md border shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold">Camera capture failed</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {missingCamerasPrompt.front && missingCamerasPrompt.top
                    ? 'Could not take Front and Top camera snapshots.'
                    : missingCamerasPrompt.front
                      ? 'Could not take Front camera snapshot.'
                      : 'Could not take Top camera snapshot.'}
                  {' '}Should we proceed without the missing picture(s)?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={retryMissingCaptures}
                className="px-3 py-2 rounded-md border border-input hover:bg-muted text-sm"
              >
                Retry
              </button>
              <button
                onClick={proceedWithoutMissing}
                disabled={acting}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-sm inline-flex items-center gap-2"
              >
                {acting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} OK, proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {barrierMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-2 max-w-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm font-medium">{barrierMessage}</div>
          <button
            onClick={() => setBarrierMessage(null)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
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

function ImageTile({ label, src, caption, missingMessage }: { label: string; src: string | null; caption?: string; missingMessage?: string }) {
  return (
    <div className="border rounded-md overflow-hidden bg-gray-50">
      <div className="px-3 py-2 border-b bg-white flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {caption && <span className="text-[10px] font-mono text-muted-foreground">{caption}</span>}
      </div>
      <div className="aspect-video bg-black flex items-center justify-center">
        {src ? (
          <a href={src} target="_blank" rel="noreferrer" className="w-full h-full">
            <img src={src} alt={label} className="w-full h-full object-contain" />
          </a>
        ) : (
          <span className="text-xs text-gray-400">{missingMessage ?? 'No image captured'}</span>
        )}
      </div>
    </div>
  );
}

export default TokenDetails;
