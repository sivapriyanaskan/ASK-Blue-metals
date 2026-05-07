import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Edit as EditIcon, Loader2 } from 'lucide-react';
import { workCentresApi, describeError, type WorkCentreRow } from '../services/mastersApi';

export const WorkCentreMasterView = () => {
  const { id } = useParams<{ id: string }>();
  const [wc, setWc] = useState<WorkCentreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    workCentresApi
      .get(id)
      .then(setWc)
      .catch((err) => setError(describeError(err, 'Failed to load work centre')))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="p-6">
      <Link to="/masters/work-centre" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Work Centre List
      </Link>
      <div className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Work Centre Details</h1>
        {wc && (
          <Link to={`/masters/work-centre/${wc.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <EditIcon className="w-4 h-4" /> Edit
          </Link>
        )}
      </div>

      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      {wc && (
        <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input type="text" value={wc.code} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={wc.name} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={wc.address ?? ''} disabled rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <input type="text" value={wc.isActive ? 'Active' : 'Inactive'} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
