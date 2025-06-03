import React from 'react';
import { X, DollarSign, Music, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RevenueBreakdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  producerId: string;
}

interface RevenueSource {
  source: string;
  amount: number;
  count: number;
}

export function RevenueBreakdownDialog({
  isOpen,
  onClose,
  producerId
}: RevenueBreakdownDialogProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [revenueSources, setRevenueSources] = React.useState<RevenueSource[]>([]);
  const [totalRevenue, setTotalRevenue] = React.useState(0);
  const [recentSales, setRecentSales] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen && producerId) {
      fetchRevenueBreakdown();
    }
  }, [isOpen, producerId]);

  const fetchRevenueBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sales by license type
      const { data: salesByType, error: salesError } = await supabase
        .from('sales')
        .select('license_type, amount')
        .eq('producer_id', producerId);

      if (salesError) throw salesError;

      // Group sales by license type
      const salesByLicenseType = salesByType.reduce((acc, sale) => {
        const licenseType = sale.license_type || 'Unknown';
        if (!acc[licenseType]) {
          acc[licenseType] = {
            count: 0,
            amount: 0
          };
        }
        acc[licenseType].count += 1;
        acc[licenseType].amount += sale.amount || 0;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      // Format revenue sources
      const sources: RevenueSource[] = Object.entries(salesByLicenseType).map(([source, data]) => ({
        source,
        amount: data.amount,
        count: data.count
      }));

      // Calculate total revenue
      const total = sources.reduce((sum, source) => sum + source.amount, 0);

      // Fetch recent sales for details
      const { data: recentSalesData, error: recentError } = await supabase
        .from('sales')
        .select(`
          id,
          license_type,
          amount,
          created_at,
          track:tracks!sales_track_id_fkey (
            title
          ),
          buyer:profiles!sales_buyer_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('producer_id', producerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      setRevenueSources(sources);
      setTotalRevenue(total);
      setRecentSales(recentSalesData || []);
    } catch (err) {
      console.error('Error fetching revenue breakdown:', err);
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Revenue Breakdown</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Total Revenue</h3>
              <p className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Revenue by Source</h3>
              <div className="space-y-4">
                {revenueSources.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No revenue data available</p>
                ) : (
                  revenueSources.map((source, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {source.source.includes('Sync') ? (
                            <FileText className="w-5 h-5 text-purple-400 mr-2" />
                          ) : (
                            <Music className="w-5 h-5 text-blue-400 mr-2" />
                          )}
                          <span className="text-white font-medium">{source.source}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-white">${source.amount.toFixed(2)}</p>
                          <p className="text-sm text-gray-400">{source.count} sales</p>
                        </div>
                      </div>
                      <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(source.amount / totalRevenue) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Recent Sales</h3>
              <div className="space-y-3">
                {recentSales.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No recent sales</p>
                ) : (
                  recentSales.map((sale) => (
                    <div key={sale.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-white font-medium">{sale.track.title}</p>
                          <p className="text-sm text-gray-400">
                            {sale.license_type} • {sale.buyer.first_name} {sale.buyer.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-semibold">${sale.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(sale.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}