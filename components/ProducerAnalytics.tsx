import React, { useState, useEffect } from 'react';
import { BarChart3, DollarSign, Clock, CheckCircle, XCircle, Calendar, ArrowUpDown, Search, Filter, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProducerAnalyticsProps {
  producerId?: string; // Optional - if not provided, shows all producers
}

export function ProducerAnalytics({ producerId }: ProducerAnalyticsProps = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [stats, setStats] = useState({
    totalTracks: 0,
    totalSales: 0,
    totalRevenue: 0,
    avgSyncFee: 0,
    acceptanceRate: 0,
    monthlyData: [] as {
      month: string;
      sales: number;
      revenue: number;
    }[],
    topTracks: [] as {
      title: string;
      sales: number;
      revenue: number;
    }[]
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, producerId]);

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

      // Determine producer ID to use
      const targetProducerId = producerId || user?.id;
      
      if (!targetProducerId) {
        throw new Error('No producer ID available');
      }

      // Fetch tracks
      const { data: tracks, error: tracksError } = await supabase
        .from('tracks')
        .select('id, title')
        .eq('producer_id', targetProducerId);

      if (tracksError) throw tracksError;

      // Fetch sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          amount,
          created_at,
          track_id,
          track:tracks!inner (
            title
          )
        `)
        .eq('producer_id', targetProducerId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;

      // Fetch proposals
      const { data: proposals, error: proposalsError } = await supabase
        .from('sync_proposals')
        .select(`
          sync_fee,
          status,
          created_at,
          track:tracks!inner (
            id,
            producer_id
          )
        `)
        .eq('tracks.producer_id', targetProducerId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (proposalsError) throw proposalsError;

      // Calculate stats
      const totalTracks = tracks?.length || 0;
      const totalSales = sales?.length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      
      const totalProposals = proposals?.length || 0;
      const acceptedProposals = proposals?.filter(p => p.status === 'accepted').length || 0;
      const avgSyncFee = proposals?.reduce((sum, p) => sum + p.sync_fee, 0) / (totalProposals || 1) || 0;
      const acceptanceRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0;

      // Calculate monthly data
      const monthlyData = sales?.reduce((acc, sale) => {
        const month = new Date(sale.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { sales: 0, revenue: 0 };
        }
        acc[month].sales++;
        acc[month].revenue += Number(sale.amount);
        return acc;
      }, {} as Record<string, { sales: number; revenue: number }>);

      // Calculate top tracks
      const trackStats = sales?.reduce((acc, sale) => {
        if (!acc[sale.track_id]) {
          acc[sale.track_id] = {
            title: sale.track.title,
            sales: 0,
            revenue: 0
          };
        }
        acc[sale.track_id].sales++;
        acc[sale.track_id].revenue += Number(sale.amount);
        return acc;
      }, {} as Record<string, { title: string; sales: number; revenue: number }>);

      const topTracks = Object.values(trackStats || {})
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        totalTracks,
        totalSales,
        totalRevenue,
        avgSyncFee,
        acceptanceRate,
        monthlyData: Object.entries(monthlyData || {}).map(([month, data]) => ({
          month,
          ...data
        })),
        topTracks
      });
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Producer Analytics</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Tracks</p>
                <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-white">{stats.totalSales}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Acceptance Rate</p>
                <p className="text-2xl font-bold text-white">
                  {stats.acceptanceRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Revenue Chart */}
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Monthly Revenue</h3>
            <div className="relative h-64">
              {stats.monthlyData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No revenue data available for this period</p>
                </div>
              ) : (
                <>
                  {stats.monthlyData.map((month, index) => {
                    const maxRevenue = Math.max(...stats.monthlyData.map(m => m.revenue));
                    const height = (month.revenue / maxRevenue) * 100;
                    const width = 100 / stats.monthlyData.length;
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
                          ${month.revenue.toFixed(0)}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between mt-4 text-xs text-gray-400 absolute bottom-0 w-full">
                    {stats.monthlyData.map(month => (
                      <span key={month.month}>{month.month}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top Tracks */}
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Top Performing Tracks</h3>
            {stats.topTracks.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400">No sales data available for this period</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.topTracks.map((track, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{track.title}</p>
                      <p className="text-sm text-gray-400">{track.sales} sales</p>
                    </div>
                    <p className="text-lg font-semibold text-white">
                      ${track.revenue.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sales Trends */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Sales Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium text-white mb-3">Sales by Month</h4>
              <div className="space-y-3">
                {stats.monthlyData.length === 0 ? (
                  <p className="text-gray-400">No sales data available</p>
                ) : (
                  stats.monthlyData.map((month) => (
                    <div key={month.month}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">{month.month}</span>
                        <span className="text-gray-400">{month.sales} sales</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${(month.sales / Math.max(...stats.monthlyData.map(m => m.sales))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-white mb-3">Revenue Growth</h4>
              <div className="h-64 relative">
                {stats.monthlyData.length < 2 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">Not enough data to show growth</p>
                  </div>
                ) : (
                  <div className="flex h-full items-end space-x-1">
                    {stats.monthlyData.map((month, index) => {
                      const prevMonth = index > 0 ? stats.monthlyData[index - 1].revenue : 0;
                      const growth = month.revenue - prevMonth;
                      const maxGrowth = Math.max(...stats.monthlyData.slice(1).map((m, i) => m.revenue - stats.monthlyData[i].revenue));
                      const minGrowth = Math.min(...stats.monthlyData.slice(1).map((m, i) => m.revenue - stats.monthlyData[i].revenue));
                      const range = Math.max(Math.abs(maxGrowth), Math.abs(minGrowth));
                      
                      // Skip first month as we can't calculate growth
                      if (index === 0) return null;
                      
                      const height = range > 0 ? (growth / range) * 50 + 50 : 50; // Center at 50% if no growth
                      
                      return (
                        <div key={month.month} className="flex-1 flex flex-col items-center">
                          <div 
                            className={`w-full ${growth >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-t-sm`}
                            style={{ height: `${height}%` }}
                            title={`${month.month}: ${growth >= 0 ? '+' : ''}$${growth.toFixed(2)}`}
                          ></div>
                          <div className="text-xs text-gray-400 mt-1 transform -rotate-45 origin-top-left">
                            {month.month}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}