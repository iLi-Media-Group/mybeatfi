import React, { useState } from 'react';
import { X, Building, Hash, Bitcoin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BankAccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  existingAccounts: any[];
}

export function BankAccountForm({ isOpen, onClose, onSave, existingAccounts }: BankAccountFormProps) {
  const { user } = useAuth();
  const [accountType, setAccountType] = useState<'bank' | 'paypal' | 'crypto'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoType, setCryptoType] = useState('USDC');
  const [isPrimary, setIsPrimary] = useState(existingAccounts.length === 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      // Validate based on account type
      if (accountType === 'bank') {
        if (!bankName.trim() || !accountNumber.trim() || !routingNumber.trim()) {
          throw new Error('Please fill in all bank account fields');
        }
      } else if (accountType === 'crypto') {
        if (!cryptoAddress.trim() || !cryptoType) {
          throw new Error('Please enter your crypto wallet address and select a currency');
        }
      }

      // Prepare account details
      const accountDetails = {
        ...(accountType === 'bank' && {
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          routing_number: routingNumber.trim()
        }),
        ...(accountType === 'crypto' && {
          crypto_address: cryptoAddress.trim(),
          crypto_type: cryptoType
        })
      };

      // If this is set as primary, update all other accounts to not be primary
      if (isPrimary && existingAccounts.length > 0) {
        const { error: updateError } = await supabase
          .from('producer_payment_methods')
          .update({ is_primary: false })
          .eq('producer_id', user.id);

        if (updateError) throw updateError;
      }

      // Insert new payment method
      const { error: insertError } = await supabase
        .from('producer_payment_methods')
        .insert({
          producer_id: user.id,
          account_type: accountType,
          account_details: accountDetails,
          is_primary: isPrimary
        });

      if (insertError) throw insertError;

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to save payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Payout Method</h2>
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
              Payout Method Type
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setAccountType('bank')}
                className={`p-3 rounded-lg flex flex-col items-center justify-center transition-colors ${
                  accountType === 'bank'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <Building className="w-6 h-6 mb-2" />
                <span className="text-sm">Bank</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('crypto')}
                className={`p-3 rounded-lg flex flex-col items-center justify-center transition-colors ${
                  accountType === 'crypto'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <Bitcoin className="w-6 h-6 mb-2" />
                <span className="text-sm">Crypto</span>
              </button>
            </div>
          </div>

          {accountType === 'bank' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bank Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full pl-10"
                    placeholder="Enter bank name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full pl-10"
                    placeholder="Enter account number"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Routing Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    className="w-full pl-10"
                    placeholder="Enter routing number"
                    required
                  />
                </div>
              </div>
            </>
          )}


          {accountType === 'crypto' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cryptocurrency
                </label>
                <select
                  value={cryptoType}
                  onChange={(e) => setCryptoType(e.target.value)}
                  className="w-full"
                  required
                >
                  <option value="USDC">USDC (Solana)</option>
                  <option value="USDT">USDT (Solana)</option>
                  <option value="SOL">Solana (SOL)</option>
                  <option value="USDC-POLYGON">USDC (Polygon)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address
                </label>
                <div className="relative">
                  <Bitcoin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    className="w-full pl-10"
                    placeholder="Enter wallet address"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <label className="text-gray-300">
              Set as primary payment method
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
              {loading ? 'Saving...' : 'Save Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
