import React, { useState, useEffect } from 'react';
import { X, DollarSign, Download, PieChart, Calendar, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface RevenueBreakdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  producerId?: string; // Optional - if provided, shows only this producer's revenue
}

interface RevenueSource {
  source: string;
  amount: number;
  count: number;
  percentage: number;
}

interface MonthlyRevenue {
  month: string;
  amount: number;
}

export function RevenueBreakdownDialog({
  isOpen,
  onClose,
  producerId
}: RevenueBreakdownDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRevenueBreakdown();
    }
  }, [isOpen, producerId, timeframe]);

  const fetchRevenueBreakdown = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeframe === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeframe === 'quarter') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (timeframe === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else {
        // 'all' - set to a date far in the past
        startDate.setFullYear(2020);
      }

      // Fetch sales data
      let query = supabase
        .from('sales')
        .select(`
          id,
          license_type,
          amount,
          created_at,
          track:tracks!inner (
            title,
            producer_id
          )
        `)
        .gte('created_at', startDate.toISOString())
        .is('deleted_at', null);

      // Filter by producer if specified
      if (producerId) {
        query = query.eq('track.producer_id', producerId);
      }

      const { data: salesData, error: salesError } = await query;

      if (salesError) throw salesError;

      // Fetch subscription data
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('stripe_subscriptions')
        .select(`
          subscription_id,
          price_id,
          status,
          current_period_start,
          current_period_end
        `)
        .eq('status', 'active');

      if (subscriptionsError) throw subscriptionsError;

      // Fetch custom sync requests
      const { data: syncRequestsData, error: syncRequestsError } = await supabase
        .from('custom_sync_requests')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      if (syncRequestsError) throw syncRequestsError;

      // Process sales by license type
      const salesByLicenseType = salesData.reduce((acc, sale) => {
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

      // Process subscription revenue
      // For simplicity, we'll estimate subscription revenue based on price IDs
      const subscriptionRevenue = subscriptionsData.reduce((acc, sub) => {
        let amount = 0;
        let name = 'Unknown Subscription';

        // Map price IDs to amounts and names
        switch (sub.price_id) {
          case 'price_1RVXvoIkn3xpidKHRzHgSFn1': // Ultimate Access
            amount = 499.00;
            name = 'Ultimate Access';
            break;
          case 'price_1RVXurIkn3xpidKH18dW0FYC': // Platinum Access
            amount = 59.99;
            name = 'Platinum Access';
            break;
          case 'price_1RVXu9Ikn3xpidKHqxoSb6bC': // Gold Access
            amount = 34.99;
            name = 'Gold Access';
            break;
          default:
            amount = 0;
        }

        if (!acc[name]) {
          acc[name] = {
            count: 0,
            amount: 0
          };
        }
        acc[name].count += 1;
        acc[name].amount += amount;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      // Process custom sync requests
      const syncRequestsRevenue = {
        count: syncRequestsData.length,
        amount: syncRequestsData.reduce((sum, req) => sum + req.sync_fee, 0)
      };

      // Combine all revenue sources
      const allSources = [
        ...Object.entries(salesByLicenseType).map(([source, data]) => ({
          source: `${source} License`,
          amount: data.amount,
          count: data.count
        })),
        ...Object.entries(subscriptionRevenue).map(([source, data]) => ({
          source: `${source} Subscription`,
          amount: data.amount,
          count: data.count
        }))
      ];

      if (syncRequestsRevenue.count > 0) {
        allSources.push({
          source: 'Custom Sync Requests',
          amount: syncRequestsRevenue.amount,
          count: syncRequestsRevenue.count
        });
      }

      // Calculate total revenue
      const total = allSources.reduce((sum, source) => sum + source.amount, 0);

      // Calculate percentages
      const sourcesWithPercentage = allSources.map(source => ({
        ...source,
        percentage: total > 0 ? (source.amount / total) * 100 : 0
      }));

      // Sort by amount descending
      const sortedSources = sourcesWithPercentage.sort((a, b) => b.amount - a.amount);

      // Calculate monthly revenue
      const months: Record<string, number> = {};
      
      // Initialize months
      const monthCount = timeframe === 'month' ? 1 : 
                         timeframe === 'quarter' ? 3 : 
                         timeframe === 'year' ? 12 : 24;
      
      for (let i = 0; i < monthCount; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        months[monthKey] = 0;
      }
      
      // Add sales to months
      salesData.forEach(sale => {
        const date = new Date(sale.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (months[monthKey] !== undefined) {
          months[monthKey] += sale.amount || 0;
        }
      });
      
      // Add subscriptions to months (simplified - just count current month)
      subscriptionsData.forEach(sub => {
        const currentMonth = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
        if (months[currentMonth] !== undefined) {
          let amount = 0;
          switch (sub.price_id) {
            case 'price_1RVXvoIkn3xpidKHRzHgSFn1': // Ultimate Access
              amount = 499.00 / 12; // Divide annual by 12 for monthly equivalent
              break;
            case 'price_1RVXurIkn3xpidKH18dW0FYC': // Platinum Access
              amount = 59.99;
              break;
            case 'price_1RVXu9Ikn3xpidKHqxoSb6bC': // Gold Access
              amount = 34.99;
              break;
          }
          months[currentMonth] += amount;
        }
      });
      
      // Add sync requests to months
      syncRequestsData.forEach(req => {
        const date = new Date(req.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (months[monthKey] !== undefined) {
          months[monthKey] += req.sync_fee || 0;
        }
      });
      
      // Convert to array and sort by date
      const monthlyData = Object.entries(months)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });

      setRevenueSources(sortedSources);
      setMonthlyRevenue(monthlyData);
      setTotalRevenue(total);
    } catch (err) {
      console.error('Error fetching revenue breakdown:', err);
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      setPdfGenerating(true);
      
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Revenue Report', 105, 15, { align: 'center' });
      
      // Add date range
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      
      let dateRangeText = '';
      if (timeframe === 'month') {
        dateRangeText = 'Last 30 Days';
      } else if (timeframe === 'quarter') {
        dateRangeText = 'Last 3 Months';
      } else if (timeframe === 'year') {
        dateRangeText = 'Last 12 Months';
      } else {
        dateRangeText = 'All Time';
      }
      
      doc.text(`Time Period: ${dateRangeText}`, 105, 25, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
      
      // Add total revenue
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 105, 40, { align: 'center' });
      
      // Add revenue sources table
      doc.setFontSize(14);
      doc.text('Revenue by Source', 14, 50);
      
      const sourceTableData = revenueSources.map(source => [
        source.source,
        `$${source.amount.toFixed(2)}`,
        source.count.toString(),
        `${source.percentage.toFixed(1)}%`
      ]);
      
      (doc as any).autoTable({
        startY: 55,
        head: [['Source', 'Amount', 'Count', 'Percentage']],
        body: sourceTableData,
        theme: 'grid',
        headStyles: { fillColor: [75, 75, 200], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 255] }
      });
      
      // Add monthly revenue table
      const tableEndY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Monthly Revenue', 14, tableEndY);
      
      const monthlyTableData = monthlyRevenue.map(item => [
        item.month,
        `$${item.amount.toFixed(2)}`
      ]);
      
      (doc as any).autoTable({
        startY: tableEndY + 5,
        head: [['Month', 'Revenue']],
        body: monthlyTableData,
        theme: 'grid',
        headStyles: { fillColor: [75, 75, 200], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 255] }
      });
      
      // Save the PDF
      doc.save('revenue-report.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF report');
    } finally {
      setPdfGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 text-green-500 mr-2" />
            <h2 className="text-2xl font-bold text-white">Revenue Breakdown</h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              {(['month', 'quarter', 'year', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    timeframe === period
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {period === 'month' ? 'Month' : 
                   period === 'quarter' ? 'Quarter' : 
                   period === 'year' ? 'Year' : 'All Time'}
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
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Total Revenue</h3>
              <button
                onClick={generatePDF}
                disabled={pdfGenerating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
              >
                {pdfGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download Report
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6 border border-purple-500/20">
              <p className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
              <p className="text-gray-400 mt-1">
                {timeframe === 'month' ? 'Last 30 days' : 
                 timeframe === 'quarter' ? 'Last 3 months' : 
                 timeframe === 'year' ? 'Last 12 months' : 'All time'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Revenue by Source */}
              <div className="bg-white/5 rounded-lg p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <PieChart className="w-5 h-5 mr-2 text-blue-400" />
                  Revenue by Source
                </h3>
                
                <div className="space-y-4">
                  {revenueSources.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No revenue data available</p>
                  ) : (
                    revenueSources.map((source, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <span className="text-white">{source.source}</span>
                            <span className="text-gray-400 text-sm ml-2">({source.count} {source.count === 1 ? 'sale' : 'sales'})</span>
                          </div>
                          <span className="text-white font-semibold">${source.amount.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${source.percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-right text-xs text-gray-400 mt-1">{source.percentage.toFixed(1)}%</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Monthly Revenue Trend */}
              <div className="bg-white/5 rounded-lg p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                  Monthly Revenue Trend
                </h3>
                
                <div className="h-64 relative">
                  {monthlyRevenue.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No monthly data available</p>
                  ) : (
                    <>
                      <div className="flex h-full items-end space-x-1">
                        {monthlyRevenue.map((item, index) => {
                          const maxRevenue = Math.max(...monthlyRevenue.map(m => m.amount));
                          const height = maxRevenue > 0 ? (item.amount / maxRevenue) * 100 : 0;
                          
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <div 
                                className="w-full bg-blue-600 rounded-t-sm hover:bg-blue-500 transition-colors"
                                style={{ height: `${height}%` }}
                                title={`${item.month}: $${item.amount.toFixed(2)}`}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-between mt-2">
                        {monthlyRevenue.map((item, index) => (
                          <div key={index} className="text-xs text-gray-400 transform -rotate-45 origin-top-left">
                            {item.month}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Revenue Table */}
            <div className="bg-white/5 rounded-lg p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-400" />
                Detailed Revenue Breakdown
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-2 text-left text-gray-400">Revenue Source</th>
                      <th className="px-4 py-2 text-right text-gray-400">Count</th>
                      <th className="px-4 py-2 text-right text-gray-400">Amount</th>
                      <th className="px-4 py-2 text-right text-gray-400">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueSources.map((source, index) => (
                      <tr key={index} className="border-b border-gray-800">
                        <td className="px-4 py-3 text-white">{source.source}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{source.count}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">${source.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{source.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-white/5">
                      <td className="px-4 py-3 text-white font-semibold">Total</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {revenueSources.reduce((sum, source) => sum + source.count, 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold">${totalRevenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
