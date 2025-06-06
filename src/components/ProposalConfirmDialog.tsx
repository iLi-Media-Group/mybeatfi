import React, { useState } from 'react';
import { X, AlertTriangle, Check, XCircle, Loader2 } from 'lucide-react';

interface ProposalConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: 'accept' | 'reject';
  proposal: any;
}

export default function ProposalConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  proposal
}: ProposalConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  
  // Handle click outside to close dialog
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } catch (error) {
      console.error(`Error ${action}ing proposal:`, error);
    } finally {
      setLoading(false);
    }
  };

  const trackTitle = proposal?.track?.title || 'this track';
  const clientName = proposal?.client?.first_name || proposal?.client?.last_name
  ? `${proposal?.client?.first_name ?? ''} ${proposal?.client?.last_name ?? ''}`.trim()
  : 'the client';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div ref={dialogRef} className="bg-gray-900 p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
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

        <p className="text-gray-300 mb-6">
          Are you sure you want to {action} the sync proposal for "{trackTitle}" from {clientName}?
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
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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