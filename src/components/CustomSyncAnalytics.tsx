import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  totalRequests: number;
  avgSyncFee: number;
  pendingRequests: number;
  completedRequests: number;
  requestsByGenre: {
    genre: string;
    count: number;
  }[];
  monthlyTrends: {
    month: string;
    requests: number;
    avgFee: number;
  }[];
}

export function CustomSyncAnalytics() {
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

      const { data, error } = await supabase
        .from('custom_sync_requests')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      if (data) {
        // Calculate analytics
        const totalRequests = data.length;
        const avgSyncFee = data.reduce((sum, req) => sum + req.sync_fee, 0) / totalRequests;
        const pendingRequests = data.filter(req => req.status === 'open').length;
        const completedRequests = data.filter(req => req.status === 'completed').length;

        // Group by genre
        const genreCounts = data.reduce((acc, req) => {
          acc[req.genre] = (acc[req.genre] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const requestsByGenre = Object.entries(genreCounts)
          .map(([genre, count]) => ({ genre, count }))
          .sort((a, b) => b.count - a.count);

        // Calculate monthly trends
        const monthlyData = data.reduce((acc, req) => {
          const month = new Date(req.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!acc[month]) {
            acc[month] = { requests: 0, totalFee: 0 };
          }
          acc[month].requests++;
          acc[month].totalFee += req.sync_fee;
          return acc;
        }, {} as Record<string, { requests: number; totalFee: number }>);

        const monthlyTrends = Object.entries(monthlyData)
          .map(([month, data]) => ({
            month,
            requests: data.requests,
            avgFee: data.totalFee / data.requests
          }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

        setAnalytics({
          totalRequests,
          avgSyncFee,
          pendingRequests,
          completedRequests,
          requestsByGenre,
          monthlyTrends
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
        <h2 className="text-xl font-bold text-white">Custom Sync Analytics</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d', 'all'] as const).map((period) => {
            const buttonClass = timeframe === period
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10';
            
            return (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 rounded-lg transition-colors ${buttonClass}`}
              >
                {period === 'all' ? 'All Time' : period}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Total Requests</p>
              <p className="text-2xl font-bold text-white">{analytics.totalRequests}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Average Sync Fee</p>
              <p className="text-2xl font-bold text-white">
                ${analytics.avgSyncFee.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Pending Requests</p>
              <p className="text-2xl font-bold text-white">{analytics.pendingRequests}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Completed Requests</p>
              <p className="text-2xl font-bold text-white">{analytics.completedRequests}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Trends</h3>
          <div className="relative h-64">
            {analytics.monthlyTrends.map((month, index) => {
              const maxRequests = Math.max(...analytics.monthlyTrends.map(m => m.requests));
              const height = (month.requests / maxRequests) * 100;
              const width = 100 / analytics.monthlyTrends.length;
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
                    {month.requests}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400">
            {analytics.monthlyTrends.map(month => (
              <span key={month.month}>{month.month}</span>
            ))}
          </div>
        </div>

        {/* Genre Distribution */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Requests by Genre</h3>
          <div className="space-y-4">
            {analytics.requestsByGenre.map(genre => {
              const percentage = (genre.count / analytics.totalRequests) * 100;
              return (
                <div key={genre.genre}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{genre.genre}</span>
                    <span className="text-gray-400">{genre.count} requests</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
