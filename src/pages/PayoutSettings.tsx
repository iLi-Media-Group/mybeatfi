import React, { useEffect, useState } from 'react';
import { PayoutOnboarding } from '../components/PayoutOnboarding';
import { PayoutOptions } from '../components/PayoutOptions';
import { supabase } from '../lib/supabase';

export function PayoutSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'usdc' | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Fetch user balance and payout settings
      const { data } = await supabase
        .from('profiles')
        .select('balance, payout_method, stripe_account_id')
        .eq('id', user.id)
        .single();

      if (data) {
        setBalance(data.balance || 0);
        setPayoutMethod(data.payout_method || null);
        setNeedsSetup(!data.stripe_account_id);
      }
    };

    fetchUserData();
  }, []);

  if (!userId) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Payout Settings</h2>
        <p className="text-gray-600">
          Configure how you want to receive your earnings
        </p>
      </div>

      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Available Balance</p>
            <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
          </div>
          {payoutMethod && (
            <div className="px-3 py-1 bg-white rounded-full text-sm font-medium">
              {payoutMethod === 'usdc' ? 'USDC Wallet' : 'Bank Account'}
            </div>
          )}
        </div>
      </div>

      {needsSetup ? (
        <PayoutOnboarding 
          userId={userId} 
          onComplete={() => {
            setNeedsSetup(false);
            setPayoutMethod(payoutMethod);
          }} 
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Request Payout</h3>
            <PayoutOptions 
              balance={balance} 
              userId={userId}
              onSuccess={(payoutId) => {
                alert(`Payout initiated! ID: ${payoutId}`);
                setBalance(0); // Reset balance after payout
              }}
            />
          </div>

          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium">Current Payout Method</h3>
            <p className="text-sm mt-1">
              {payoutMethod === 'usdc' 
                ? 'You will receive payments in USDC to your connected wallet.'
                : 'You will receive payments via bank transfer.'}
            </p>
            <button 
              onClick={() => setNeedsSetup(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Change payout method
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
