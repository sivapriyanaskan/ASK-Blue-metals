import { Link } from 'react-router';
import { Sparkles, ArrowLeft } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
}

/**
 * Friendly placeholder for modules that are still being built out.
 */
export const ComingSoon = ({ title, description, backTo = '/dashboard', backLabel = 'Back to Dashboard' }: ComingSoonProps) => {
  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto bg-white border border-gray-300 rounded-lg p-10 text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 mb-6">
          {description ?? 'This module is on our roadmap and will arrive in a future release.'}
        </p>
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded p-3 mb-6 text-left">
          <strong>Available now:</strong> Master data (Items, Customers, Suppliers, Vehicles, Drivers, Banks, Accounts, Bill Sundries, Printers, Work Centres, Item Groups, Customer/Supplier rates, Freeze Item-to-Customer), User &amp; Role management, and Audit Logs.
        </div>
        <Link to={backTo} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
      </div>
    </div>
  );
};
