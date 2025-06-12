import React, { useState } from 'react';
import { Banknote, Wallet, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { createStripePayout } from '../lib/stripe-payout';
import { supabase } from '../lib/supabase';

interface PayoutOnboardingProps {
  userId: string;
  onComplete?: () => void;
}

export function PayoutOnboarding({ userId, onComplete }: PayoutOnboardingProps) {
  const [step, setStep] = useState<'method' | 'bank' | 'usdc' | 'complete'>('method');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'usdc' | null>(null);

  const handleMethodSelect = (method: 'bank' | 'usdc') => {
    setPayoutMethod(method);
    setStep(method);
  };

  const handleBankSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, you would create a Stripe Connect account here
      // This is just a simulation for the demo
      const mockAccountId = `acct_${Math.random().toString(36).substring(2, 10)}`;
      setStripeAccountId(mockAccountId);
      
      // Save to user profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          stripe_account_id: mockAccountId,
          payout_method: 'bank'
        })
        .eq('id', userId);

      if (error) throw error;
      
      setStep('complete');
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUSDCSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!walletAddress) {
        throw new Error('Please enter a valid wallet address');
      }

      // In a real app, you would verify the wallet address here
      const mockAccountId = `acct_${Math.random().toString(36).substring(2, 10)}`;
      setStripeAccountId(mockAccountId);
      
      // Save to user profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          stripe_account_id: mockAccountId,
          payout_method: 'usdc',
          usdc_address: walletAddress
        })
        .eq('id', userId);

      if (error) throw error;
      
      setStep('complete');
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {step === 'method' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Select Payout Method</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleMethodSelect('bank')}
              className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <Banknote className="w-5 h-5" />
              <span>Bank Transfer</span>
            </button>

            <button
              onClick={() => handleMethodSelect('usdc')}
              className="w-full py-3 px-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <Wallet className="w-5 h-5" />
              <span>USDC (Crypto)</span>
            </button>
          </div>
        </div>
      )}

      {step === 'bank' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Bank Account Setup</h3>
          <p className="text-sm text-gray-600">
            Connect your bank account to receive payments via ACH transfer.
          </p>
          
          <div className="p-4 border rounded-lg bg-gray-50">
            <p className="text-sm">
              In a production app, this would integrate with Stripe Connect to collect:
            </p>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
              <li>Bank account details</li>
              <li>Tax information</li>
              <li>Identity verification</li>
            </ul>
          </div>

          <button
            onClick={handleBankSetup}
            disabled={loading}
            className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Complete Bank Setup</span>
            )}
          </button>
        </div>
      )}

      {step === 'usdc' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">USDC Wallet Setup</h3>
          <p className="text-sm text-gray-600">
            Enter your USDC-compatible wallet address to receive crypto payments.
          </p>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="0x..."
            />
            <p className="text-xs text-gray-500">
              Make sure this address supports USDC on the Solana network.
            </p>
          </div>

          <button
            onClick={handleUSDCSetup}
            disabled={loading || !walletAddress}
            className="w-full py-3 px-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Save Wallet Address</span>
            )}
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <h3 className="text-lg font-medium">Payout Setup Complete!</h3>
          <p className="text-sm text-gray-600">
            {payoutMethod === 'bank' 
              ? 'Your bank account is now connected for payouts.'
              : 'Your USDC wallet is now setup for crypto payouts.'}
          </p>
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium">Account ID: {stripeAccountId}</p>
            {payoutMethod === 'usdc' && (
              <p className="mt-1">Wallet: {walletAddress}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start space-x-2">
          <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
