import React, { useState } from 'react';
import { Banknote, Wallet, Loader2 } from 'lucide-react';
import { createStripePayout } from '../lib/stripe-payout';
import { supabase } from '../lib/supabase';

interface PayoutOptionsProps {
  balance: number;
  userId: string;
  onSuccess?: (payoutId: string) => void;
  onError?: (error: Error) => void;
}

export function PayoutOptions({ balance, userId, onSuccess, onError }: PayoutOptionsProps) {
  const [loading, setLoading] = useState<'bank' | 'usdc' | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'usdc' | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const checkPayoutSetup = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('payout_method, stripe_account_id, usdc_address')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('Failed to load payout settings');
    }

    if (!data.stripe_account_id) {
      setNeedsSetup(true);
      return false;
    }

    setPayoutMethod(data.payout_method || 'bank');
    return true;
  };

  const handlePayout = async (method: 'bank' | 'usdc') => {
    try {
      const isSetup = await checkPayoutSetup();
      if (!isSetup) return;

      setLoading(method);
      
      const { data } = await supabase
        .from('profiles')
        .select('stripe_account_id, usdc_address')
        .eq('id', userId)
        .single();

      if (!data?.stripe_account_id) {
        throw new Error('Payout account not setup');
      }

      const { payout_id } = await createStripePayout({
        amount: balance,
        recipient_id: data.stripe_account_id,
        currency: method === 'usdc' ? 'usdc' : 'usd',
        metadata: {
          payout_method: method,
          wallet_address: method === 'usdc' ? data.usdc_address : undefined
        }
      });
      
      if (onSuccess) onSuccess(payout_id);
    } catch (error) {
      console.error('Payout error:', error);
      if (onError) onError(error instanceof Error ? error : new Error('Payout failed'));
    } finally {
      setLoading(null);
    }
  };

  if (needsSetup) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800">
        <p className="font-medium">Payout setup required</p>
        <p className="text-sm mt-1">
          You need to configure your payout method before withdrawing funds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button
          onClick={() => handlePayout('bank')}
          disabled={loading === 'bank'}
          className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'bank' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Banknote className="w-5 h-5" />
              <span>Bank Transfer (USD)</span>
            </>
          )}
        </button>

        <button
          onClick={() => handlePayout('usdc')}
          disabled={loading === 'usdc'}
          className="w-full py-3 px-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === 'usdc' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>USDC Payout</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
