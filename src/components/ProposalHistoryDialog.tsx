import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProposalHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
}

interface HistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: {
    first_name: string;
    last_name: string;
    email: string;
  };
  changed_at: string;
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

interface ProposalFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  uploader: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function ProposalHistoryDialog({
  isOpen,
  onClose,
  proposalId
}: ProposalHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationMessage[]>([]);
  const [files, setFiles] = useState<ProposalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, proposalId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from('proposal_history')
        .select(`
          id,
          previous_status,
          new_status,
          changed_at,
          changed_by:profiles!changed_by (
            first_name,
            last_name,
            email
          )
        `)
        .eq('proposal_id', proposalId)
        .order('changed_at', { ascending: true });

      if (historyError) throw historyError;

      // Fetch negotiations
      const { data: negotiationsData, error: negotiationsError } = await supabase
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
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true });

      if (negotiationsError) throw negotiationsError;

      // Fetch files
      const { data: filesData, error: filesError } = await supabase
        .from('proposal_files')
        .select(`
          id,
          file_name,
          file_url,
          file_type,
          file_size,
          created_at,
          uploader:profiles!uploader_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: true });

      if (filesError) throw filesError;

      if (historyData) setHistory(historyData);
      if (negotiationsData) setNegotiations(negotiationsData);
      if (filesData) setFiles(filesData);
    } catch (err) {
      console.error('Error fetching proposal history:', err);
      setError('Failed to load proposal history');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'expired':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-purple-500/20 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Proposal History</h2>
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-8 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Status Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Status Changes</h3>
              <div className="space-y-4">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg"
                  >
                    {getStatusIcon(entry.new_status)}
                    <div className="flex-1">
                      <p className="text-white">
                        Status changed to{' '}
                        <span className="font-semibold">{entry.new_status}</span>
                        {entry.previous_status && (
                          <> from {entry.previous_status}</>
                        )}
                      </p>
                      <div className="flex items-center mt-1 text-sm text-gray-400">
                        <span>
                          by {entry.changed_by.first_name} {entry.changed_by.last_name}
                        </span>
                        <span className="mx-2">•</span>
                        <span>
                          {new Date(entry.changed_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Negotiations */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Negotiations</h3>
              <div className="space-y-4">
                {negotiations.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 bg-white/5 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-400">
                        {msg.sender.first_name} {msg.sender.last_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white mb-2">{msg.message}</p>
                    {msg.counter_offer && (
                      <p className="text-green-400 font-semibold flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Counter Offer: ${msg.counter_offer.toFixed(2)}
                      </p>
                    )}
                    {msg.counter_terms && (
                      <p className="text-blue-400">
                        Proposed Terms: {msg.counter_terms}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Files */}
            {files.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Shared Files</h3>
                <div className="space-y-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-purple-400 transition-colors"
                          >
                            {file.file_name}
                          </a>
                          <div className="text-sm text-gray-400">
                            {formatFileSize(file.file_size)} • Uploaded by{' '}
                            {file.uploader.first_name} {file.uploader.last_name}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(file.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
