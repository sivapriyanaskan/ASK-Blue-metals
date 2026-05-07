import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Loader2, Printer, Edit } from 'lucide-react';
import { commonPrinterSettingsApi, type CommonPrinterSettingRow } from '../services/operationsApi';
import { describeError } from '../services/mastersApi';

const fmtDt = (s: string) => s ? new Date(s).toLocaleString('en-IN') : '-';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value ?? '-'}</div>
  </div>
);

export const CommonPrinterSettingsDetails = () => {
  const { id } = useParams();
  const [setting, setSetting] = useState<CommonPrinterSettingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    commonPrinterSettingsApi.get(id)
      .then(setSetting)
      .catch(e => setError(describeError(e, 'Failed to load printer setting')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;
  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded m-6">{error}</div>;
  if (!setting) return <div className="p-6 text-gray-500">Printer setting not found.</div>;

  return (
    <div className="p-6">
      <Link to="/settings/common-printer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Printer Settings
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Printer className="w-7 h-7 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Printer Setting Details</h1>
            <p className="text-gray-600 text-sm">{setting.formName.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <Link to={`/settings/common-printer/\${id}/edit`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Edit className="w-4 h-4" /> Edit
        </Link>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Form Name" value={setting.formName.replace(/_/g, ' ')} />
            <Row label="Printer" value={setting.printerName || 'Not assigned'} />
            <Row label="Default Copies" value={setting.defaultCopies} />
            <Row label="Status" value={
              <span className={`px-2 py-0.5 rounded text-xs font-medium \${setting.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {setting.isActive ? 'Active' : 'Inactive'}
              </span>
            } />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-300 p-5">
          <h3 className="font-semibold mb-4 pb-2 border-b text-sm uppercase text-gray-500 tracking-wide">Audit</h3>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Created At" value={fmtDt(setting.createdAt)} />
            <Row label="Updated At" value={fmtDt(setting.updatedAt)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommonPrinterSettingsDetails;
