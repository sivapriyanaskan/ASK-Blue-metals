import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { HardwareStatus } from '../components/HardwareStatus';
import { TrendingUp, TrendingDown, Users, Package, DollarSign, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Link } from 'react-router';
import {
  tokenApi, purchaseEntryPassApi, salesBillApi, purchaseBillApi, shiftApi,
  type SalesBillRow, type PurchaseBillRow, type TokenRow,
} from '../services/operationsApi';

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStartStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const HOUR_SLOTS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

const hourSlot = (isoStr: string): string => {
  const hr = new Date(isoStr).getHours();
  let slot = 6;
  for (const h of [6, 8, 10, 12, 14, 16, 18, 20]) {
    if (hr >= h) slot = h;
  }
  return `${String(slot).padStart(2, '0')}:00`;
};

export const Dashboard = () => {
  const { user, shiftStatus } = useAppContext();

  const [todayTokens, setTodayTokens] = useState<TokenRow[]>([]);
  const [todayPassesTotal, setTodayPassesTotal] = useState(0);
  const [todaySales, setTodaySales] = useState<SalesBillRow[]>([]);
  const [todayPurchase, setTodayPurchase] = useState<PurchaseBillRow[]>([]);
  const [monthSales, setMonthSales] = useState<SalesBillRow[]>([]);
  const [monthPurchase, setMonthPurchase] = useState<PurchaseBillRow[]>([]);
  const [cashInHand, setCashInHand] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    const t = todayStr();
    const ms = monthStartStr();

    const results = await Promise.allSettled([
      tokenApi.list({ dateFrom: t, dateTo: t, pageSize: 200 }),                          // 0
      purchaseEntryPassApi.list({ dateFrom: t, dateTo: t, pageSize: 200 }),               // 1
      salesBillApi.list({ dateFrom: t, dateTo: t, status: 'POSTED', pageSize: 200 }),    // 2
      purchaseBillApi.list({ dateFrom: t, dateTo: t, status: 'POSTED', pageSize: 200 }), // 3
      salesBillApi.list({ dateFrom: ms, dateTo: t, status: 'POSTED', pageSize: 200 }),   // 4
      purchaseBillApi.list({ dateFrom: ms, dateTo: t, status: 'POSTED', pageSize: 200 }),// 5
      shiftApi.list({ status: 'OPEN', pageSize: 1 }),                                    // 6
    ]);

    const ok = <T,>(r: PromiseSettledResult<T>): T | null =>
      r.status === 'fulfilled' ? r.value : null;

    const tokens = ok(results[0]);
    const passes = ok(results[1]);
    const sales = ok(results[2]);
    const purchase = ok(results[3]);
    const mSales = ok(results[4]);
    const mPurchase = ok(results[5]);
    const shift = ok(results[6]);

    setTodayTokens(tokens?.items ?? []);
    setTodayPassesTotal(passes?.total ?? 0);
    setTodaySales(sales?.items ?? []);
    setTodayPurchase(purchase?.items ?? []);
    setMonthSales(mSales?.items ?? []);
    setMonthPurchase(mPurchase?.items ?? []);

    const openShift = shift?.items?.[0];
    setCashInHand(openShift ? Number(openShift.cashInHand) : 0);

    setLoading(false);
    setLastRefreshed(new Date());
  };

  useEffect(() => { void load(); }, []);

  // --- derived stats ---
  const openTokens = useMemo(() => todayTokens.filter(t => t.status === 'OPEN'), [todayTokens]);
  const cancelledTokens = useMemo(() => todayTokens.filter(t => t.status === 'CANCELLED'), [todayTokens]);

  const todaySalesTotal = useMemo(() => todaySales.reduce((s, b) => s + Number(b.totalAmount), 0), [todaySales]);
  const todayPurchaseTotal = useMemo(() => todayPurchase.reduce((s, b) => s + Number(b.grossPayable), 0), [todayPurchase]);

  const cashAmt = useMemo(() => todaySales.reduce((s, b) => s + Number(b.cashAmount), 0), [todaySales]);
  const onlineAmt = useMemo(() => todaySales.reduce((s, b) => s + Number(b.onlineAmount), 0), [todaySales]);
  const creditAmt = useMemo(() => todaySales.reduce((s, b) => s + Number(b.creditAmount), 0), [todaySales]);

  const paymentModeData = useMemo(() => {
    const arr = [
      { id: 'cash', name: 'Cash', value: Math.round(cashAmt), color: '#10b981' },
      { id: 'online', name: 'Online', value: Math.round(onlineAmt), color: '#3b82f6' },
      { id: 'credit', name: 'Credit', value: Math.round(creditAmt), color: '#f59e0b' },
    ];
    return arr.filter(p => p.value > 0);
  }, [cashAmt, onlineAmt, creditAmt]);

  const itemSalesData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of todaySales) {
      map[b.item.name] = (map[b.item.name] ?? 0) + Number(b.netWeight);
    }
    return Object.entries(map)
      .map(([item, qty]) => ({ item, qty: Math.round(qty * 100) / 100 }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [todaySales]);

  const activityChart = useMemo(() => {
    const slotMap: Record<string, { sales: number; purchase: number }> = {};
    for (const h of HOUR_SLOTS) slotMap[h] = { sales: 0, purchase: 0 };
    for (const b of todaySales) {
      const slot = hourSlot(b.createdAt);
      if (slotMap[slot]) slotMap[slot].sales += Number(b.totalAmount);
    }
    for (const b of todayPurchase) {
      const slot = hourSlot(b.createdAt);
      if (slotMap[slot]) slotMap[slot].purchase += Number(b.grossPayable);
    }
    return HOUR_SLOTS.map(time => ({
      time,
      sales: Math.round(slotMap[time].sales),
      purchase: Math.round(slotMap[time].purchase),
    }));
  }, [todaySales, todayPurchase]);

  const monthSalesTotal = useMemo(() => monthSales.reduce((s, b) => s + Number(b.totalAmount), 0), [monthSales]);
  const monthPurchaseTotal = useMemo(() => monthPurchase.reduce((s, b) => s + Number(b.grossPayable), 0), [monthPurchase]);
  const outstandingCredit = useMemo(() => monthSales.reduce((s, b) => s + Number(b.creditAmount), 0), [monthSales]);
  const roundingAdjustments = useMemo(() => todaySales.reduce((s, b) => s + Math.abs(Number(b.roundOff)), 0), [todaySales]);
  const cashPct = useMemo(() => todaySalesTotal > 0 ? Math.round((cashAmt / todaySalesTotal) * 100) : 0, [cashAmt, todaySalesTotal]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-gray-500 text-sm">Loading live data from database…</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 pb-3 border-b border-gray-300 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-400">
              Updated {lastRefreshed.toLocaleTimeString('en-IN')}
            </span>
          )}
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Operator Dashboard */}
      {(user.role === 'Admin' || user.role === 'Weighbridge Operator') && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Operations Overview
            <span className="text-sm font-normal text-gray-400 ml-2">Today</span>
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Today Tokens</span>
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{todayTokens.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {todayTokens.filter(t => t.status === 'BILLED').length} billed &middot; {openTokens.length} open
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Entry Passes</span>
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{todayPassesTotal}</div>
              <div className="text-xs text-gray-500 mt-1">Purchase entry passes</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Pending Tokens</span>
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{openTokens.length}</div>
              <div className="text-xs text-gray-500 mt-1">Awaiting billing</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Cancelled Today</span>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{cancelledTokens.length}</div>
              <div className="text-xs text-gray-500 mt-1">Token cancellations</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="bg-white rounded-lg border border-gray-300 p-4">
                <h3 className="font-semibold mb-1">Today's Activity</h3>
                <p className="text-xs text-gray-400 mb-4">Cumulative sales & purchase by hour (INR)</p>
                {activityChart.every(d => d.sales === 0 && d.purchase === 0) ? (
                  <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    No transactions recorded today
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220} key="ops-activity-chart">
                    <AreaChart data={activityChart}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <Tooltip formatter={(v: number) => INR(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" name="Sales" />
                      <Area type="monotone" dataKey="purchase" stroke="#10b981" fillOpacity={1} fill="url(#colorPurchase)" name="Purchase" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <HardwareStatus />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <Link to="/operations/token-creation" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all">
              <div className="font-semibold mb-1">Create Token</div>
              <div className="text-sm opacity-90">Empty vehicle entry</div>
            </Link>
            <Link to="/operations/purchase-entry-pass" className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all">
              <div className="font-semibold mb-1">Purchase Entry Pass</div>
              <div className="text-sm opacity-90">Loaded vehicle entry</div>
            </Link>
            <Link to="/operations/token-cancel" className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-lg hover:from-red-700 hover:to-red-800 transition-all">
              <div className="font-semibold mb-1">Cancel Token</div>
              <div className="text-sm opacity-90">Requires approval</div>
            </Link>
          </div>
        </div>
      )}

      {/* Billing Dashboard */}
      {(user.role === 'Admin' || user.role === 'Billing Staff') && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Billing Overview
            <span className="text-sm font-normal text-gray-400 ml-2">Today</span>
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Today Sales</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{INR(todaySalesTotal)}</div>
              <div className="text-xs text-gray-500 mt-1">From {todaySales.length} bills</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Today Purchase</span>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{INR(todayPurchaseTotal)}</div>
              <div className="text-xs text-gray-500 mt-1">From {todayPurchase.length} bills</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Cash Collected</span>
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{INR(cashAmt)}</div>
              {todaySalesTotal > 0 ? (
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  {cashPct}% of total sales
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">No sales today</div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Pending Credits</span>
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{INR(creditAmt)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {todaySales.filter(b => Number(b.creditAmount) > 0).length} credit bills today
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <h3 className="font-semibold mb-4">Payment Mode Distribution</h3>
              {paymentModeData.length === 0 ? (
                <div className="flex items-center justify-center h-36 text-gray-400 text-sm">No sales today</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180} key="billing-pie-chart-container">
                    <PieChart>
                      <Pie
                        data={paymentModeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {paymentModeData.map((entry) => (
                          <Cell key={`cell-${entry.id}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => INR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-2">
                    {paymentModeData.map((item) => (
                      <div key={`legend-${item.id}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{INR(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="col-span-2 bg-white rounded-lg border border-gray-300 p-4">
              <h3 className="font-semibold mb-1">Item-wise Sales (Tons)</h3>
              <p className="text-xs text-gray-400 mb-3">Today's net weight by item</p>
              {itemSalesData.length === 0 ? (
                <div className="flex items-center justify-center h-36 text-gray-400 text-sm">No sales today</div>
              ) : (
                <ResponsiveContainer width="100%" height={180} key="billing-bar-chart-container">
                  <BarChart data={itemSalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="item" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => [`${v} T`, 'Weight']} />
                    <Bar name="Net Weight (T)" dataKey="qty" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link to="/operations/sales-bill" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all">
              <div className="font-semibold mb-1">Create Sales Bill</div>
              <div className="text-sm opacity-90">Tax invoice for customer</div>
            </Link>
            <Link to="/operations/purchase-bill" className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all">
              <div className="font-semibold mb-1">Create Purchase Bill</div>
              <div className="text-sm opacity-90">Bill for supplier</div>
            </Link>
          </div>
        </div>
      )}

      {/* Supervisor Dashboard */}
      {(user.role === 'Admin' || user.role === 'Supervisor') && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Supervisor Monitoring
            <span className="text-sm font-normal text-gray-400 ml-2">Today</span>
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">Total Tokens</div>
              <div className="text-3xl font-bold text-blue-600">{todayTokens.length}</div>
              <div className="text-xs text-gray-500 mt-1">Created today</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">Cancellations</div>
              <div className="text-3xl font-bold text-red-600">{cancelledTokens.length}</div>
              <div className="text-xs text-gray-500 mt-1">Today's total</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">Rounding Adjustments</div>
              <div className="text-3xl font-bold text-blue-600">{INR(roundingAdjustments)}</div>
              <div className="text-xs text-gray-500 mt-1">Total today</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">Pending Bills</div>
              <div className="text-3xl font-bold text-yellow-600">{openTokens.length}</div>
              <div className="text-xs text-gray-500 mt-1">Open tokens unbilled</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-300 p-4">
            <h3 className="font-semibold mb-3">Cancelled Tokens Today</h3>
            {cancelledTokens.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No cancellations today</div>
            ) : (
              <div className="space-y-2">
                {cancelledTokens.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded">
                    <div>
                      <div className="font-medium text-sm">Token #{t.tokenNo} — {t.vehicleNo}</div>
                      <div className="text-xs text-gray-600">
                        Customer: {t.customer.name} &nbsp;|&nbsp; Item: {t.item.name}
                        {t.cancelledReason && <>&nbsp;|&nbsp; Reason: {t.cancelledReason}</>}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Cancelled</span>
                  </div>
                ))}
                {cancelledTokens.length > 5 && (
                  <p className="text-xs text-gray-400 text-center">+{cancelledTokens.length - 5} more cancellations</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accounts Dashboard */}
      {(user.role === 'Admin' || user.role === 'Accounts') && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Financial Overview
            <span className="text-sm font-normal text-gray-400 ml-2">This Month</span>
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">Cash In Hand</div>
              <div className="text-2xl font-bold text-green-600">{INR(cashInHand)}</div>
              <div className="text-xs text-gray-500 mt-1">Current open shift</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">Outstanding Credit</div>
              <div className="text-2xl font-bold text-yellow-600">{INR(outstandingCredit)}</div>
              <div className="text-xs text-gray-500 mt-1">Credit sales this month</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">This Month Sales</div>
              <div className="text-2xl font-bold text-blue-600">{INR(monthSalesTotal)}</div>
              <div className="text-xs text-gray-500 mt-1">{monthSales.length} bills</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-4">
              <div className="text-sm text-gray-600 mb-2">This Month Purchase</div>
              <div className="text-2xl font-bold text-purple-600">{INR(monthPurchaseTotal)}</div>
              <div className="text-xs text-gray-500 mt-1">{monthPurchase.length} bills</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Link
              to="/reports/sales-register"
              className="bg-white border border-gray-300 p-4 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="font-semibold mb-1">Sales Register</div>
              <div className="text-sm text-gray-600">View all sales transactions</div>
            </Link>
            <Link
              to="/reports/purchase-register"
              className="bg-white border border-gray-300 p-4 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="font-semibold mb-1">Purchase Register</div>
              <div className="text-sm text-gray-600">View all purchase transactions</div>
            </Link>
            <Link
              to="/admin/audit-logs"
              className="bg-white border border-gray-300 p-4 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="font-semibold mb-1">Audit Logs</div>
              <div className="text-sm text-gray-600">Track all system changes</div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
