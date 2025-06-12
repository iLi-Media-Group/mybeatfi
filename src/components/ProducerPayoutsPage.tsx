import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, Download, CheckCircle, Clock, Filter, ArrowUpDown, Loader2, Search, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProducerPayout {
  id: string;
  producer_id: string;
  amount_usdc: number;
  month: string;
  status: 'pending' | 'paid' | 'skipped';
  payment_txn_id?: string;
  created_at: string;
  updated_at: string;
  producer?: {
    first_name: string;
    last_name: string;
    email: string;
    usdc_address: string;
  };
}

interface PayoutDetailProps {
  isOpen: boolean;
  onClose: () => void;
  payout: ProducerPayout;
  onMarkAsPaid: (payoutId: string, txnId: string) => Promise<void>;
}

function PayoutDetailDialog({ isOpen, onClose, payout, onMarkAsPaid }: PayoutDetailProps) {
  const [txnId, setTxnId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleMarkAsPaid = async () => {
    if (!txnId.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onMarkAsPaid(payout.id, txnId);
      onClose();
    } catch (err) {
      console.error('Error updating payout:', err);
      setError('Failed to update payout status');
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Payout Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Producer</p>
              <p className="text-white font-medium">
                {payout.producer?.first_name} {payout.producer?.last_name}
              </p>
              <p className="text-gray-400 text-sm">{payout.producer?.email}</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm">Amount</p>
              <p className="text-2xl font-bold text-white">${payout.amount_usdc.toFixed(2)} USDC</p>
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Period</p>
            <p className="text-white">{formatMonth(payout.month)}</p>
          </div>

          <div>
            <p className="text-gray-400 text-sm">USDC Wallet Address</p>
            <p className="text-white break-all font-mono text-sm">{payout.producer?.usdc_address || 'Not provided'}</p>
          </div>

          {payout.status === 'pending' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                className="w-full"
                placeholder="Enter blockchain transaction ID"
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Enter the transaction ID after sending the USDC payment
              </p>
            </div>
          )}

          {payout.status === 'paid' && payout.payment_txn_id && (
            <div>
              <p className="text-gray-400 text-sm">Transaction ID</p>
              <p className="text-white break-all font-mono text-sm">{payout.payment_txn_id}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Close
            </button>
            
            {payout.status === 'pending' && (
              <button
                onClick={handleMarkAsPaid}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProducerPayoutsPage() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<ProducerPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'month' | 'amount'>('month');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<ProducerPayout | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      fetchPayouts();
    }
  }, [user, filterStatus, sortField, sortOrder]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
      
    if (data && ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(data.email)) {
      setIsAdmin(true);
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('producer_payouts')
        .select(`
          *,
          producer:profiles!producer_id (
            first_name,
            last_name,
            email,
            usdc_address
          )
        `);

      // Apply filters based on user role
      if (!isAdmin) {
        // Regular producers can only see their own payouts
        query = query.eq('producer_id', user?.id);
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // Apply sorting
      if (sortField === 'month') {
        query = query.order('month', { ascending: sortOrder === 'asc' });
      } else if (sortField === 'amount') {
        query = query.order('amount_usdc', { ascending: sortOrder === 'asc' });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filtering in memory (for admin view)
      let filteredData = data || [];
      
      if (isAdmin && searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        filteredData = filteredData.filter(payout => {
          const producerName = `${payout.producer?.first_name || ''} ${payout.producer?.last_name || ''}`.toLowerCase();
          const producerEmail = (payout.producer?.email || '').toLowerCase();
          return producerName.includes(searchLower) || producerEmail.includes(searchLower);
        });
      }

      setPayouts(filteredData);
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: 'month' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleMarkAsPaid = async (payoutId: string, txnId: string) => {
    try {
      const { error } = await supabase
        .from('producer_payouts')
        .update({
          status: 'paid',
          payment_txn_id: txnId,
          updated_at: new Date().toISOString()
        })
        .eq('id', payoutId);

      if (error) throw error;

      // Refresh payouts list
      await fetchPayouts();
    } catch (err) {
      console.error('Error updating payout:', err);
      throw err;
    }
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">Pending</span>;
      case 'paid':
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">Paid</span>;
      case 'skipped':
        return <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full text-xs">Skipped</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">USDC Payouts</h1>
          
          {isAdmin && (
            <button
              onClick={() => {/* TODO: Implement generate monthly payouts */}}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Generate Monthly Payouts
            </button>
          )}
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">USDC Payout History</h2>
            
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search producer..."
                    className="pl-9 pr-4 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm"
                  />
                </div>
              )}
              
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="pl-8 pr-4 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
                <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              
              <button
                onClick={() => handleSort('month')}
                className="flex items-center space-x-1 px-3 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm hover:bg-white/10"
              >
                <span>Month</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleSort('amount')}
                className="flex items-center space-x-1 px-3 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm hover:bg-white/10"
              >
                <span>Amount</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No USDC payouts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/20">
                    {isAdmin && (
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Producer</th>
                    )}
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Month</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Amount (USDC)</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Created</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-white/5">
                      {isAdmin && (
                        <td className="px-6 py-4 text-white">
                          <div>
                            <p className="font-medium">
                              {payout.producer?.first_name} {payout.producer?.last_name}
                            </p>
                            <p className="text-sm text-gray-400">{payout.producer?.email}</p>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-white">{formatMonth(payout.month)}</td>
                      <td className="px-6 py-4 text-white font-medium">${payout.amount_usdc.toFixed(2)}</td>
                      <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedPayout(payout)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">USDC Payout Information</h2>
            <div className="space-y-4">
              <p className="text-gray-300">
                We process USDC payouts on the 15th of each month for the previous month's earnings.
                Make sure your USDC wallet address is up to date in your profile settings.
              </p>
              
              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/20">
                <h3 className="text-lg font-semibold text-white mb-2">Your USDC Wallet</h3>
                <div className="flex items-center justify-between">
                  <p className="text-gray-300 font-mono break-all">
                    {user?.usdc_address || 'No wallet address provided'}
                  </p>
                  <button
                    onClick={() => {/* TODO: Implement update wallet address */}}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedPayout && (
        <PayoutDetailDialog
          isOpen={true}
          onClose={() => setSelectedPayout(null)}
          payout={selectedPayout}
          onMarkAsPaid={handleMarkAsPaid}
        />
      )}
    </div>
  );
}
