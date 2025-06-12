import React, { useState, useEffect } from 'react';
import { Wallet, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function WalletSettings() {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('usdc_address')
        .eq('id', user.id)
        .single();

      if (data?.usdc_address) {
        setWalletAddress(data.usdc_address);
      }
    };

    fetchWalletAddress();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (!user) throw new Error('Not authenticated');

      // Basic validation - in production you'd want more robust validation
      if (!walletAddress.startsWith('0x') && !walletAddress.startsWith('solana:')) {
        throw new Error('Please enter a valid wallet address');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ usdc_address: walletAddress })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">USDC Wallet Settings</h2>
        <p className="text-gray-600">
          Enter your Solana-compatible wallet address to receive USDC payments
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="wallet" className="block text-sm font-medium mb-1">
            Wallet Address
          </label>
          <input
            id="wallet"
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g. 0x... or solana:..."
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            This address will be used for all USDC payouts
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>Save Wallet Address</span>
            </>
          )}
        </button>

        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-md flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>Wallet address saved successfully!</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-start space-x-2">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </form>

      <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
        <h3 className="font-medium mb-1">Important Notes</h3>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Only enter a Solana-compatible wallet address</li>
          <li>Double-check the address before saving</li>
          <li>Payouts are processed monthly</li>
        </ul>
      </div>
    </div>
  );
}
