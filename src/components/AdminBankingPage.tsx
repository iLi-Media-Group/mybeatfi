import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Clock, Download, AlertCircle, CheckCircle, FileText, ChevronDown, ChevronUp, Filter, Calendar, ArrowUpDown, Loader2, Search, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Withdrawal {
  id: string;
  producer_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
  payment_method_id: string;
  producer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  payment_method: {
    account_type: 'bank' | 'paypal' | 'crypto';
    account_details: any;
  };
}

interface WithdrawalDetailProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawal: Withdrawal;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}

function WithdrawalDetail({ isOpen, onClose, withdrawal, onApprove, onReject }: WithdrawalDetailProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError('');
      await onApprove();
      onClose();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      setError('Failed to approve withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError('');
      await onReject();
      onClose();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
      setError('Failed to reject withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodDetails = () => {
    const { account_type, account_details } = withdrawal.payment_method;
    
    if (account_type === 'bank') {
      return (
        <>
          <p><strong>Bank Name:</strong> {account_details.bank_name}</p>
          <p><strong>Account Number:</strong> {account_details.account_number}</p>
          <p><strong>Routing Number:</strong> {account_details.routing_number}</p>
        </>
      );
    } else {
      return (
        <>
          <p><strong>Crypto Type:</strong> {account_details.crypto_type}</p>
          <p><strong>Wallet Address:</strong> {account_details.crypto_address}</p>
        </>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Withdrawal Request Details</h2>
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

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Producer</p>
              <p className="text-white font-medium">
                {withdrawal.producer.first_name} {withdrawal.producer.last_name}
              </p>
              <p className="text-gray-400 text-sm">{withdrawal.producer.email}</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm">Amount</p>
              <p className="text-2xl font-bold text-white">${withdrawal.amount.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Request Date</p>
            <p className="text-white">{new Date(withdrawal.created_at).toLocaleString()}</p>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-2">Payment Method</p>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white font-medium mb-2">
                {withdrawal.payment_method.account_type === 'bank' && 'Bank Account'}
                {withdrawal.payment_method.account_type === 'paypal' && 'PayPal'}
                {withdrawal.payment_method.account_type === 'crypto' && 'Cryptocurrency'}
              </p>
              <div className="text-gray-300 text-sm space-y-1">
                {getPaymentMethodDetails()}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <X className="w-5 h-5 mr-2" />
              )}
              Reject
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminBankingPage() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWithdrawal, setExpandedWithdrawal] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'producer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  useEffect(() => {
    if (user) {
      fetchWithdrawals();
    }
  }, [user, filterStatus, sortField, sortOrder]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is admin
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user?.id)
        .single();

      if (!profileData || !['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(profileData.email)) {
        throw new Error('Unauthorized access');
      }

      // Build query
      let query = supabase
        .from('producer_withdrawals')
        .select(`
          *,
          producer:profiles!producer_id (
            first_name,
            last_name,
            email
          ),
          payment_method:producer_payment_methods!payment_method_id (
            account_type,
            account_details
          )
        `);

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // Apply sorting
      if (sortField === 'date') {
        query = query.order('created_at', { ascending: sortOrder === 'asc' });
      } else if (sortField === 'amount') {
        query = query.order('amount', { ascending: sortOrder === 'asc' });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply producer name sorting and filtering in memory
      let filteredData = data || [];
      
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        filteredData = filteredData.filter(withdrawal => {
          const producerName = `${withdrawal.producer.first_name} ${withdrawal.producer.last_name}`.toLowerCase();
          const producerEmail = withdrawal.producer.email.toLowerCase();
          return producerName.includes(searchLower) || producerEmail.includes(searchLower);
        });
      }

      if (sortField === 'producer') {
        filteredData.sort((a, b) => {
          const nameA = `${a.producer.first_name} ${a.producer.last_name}`.toLowerCase();
          const nameB = `${b.producer.first_name} ${b.producer.last_name}`.toLowerCase();
          return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
      }

      setWithdrawals(filteredData);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      setError('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: 'date' | 'amount' | 'producer') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleWithdrawal = (id: string) => {
    setExpandedWithdrawal(expandedWithdrawal === id ? null : id);
  };

  const handleApproveWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    try {
      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('producer_withdrawals')
        .update({ status: 'completed' })
        .eq('id', selectedWithdrawal.id);

      if (updateError) throw updateError;

      // Update transaction status
      const { error: transactionError } = await supabase
        .from('producer_transactions')
        .update({ status: 'completed' })
        .eq('producer_id', selectedWithdrawal.producer_id)
        .eq('type', 'withdrawal')
        .eq('amount', -selectedWithdrawal.amount)
        .eq('status', 'pending');

      if (transactionError) throw transactionError;

      // Refresh withdrawals list
      await fetchWithdrawals();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      throw err;
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal) return;

    try {
      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('producer_withdrawals')
        .update({ status: 'rejected' })
        .eq('id', selectedWithdrawal.id);

      if (updateError) throw updateError;

      // Update transaction status
      const { error: transactionError } = await supabase
        .from('producer_transactions')
        .update({ status: 'rejected' })
        .eq('producer_id', selectedWithdrawal.producer_id)
        .eq('type', 'withdrawal')
        .eq('amount', -selectedWithdrawal.amount)
        .eq('status', 'pending');

      if (transactionError) throw transactionError;

      // Return funds to producer balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('producer_balances')
        .select('available_balance')
        .eq('producer_id', selectedWithdrawal.producer_id)
        .single();

      if (balanceError) throw balanceError;

      const { error: updateBalanceError } = await supabase
        .from('producer_balances')
        .update({
          available_balance: balanceData.available_balance + selectedWithdrawal.amount
        })
        .eq('producer_id', selectedWithdrawal.producer_id);

      if (updateBalanceError) throw updateBalanceError;

      // Refresh withdrawals list
      await fetchWithdrawals();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
      throw err;
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
          <h1 className="text-3xl font-bold text-white">Producer Withdrawals</h1>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 md:mb-0">Withdrawal Requests</h2>
            
            <div className="flex flex-wrap gap-2">
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
              
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="pl-8 pr-4 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All Statuses</option>
                </select>
                <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              
              <button
                onClick={() => handleSort('date')}
                className="flex items-center space-x-1 px-3 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm hover:bg-white/10"
              >
                <span>Date</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleSort('amount')}
                className="flex items-center space-x-1 px-3 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm hover:bg-white/10"
              >
                <span>Amount</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleSort('producer')}
                className="flex items-center space-x-1 px-3 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm hover:bg-white/10"
              >
                <span>Producer</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {withdrawals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="bg-white/5 rounded-lg overflow-hidden"
                >
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                    onClick={() => toggleWithdrawal(withdrawal.id)}
                  >
                    <div className="flex items-center space-x-4">
                      {withdrawal.status === 'pending' && <Clock className="w-5 h-5 text-yellow-400" />}
                      {withdrawal.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {withdrawal.status === 'rejected' && <AlertCircle className="w-5 h-5 text-red-400" />}
                      <div>
                        <p className="text-white font-medium">
                          {withdrawal.producer.first_name} {withdrawal.producer.last_name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-lg font-semibold text-white">
                        ${withdrawal.amount.toFixed(2)}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                      {expandedWithdrawal === withdrawal.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {expandedWithdrawal === withdrawal.id && (
                    <div className="p-4 bg-black/20 border-t border-purple-500/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400">Producer Email</p>
                          <p className="text-white">{withdrawal.producer.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Payment Method</p>
                          <p className="text-white">
                            {withdrawal.payment_method.account_type === 'bank' && 'Bank Account'}
                            {withdrawal.payment_method.account_type === 'paypal' && 'PayPal'}
                            {withdrawal.payment_method.account_type === 'crypto' && 'Cryptocurrency'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Request Date</p>
                          <p className="text-white">{new Date(withdrawal.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Status</p>
                          <p className={`
                            ${withdrawal.status === 'completed' ? 'text-green-400' : ''}
                            ${withdrawal.status === 'pending' ? 'text-yellow-400' : ''}
                            ${withdrawal.status === 'rejected' ? 'text-red-400' : ''}
                          `}>
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWithdrawal(withdrawal);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                            >
                              View Details
                            </button>
                          </>
                        )}
                        {withdrawal.status === 'completed' && (
                          <button
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm flex items-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedWithdrawal && (
        <WithdrawalDetail
          isOpen={true}
          onClose={() => setSelectedWithdrawal(null)}
          withdrawal={selectedWithdrawal}
          onApprove={handleApproveWithdrawal}
          onReject={handleRejectWithdrawal}
        />
      )}
    </div>
  );
}
