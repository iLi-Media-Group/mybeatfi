import React, { useState, useEffect } from 'react';
import { X, Clock, User, MessageSquare, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProposalHistoryDialogProps {
  proposal: any;
  onClose: () => void;
}

interface HistoryEntry {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  created_at: string;
  changer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface NegotiationMessage {
  id: string;
  sender: {
    first_name: string;
    last_name: string;
    email: string;
  };
  message: string;
  counter_offer?: number;
  counter_terms?: string;
  created_at: string;
}

export default function ProposalHistoryDialog({
  proposal,
  onClose
}: ProposalHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'negotiations'>('history');

  useEffect(() => {
    if (proposal?.id) {
      fetchHistory();
      fetchNegotiations();
    }
  }, [proposal?.id]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('proposal_history')
        .select(`
          id,
          previous_status,
          new_status,
          changed_by,
          created_at,
          changer:profiles!changed_by (
            first_name,
            last_name,
            email
          )
        `)
        .eq('proposal_id', proposal.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setHistory(data);
    } catch (err) {
      console.error('Error fetching proposal history:', err);
      setError('Failed to load proposal history');
    }
  };

  const fetchNegotiations = async () => {
    try {
      const { data, error } = await supabase
        .from('proposal_negotiations')
        .select(`
          id,
          message,
          counter_offer,
          counter_terms,
          created_at,
          sender:profiles!sender_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('proposal_id', proposal.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setNegotiations(data);
    } catch (err) {
      console.error('Error fetching negotiations:', err);
      setError('Failed to load negotiations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'accepted':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      case 'negotiating':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-xl border border-purple-500/20 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Proposal History</h2>
            <p className="text-gray-400">
              {proposal?.track?.title} - {proposal?.client?.full_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-blue-500/20">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            Status History
          </button>
          <button
            onClick={() => setActiveTab('negotiations')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'negotiations'
                ? 'bg-purple-600 text-white'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            Negotiations ({negotiations.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No status changes recorded</p>
                    </div>
                  ) : (
                    history.map((entry) => (
                      <div key={entry.id} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-white font-medium">
                              {entry.changer.first_name} {entry.changer.last_name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${getStatusColor(entry.previous_status)}`}>
                            {entry.previous_status}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`text-sm ${getStatusColor(entry.new_status)}`}>
                            {entry.new_status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'negotiations' && (
                <div className="space-y-4">
                  {negotiations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">No negotiations recorded</p>
                    </div>
                  ) : (
                    negotiations.map((msg) => (
                      <div key={msg.id} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-400">
                              {msg.sender.first_name} {msg.sender.last_name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white mb-2">{msg.message}</p>
                        {msg.counter_offer && (
                          <div className="flex items-center space-x-1 text-green-400 text-sm">
                            <DollarSign className="w-3 h-3" />
                            <span>Counter Offer: ${msg.counter_offer.toFixed(2)}</span>
                          </div>
                        )}
                        {msg.counter_terms && (
                          <div className="flex items-center space-x-1 text-blue-400 text-sm mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>Terms: {msg.counter_terms}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}