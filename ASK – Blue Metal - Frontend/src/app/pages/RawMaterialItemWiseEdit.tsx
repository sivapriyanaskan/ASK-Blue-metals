import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Save, X, Calendar, Clock, Loader2 } from 'lucide-react';
import { SearchableDropdown } from '../components/ui/searchable-dropdown';
import { itemsApi, describeError, type ItemRow } from '../services/mastersApi';
import {
  rawMaterialEntryApi,
  type RawMaterialStatus,
} from '../services/operationsApi';

const splitDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    };
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
};

export const RawMaterialItemWiseEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const initial = splitDateTime(new Date().toISOString());

  const [items, setItems] = useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingEntry, setLoadingEntry] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entryNo, setEntryNo] = useState<string>('');
  const [status, setStatus] = useState<RawMaterialStatus>('SAVED');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [itemId, setItemId] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [consumed, setConsumed] = useState('');
  const [remarks, setRemarks] = useState('');

  // Load raw-material items.
  useEffect(() => {
    setLoadingItems(true);
    itemsApi
      .list({ pageSize: 200 })
      .then((res) => {
        setItems(res.items.filter((it) => it.isRawMaterial && it.isActive !== false));
      })
      .catch((err) => setError(describeError(err, 'Failed to load items')))
      .finally(() => setLoadingItems(false));
  }, []);

  // Load existing entry in edit mode.
  useEffect(() => {
    if (!id) return;
    setLoadingEntry(true);
    rawMaterialEntryApi
      .get(id)
      .then((entry) => {
        setEntryNo(entry.entryNo);
        setStatus(entry.status);
        const { date: d, time: t } = splitDateTime(entry.entryDateTime);
        setDate(d);
        setTime(t);
        setItemId(entry.itemId);
        setCurrentStock(String(entry.currentStockTonn));
        setConsumed(String(entry.consumedTonn));
        setRemarks(entry.remarks ?? '');
      })
      .catch((err) => setError(describeError(err, 'Failed to load entry')))
      .finally(() => setLoadingEntry(false));
  }, [id]);

  const closing = useMemo(() => {
    const c = parseFloat(currentStock) || 0;
    const u = parseFloat(consumed) || 0;
    return (c - u).toFixed(3);
  }, [currentStock, consumed]);

  const itemOptions = useMemo(
    () => items.map((it) => ({ value: it.id, label: `${it.code} – ${it.name}` })),
    [items],
  );

  const handleSave = async () => {
    setError(null);
    if (!itemId) {
      setError('Please select an item');
      return;
    }
    const c = parseFloat(currentStock);
    const u = parseFloat(consumed);
    if (Number.isNaN(c) || c < 0) {
      setError('Enter a valid current stock');
      return;
    }
    if (Number.isNaN(u) || u < 0) {
      setError('Enter a valid consumed quantity');
      return;
    }
    if (u > c) {
      setError('Consumed quantity cannot exceed current stock');
      return;
    }

    const entryDateTime = new Date(`${date}T${time}:00`).toISOString();

    setSaving(true);
    try {
      if (isEdit && id) {
        await rawMaterialEntryApi.update(id, {
          entryDateTime,
          itemId,
          currentStockTonn: Number(c.toFixed(3)),
          consumedTonn: Number(u.toFixed(3)),
          status,
          remarks: remarks.trim() || null,
        });
      } else {
        await rawMaterialEntryApi.create({
          entryDateTime,
          itemId,
          currentStockTonn: Number(c.toFixed(3)),
          consumedTonn: Number(u.toFixed(3)),
          status,
          source: 'ITEM_WISE',
          remarks: remarks.trim() || null,
        });
      }
      navigate('/production/item-wise');
    } catch (err) {
      setError(describeError(err, 'Failed to save entry'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate('/production/item-wise');

  if (loadingEntry || loadingItems) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit' : 'Create'} Raw Material Stock
        </h1>
        <p className="text-sm text-gray-500">Item-wise stock consumption entry.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Entry No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entry No</label>
            <input
              type="text"
              value={entryNo || (isEdit ? '' : 'Auto-generated on save')}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <SearchableDropdown
              options={[
                { value: 'SAVED', label: 'Saved' },
                { value: 'POSTED', label: 'Posted' },
              ]}
              value={status}
              onValueChange={(v) => setStatus(v as RawMaterialStatus)}
              placeholder="Select status"
              className="w-full"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Item */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={itemOptions}
              value={itemId}
              onValueChange={setItemId}
              placeholder="Select Item"
              className="w-full"
            />
          </div>

          {/* Current Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Curr.Stock (Tonn) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.000"
            />
          </div>

          {/* Consumed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consumed (Tonn) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={consumed}
              onChange={(e) => setConsumed(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.000"
            />
          </div>

          {/* Closing Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Closing (Tonn)
            </label>
            <input
              type="text"
              value={closing}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-semibold"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-calculated: Current Stock - Consumed</p>
          </div>

          {/* Remarks */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};
