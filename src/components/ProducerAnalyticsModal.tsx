import React, { useState, useEffect } from 'react';
import { X, BarChart3, DollarSign, Music, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProducerAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  producerId: string;
  producerName: string;
}

interface ProducerStats {
  totalTracks: number;
  totalSales: number;
  totalRevenue: number;
  avgSyncFee: number;
  acceptanceRate: number;
  monthlyData: {
    month: string;
    sales: number;
    revenue: number;
  }[];
  topTracks: {
    title: string;
    sales: number;
    revenue: number;
  }[];
}

export function ProducerAnalyticsModal({
  isOpen,
  onClose,
  producerId,
  producerName
}: ProducerAnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProducerStats | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (isOpen) {
      fetchProducerStats();
    }
  }, [isOpen, producerId, timeframe]);

  const fetchProducerStats = async () => {
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

      // Fetch tracks
      const { data: tracks, error: tracksError } = await supabase
        .from('tracks')
        .select('id, title')
        .eq('producer_id', producerId);

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
        .eq('tracks.producer_id', producerId)
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
        .eq('tracks.producer_id', producerId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (proposalsError) throw proposalsError;

      // Calculate stats
      const totalTracks = tracks?.length || 0;
      const totalSales = sales?.length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
      
      const totalProposals = proposals?.length || 0;
      const acceptedProposals = proposals?.filter(p => p.status === 'accepted').length || 0;
      const avgSyncFee = proposals?.reduce((sum, p) => sum + p.sync_fee, 0) / totalProposals || 0;
      const acceptanceRate = totalProposals > 0 ? (acceptedProposals / totalProposals) * 100 : 0;

      // Calculate monthly data
      const monthlyData = sales?.reduce((acc, sale) => {
        const month = new Date(sale.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { sales: 0, revenue: 0 };
        }
        acc[month].sales++;
        acc[month].revenue += sale.amount;
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
        acc[sale.track_id].revenue += sale.amount;
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
      console.error('Error fetching producer stats:', err);
      setError('Failed to load producer statistics');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-purple-500/20 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-purple-500/20 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">{producerName}'s Analytics</h2>
            <p className="text-gray-400">Performance metrics and activity</p>
          </div>
          <div className="flex items-center space-x-4">
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : stats && (
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400">Total Tracks</p>
                    <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
                  </div>
                  <Music className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400">Total Sales</p>
                    <p className="text-2xl font-bold text-white">{stats.totalSales}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
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

              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400">Acceptance Rate</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.acceptanceRate.toFixed(1)}%
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Monthly Revenue Chart */}
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue</h3>
              <div className="relative h-64">
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
              </div>
              <div className="flex justify-between mt-4 text-xs text-gray-400">
                {stats.monthlyData.map(month => (
                  <span key={month.month}>{month.month}</span>
                ))}
              </div>
            </div>

            {/* Top Tracks */}
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Top Performing Tracks</h3>
              <div className="space-y-4">
                {stats.topTracks.map((track, index) => (
                  <div key={index} className="flex items-center justify-between">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
