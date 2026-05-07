import { FileText } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
}

export const Placeholder = ({ title, description }: PlaceholderProps) => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-300 p-12 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
          This page is available in the full ERP system
        </div>
      </div>
    </div>
  );
};
