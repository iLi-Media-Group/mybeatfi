import React, { useState } from 'react';
import { X, DollarSign, AlertCircle, Loader2, Building, Bitcoin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WithdrawalRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  availableBalance: number;
  paymentMethods: any[];
}

export function WithdrawalRequestForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  availableBalance,
  paymentMethods
}: WithdrawalRequestFormProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Find primary payment method
  const primaryMethod = paymentMethods.find(method => method.is_primary);
  
  // Set default selected payment method to primary or first available
  React.useEffect(() => {
    if (primaryMethod) {
      setSelectedPaymentMethod(primaryMethod.id);
    } else if (paymentMethods.length > 0) {
      setSelectedPaymentMethod(paymentMethods[0].id);
    }
  }, [paymentMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const withdrawalAmount = parseFloat(amount);
      
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (withdrawalAmount > availableBalance) {
        throw new Error('Withdrawal amount exceeds available balance');
      }

      if (withdrawalAmount < 50) {
        throw new Error('Minimum withdrawal amount is $50');
      }

      if (!selectedPaymentMethod) {
        throw new Error('Please select a payment method');
      }

      // Get selected payment method details
      const paymentMethod = paymentMethods.find(method => method.id === selectedPaymentMethod);
      if (!paymentMethod) {
        throw new Error('Selected payment method not found');
      }

      // Create withdrawal request
      const { error: withdrawalError } = await supabase
        .from('producer_withdrawals')
        .insert({
          producer_id: user.id,
          amount: withdrawalAmount,
          payment_method_id: selectedPaymentMethod,
          status: 'pending'
        });

      if (withdrawalError) throw withdrawalError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('producer_transactions')
        .insert({
          producer_id: user.id,
          amount: -withdrawalAmount, // Negative amount for withdrawals
          type: 'withdrawal',
          status: 'pending',
          description: `Withdrawal to ${
            paymentMethod.account_type === 'bank' ? paymentMethod.account_details.bank_name :
            paymentMethod.account_type === 'paypal' ? 'PayPal' :
            `${paymentMethod.account_details.crypto_type} wallet`
          }`
        });

      if (transactionError) throw transactionError;

      // Update producer balance
      const { error: balanceError } = await supabase
        .from('producer_balances')
        .update({
          available_balance: availableBalance - withdrawalAmount
        })
        .eq('producer_id', user.id);

      if (balanceError) throw balanceError;

      onSubmit();
      onClose();
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      setError(err instanceof Error ? err.message : 'Failed to request withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method: any) => {
    if (method.account_type === 'bank') {
      return `${method.account_details.bank_name} (****${method.account_details.account_number.slice(-4)})`;
    } else {
      return `${method.account_details.crypto_type} (${method.account_details.crypto_address.slice(0, 6)}...${method.account_details.crypto_address.slice(-4)})`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Request Withdrawal</h2>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Available Balance
            </label>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xl font-semibold text-white">${availableBalance.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Withdrawal Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10"
                placeholder="0.00"
                step="0.01"
                min="50"
                max={availableBalance}
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Minimum withdrawal: $50.00
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method
            </label>
            {paymentMethods.length === 0 ? (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 text-sm">
                      No payment methods available. Please add a payment method first.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                    >
                      Add Payment Method
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer ${
                      selectedPaymentMethod === method.id
                        ? 'bg-purple-900/20 border border-purple-500/20'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={() => setSelectedPaymentMethod(method.id)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        {method.account_type === 'bank' && <Building className="w-5 h-5 text-blue-400" />}
                        {method.account_type === 'crypto' && <Bitcoin className="w-5 h-5 text-blue-400" />}
                        <span className="text-white">{getPaymentMethodLabel(method)}</span>
                      </div>
                      {method.is_primary && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                          Primary
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-gray-300">
              Withdrawal requests are processed within 3-5 business days. A 2% processing fee may apply depending on the payment method.
            </p>
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
              disabled={loading || paymentMethods.length === 0 || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2 inline" />
                  Processing...
                </>
              ) : (
                'Request Withdrawal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
