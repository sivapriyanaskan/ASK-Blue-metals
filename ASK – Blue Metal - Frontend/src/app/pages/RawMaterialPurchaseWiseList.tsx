import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Search, Loader2, CheckCircle2, Package, HelpCircle, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import {
  purchaseConsumptionApi,
  shiftApi,
  type PurchaseConsumptionRow,
  type PurchaseConsumptionStatus,
  type PurchaseConsumptionStats,
  type ShiftRow,
} from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmtTonn = (s: string | number) => Number(s).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtDateTime = (s: string) => new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_BADGE: Record<PurchaseConsumptionStatus, string> = {
  NEW: 'bg-amber-100 text-amber-800 border-amber-300',
  CONSUMED: 'bg-green-100 text-green-800 border-green-300',
  IN_STOCK: 'bg-blue-100 text-blue-800 border-blue-300',
  UNDEFINED: 'bg-gray-200 text-gray-700 border-gray-300',
};

const STATUS_LABEL: Record<PurchaseConsumptionStatus, string> = {
  NEW: 'New',
  CONSUMED: 'Consumed',
  IN_STOCK: 'In Stock',
  UNDEFINED: 'Undefined',
};

type PendingMap = Record<string, PurchaseConsumptionStatus>;

export const RawMaterialPurchaseWiseList = () => {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [rows, setRows] = useState<PurchaseConsumptionRow[]>([]);
  const [stats, setStats] = useState<PurchaseConsumptionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PurchaseConsumptionStatus>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingMap>({});
  const [includePrevUndefined, setIncludePrevUndefined] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await shiftApi.list({ pageSize: 30 });
        setShifts(r.items);
        const open = r.items.find((s) => s.status === 'OPEN');
        if (open) setSelectedShiftId(open.id);
        else if (r.items[0]) setSelectedShiftId(r.items[0].id);
      } catch (err) {
        setError(describeError(err, 'Failed to load shifts'));
      }
    })();
  }, []);

  const reload = async () => {
    if (!selectedShiftId) return;
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        purchaseConsumptionApi.list({
          shiftId: selectedShiftId,
          includePreviousUndefined: includePrevUndefined,
        }),
        purchaseConsumptionApi.stats(selectedShiftId),
      ]);
      setRows(listRes.items);
      setStats(statsRes);
      setPending({});
      setSelectedIds(new Set());
    } catch (err) {
      setError(describeError(err, 'Failed to load purchase entries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShiftId, includePrevUndefined]);

  const selectedShift = useMemo(() => shifts.find((s) => s.id === selectedShiftId) ?? null, [shifts, selectedShiftId]);
  const isShiftLocked = selectedShift?.status === 'CLOSED';

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const effectiveStatus = pending[r.id] ?? r.status;
      if (statusFilter && effectiveStatus !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          r.purchaseBill.purchaseNo.toLowerCase().includes(q) ||
          r.purchaseBill.supplierNameSnapshot.toLowerCase().includes(q) ||
          r.purchaseBill.itemNameSnapshot.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, statusFilter, searchTerm, pending]);

  const pendingCount = Object.keys(pending).length;

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((r) => r.id)));
  };

  const applyBulkLocal = (status: PurchaseConsumptionStatus) => {
    if (selectedIds.size === 0) return;
    setPending((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        const row = rows.find((r) => r.id === id);
        if (!row) continue;
        if (row.status === status) delete next[id];
        else next[id] = status;
      }
      return next;
    });
  };

  const clearRowPending = (id: string) => {
    setPending((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateStock = async () => {
    if (pendingCount === 0 || isShiftLocked) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const grouped: Record<PurchaseConsumptionStatus, string[]> = {
        NEW: [], CONSUMED: [], IN_STOCK: [], UNDEFINED: [],
      };
      for (const [id, status] of Object.entries(pending)) grouped[status].push(id);
      let total = 0;
      for (const status of Object.keys(grouped) as PurchaseConsumptionStatus[]) {
        if (grouped[status].length === 0) continue;
        const res = await purchaseConsumptionApi.bulkUpdate(grouped[status], status);
        total += res.count;
      }
      setSuccessMessage(`Updated ${total} entr${total === 1 ? 'y' : 'ies'} successfully.`);
      await reload();
    } catch (err) {
      setError(describeError(err, 'Failed to update stock'));
    } finally {
      setSaving(false);
    }
  };

  const shiftOptions = useMemo(
    () => shifts.map((s) => ({
      value: s.id,
      label: `${s.shiftNo} — ${new Date(s.shiftDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} (${s.status})`,
    })),
    [shifts],
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Material — Purchase Wise</h1>
          <p className="text-sm text-gray-500">Classify each purchase as Consumed, In Stock, or Undefined before closing the shift.</p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {successMessage && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div>}

      <div className="rounded-lg border border-gray-300 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Shift</label>
            <SearchableDropdown options={shiftOptions} value={selectedShiftId} onValueChange={setSelectedShiftId} placeholder="Select shift" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Shift Date &amp; Time</label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {selectedShift ? fmtDateTime(selectedShift.openedAt) : '—'}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Update Status</label>
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${isShiftLocked ? 'border-gray-300 bg-gray-100 text-gray-600' : 'border-green-300 bg-green-50 text-green-700'}`}>
              {isShiftLocked ? 'LOCKED' : 'UNLOCKED'}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <input id="prev-undef" type="checkbox" checked={includePrevUndefined} onChange={(e) => setIncludePrevUndefined(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          <label htmlFor="prev-undef" className="text-gray-700">
            Include <span className="font-medium">Undefined</span> entries carried over from previous shifts
          </label>
        </div>
      </div>

      {pendingCount > 0 && !isShiftLocked && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span>{pendingCount} unsaved change{pendingCount === 1 ? '' : 's'}. Click <span className="font-semibold">Update Stock</span> to persist.</span>
          </div>
          <button type="button" disabled={saving} onClick={() => void updateStock()} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Update Stock
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total Bills" value={stats?.totalBills ?? 0} accent="text-gray-900" />
        <StatCard label="Total Purchase Qty (T)" value={fmtTonn(stats?.totalQty ?? 0)} accent="text-blue-600" />
        <StatCard label="Consumed (T)" value={fmtTonn(stats?.consumedQty ?? 0)} accent="text-green-600" icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
        <StatCard label="In Stock (T)" value={fmtTonn(stats?.inStockQty ?? 0)} accent="text-indigo-600" icon={<Package className="h-4 w-4 text-indigo-600" />} />
        <StatCard label="Consumption Rate" value={`${(stats?.consumptionRate ?? 0).toFixed(1)}%`} accent="text-emerald-600" />
      </div>

      <div className="rounded-lg border border-gray-300 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by purchase no, supplier, item…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="w-48">
            <SearchableDropdown
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'NEW', label: 'New' },
                { value: 'CONSUMED', label: 'Consumed' },
                { value: 'IN_STOCK', label: 'In Stock' },
                { value: 'UNDEFINED', label: 'Undefined' },
              ]}
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as '' | PurchaseConsumptionStatus)}
              placeholder="All Statuses"
            />
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && !isShiftLocked && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm text-blue-900">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <BulkBtn label="Mark Consumed" color="green" onClick={() => applyBulkLocal('CONSUMED')} />
          <BulkBtn label="Mark In Stock" color="indigo" onClick={() => applyBulkLocal('IN_STOCK')} />
          <BulkBtn label="Mark Undefined" color="gray" onClick={() => applyBulkLocal('UNDEFINED')} />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {rows.length === 0 ? 'No purchase entries for this shift.' : 'No entries match the current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-300 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll} disabled={isShiftLocked} className="h-4 w-4 rounded border-gray-300" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Purchase No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Purchase Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Qty (T)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((r) => {
                  const effectiveStatus = pending[r.id] ?? r.status;
                  const isCarryOver = r.createdByShift?.id && r.createdByShift.id !== selectedShiftId;
                  return (
                    <tr key={r.id} className={selectedIds.has(r.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleRow(r.id)} disabled={isShiftLocked} className="h-4 w-4 rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-600">
                        <Link to={`/operations/purchase-bills/${r.purchaseBill.id}`}>{r.purchaseBill.purchaseNo}</Link>
                        {isCarryOver && (
                          <span className="ml-2 inline-block rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">CARRY-OVER</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmtDateTime(r.purchaseBill.purchaseDateTime)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.purchaseBill.supplierNameSnapshot}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.purchaseBill.itemNameSnapshot}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">{fmtTonn(r.quantity)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[effectiveStatus]}`}>
                            {STATUS_LABEL[effectiveStatus]}
                          </span>
                          {pending[r.id] && (
                            <button type="button" onClick={() => clearRowPending(r.id)} className="text-xs text-gray-500 hover:text-gray-700" title="Revert pending change">↺</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingCount > 0 && !isShiftLocked && (
        <div className="flex justify-end">
          <button type="button" disabled={saving} onClick={() => void updateStock()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Update Stock ({pendingCount})
          </button>
        </div>
      )}

      {isShiftLocked && (
        <div className="flex items-start gap-2 rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <HelpCircle className="mt-0.5 h-4 w-4 text-gray-500" />
          <span>This shift is closed. Open the current shift to update statuses.</span>
        </div>
      )}
    </div>
  );
};

function StatCard({ label, value, accent, icon }: { label: string; value: number | string; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase text-gray-500">{label}</span>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function BulkBtn({ label, color, onClick }: { label: string; color: 'green' | 'indigo' | 'gray'; onClick: () => void }) {
  const classes: Record<'green' | 'indigo' | 'gray', string> = {
    green: 'bg-green-600 hover:bg-green-700 text-white',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    gray: 'bg-gray-600 hover:bg-gray-700 text-white',
  };
  return (
    <button type="button" onClick={onClick} className={`rounded-md px-3 py-1.5 text-xs font-medium ${classes[color]}`}>
      {label}
    </button>
  );
}
