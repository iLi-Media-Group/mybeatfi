import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Wallet, CheckCircle, AlertCircle } from 'lucide-react';

interface PayoutProcessingProps {
  payoutId: string;
  onComplete: () => void;
}

export function PayoutProcessing({ payoutId, onComplete }: PayoutProcessingProps) {
  const [method, setMethod] = useState<'manual' | 'automated' | null>(null);
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!method) return;
    if (method === 'automated' && !txHash) {
      setError('Transaction hash required for automated payments');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: updateError } = await supabase.functions.invoke('update-payout-status', {
        body: { payoutId, txHash, method }
      });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(onComplete, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      {success ? (
        <div className="text-center space-y-2 text-green-600">
          <CheckCircle className="w-8 h-8 mx-auto" />
          <p className="font-medium">Payout marked as paid!</p>
        </div>
      ) : (
        <>
          <h3 className="font-medium">Process Payout</h3>
          
          <div className="space-y-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setMethod('manual')}
                className={`px-4 py-2 border rounded-md ${method === 'manual' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
              >
                Manual Payment
              </button>
              <button
                onClick={() => setMethod('automated')}
                className={`px-4 py-2 border rounded-md ${method === 'automated' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
              >
                Automated Payment
              </button>
            </div>

            {method === 'automated' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Enter Solana transaction hash"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !method || (method === 'automated' && !txHash)}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 flex justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Mark as Paid'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
