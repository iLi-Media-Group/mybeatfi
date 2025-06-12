import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface DeleteLicenseDialogProps {
  onClose: () => void;
  license: {
    track: {
      title: string;
    };
    expiry_date: string;
  };
  onConfirm: () => Promise<void>;
}

export function DeleteLicenseDialog({ onClose, license, onConfirm }: DeleteLicenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error deleting license:', err);
      setError('Failed to delete license');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = new Date(license.expiry_date) <= new Date();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-4">Delete License</h3> 
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Are you sure you want to delete your license for "{license.track.title}"?
          </p>
          
          {!isExpired && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">
                This license is still valid until {new Date(license.expiry_date).toLocaleDateString()}.
                Deleting it will revoke your rights to use this track after the expiration date.
              </p>
            </div>
          )}
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
              <span>Delete License</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
