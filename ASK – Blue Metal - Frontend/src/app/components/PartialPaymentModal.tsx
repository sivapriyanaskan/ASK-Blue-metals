import { AlertCircle } from 'lucide-react';

interface PartialPaymentModalProps {
  isOpen: boolean;
  remainingAmount: number;
  receivableAmount: number;
  onAllow: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const PartialPaymentModal = ({
  isOpen,
  remainingAmount,
  receivableAmount,
  onAllow,
  onCancel,
  isSubmitting = false,
}: PartialPaymentModalProps) => {
  if (!isOpen) return null;

  const receivedAmount = receivableAmount - remainingAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold">Incomplete Payment</h3>
        </div>

        <div className="space-y-3 bg-orange-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receivable Amount:</span>
            <span className="font-mono font-medium">₹{receivableAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount Received:</span>
            <span className="font-mono font-medium text-green-700">₹{receivedAmount.toFixed(2)}</span>
          </div>
          <div className="border-t border-orange-200 pt-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-orange-900">Remaining Amount:</span>
              <span className="font-mono font-bold text-orange-700">₹{remainingAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          You can allow this partial payment and defer the remaining balance to the customer's next bill.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel & Edit
          </button>
          <button
            type="button"
            onClick={onAllow}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Processing...' : 'Allow & Save'}
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
          Remaining balance: ₹{remainingAmount.toFixed(2)} will be added to customer account and due on next bill.
        </div>
      </div>
    </div>
  );
};
