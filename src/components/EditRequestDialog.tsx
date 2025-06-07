import React, { useState } from 'react';
import { X, Loader2, Calendar } from 'lucide-react'; 

interface EditRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    project_title: string;
    project_description: string;
    sync_fee: number;
    end_date: string;
  };
  onSave: (updatedRequest: Partial<{
    project_title: string;
    project_description: string;
    sync_fee: number;
    end_date: string;
  }>) => Promise<void>;
}

export function EditRequestDialog({ isOpen, onClose, request, onSave }: EditRequestDialogProps) {
  const [title, setTitle] = useState(request.project_title);
  const [description, setDescription] = useState(request.project_description);
  const [syncFee, setSyncFee] = useState(request.sync_fee.toString());
  const [endDate, setEndDate] = useState(request.end_date ? new Date(request.end_date).toISOString().split('T')[0] : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      await onSave({
        project_title: title,
        project_description: description,
        sync_fee: parseFloat(syncFee)
        end_date: endDate ? new Date(endDate).toISOString() : request.end_date
      });

      onClose();
    } catch (err) {
      console.error('Error updating request:', err);
      setError('Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-lg">
        <h3 className="text-xl font-bold text-white mb-4">Edit Sync Request</h3> 
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sync Fee
            </label>
            <input
              type="number"
              value={syncFee}
              onChange={(e) => setSyncFee(e.target.value)}
              className="w-full"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Due Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}