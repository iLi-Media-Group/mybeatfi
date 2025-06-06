import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, ArrowUpDown, Search, Filter, Download, Loader2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Sale {
  id: string;
  amount: number;
  license_type: string;
  created_at: string;
  track: {
    title: string;
  };
  buyer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function ProducerSalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'track'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'single' | 'gold' | 'platinum' | 'ultimate'>('all');
  const [dateRange, setDateRange] = useState<'all' | '30days' | '90days' | 'year'>('30days');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSales();
    }
  }, [user, filterType, dateRange, sortField, sortOrder]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build date filter
      let dateFilter = '';
      const now = new Date();
      if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        dateFilter = `created_at.gte.${thirtyDaysAgo.toISOString()}`;
      } else if (dateRange === '90days') {
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        dateFilter = `created_at.gte.${ninetyDaysAgo.toISOString()}`;
      } else if (dateRange === 'year') {
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        dateFilter = `created_at.gte.${oneYearAgo.toISOString()}`;
      }

      // Build license type filter
      let licenseFilter = '';
      if (filterType !== 'all') {
        licenseFilter = `license_type.eq.${filterType === 'single' ? 'Single Track' : 
                                           filterType === 'gold' ? 'Gold Access' : 
                                           filterType === 'platinum' ? 'Platinum Access' : 
                                           'Ultimate Access'}`;
      }

      // Combine filters
      let filters = [];
      if (dateFilter) filters.push(dateFilter);
      if (licenseFilter) filters.push(licenseFilter);
      
      // Fetch sales
      let query = supabase
        .from('sales')
        .select(`
          id,
          amount,
          license_type,
          created_at,
          track:tracks (
            title
          ),
          buyer:profiles!buyer_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('producer_id', user.id)
        .is('deleted_at', null);

      // Apply filters
      if (filters.length > 0) {
        query = query.or(filters.join(','));
      }

      // Apply sorting
      query = query.order(sortField === 'date' ? 'created_at' : 
                          sortField === 'track' ? 'track.title' : 
                          'amount', { 
        ascending: sortOrder === 'asc' 
      });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Apply search filter in memory
      let filteredData = data || [];
      
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        filteredData = filteredData.filter(sale => {
          const trackTitle = sale.track?.title?.toLowerCase() || '';
          const buyerName = `${sale.buyer?.first_name || ''} ${sale.buyer?.last_name || ''}`.toLowerCase();
          const buyerEmail = sale.buyer?.email?.toLowerCase() || '';
          return trackTitle.includes(searchLower) || 
                 buyerName.includes(searchLower) || 
                 buyerEmail.includes(searchLower);
        });
      }

      // Calculate total revenue
      const total = filteredData.reduce((sum, sale) => sum + Number(sale.amount), 0);
      
      setSales(filteredData);
      setTotalRevenue(total);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales();
  };

  const generateSalesReport = async () => {
    try {
      setGeneratingReport(true);
      
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Sales Report', 105, 15, { align: 'center' });
      
      // Add producer info
      const { data: producerData, error: producerError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, producer_number')
        .eq('id', user?.id)
        .single();

      if (producerError) {
        console.error('Error fetching producer details:', producerError);
      }
      
      if (producerData) {
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text(`Producer: ${producerData.first_name} ${producerData.last_name}`, 14, 30);
        doc.text(`Email: ${producerData.email}`, 14, 37);
        if (producerData.producer_number) {
          doc.text(`Producer ID: ${producerData.producer_number}`, 14, 44);
        }
      }
      
      // Add date range
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      
      let dateRangeText = '';
      if (dateRange === '30days') {
        dateRangeText = 'Last 30 Days';
      } else if (dateRange === '90days') {
        dateRangeText = 'Last 90 Days';
      } else if (dateRange === 'year') {
        dateRangeText = 'Last 12 Months';
      } else {
        dateRangeText = 'All Time';
      }
      
      doc.text(`Time Period: ${dateRangeText}`, 14, 55);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 62);
      
      // Add total revenue
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 14, 72);
      
      // Add sales table
      const tableData = sales.map(sale => [
        new Date(sale.created_at).toLocaleDateString(),
        sale.track?.title || 'Unknown Track',
        `${sale.buyer?.first_name || ''} ${sale.buyer?.last_name || ''}`.trim() || 'Unknown Buyer',
        sale.license_type || 'Unknown License',
        `$${Number(sale.amount).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        startY: 80,
        head: [['Date', 'Track', 'Buyer', 'License Type', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [75, 75, 200], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 255] }
      });
      
      // Save the PDF
      doc.save('sales-report.pdf');
    } catch (err) {
      console.error('Error generating sales report:', err);
      setError('Failed to generate sales report');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Sales History</h1>
          <button
            onClick={generateSalesReport}
            disabled={generatingReport || sales.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
          >
            {generatingReport ? (
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

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Revenue Summary</h2>
              <p className="text-gray-400 mt-2">
                {dateRange === '30days' ? 'Last 30 days' : 
                 dateRange === '90days' ? 'Last 90 days' : 
                 dateRange === 'year' ? 'Last 12 months' : 'All time'}
              </p>
            </div>
            <div className="text-3xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="pl-8 pr-4 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm"
              >
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="pl-8 pr-4 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm"
              >
                <option value="all">All License Types</option>
                <option value="single">Single Track</option>
                <option value="gold">Gold Access</option>
                <option value="platinum">Platinum Access</option>
                <option value="ultimate">Ultimate Access</option>
              </select>
              <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by track or buyer..."
                className="w-full pl-9 pr-4 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-white text-sm"
              />
            </form>
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
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No sales found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/20">
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Date
                        {sortField === 'date' && (
                          <ArrowUpDown className="w-4 h-4 ml-1" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('track')}
                        className="flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                      >
                        Track
                        {sortField === 'track' && (
                          <ArrowUpDown className="w-4 h-4 ml-1" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">Buyer</th>
                    <th className="px-6 py-3 text-left">License Type</th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Amount
                        {sortField === 'amount' && (
                          <ArrowUpDown className="w-4 h-4 ml-1" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-white">
                        {sale.track?.title || 'Unknown Track'}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {`${sale.buyer?.first_name || ''} ${sale.buyer?.last_name || ''}`.trim() || 'Unknown Buyer'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                          {sale.license_type || 'Unknown License'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-green-400 font-semibold">
                        ${Number(sale.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}