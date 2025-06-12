import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProposalNegotiationDialog } from './ProposalNegotiationDialog';
import { ProposalHistoryDialog } from './ProposalHistoryDialog';
import { ProposalConfirmDialog } from './ProposalConfirmDialog';

interface TrackProposalsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle: string;
}

interface SyncProposal {
  id: string;
  project_type: string;
  sync_fee: number;
  expiration_date: string;
  is_urgent: boolean;
  status: string;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function TrackProposalsDialog({
  isOpen,
  onClose,
  trackId,
  trackTitle
}: TrackProposalsDialogProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<SyncProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<SyncProposal | null>(null);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject'>('accept');
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'expired'>('all');

  useEffect(() => {
    if (isOpen && trackId) {
      fetchProposals();
    }
  }, [isOpen, trackId, filter]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('sync_proposals')
        .select(`
          id,
          project_type,
          sync_fee,
          expiration_date,
          is_urgent,
          status,
          created_at,
          client:profiles!client_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setProposals(data);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleProposalAction = (proposal: SyncProposal, action: 'negotiate' | 'history' | 'accept' | 'reject') => {
    setSelectedProposal(proposal);
    
    switch (action) {
      case 'negotiate':
        setShowNegotiationDialog(true);
        break;
      case 'history':
        setShowHistoryDialog(true);
        break;
      case 'accept':
        setConfirmAction('accept');
        setShowConfirmDialog(true);
        break;
      case 'reject':
        setConfirmAction('reject');
        setShowConfirmDialog(true);
        break;
    }
  };

  const handleProposalStatusChange = async (action: 'accept' | 'reject') => {
    if (!selectedProposal || !user) return;
    
    try {
      // Update proposal status
      const { error } = await supabase
        .from('sync_proposals')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      // Create history entry
      const { error: historyError } = await supabase
        .from('proposal_history')
        .insert({
          proposal_id: selectedProposal.id,
          previous_status: 'pending',
          new_status: action === 'accept' ? 'accepted' : 'rejected',
          changed_by: user.id
        });

      if (historyError) throw historyError;

      // Send notification to client
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId: selectedProposal.id,
          action,
          trackTitle,
          clientEmail: selectedProposal.client.email
        })
      });

      // Update local state
      setProposals(proposals.map(p => 
        p.id === selectedProposal.id 
          ? { ...p, status: action === 'accept' ? 'accepted' : 'rejected' } 
          : p
      ));
      
      setShowConfirmDialog(false);
      setSelectedProposal(null);
    } catch (err) {
      console.error(`Error ${action}ing proposal:`, err);
      throw err;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Pending</span>;
      case 'accepted':
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">Accepted</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">Rejected</span>;
      case 'expired':
        return <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full text-xs">Expired</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Proposals for "{trackTitle}"</h2>
              <p className="text-gray-400">View and manage all sync proposals for this track</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4 flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'accepted'
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilter('expired')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === 'expired'
                  ? 'bg-gray-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Expired
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No proposals found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => {
                  const isExpired = new Date(proposal.expiration_date) < new Date();
                  const isPending = proposal.status === 'pending';
                  
                  return (
                    <div
                      key={proposal.id}
                      className="p-4 bg-white/5 rounded-lg border border-purple-500/10"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-medium">
                              {proposal.client.first_name} {proposal.client.last_name}
                            </p>
                            {getStatusBadge(proposal.status)}
                            {proposal.is_urgent && (
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">Urgent</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            Submitted: {new Date(proposal.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-green-400">${proposal.sync_fee.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            Expires: {new Date(proposal.expiration_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-black/20 rounded-lg p-3 mb-3">
                        <p className="text-gray-300 whitespace-pre-wrap">{proposal.project_type}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleProposalAction(proposal, 'history')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors flex items-center"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          View History
                        </button>
                        
                        {isPending && !isExpired && (
                          <>
                            <button
                              onClick={() => handleProposalAction(proposal, 'negotiate')}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Negotiate
                            </button>
                            <button
                              onClick={() => handleProposalAction(proposal, 'accept')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors flex items-center"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleProposalAction(proposal, 'reject')}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors flex items-center"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested Dialogs */}
      {selectedProposal && showNegotiationDialog && (
        <ProposalNegotiationDialog
          isOpen={showNegotiationDialog}
          onClose={() => {
            setShowNegotiationDialog(false);
            setSelectedProposal(null);
            fetchProposals(); // Refresh proposals after negotiation
          }}
          proposalId={selectedProposal.id}
          currentOffer={selectedProposal.sync_fee}
          clientName={`${selectedProposal.client.first_name} ${selectedProposal.client.last_name}`}
          trackTitle={trackTitle}
        />
      )}

      {selectedProposal && showHistoryDialog && (
        <ProposalHistoryDialog
          isOpen={showHistoryDialog}
          onClose={() => {
            setShowHistoryDialog(false);
            setSelectedProposal(null);
          }}
          proposalId={selectedProposal.id}
        />
      )}

      {selectedProposal && showConfirmDialog && (
        <ProposalConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => {
            setShowConfirmDialog(false);
            setSelectedProposal(null);
          }}
          onConfirm={() => handleProposalStatusChange(confirmAction)}
          action={confirmAction}
          trackTitle={trackTitle}
          clientName={`${selectedProposal.client.first_name} ${selectedProposal.client.last_name}`}
        />
      )}
    </>
  );
}
