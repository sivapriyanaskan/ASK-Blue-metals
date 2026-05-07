import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Edit as EditIcon, Loader2 } from 'lucide-react';
import { vehiclesApi, workCentresApi, describeError, type VehicleRow, type WorkCentreRow } from '../services/mastersApi';

export const VehicleMasterView = () => {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [workCentres, setWorkCentres] = useState<WorkCentreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workCentresApi.list({ pageSize: 200 }).then((r) => setWorkCentres(r.items)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    vehiclesApi
      .get(id)
      .then(setVehicle)
      .catch((err) => setError(describeError(err, 'Failed to load vehicle')))
      .finally(() => setLoading(false));
  }, [id]);

  const wcName = workCentres.find((w) => w.id === vehicle?.workCentreId)?.name ?? '-';

  return (
    <div className="p-6">
      <Link to="/masters/vehicle" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Vehicle List
      </Link>
      <div className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Details</h1>
        {vehicle && (
          <Link to={`/masters/vehicle/${vehicle.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <EditIcon className="w-4 h-4" /> Edit
          </Link>
        )}
      </div>

      {error && <div className="max-w-4xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {loading && <div className="max-w-4xl mx-auto mb-4 p-3 bg-gray-50 border border-gray-300 text-gray-700 rounded flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

      {vehicle && (
        <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-300 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Registration No." value={vehicle.registrationNumber} mono />
            <Field label="Name" value={vehicle.name} />
            <Field label="Work Centre" value={wcName} />
            <Field label="Status" value={vehicle.isActive ? 'Active' : 'Inactive'} />
            <Field label="Tank Capacity (L)" value={vehicle.tankCapacityLitres ?? '-'} />
            <Field label="Empty Weight (kg)" value={vehicle.emptyWeightKg ?? '-'} />
            <Field label="Meter Opening" value={vehicle.meterOpening ?? '-'} />
            <Field label="Meter Max" value={vehicle.meterMax ?? '-'} />
            <Field label="Hour Opening" value={vehicle.hourOpening ?? '-'} />
            <Field label="Hour Max" value={vehicle.hourMax ?? '-'} />
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type="text" value={String(value)} disabled className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 ${mono ? 'font-mono' : ''}`} />
  </div>
);
