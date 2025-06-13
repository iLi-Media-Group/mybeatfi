import React from 'react';
import { X, AlertTriangle, Check, XCircle, Loader2 } from 'lucide-react';

interface ProposalConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'accept' | 'reject';
  proposal: any;
}

export function ProposalConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  proposal
}: ProposalConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  if (!isOpen) return null;
  
  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(`Error ${action}ing proposal:`, err);
      setError(`Failed to ${action} proposal. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-bold text-white">Confirm {action === 'accept' ? 'Acceptance' : 'Rejection'}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <p className="text-gray-300 mb-6">
          Are you sure you want to {action} the sync proposal for "{proposal?.track?.title}" from {proposal?.client?.first_name} {proposal?.client?.last_name}?
          {action === 'reject' && (
            <span className="block mt-2 text-yellow-400">
              This action cannot be undone.
            </span>
          )}
        </p>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              action === 'accept'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : action === 'accept' ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Accept Proposal
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Reject Proposal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
