import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface DeleteTrackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trackTitle: string;
  onConfirm: () => Promise<void>;
}

export function DeleteTrackDialog({ isOpen, onClose, trackTitle, onConfirm }: DeleteTrackDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error deleting track:', err);
      setError('Failed to delete track');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">Delete Track</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Are you sure you want to delete "{trackTitle}"? This action cannot be undone.
          </p>
          
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-sm">
                Deleting this track will remove it from your catalog and make it unavailable for future licensing.
                Any existing licenses will remain valid until their expiration date.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Deleting...
              </span>
            ) : (
              <span>Delete Track</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
