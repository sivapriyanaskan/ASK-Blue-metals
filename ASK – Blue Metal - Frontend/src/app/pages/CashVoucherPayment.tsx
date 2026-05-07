import { useState } from 'react';
import { Save, DollarSign, FileText } from 'lucide-react';
import { suppliers } from '../data/mockData';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';

interface CashVoucher {
  voucherNo: string;
  date: string;
  paymentTo: string;
  paymentType: 'Supplier' | 'Employee' | 'Expense';
  amount: number;
  paymentMode: 'Cash' | 'Cheque' | 'NEFT';
  particulars: string;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  createdBy: string;
}

const mockVouchers: CashVoucher[] = [
  {
    voucherNo: 'CV-0001',
    date: '2026-02-28',
    paymentTo: 'RK Stone Suppliers',
    paymentType: 'Supplier',
    amount: 50000,
    paymentMode: 'Cash',
    particulars: 'Payment for raw material purchase',
    createdBy: 'admin'
  },
  {
    voucherNo: 'CV-0002',
    date: '2026-02-27',
    paymentTo: 'Electricity Board',
    paymentType: 'Expense',
    amount: 15000,
    paymentMode: 'Cheque',
    particulars: 'Monthly electricity bill payment',
    chequeNo: 'CHQ-123456',
    chequeDate: '2026-02-27',
    bankName: 'State Bank of India',
    createdBy: 'admin'
  }
];

export const CashVoucherPayment = () => {
  const [vouchers, setVouchers] = useState<CashVoucher[]>(mockVouchers);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    paymentTo: '',
    paymentType: 'Supplier' as 'Supplier' | 'Employee' | 'Expense',
    amount: 0,
    paymentMode: 'Cash' as 'Cash' | 'Cheque' | 'NEFT',
    particulars: '',
    chequeNo: '',
    chequeDate: '',
    bankName: ''
  });
  
  const [denominations, setDenominations] = useState({
    '2000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0
  });
  const [cashPaid, setCashPaid] = useState(0);

  const handleDenominationChange = (denom: string, count: number) => {
    const newDenominations = { ...denominations, [denom]: count };
    setDenominations(newDenominations);
    
    const total = Object.entries(newDenominations).reduce((sum, [denomination, qty]) => {
      return sum + (parseInt(denomination) * qty);
    }, 0);
    
    setCashPaid(total);
    setFormData({ ...formData, amount: total });
  };

  const handleSave = () => {
    if (!formData.paymentTo || !formData.amount || !formData.particulars) {
      alert('Please fill all required fields');
      return;
    }

    const newVoucher: CashVoucher = {
      voucherNo: 'CV-' + String(vouchers.length + 1).padStart(4, '0'),
      date: formData.date,
      paymentTo: formData.paymentTo,
      paymentType: formData.paymentType,
      amount: formData.amount,
      paymentMode: formData.paymentMode,
      particulars: formData.particulars,
      chequeNo: formData.chequeNo,
      chequeDate: formData.chequeDate,
      bankName: formData.bankName,
      createdBy: 'admin'
    };

    setVouchers([newVoucher, ...vouchers]);
    alert(`Cash voucher created successfully!\nVoucher No: ${newVoucher.voucherNo}\nAmount: ₹${formData.amount}`);
    setShowForm(false);
  };

  const handlePrint = (voucherNo: string) => {
    alert(`Printing Cash Voucher: ${voucherNo}`);
  };

  if (showForm) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Cash Voucher</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-3xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={[
                  { label: 'Supplier Payment', value: 'Supplier' },
                  { label: 'Employee Payment', value: 'Employee' },
                  { label: 'Expense Payment', value: 'Expense' }
                ]}
                value={formData.paymentType}
                onValueChange={(val) => setFormData({ ...formData, paymentType: val as any })}
                placeholder="Select Payment Type"
                className="w-full"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment To <span className="text-red-500">*</span>
              </label>
              {formData.paymentType === 'Supplier' ? (
                <SearchableDropdown
                  options={suppliers.map(s => ({ label: s.name, value: s.name }))}
                  value={formData.paymentTo}
                  onValueChange={(val) => setFormData({ ...formData, paymentTo: val })}
                  placeholder="Select Supplier"
                  className="w-full"
                />
              ) : (
                <input
                  type="text"
                  value={formData.paymentTo}
                  onChange={(e) => setFormData({ ...formData, paymentTo: e.target.value })}
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={[
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Cheque', value: 'Cheque' },
                  { label: 'NEFT/Bank Transfer', value: 'NEFT' }
                ]}
                value={formData.paymentMode}
                onValueChange={(val) => setFormData({ ...formData, paymentMode: val as any })}
                placeholder="Select Payment Mode"
                className="w-full"
              />
            </div>

            {formData.paymentMode === 'Cheque' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque No
                  </label>
                  <input
                    type="text"
                    value={formData.chequeNo}
                    onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </>
            )}

            {formData.paymentMode === 'Cash' && (
              <div className="col-span-2">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-600 text-white rounded text-xs">CASH</span>
                    Cash Denomination Tracking
                  </h4>
                  
                  {/* Denomination Details */}
                  <div className="bg-white rounded-lg border-2 border-red-300 p-3">
                    <h5 className="font-semibold text-sm mb-2 text-red-900 border-b border-red-200 pb-2">
                      Denomination Details (Cash Paid Out)
                    </h5>
                    <div className="bg-white rounded border border-gray-300 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-red-100 border-b border-gray-300">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Denominations</th>
                            <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Nos</th>
                            <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(denominations).map(([denom, count], idx) => {
                            const amount = parseInt(denom) * count;
                            const isEven = idx % 2 === 0;
                            return (
                              <tr key={denom} className={`border-b border-gray-300 last:border-b-0 ${isEven ? 'bg-red-50' : 'bg-white'}`}>
                                <td className="px-2 py-1.5 font-bold text-center text-red-900">{denom}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="number"
                                    value={count}
                                    onChange={(e) => handleDenominationChange(denom, parseInt(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-semibold"
                                    min="0"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono font-semibold">
                                  {amount.toFixed(0)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded flex justify-between items-center">
                      <span className="text-xs font-bold text-red-900">Total Cash Paid:</span>
                      <span className="font-mono font-bold text-red-900">₹{cashPaid.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Particulars <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.particulars}
                onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
                rows={3}
                placeholder="Enter payment details..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              <Save className="w-4 h-4" />
              Save Voucher
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Voucher Payment</h1>
          <p className="text-gray-600">Create cash payment vouchers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          <DollarSign className="w-4 h-4" />
          New Voucher
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Vouchers</div>
          <div className="text-2xl font-bold text-gray-900">{vouchers.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Total Amount Paid</div>
          <div className="text-2xl font-bold text-red-600">
            ₹{vouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-300 p-4">
          <div className="text-sm text-gray-600">Today's Payments</div>
          <div className="text-2xl font-bold text-blue-600">
            {vouchers.filter(v => v.date === new Date().toISOString().split('T')[0]).length}
          </div>
        </div>
      </div>

      {/* Vouchers List */}
      <div className="bg-white rounded-lg border border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vouchers.map((voucher) => (
                <tr key={voucher.voucherNo} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {voucher.voucherNo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{voucher.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{voucher.paymentTo}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                      {voucher.paymentType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    ₹{voucher.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{voucher.paymentMode}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handlePrint(voucher.voucherNo)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};