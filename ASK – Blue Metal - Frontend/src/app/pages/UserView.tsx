import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  Mail,
  ShieldCheck,
  User as UserIcon,
  Wallet,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  PiggyBank,
  TrendingUp,
  Filter,
  X,
  Eye,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  ScrollText,
  FileText,
  Download,
} from 'lucide-react';
import { usersApi, auditApi, type UserRow, type AuditLogRow } from '../services/iamApi';
import { shiftApi, type ShiftRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const formatINR = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getInitials = (first: string, last: string, username: string) => {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (f || l) return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase() || '?';
  return (username || '?').slice(0, 2).toUpperCase();
};

export const UserView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserRow | null>(null);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'OPEN' | 'CLOSED'>('');
  const [logsShift, setLogsShift] = useState<ShiftRow | null>(null);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const u = await usersApi.get(id);
        if (!cancelled) setUser(u);
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load user'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setShiftsLoading(true);
      try {
        const res = await shiftApi.list({
          openedById: id,
          status: statusFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          pageSize: 200,
        });
        if (!cancelled) setShifts(res.items);
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Failed to load shifts'));
      } finally {
        if (!cancelled) setShiftsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, dateFrom, dateTo, statusFilter]);

  const totals = useMemo(() => {
    const sum = (key: keyof ShiftRow) =>
      shifts.reduce((acc, s) => acc + Number((s[key] as string | number) ?? 0), 0);
    return {
      count: shifts.length,
      open: shifts.filter((s) => s.status === 'OPEN').length,
      closed: shifts.filter((s) => s.status === 'CLOSED').length,
      opening: sum('openingAmount'),
      billing: sum('billingTotal'),
      receipts: sum('receiptTotal'),
      payments: sum('paymentTotal'),
      purchase: sum('purchaseTotal'),
      closing: sum('closingAmount'),
    };
  }, [shifts]);

  const hasFilters = !!(dateFrom || dateTo || statusFilter);
  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
  };

  const openLogs = async (shift: ShiftRow) => {
    setLogsShift(shift);
    setLogs([]);
    setLogsError(null);
    setLogsLoading(true);
    try {
      // Fetch every action this user performed during the shift window.
      const from = shift.openedAt;
      const to = shift.closedAt ?? new Date().toISOString();
      const res = await auditApi.list({
        actorId: id,
        from,
        to,
        pageSize: 200,
      });
      // Drop system noise (token refreshes, session pings, etc.) and sort
      // chronologically so the timeline reads top-to-bottom.
      const NOISE_ACTIONS = new Set(['REFRESH', 'LOGIN', 'LOGOUT', 'VIEW', 'READ']);
      const NOISE_RESOURCES = new Set([
        'iam.refresh_token',
        'iam.session',
        'iam.access_token',
        'auth.session',
      ]);
      const filtered = res.items.filter(
        (l) =>
          !NOISE_ACTIONS.has(l.action) &&
          !NOISE_RESOURCES.has(l.resource),
      );
      const items = filtered.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setLogs(items);
    } catch (err) {
      setLogsError(describeError(err, 'Failed to load logs'));
    } finally {
      setLogsLoading(false);
    }
  };
  const closeLogs = () => {
    setLogsShift(null);
    setLogs([]);
    setLogsError(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-40 bg-gray-200 rounded" />
          <div className="h-40 bg-gradient-to-r from-gray-200 to-gray-100 rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-red-900">Unable to load user</div>
            <div className="text-sm text-red-700 mt-1">{error ?? 'User not found.'}</div>
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.username;
  const initials = getInitials(user.firstName, user.lastName, user.username);
  const isActive = user.status === 'ACTIVE';
  const isLocked = user.status === 'LOCKED';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 inline-flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <nav className="text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer" onClick={() => navigate('/admin/users')}>
            User Management
          </span>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{fullName}</span>
        </nav>
      </div>

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-3xl md:text-4xl font-bold shadow-lg">
              {initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold truncate">{fullName}</h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                  isActive
                    ? 'bg-emerald-400/30 text-emerald-50 border border-emerald-300/40'
                    : isLocked
                    ? 'bg-amber-400/30 text-amber-50 border border-amber-300/40'
                    : 'bg-gray-400/30 text-gray-50 border border-gray-300/40'
                }`}
              >
                <CircleDot className="w-3 h-3" /> {user.status}
              </span>
            </div>
            <div className="text-white/80 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" /> @{user.username}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Last login:{' '}
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {user.roles.length === 0 && (
                <span className="text-white/60 text-xs">No roles assigned</span>
              )}
              {user.roles.map((r) => (
                <span
                  key={r}
                  className="px-2.5 py-1 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs rounded-lg inline-flex items-center gap-1.5 font-medium"
                >
                  <ShieldCheck className="w-3 h-3" /> {r}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-right text-xs text-white/70">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Member since
            </div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {new Date(user.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Total Shifts"
          value={totals.count.toString()}
          sub={`${totals.open} open · ${totals.closed} closed`}
          tone="blue"
        />
        <KpiCard
          icon={<Receipt className="w-5 h-5" />}
          label="Total Billing"
          value={formatINR(totals.billing)}
          tone="emerald"
        />
        <KpiCard
          icon={<ArrowDownCircle className="w-5 h-5" />}
          label="Total Receipts"
          value={formatINR(totals.receipts)}
          tone="indigo"
        />
        <KpiCard
          icon={<ArrowUpCircle className="w-5 h-5" />}
          label="Total Payments"
          value={formatINR(totals.payments)}
          tone="rose"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MiniStat
          icon={<Wallet className="w-4 h-4" />}
          label="Opening Total"
          value={formatINR(totals.opening)}
          tone="text-slate-600"
        />
        <MiniStat
          icon={<ShoppingCart className="w-4 h-4" />}
          label="Purchase Total"
          value={formatINR(totals.purchase)}
          tone="text-amber-600"
        />
        <MiniStat
          icon={<PiggyBank className="w-4 h-4" />}
          label="Closing Total"
          value={formatINR(totals.closing)}
          tone="text-emerald-600"
        />
        <MiniStat
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Net (Bill − Pay)"
          value={formatINR(totals.billing - totals.payments)}
          tone={totals.billing - totals.payments >= 0 ? 'text-emerald-600' : 'text-rose-600'}
        />
      </div>

      {/* Shift History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" /> Shift History
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {shifts.length === 0
                  ? 'No shifts to display'
                  : `Showing ${shifts.length} shift${shifts.length === 1 ? '' : 's'}`}
                {hasFilters && ' (filtered)'}
              </p>
            </div>

            {/* Status pill tabs */}
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
              {([
                ['', 'All'],
                ['OPEN', 'Open'],
                ['CLOSED', 'Closed'],
              ] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 rounded-md transition ${
                    statusFilter === v
                      ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter row */}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filters
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg inline-flex items-center gap-1.5 transition"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Shift No</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Opened</th>
                <th className="px-5 py-3 font-semibold">Closed</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Opening</th>
                <th className="px-5 py-3 font-semibold text-right">Billing</th>
                <th className="px-5 py-3 font-semibold text-right">Receipts</th>
                <th className="px-5 py-3 font-semibold text-right">Payments</th>
                <th className="px-5 py-3 font-semibold text-right">Purchase</th>
                <th className="px-5 py-3 font-semibold text-right">Closing</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shiftsLoading && (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-blue-600" />
                    Loading shifts…
                  </td>
                </tr>
              )}
              {!shiftsLoading && shifts.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center">
                    <div className="inline-flex flex-col items-center text-gray-500">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="font-medium text-gray-700">No shifts found</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {hasFilters
                          ? 'Try adjusting the filters or clearing them.'
                          : 'This user has not opened any shifts yet.'}
                      </div>
                      {hasFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!shiftsLoading &&
                shifts.map((s) => {
                  const isOpen = s.status === 'OPEN';
                  return (
                    <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-3 font-mono text-blue-600 font-semibold">
                        {s.shiftNo}
                      </td>
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {new Date(s.shiftDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(s.openedAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                        {s.closedAt
                          ? new Date(s.closedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                            isOpen
                              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                          }`}
                        >
                          <CircleDot className="w-2.5 h-2.5" />
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-gray-700">
                        {formatINR(s.openingAmount)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {formatINR(s.billingTotal)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-indigo-700">
                        {formatINR(s.receiptTotal)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-rose-700">
                        {formatINR(s.paymentTotal)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-amber-700">
                        {formatINR(s.purchaseTotal)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-gray-900 font-semibold">
                        {formatINR(s.closingAmount)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                isOpen
                                  ? `/shift-management/shift-close?shiftId=${s.id}`
                                  : `/shift-management/${s.id}`,
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-md border border-blue-200 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => void openLogs(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-600 hover:text-white hover:bg-purple-600 rounded-md border border-purple-200 transition"
                            title="View activity logs for this shift"
                          >
                            <ScrollText className="w-3.5 h-3.5" /> Logs
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void shiftApi.downloadReport(s.id).catch((err) => {
                                console.error(err);
                                alert('Failed to download shift report');
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-md border border-emerald-200 transition"
                            title="Download detailed Excel report"
                          >
                            <Download className="w-3.5 h-3.5" /> Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {logsShift && (
        <ShiftLogsModal
          shift={logsShift}
          userName={fullName}
          logs={logs}
          loading={logsLoading}
          error={logsError}
          onClose={closeLogs}
        />
      )}
    </div>
  );
};

// ---------- Sub-components ----------

// Soft, low-saturation palette for action chips.
const ACTION_TONES: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-sky-50 text-sky-700 border-sky-200',
  CLOSE: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCEL: 'bg-rose-50 text-rose-700 border-rose-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  LOGIN: 'bg-slate-50 text-slate-600 border-slate-200',
  LOGOUT: 'bg-slate-50 text-slate-600 border-slate-200',
};

// Human-friendly title for action + resource combinations.
const RESOURCE_LABELS: Record<string, string> = {
  Shift: 'Shift',
  'Shift.TransferDenominations': 'Cash Denominations Transfer',
  SalesBill: 'Sales Bill',
  PurchaseBill: 'Purchase Bill',
  Token: 'Token',
  WeightSlip: 'Weight Slip',
  CashVoucher: 'Cash Voucher',
  FuelConsumption: 'Fuel Consumption',
  PurchaseConsumption: 'Purchase Consumption',
  PurchaseEntryPass: 'Purchase Entry Pass',
  CurrencyExchange: 'Currency Exchange',
  RawMaterialEntry: 'Raw Material Entry',
  CustomerFreeze: 'Customer Freeze',
  Role: 'Role',
  User: 'User',
  Setting: 'Setting',
};

const ACTION_VERBS: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  CLOSE: 'Closed',
  CANCEL: 'Cancelled',
  DELETE: 'Deleted',
  LOGIN: 'Logged in to',
  LOGOUT: 'Logged out of',
};

const describeEvent = (action: string, resource: string): string => {
  const verb = ACTION_VERBS[action] ?? action;
  const label = RESOURCE_LABELS[resource] ?? resource;
  if (action === 'LOGIN' || action === 'LOGOUT') return verb.replace(' to', '').replace(' of', '');
  return `${verb} ${label}`;
};

// Friendly label for a snake/camel case key.
const humanizeKey = (key: string): string => {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bId\b/g, 'ID')
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const MONEY_HINTS = /(amount|total|price|value|balance|paid|due|tax|gst|cgst|sgst|igst|cash|discount|opening|closing|received|payment|charge|fee|rate|cost)/i;
const DATE_HINTS = /(date|at|time|on)$/i;
const ID_HINTS = /id$/i;

const formatValue = (key: string, value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 italic">—</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${
          value ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  if (typeof value === 'number') {
    if (MONEY_HINTS.test(key)) {
      return (
        <span className="font-mono tabular-nums text-slate-800">
          ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }
    return <span className="font-mono tabular-nums text-slate-800">{value}</span>;
  }
  if (typeof value === 'string') {
    // ISO date detection
    if (DATE_HINTS.test(key) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return (
          <span className="text-slate-800">
            {d.toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        );
      }
    }
    if (MONEY_HINTS.test(key) && /^-?\d+(\.\d+)?$/.test(value)) {
      const n = Number(value);
      return (
        <span className="font-mono tabular-nums text-slate-800">
          ₹{n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }
    if (ID_HINTS.test(key) && value.length > 12) {
      return (
        <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
          {value}
        </span>
      );
    }
    return <span className="text-slate-800 break-words">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-slate-400 italic">empty</span>;
    }
    // Array of primitives → comma list
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return (
        <span className="text-slate-800">
          {value.map((v) => String(v)).join(', ')}
        </span>
      );
    }
    // Array of objects → mini-table-like blocks
    return (
      <div className="space-y-1.5 mt-0.5">
        {value.map((item, idx) => (
          <div
            key={idx}
            className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5"
          >
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5 font-semibold">
              Item {idx + 1}
            </div>
            <ObjectRows obj={item as Record<string, unknown>} dense />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5 mt-0.5">
        <ObjectRows obj={value as Record<string, unknown>} dense />
      </div>
    );
  }
  return <span className="text-slate-800">{String(value)}</span>;
};

const ObjectRows = ({
  obj,
  dense,
}: {
  obj: Record<string, unknown>;
  dense?: boolean;
}) => {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return <div className="text-xs italic text-slate-400">No details</div>;
  }
  return (
    <dl
      className={`grid grid-cols-1 ${
        dense ? '' : 'sm:grid-cols-2'
      } gap-x-6 gap-y-2 text-xs`}
    >
      {keys.map((k) => (
        <div key={k} className="flex flex-col gap-0.5 min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
            {humanizeKey(k)}
          </dt>
          <dd className="min-w-0 text-sm">{formatValue(k, obj[k])}</dd>
        </div>
      ))}
    </dl>
  );
};

const ChangeDetails = ({ changes }: { changes: unknown }) => {
  if (changes === null || changes === undefined) {
    return <div className="text-xs italic text-slate-400">No additional details</div>;
  }
  if (typeof changes !== 'object') {
    return <div className="text-xs text-slate-700">{String(changes)}</div>;
  }
  if (Array.isArray(changes)) {
    return <>{formatValue('items', changes)}</>;
  }
  return <ObjectRows obj={changes as Record<string, unknown>} />;
};

const ShiftLogsModal = ({
  shift,
  userName,
  logs,
  loading,
  error,
  onClose,
}: {
  shift: ShiftRow;
  userName: string;
  logs: AuditLogRow[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (soft slate, not bright) */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-slate-500" /> Shift Activity Logs
              </h2>
              <div className="text-xs text-slate-600 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Shift
                  <span className="font-mono font-semibold text-slate-800">{shift.shiftNo}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-800">{userName}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-800">
                    {new Date(shift.shiftDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-800">
                    {new Date(shift.openedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' – '}
                    {shift.closedAt
                      ? new Date(shift.closedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Now'}
                  </span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-white">
          {loading && (
            <div className="p-16 text-center text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-slate-400" />
              Loading logs…
            </div>
          )}
          {!loading && error && (
            <div className="p-6">
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <div className="text-sm text-rose-700">{error}</div>
              </div>
            </div>
          )}
          {!loading && !error && logs.length === 0 && (
            <div className="p-16 text-center">
              <div className="inline-flex flex-col items-center text-slate-500">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <ScrollText className="w-6 h-6 text-slate-400" />
                </div>
                <div className="font-medium text-slate-700">No activity logs</div>
                <div className="text-xs text-slate-500 mt-1">
                  No actions were recorded during this shift.
                </div>
              </div>
            </div>
          )}
          {!loading && !error && logs.length > 0 && (
            <ol className="relative px-6 py-5">
              <div className="absolute left-[26px] top-6 bottom-6 w-px bg-slate-200" />
              {logs.map((log, idx) => {
                const tone =
                  ACTION_TONES[log.action] ?? 'bg-slate-50 text-slate-700 border-slate-200';
                return (
                  <li key={log.id} className="relative pl-10 pb-5 last:pb-0">
                    <span className="absolute left-[18px] top-2 w-4 h-4 rounded-full bg-white border-2 border-slate-300 ring-2 ring-white" />
                    <div className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${tone}`}
                          >
                            {log.action}
                          </span>
                          <span className="text-sm font-medium text-slate-800">
                            {describeEvent(log.action, log.resource)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 inline-flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Structured changes */}
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <ChangeDetails changes={log.changes} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            {loading
              ? 'Loading…'
              : `${logs.length} ${logs.length === 1 ? 'activity' : 'activities'} during this shift`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


const toneStyles: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
};

const KpiCard = ({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: keyof typeof toneStyles;
}) => {
  const t = toneStyles[tone];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${t.bg} ${t.text} flex items-center justify-center ring-1 ${t.ring}`}>
          {icon}
        </div>
      </div>
      <div className="text-xs uppercase tracking-wide text-gray-500 font-medium">{label}</div>
      <div className="text-xl md:text-2xl font-bold text-gray-900 font-mono tabular-nums mt-1 truncate">
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
};

const MiniStat = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 hover:border-gray-300 transition">
    <div className={`${tone}`}>{icon}</div>
    <div className="min-w-0 flex-1">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{label}</div>
      <div className="text-sm font-semibold text-gray-900 font-mono tabular-nums truncate">
        {value}
      </div>
    </div>
  </div>
);
