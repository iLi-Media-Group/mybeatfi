import React, { useState, useEffect } from 'react';
import { Percent, DollarSign, Save, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function CompensationSettings() {
  const { user } = useAuth();
  const [standardRate, setStandardRate] = useState(75); // Updated to 75%
  const [exclusiveRate, setExclusiveRate] = useState(80);
  const [syncFeeRate, setSyncFeeRate] = useState(90); // Updated to 90%
  const [holdingPeriod, setHoldingPeriod] = useState(30);
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(50);
  const [processingFee, setProcessingFee] = useState(2);
  const [noSalesBucketRate, setNoSalesBucketRate] = useState(2); // Added no sales bucket rate
  const [growthBonusRate, setGrowthBonusRate] = useState(5); // Added growth bonus rate
  const [noSaleBonusRate, setNoSaleBonusRate] = useState(3); // Added no sale bonus rate
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
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

      // Fetch compensation settings
      const { data, error } = await supabase
        .from('compensation_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setStandardRate(data.standard_rate);
        setExclusiveRate(data.exclusive_rate);
        setSyncFeeRate(data.sync_fee_rate);
        setHoldingPeriod(data.holding_period);
        setMinimumWithdrawal(data.minimum_withdrawal);
        setProcessingFee(data.processing_fee);
        setNoSalesBucketRate(data.no_sales_bucket_rate || 2);
        setGrowthBonusRate(data.growth_bonus_rate || 5);
        setNoSaleBonusRate(data.no_sale_bonus_rate || 3);
      }
    } catch (err) {
      console.error('Error fetching compensation settings:', err);
      setError('Failed to load compensation settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Validate inputs
      if (standardRate < 0 || standardRate > 100) {
        throw new Error('Standard rate must be between 0 and 100');
      }
      if (exclusiveRate < 0 || exclusiveRate > 100) {
        throw new Error('Exclusive rate must be between 0 and 100');
      }
      if (syncFeeRate < 0 || syncFeeRate > 100) {
        throw new Error('Sync fee rate must be between 0 and 100');
      }
      if (holdingPeriod < 0) {
        throw new Error('Holding period must be a positive number');
      }
      if (minimumWithdrawal < 0) {
        throw new Error('Minimum withdrawal must be a positive number');
      }
      if (processingFee < 0 || processingFee > 100) {
        throw new Error('Processing fee must be between 0 and 100');
      }
      if (noSalesBucketRate < 0 || noSalesBucketRate > 100) {
        throw new Error('No sales bucket rate must be between 0 and 100');
      }
      if (growthBonusRate < 0 || growthBonusRate > 100) {
        throw new Error('Growth bonus rate must be between 0 and 100');
      }
      if (noSaleBonusRate < 0 || noSaleBonusRate > 100) {
        throw new Error('No sale bonus rate must be between 0 and 100');
      }

      // Update or insert settings
      const { data, error } = await supabase
        .from('compensation_settings')
        .upsert({
          id: 1, // Single row for settings
          standard_rate: standardRate,
          exclusive_rate: exclusiveRate,
          sync_fee_rate: syncFeeRate,
          holding_period: holdingPeriod,
          minimum_withdrawal: minimumWithdrawal,
          processing_fee: processingFee,
          no_sales_bucket_rate: noSalesBucketRate,
          growth_bonus_rate: growthBonusRate,
          no_sale_bonus_rate: noSaleBonusRate,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving compensation settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Compensation Settings</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-center">Settings saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Single Track & License Revenue</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Standard License Rate (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={standardRate}
                  onChange={(e) => setStandardRate(parseInt(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Percentage of standard license sales that goes to producers (75% recommended)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exclusive License Rate (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={exclusiveRate}
                  onChange={(e) => setExclusiveRate(parseInt(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Percentage of exclusive license sales that goes to producers
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Custom Sync Revenue</h3>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sync Fee Rate (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={syncFeeRate}
                onChange={(e) => setSyncFeeRate(parseInt(e.target.value))}
                className="w-full pl-10"
                min="0"
                max="100"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Percentage of sync fees that goes to producers (90% recommended)
            </p>
          </div>
        </div>

        <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Membership Plan Revenue</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                No Sales Bucket Rate (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={noSalesBucketRate}
                  onChange={(e) => setNoSalesBucketRate(parseInt(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Percentage of membership revenue allocated to producers with no sales (2% recommended)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Growth Bonus Rate (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={growthBonusRate}
                  onChange={(e) => setGrowthBonusRate(parseInt(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Bonus percentage for producers with increasing sales
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                No Sale Bonus Rate (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={noSaleBonusRate}
                  onChange={(e) => setNoSaleBonusRate(parseInt(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Bonus percentage for producers with no sales in a period
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Payment Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Holding Period (Days)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={holdingPeriod}
                  onChange={(e) => setHoldingPeriod(parseInt(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Number of days before earnings become available for withdrawal
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Withdrawal ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={minimumWithdrawal}
                  onChange={(e) => setMinimumWithdrawal(parseInt(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  step="1"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Minimum amount that can be withdrawn
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Processing Fee (%)
              </label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(parseFloat(e.target.value))}
                  className="w-full pl-10"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Fee charged for processing withdrawals
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-400 text-sm">
              Changing these settings will affect all future transactions and earnings calculations.
              Existing transactions will not be affected.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
