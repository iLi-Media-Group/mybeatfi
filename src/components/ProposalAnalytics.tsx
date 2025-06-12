import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  total_proposals: number;
  accepted_proposals: number;
  rejected_proposals: number;
  expired_proposals: number;
  avg_sync_fee: number;
  exclusive_requests: number;
  monthlyData: {
    month: string;
    total: number;
    accepted: number;
    rejected: number;
    avgFee: number;
  }[];
}

export function ProposalAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (timeframe !== 'all') {
        const days = parseInt(timeframe);
        startDate.setDate(startDate.getDate() - days);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 2);
      }

      const { data: proposals, error: proposalsError } = await supabase
        .from('sync_proposals')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (proposalsError) throw proposalsError;

      if (proposals) {
        // Calculate overall stats
        const total = proposals.length;
        const accepted = proposals.filter(p => p.status === 'accepted').length;
        const rejected = proposals.filter(p => p.status === 'rejected').length;
        const expired = proposals.filter(p => p.status === 'expired').length;
        const avgFee = proposals.reduce((sum, p) => sum + p.sync_fee, 0) / total;
        const exclusive = proposals.filter(p => p.is_exclusive).length;

        // Calculate monthly data
        const monthlyStats = proposals.reduce((acc, proposal) => {
          const month = new Date(proposal.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!acc[month]) {
            acc[month] = { total: 0, accepted: 0, rejected: 0, totalFee: 0 };
          }
          acc[month].total++;
          if (proposal.status === 'accepted') acc[month].accepted++;
          if (proposal.status === 'rejected') acc[month].rejected++;
          acc[month].totalFee += proposal.sync_fee;
          return acc;
        }, {} as Record<string, { total: number; accepted: number; rejected: number; totalFee: number }>);

        const monthlyData = Object.entries(monthlyStats)
          .map(([month, stats]) => ({
            month,
            total: stats.total,
            accepted: stats.accepted,
            rejected: stats.rejected,
            avgFee: stats.totalFee / stats.total
          }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setAnalytics({
          total_proposals: total,
          accepted_proposals: accepted,
          rejected_proposals: rejected,
          expired_proposals: expired,
          avg_sync_fee: avgFee,
          exclusive_requests: exclusive,
          monthlyData
        });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-center">{error}</p>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Sync Proposal Analytics</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timeframe === period
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {period === 'all' ? 'All Time' : period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Total Proposals</p>
              <p className="text-2xl font-bold text-white">{analytics.total_proposals}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Average Sync Fee</p>
              <p className="text-2xl font-bold text-white">
                ${analytics.avg_sync_fee.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Acceptance Rate</p>
              <p className="text-2xl font-bold text-white">
                {((analytics.accepted_proposals / analytics.total_proposals) * 100).toFixed(1)}%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Exclusive Requests</p>
              <p className="text-2xl font-bold text-white">{analytics.exclusive_requests}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Trends</h3>
          <div className="relative h-64">
            {analytics.monthlyData.map((month, index) => {
              const maxTotal = Math.max(...analytics.monthlyData.map(m => m.total));
              const height = (month.total / maxTotal) * 100;
              const width = 100 / analytics.monthlyData.length;
              const left = index * width;

              return (
                <div
                  key={month.month}
                  className="absolute bottom-0 bg-purple-500 rounded-t transition-all duration-300"
                  style={{
                    height: `${height}%`,
                    width: `${width - 4}%`,
                    left: `${left}%`
                  }}
                >
                  <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                    {month.total}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400">
            {analytics.monthlyData.map(month => (
              <span key={month.month}>{month.month}</span>
            ))}
          </div>
        </div>

        {/* Proposal Status Distribution */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Proposal Status Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">Accepted</span>
                <span className="text-gray-400">{analytics.accepted_proposals} proposals</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${(analytics.accepted_proposals / analytics.total_proposals) * 100}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">Rejected</span>
                <span className="text-gray-400">{analytics.rejected_proposals} proposals</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${(analytics.rejected_proposals / analytics.total_proposals) * 100}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">Expired</span>
                <span className="text-gray-400">{analytics.expired_proposals} proposals</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{
                    width: `${(analytics.expired_proposals / analytics.total_proposals) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
