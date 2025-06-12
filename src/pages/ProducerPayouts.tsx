import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { WalletSettings } from '../components/WalletSettings';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export function ProducerPayouts() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        if (!user) return;

        const { data, error } = await supabase
          .from('producer_payouts')
          .select('*')
          .eq('producer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPayouts(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Producer Payouts</h1>
        <p className="text-gray-600">
          Manage your USDC payouts and wallet settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Payout History</h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-md">
              <p>{error}</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-4 bg-gray-50 text-gray-600 rounded-md">
              <p>No payouts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div key={payout.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {format(new Date(payout.created_at), 'MMMM yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {payout.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${payout.amount_usdc} USDC</p>
                      {payout.payment_txn_id && (
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">
                          TX: {payout.payment_txn_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <WalletSettings />
        </div>
      </div>
    </div>
  );
}
