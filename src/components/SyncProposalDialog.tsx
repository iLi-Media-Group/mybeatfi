import React, { useState } from 'react';
import { X, Clock, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';


interface SyncProposalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
}

export function SyncProposalDialog({ isOpen, onClose, track }: SyncProposalDialogProps) {
  const { user } = useAuth();
  const [projectType, setProjectType] = useState('');
  const [duration, setDuration] = useState('');
  const [isExclusive, setIsExclusive] = useState(false);
  const [syncFee, setSyncFee] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<'immediate' | 'net30' | 'net60' | 'net90'>('immediate');
  const [expirationDate, setExpirationDate] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<{ first_name?: string, last_name?: string } | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        if (data) setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      if (!projectType.trim()) {
        throw new Error('Please describe your project');
      }

      if (!duration.trim()) {
        throw new Error('Please specify the duration');
      }

      if (!syncFee.trim() || isNaN(parseFloat(syncFee))) {
        throw new Error('Please enter a valid sync fee');
      }

      if (!expirationDate) {
        throw new Error('Please select an expiration date');
      }

      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('sync_proposals')
        .insert({
          track_id: track.id,
          client_id: user.id,
          project_type: projectType,
          duration,
          is_exclusive: isExclusive,
          sync_fee: parseFloat(syncFee),
          payment_terms: paymentTerms,
          expiration_date: new Date(expirationDate).toISOString(),
          is_urgent: isUrgent,
          status: 'pending',
          negotiation_status: 'pending'
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Send notification through edge function
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-negotiation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId: proposal.id,
          senderId: user.id,
          message: projectType,
          syncFee: parseFloat(syncFee),
          recipientEmail: track.artist // This should be the producer's email
        })
      });

      onClose();
    } catch (err) {
      console.error('Error submitting proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-purple-500/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Submit Sync Proposal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client Name
            </label>
            <input
              type="text"
              value={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''}
              disabled
              className="w-full opacity-75"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Description
            </label>
            <textarea
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              maxLength={800}
              rows={4}
              className="w-full"
              placeholder="Describe your project and how you plan to use the music..."
              required
            />
            <p className="mt-1 text-sm text-gray-400">
              {projectType.length}/800 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration of Use
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full"
              placeholder="e.g., 1 year, perpetual"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isExclusive}
              onChange={(e) => setIsExclusive(e.target.checked)}
              className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <label className="text-gray-300">
              Exclusive Rights
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sync Fee Offer
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={syncFee}
                  onChange={(e) => setSyncFee(e.target.value)}
                  className="w-full pl-10"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as typeof paymentTerms)}
                className="w-full"
                required
              >
                <option value="immediate">Immediate upon Acceptance</option>
                <option value="net30">Net 30</option>
                <option value="net60">Net 60</option>
                <option value="net90">Net 90</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Proposal Expiration Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full pl-10"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <label className="text-gray-300">
              Urgent Proposal (Response within 48 hours)
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Clock className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Submitting...
                </span>
              ) : (
                'Submit Proposal'
              )}
            </button>
          </div>
          
          <div className="mt-4">
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-400">or</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>
          </div>              
        </form>
      </div>
    </div>
  );
}
