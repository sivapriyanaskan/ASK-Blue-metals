import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { SearchableDropdown, type SearchableDropdownOption } from './ui/searchable-dropdown';

interface PaymentSectionProps {
  paymentMode: 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED';
  setPaymentMode: (mode: 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED') => void;
  paymentModeClassName?: string;
  receivableAmount: number;
  receivedAmount: number;
  setReceivedAmount: (amount: number) => void;
  balanceAmount: number;
  setBalanceAmount: (amount: number) => void;
  
  // Cash fields
  denominations: Record<string, number>;
  setDenominations: (denom: Record<string, number>) => void;
  returnedDenominations: Record<string, number>;
  setReturnedDenominations: (denom: Record<string, number>) => void;
  cashCollected: number;
  setCashCollected: (amount: number) => void;
  balanceToBeGiven: number;
  setBalanceToBeGiven: (amount: number) => void;
  
  // Online fields
  bankId: string;
  setBankId: (id: string) => void;
  accountNo: string;
  setAccountNo: (no: string) => void;
  transactionNo: string;
  setTransactionNo: (no: string) => void;
  digitalPayment: number;
  setDigitalPayment: (amount: number) => void;
  banks: any[];
  
  // Credit fields
  crRefNo: string;
  setCrRefNo: (ref: string) => void;

  // Live cash-in-hand denomination breakdown from the currently open shift.
  // Used to show the cashier how many notes of each denomination are
  // physically available before they decide how much change to return.
  inHandDenominations?: Record<string, number>;
}

export const PaymentSection = (props: PaymentSectionProps) => {
  const {
    paymentMode, setPaymentMode, paymentModeClassName, receivableAmount, receivedAmount, setReceivedAmount,
    balanceAmount, setBalanceAmount, denominations, setDenominations, returnedDenominations,
    setReturnedDenominations, cashCollected, setCashCollected, balanceToBeGiven, setBalanceToBeGiven,
    bankId, setBankId, accountNo, setAccountNo, transactionNo, setTransactionNo, digitalPayment,
    setDigitalPayment, banks, crRefNo, setCrRefNo, inHandDenominations,
  } = props;

  const inHand = inHandDenominations ?? {};

  // Payment mode options
  const paymentModeOptions: SearchableDropdownOption[] = [
    { label: 'CASH', value: 'CASH', description: 'Cash payment with denominations' },
    { label: 'ONLINE', value: 'ONLINE', description: 'Digital/Online payment' },
    { label: 'CREDIT', value: 'CREDIT', description: 'Credit sale (pay later)' },
    { label: 'MIXED', value: 'MIXED', description: 'Cash + Online payment' },
  ];

  // Bank options
  const bankOptions: SearchableDropdownOption[] = banks
    .filter(b => b.isActive)
    .map(bank => ({
      label: bank.bankName,
      value: bank.id,
      description: bank.accountNumber,
    }));

  const inwardDenominationRows = useMemo(
    () =>
      Object.entries(denominations)
        .filter(([denom]) => Number(denom) !== 2000)
        .sort((a, b) => Number(b[0]) - Number(a[0])),
    [denominations],
  );

  const outwardDenominationRows = useMemo(
    () =>
      Object.entries(returnedDenominations)
        .filter(([denom]) => Number(denom) !== 2000)
        .sort((a, b) => Number(b[0]) - Number(a[0])),
    [returnedDenominations],
  );

  const handleDenominationChange = (denom: string, count: number) => {
    const newDenominations = { ...denominations, [denom]: count };
    setDenominations(newDenominations);
    
    const total = Object.entries(newDenominations).reduce((sum, [denomination, qty]) => {
      return sum + (parseInt(denomination) * qty);
    }, 0);
    
    setCashCollected(total);
    
    if (paymentMode === 'CASH') {
      setReceivedAmount(total);
      // Do NOT auto-calculate balanceToBeGiven - it must come from denomination out entries only
      setBalanceAmount(receivableAmount - total);
    } else if (paymentMode === 'MIXED') {
      setReceivedAmount(total + digitalPayment);
      setBalanceAmount(receivableAmount - (total + digitalPayment));
    }
  };

  const handleReturnedDenominationChange = (denom: string, count: number) => {
    const newReturnedDenominations = { ...returnedDenominations, [denom]: count };
    setReturnedDenominations(newReturnedDenominations);
    
    const total = Object.entries(newReturnedDenominations).reduce((sum, [denomination, qty]) => {
      return sum + (parseInt(denomination) * qty);
    }, 0);
    
    setBalanceToBeGiven(total);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-6">
      <h3 className="font-semibold mb-4">Payment Details *</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
          <SearchableDropdown
            className={paymentModeClassName}
            options={paymentModeOptions}
            value={paymentMode}
            onValueChange={(value) => {
              const newMode = value as 'CASH' | 'ONLINE' | 'CREDIT' | 'MIXED';
              setPaymentMode(newMode);
              
              if (newMode === 'CREDIT') {
                setReceivedAmount(0);
                setBalanceAmount(receivableAmount);
              } else if (newMode === 'ONLINE') {
                setReceivedAmount(digitalPayment);
                setBalanceAmount(receivableAmount - digitalPayment);
              } else if (newMode === 'CASH') {
                setReceivedAmount(cashCollected);
                setBalanceAmount(receivableAmount - cashCollected);
                // Do NOT auto-calculate balanceToBeGiven - it must come from denomination out entries only
              } else if (newMode === 'MIXED') {
                setReceivedAmount(cashCollected + digitalPayment);
                setBalanceAmount(receivableAmount - (cashCollected + digitalPayment));
              }
            }}
            placeholder="Select Payment Mode"
            searchPlaceholder="Search payment modes..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receivable Amount</label>
          <div className="px-3 py-2 border border-gray-300 rounded-lg bg-yellow-50 font-mono font-bold text-lg text-orange-900">
            ₹{receivableAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* CASH Mode */}
      {paymentMode === 'CASH' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs">CASH</span>
            Cash Denomination Tracking
          </h4>
          
          {/* Two denomination tables side by side */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Denomination Inward Details (Cash received FROM customer) */}
            <div className="bg-white rounded-lg border-2 border-blue-300 p-3">
              <h5 className="font-semibold text-sm mb-2 text-blue-900 border-b border-blue-200 pb-2">
                Denomination Inward Details
              </h5>
              <div className="bg-white rounded border border-gray-300 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-blue-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Denominations</th>
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Nos</th>
                      <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inwardDenominationRows.map(([denom, count], idx) => {
                      const amount = parseInt(denom) * count;
                      const isEven = idx % 2 === 0;
                      return (
                        <tr key={denom} className={`border-b border-gray-300 last:border-b-0 ${isEven ? 'bg-blue-50' : 'bg-white'}`}>
                          <td className="px-2 py-1.5 font-bold text-center text-blue-900">{denom}</td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              value={count === 0 ? '' : count}
                              onChange={(e) => handleDenominationChange(denom, parseInt(e.target.value) || 0)}
                              className={`w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-semibold ${idx === 0 ? 'payment-cash-first-input' : ''}`}
                              min="0"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">
                            {amount > 0 ? amount.toFixed(0) : '–'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded flex justify-between items-center">
                <span className="text-xs font-bold text-green-900">Total Collected:</span>
                <span className="font-mono font-bold text-green-900">₹{cashCollected.toFixed(2)}</span>
              </div>
            </div>

            {/* Denomination Out Details (Cash returned TO customer) */}
            <div className="bg-white rounded-lg border-2 border-orange-300 p-3">
              <h5 className="font-semibold text-sm mb-2 text-orange-900 border-b border-orange-200 pb-2">
                Denomination Out Details
              </h5>
              
              <div className="bg-white rounded border border-gray-300 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-orange-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Denominations</th>
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">In Hand</th>
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Nos</th>
                      <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outwardDenominationRows.map(([denom, count], idx) => {
                      const amount = parseInt(denom) * count;
                      const isEven = idx % 2 === 0;
                      const available = Number(inHand[denom] ?? 0);
                      return (
                        <tr key={denom} className={`border-b border-gray-300 last:border-b-0 ${isEven ? 'bg-orange-50' : 'bg-white'}`}>
                          <td className="px-2 py-1.5 font-bold text-center text-orange-900">{denom}</td>
                          <td className="px-2 py-1.5 text-center text-xs font-semibold text-purple-700">
                            {available > 0 ? `${denom} × ${available}` : '–'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              value={count === 0 ? '' : count}
                              onChange={(e) => handleReturnedDenominationChange(denom, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-semibold"
                              min="0"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">
                            {amount > 0 ? amount.toFixed(0) : '–'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded flex justify-between items-center">
                <span className="text-xs font-bold text-yellow-900">Total Returned:</span>
                <span className="font-mono font-bold text-yellow-900">₹{balanceToBeGiven.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Expected Balance Indicator - Moved Here */}
          {cashCollected > receivableAmount && (
            <div className="mb-3 p-3 bg-blue-50 border-2 border-blue-400 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-blue-900">Expected Balance to Return:</span>
                <span className="font-mono font-bold text-blue-900 text-2xl">₹{(cashCollected - receivableAmount).toFixed(2)}</span>
              </div>
              <div className="text-xs text-blue-800 mb-2">
                Enter denomination counts above that total this amount
              </div>
              {balanceToBeGiven > 0 && balanceToBeGiven !== (cashCollected - receivableAmount) && (
                <div className="mt-2 pt-2 border-t border-blue-300">
                  {balanceToBeGiven < (cashCollected - receivableAmount) 
                    ? <span className="text-sm text-red-700 font-bold">❌ Short by ₹{((cashCollected - receivableAmount) - balanceToBeGiven).toFixed(2)}</span>
                    : <span className="text-sm text-red-700 font-bold">❌ Excess by ₹{(balanceToBeGiven - (cashCollected - receivableAmount)).toFixed(2)}</span>
                  }
                </div>
              )}
              {balanceToBeGiven > 0 && balanceToBeGiven === (cashCollected - receivableAmount) && (
                <div className="mt-2 pt-2 border-t border-blue-300">
                  <span className="text-sm text-green-700 font-bold">✓ Denomination Out matches exactly!</span>
                </div>
              )}
            </div>
          )}
          
          {/* Summary Section */}
          <div className="grid grid-cols-4 gap-3 bg-white rounded-lg border-2 border-gray-300 p-3">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Cash Received</div>
              <div className="font-mono font-bold text-blue-900 text-lg">₹{cashCollected.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Receivable</div>
              <div className="font-mono font-bold text-gray-900 text-lg">₹{receivableAmount.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Balance Returned</div>
              <div className="font-mono font-bold text-yellow-900 text-lg">₹{balanceToBeGiven.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Net Status</div>
              <div className={`font-mono font-bold text-lg ${
                (cashCollected - balanceToBeGiven) === receivableAmount ? 'text-green-900' : 'text-red-900'
              }`}>
                {(cashCollected - balanceToBeGiven) === receivableAmount ? '✓ Settled' : '✗ Pending'}
              </div>
            </div>
          </div>
          
          {/* Validation Messages */}
          {(cashCollected - balanceToBeGiven) < receivableAmount && (
            <div className="mt-3 p-2 bg-red-100 border border-red-400 rounded text-sm font-medium text-red-900">
              ❌ Short payment: ₹{(receivableAmount - (cashCollected - balanceToBeGiven)).toFixed(2)} still due
            </div>
          )}
          
          {(cashCollected - balanceToBeGiven) > receivableAmount && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm font-medium text-yellow-900">
              ⚠ Overpayment: Adjust denomination out to balance properly
            </div>
          )}
          
          {(cashCollected - balanceToBeGiven) === receivableAmount && balanceToBeGiven > 0 && (
            <div className="mt-3 p-2 bg-green-100 border border-green-400 rounded text-sm font-medium text-green-900">
              ✓ Transaction balanced. Return ₹{balanceToBeGiven.toFixed(2)} to customer.
            </div>
          )}
        </div>
      )}

      {/* ONLINE Mode */}
      {paymentMode === 'ONLINE' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <span className="px-2 py-1 bg-green-600 text-white rounded text-xs">ONLINE</span>
            Online Payment Details
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Bank *</label>
              <SearchableDropdown
                options={bankOptions}
                value={bankId}
                onValueChange={(value) => setBankId(value)}
                placeholder="Select Bank"
                searchPlaceholder="Search..."
                className="h-8 payment-bank-enter-target"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Transaction No *</label>
              <input
                type="text"
                value={transactionNo}
                onChange={(e) => setTransactionNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="TXN123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Digital Payment Amount *</label>
              <input
                type="number"
                value={digitalPayment === 0 ? '' : digitalPayment}
                onChange={(e) => {
                  const amt = parseFloat(e.target.value) || 0;
                  setDigitalPayment(amt);
                  setReceivedAmount(amt);
                  setBalanceAmount(receivableAmount - amt);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Balance Amount</label>
              <div className={`px-3 py-2 border rounded-lg font-mono font-bold ${
                balanceAmount === 0 ? 'bg-green-100 border-green-300 text-green-900' : 'bg-red-100 border-red-300 text-red-900'
              }`}>
                ₹{balanceAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREDIT Mode */}
      {paymentMode === 'CREDIT' && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <span className="px-2 py-1 bg-orange-600 text-white rounded text-xs">CREDIT</span>
            Credit Sale Details
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Reference No *</label>
              <input
                type="text"
                value={crRefNo}
                onChange={(e) => setCrRefNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono bg-white payment-credit-ref-input"
                placeholder="CR/2026/123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Amount</label>
              <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono font-bold">
                ₹0.00
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Balance Amount (Due)</label>
              <div className="px-3 py-2 border border-orange-300 rounded-lg bg-orange-100 font-mono font-bold text-orange-900 text-lg">
                ₹{receivableAmount.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-800">
            <strong>Note:</strong> Full amount will be recorded as receivable. Customer will pay later.
          </div>
        </div>
      )}

      {/* MIXED Mode */}
      {paymentMode === 'MIXED' && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
            <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs">MIXED</span>
            Mixed Payment (Cash + Online)
          </h4>
          
          {/* Dual Denomination Tracking */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Denomination Inward Details */}
            <div className="bg-white rounded-lg border-2 border-blue-300 p-3">
              <h5 className="font-semibold text-sm mb-2 text-blue-900 border-b border-blue-200 pb-2">
                Denomination Inward Details
              </h5>
              <div className="bg-white rounded border border-gray-300 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-blue-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Denominations</th>
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Nos</th>
                      <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inwardDenominationRows.map(([denom, count], idx) => {
                      const amount = parseInt(denom) * count;
                      const isEven = idx % 2 === 0;
                      return (
                        <tr key={denom} className={`border-b border-gray-300 last:border-b-0 ${isEven ? 'bg-blue-50' : 'bg-white'}`}>
                          <td className="px-2 py-1.5 font-bold text-center text-blue-900">{denom}</td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              value={count === 0 ? '' : count}
                              onChange={(e) => handleDenominationChange(denom, parseInt(e.target.value) || 0)}
                              className={`w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-semibold ${idx === 0 ? 'payment-cash-first-input' : ''}`}
                              min="0"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">
                            {amount > 0 ? amount.toFixed(0) : '–'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded flex justify-between items-center">
                <span className="text-xs font-bold text-green-900">Cash Collected:</span>
                <span className="font-mono font-bold text-green-900">₹{cashCollected.toFixed(2)}</span>
              </div>
            </div>

            {/* Denomination Out Details */}
            <div className="bg-white rounded-lg border-2 border-orange-300 p-3">
              <h5 className="font-semibold text-sm mb-2 text-orange-900 border-b border-orange-200 pb-2">
                Denomination Out Details
              </h5>
              
              <div className="bg-white rounded border border-gray-300 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-orange-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700">Denominations</th>
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">In Hand</th>
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700">Nos</th>
                      <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outwardDenominationRows.map(([denom, count], idx) => {
                      const amount = parseInt(denom) * count;
                      const isEven = idx % 2 === 0;
                      const available = Number(inHand[denom] ?? 0);
                      return (
                        <tr key={denom} className={`border-b border-gray-300 last:border-b-0 ${isEven ? 'bg-orange-50' : 'bg-white'}`}>
                          <td className="px-2 py-1.5 font-bold text-center text-orange-900">{denom}</td>
                          <td className="px-2 py-1.5 text-center text-xs font-semibold text-purple-700">
                            {available > 0 ? `${denom} × ${available}` : '–'}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              value={count === 0 ? '' : count}
                              onChange={(e) => handleReturnedDenominationChange(denom, parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-semibold"
                              min="0"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">
                            {amount > 0 ? amount.toFixed(0) : '–'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded flex justify-between items-center">
                <span className="text-xs font-bold text-yellow-900">Cash Returned:</span>
                <span className="font-mono font-bold text-yellow-900">₹{balanceToBeGiven.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Expected Balance Indicator for MIXED - Moved Here */}
          {(cashCollected + digitalPayment) > receivableAmount && (
            <div className="mb-3 p-3 bg-blue-50 border-2 border-blue-400 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-blue-900">Expected Cash Balance to Return:</span>
                <span className="font-mono font-bold text-blue-900 text-2xl">₹{(cashCollected - (receivableAmount - digitalPayment)).toFixed(2)}</span>
              </div>
              <div className="text-xs text-blue-800 mb-2">
                Enter cash denomination counts above that total this amount
              </div>
              {balanceToBeGiven > 0 && balanceToBeGiven !== (cashCollected - (receivableAmount - digitalPayment)) && (
                <div className="mt-2 pt-2 border-t border-blue-300">
                  {balanceToBeGiven < (cashCollected - (receivableAmount - digitalPayment))
                    ? <span className="text-sm text-red-700 font-bold">❌ Short by ₹{((cashCollected - (receivableAmount - digitalPayment)) - balanceToBeGiven).toFixed(2)}</span>
                    : <span className="text-sm text-red-700 font-bold">❌ Excess by ₹{(balanceToBeGiven - (cashCollected - (receivableAmount - digitalPayment))).toFixed(2)}</span>
                  }
                </div>
              )}
              {balanceToBeGiven > 0 && balanceToBeGiven === (cashCollected - (receivableAmount - digitalPayment)) && (
                <div className="mt-2 pt-2 border-t border-blue-300">
                  <span className="text-sm text-green-700 font-bold">✓ Denomination Out matches exactly!</span>
                </div>
              )}
            </div>
          )}
          
          {/* Online Payment Section */}
          <div className="mb-4 bg-white rounded-lg border border-gray-300 p-3">
            <div className="font-medium text-sm mb-3 text-green-900 border-b border-green-200 pb-2">Online Payment Details</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">Bank *</label>
                <SearchableDropdown
                  options={banks.filter(b => b.isActive).map(bank => ({
                    value: bank.id,
                    label: bank.bankName
                  }))}
                  value={bankId}
                  onValueChange={setBankId}
                  placeholder="Select Bank"
                  searchPlaceholder="Search banks..."
                  className="payment-bank-enter-target"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">Transaction No *</label>
                <input
                  type="text"
                  value={transactionNo}
                  onChange={(e) => setTransactionNo(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 font-mono bg-white"
                  placeholder="TXN123456789"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">Digital Payment *</label>
                <input
                  type="number"
                  value={digitalPayment === 0 ? '' : digitalPayment}
                  onChange={(e) => {
                    const amt = parseFloat(e.target.value) || 0;
                    setDigitalPayment(amt);
                    setReceivedAmount(cashCollected + amt);
                    setBalanceAmount(receivableAmount - (cashCollected + amt));
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 font-mono bg-white"
                />
              </div>
            </div>
          </div>
          
          {/* Summary Section */}
          <div className="bg-white border-2 border-purple-300 rounded-lg p-3">
            <div className="grid grid-cols-5 gap-2 text-sm">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Cash In</div>
                <div className="font-mono font-bold text-blue-900">₹{cashCollected.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Cash Out</div>
                <div className="font-mono font-bold text-orange-900">₹{balanceToBeGiven.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Digital</div>
                <div className="font-mono font-bold text-green-900">₹{digitalPayment.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Total Received</div>
                <div className="font-mono font-bold text-purple-900">₹{((cashCollected - balanceToBeGiven) + digitalPayment).toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Status</div>
                <div className={`font-mono font-bold ${
                  ((cashCollected - balanceToBeGiven) + digitalPayment) === receivableAmount ? 'text-green-900' : 'text-red-900'
                }`}>
                  {((cashCollected - balanceToBeGiven) + digitalPayment) === receivableAmount ? '✓ OK' : '✗ Diff'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};