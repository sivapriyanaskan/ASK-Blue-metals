import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { purchaseBillApi, rawMaterialEntryApi, type PurchaseBillRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

interface PurchaseBill {
  id: string;
  billNo: string;
  billDate: string;
  supplierName: string;
  itemId: string;
  itemName: string;
  qty: number;
}

interface LineItem {
  id: string;
  isSelected: boolean;
  purchaseBillId: string;
  purchaseNoSnapshot: string;
  purchaseDateSnapshot: string;
  supplierNameSnapshot: string;
  itemId: string;
  itemNameSnapshot: string;
  purchaseQty: number;
  productionQty: number;
  balanceQty: number;
}

const formatBillDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export const RawMaterialPurchaseWiseEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingBills, setLoadingBills] = useState(true);

  useEffect(() => {
    setLoadingBills(true);
    purchaseBillApi.list({ status: 'POSTED', pageSize: 200 })
      .then((res) => {
        const rows: PurchaseBill[] = res.items.map((b: PurchaseBillRow) => ({
          id: b.id,
          billNo: b.purchaseNo,
          billDate: formatBillDate(b.purchaseDateTime),
          supplierName: b.supplierNameSnapshot,
          itemId: b.itemId,
          itemName: b.itemNameSnapshot,
          qty: Number(b.netWeight) || 0,
        }));        setPurchaseBills(rows);
      })
      .catch((err) => setLoadError(describeError(err, 'Failed to load purchase bills')))
      .finally(() => setLoadingBills(false));
  }, []);
  const [formData, setFormData] = useState({
    productionPurchaseWiseId: '',
    entryNo: 'RPW-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
    entryDateTime: new Date().toISOString().slice(0, 16),
    status: 'SAVED' as 'SAVED' | 'POSTED' | 'CANCELLED',
    remarks: ''
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      isSelected: false,
      purchaseBillId: '',
      purchaseNoSnapshot: '',
      purchaseDateSnapshot: '',
      supplierNameSnapshot: '',
      itemId: '',
      itemNameSnapshot: '',
      purchaseQty: 0,
      productionQty: 0,
      balanceQty: 0
    }
  ]);

  const calculateBalanceQty = (purchaseQty: number, productionQty: number) => {
    return purchaseQty - productionQty;
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    if (field === 'purchaseBillId') {
      const selectedBill = purchaseBills.find(b => b.id === value);
      if (selectedBill) {
        newLineItems[index].purchaseNoSnapshot = selectedBill.billNo;
        newLineItems[index].purchaseDateSnapshot = selectedBill.billDate;
        newLineItems[index].supplierNameSnapshot = selectedBill.supplierName;
        newLineItems[index].itemId = selectedBill.itemId;
        newLineItems[index].itemNameSnapshot = selectedBill.itemName;
        newLineItems[index].purchaseQty = selectedBill.qty;
        newLineItems[index].balanceQty = calculateBalanceQty(selectedBill.qty, newLineItems[index].productionQty);
        // Auto-select the row when a bill is chosen so totals reflect the line.
        newLineItems[index].isSelected = true;
      }
    }

    if (field === 'productionQty') {
      const productionQty = typeof value === 'number' ? value : 0;
      newLineItems[index].balanceQty = calculateBalanceQty(newLineItems[index].purchaseQty, productionQty);
      
      // Auto-update Item Wise consumed stock
      if (productionQty > 0 && newLineItems[index].itemNameSnapshot) {
        // This would call an API to update Raw Material Item Wise consumedTonn
        console.log('Auto-updating Item Wise consumed stock:', {
          itemName: newLineItems[index].itemNameSnapshot,
          consumedTonn: productionQty
        });
      }
    }

    if (field === 'purchaseQty') {
      newLineItems[index].balanceQty = calculateBalanceQty(newLineItems[index].purchaseQty, newLineItems[index].productionQty);
    }

    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        isSelected: false,
        purchaseBillId: '',
        purchaseNoSnapshot: '',
        purchaseDateSnapshot: '',
        supplierNameSnapshot: '',
        itemId: '',
        itemNameSnapshot: '',
        purchaseQty: 0,
        productionQty: 0,
        balanceQty: 0
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const [saving, setSaving] = useState(false);

  // When editing, load the existing entry. Re-runs once purchase bills are
  // available so we can match the original purchase bill back into the row.
  useEffect(() => {
    if (!id || loadingBills) return;
    rawMaterialEntryApi.get(id)
      .then((entry) => {
        // Try to extract the purchase bill number from the remarks (we store
        // "<user remarks> | Purchase: <billNo>" on create).
        const remarks = entry.remarks ?? '';
        const purchaseMatch = remarks.match(/Purchase:\s*([^|]+)\s*$/);
        const purchaseNo = purchaseMatch?.[1]?.trim();
        const userRemarks = purchaseMatch
          ? remarks.replace(/\s*\|\s*Purchase:\s*[^|]+\s*$/, '').trim()
          : remarks;
        const matchedBill = purchaseNo
          ? purchaseBills.find((b) => b.billNo === purchaseNo)
          : undefined;

        setFormData((f) => ({
          ...f,
          entryNo: entry.entryNo,
          entryDateTime: entry.entryDateTime ? new Date(entry.entryDateTime).toISOString().slice(0, 16) : f.entryDateTime,
          status: entry.status,
          remarks: userRemarks,
        }));

        const purchaseQty = Number(entry.currentStockTonn) || 0;
        const productionQty = Number(entry.consumedTonn) || 0;
        setLineItems([{
          id: '1',
          isSelected: true,
          purchaseBillId: matchedBill?.id ?? '',
          purchaseNoSnapshot: matchedBill?.billNo ?? purchaseNo ?? '',
          purchaseDateSnapshot: matchedBill?.billDate ?? '',
          supplierNameSnapshot: matchedBill?.supplierName ?? '',
          itemId: entry.itemId,
          itemNameSnapshot: entry.itemNameSnapshot,
          purchaseQty,
          productionQty,
          balanceQty: purchaseQty - productionQty,
        }]);
      })
      .catch((err) => setLoadError(describeError(err, 'Failed to load entry')));
  }, [id, loadingBills, purchaseBills]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.entryDateTime) {
      alert('Entry Date Time is required');
      return;
    }

    const selected = lineItems.filter(item => item.isSelected);
    if (selected.length === 0) {
      alert('At least one line item must be selected');
      return;
    }

    const invalidLines = selected.filter(item => !item.itemId || item.productionQty <= 0);
    if (invalidLines.length > 0) {
      alert('All selected line items must have an item and a positive production qty');
      return;
    }

    const overAllocatedLines = selected.filter(item => item.productionQty > item.purchaseQty);
    if (overAllocatedLines.length > 0) {
      alert('Production qty cannot exceed purchase qty for any line item');
      return;
    }

    setSaving(true);
    try {
      // Purchase Bill netWeight is already stored in tons (per-ton billing).
      const entryDateTime = new Date(formData.entryDateTime).toISOString();
      if (id) {
        // Edit mode: update the single entry from the first selected line.
        const line = selected[0];
        await rawMaterialEntryApi.update(id, {
          entryDateTime,
          itemId: line.itemId,
          currentStockTonn: Number(line.purchaseQty.toFixed(3)),
          consumedTonn: Number(line.productionQty.toFixed(3)),
          status: formData.status,
          remarks: formData.remarks || null,
        });
      } else {
        for (const line of selected) {
          await rawMaterialEntryApi.create({
            entryDateTime,
            itemId: line.itemId,
            currentStockTonn: Number(line.purchaseQty.toFixed(3)),
            consumedTonn: Number(line.productionQty.toFixed(3)),
            status: formData.status,
            source: 'PURCHASE_WISE',
            remarks: formData.remarks
              ? `${formData.remarks} | Purchase: ${line.purchaseNoSnapshot}`
              : `Purchase: ${line.purchaseNoSnapshot}`,
          });
        }
      }
      navigate('/production/purchase-wise');
    } catch (err) {
      alert(describeError(err, 'Failed to save raw material entry'));
    } finally {
      setSaving(false);
    }
  };

  const totalPurchaseQty = lineItems.filter(i => i.isSelected).reduce((sum, item) => sum + item.purchaseQty, 0);
  const totalProductionQty = lineItems.filter(i => i.isSelected).reduce((sum, item) => sum + item.productionQty, 0);
  const totalBalanceQty = lineItems.filter(i => i.isSelected).reduce((sum, item) => sum + item.balanceQty, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit' : 'Create'} Raw Material - Purchase Wise</h1>
        <p className="text-gray-600">Track raw material consumption by purchase</p>
      </div>

      {loadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
          {loadError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="font-semibold mb-4 pb-2 border-b">Basic Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.entryNo}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Date Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.entryDateTime}
                  onChange={(e) => setFormData({ ...formData, entryDateTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={[
                    { value: 'SAVED', label: 'Saved' },
                    { value: 'POSTED', label: 'Posted' },
                    { value: 'CANCELLED', label: 'Cancelled' }
                  ]}
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  placeholder="Select Status"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Purchase-Wise Allocation Details */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h3 className="font-semibold">Purchase-Wise Allocation Details</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Line
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Select</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Purchase Bill <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Purchase No</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Purchase Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Supplier</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item Name</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Purchase Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      Production Qty <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Balance Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={(e) => handleLineItemChange(index, 'isSelected', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <SearchableDropdown
                          options={[
                            { value: '', label: loadingBills ? 'Loading...' : (purchaseBills.length === 0 ? 'No posted purchase bills' : 'Select Purchase Bill') },
                            ...purchaseBills.map(bill => ({
                              value: bill.id,
                              label: bill.billNo,
                              description: `${bill.supplierName} · ${bill.itemName} · ${bill.qty.toLocaleString('en-IN', { minimumFractionDigits: 3 })} T`,
                            }))
                          ]}
                          value={item.purchaseBillId}
                          onValueChange={(value) => handleLineItemChange(index, 'purchaseBillId', value)}
                          placeholder="Select Purchase Bill"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.purchaseNoSnapshot}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.purchaseDateSnapshot}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.supplierNameSnapshot}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.itemNameSnapshot}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.purchaseQty > 0 ? item.purchaseQty.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.purchaseQty}
                          value={item.productionQty}
                          onChange={(e) => handleLineItemChange(index, 'productionQty', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          required={item.isSelected}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.balanceQty > 0 ? item.balanceQty.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-orange-50 font-semibold text-orange-900 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 font-semibold text-gray-900 text-right">Selected Totals:</td>
                    <td className="px-4 py-3 font-bold text-blue-600">
                      {totalPurchaseQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">
                      {totalProductionQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-bold text-orange-600">
                      {totalBalanceQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex gap-3 justify-end">
              <Link
                to="/production/purchase-wise"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5 inline mr-2" />
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5 inline mr-2" />
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};