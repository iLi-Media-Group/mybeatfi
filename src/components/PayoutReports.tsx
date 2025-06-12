import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, Calendar, Filter, User, CheckCircle, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Payout {
  id: string;
  producer_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  month: string;
  created_at: string;
  producer: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function PayoutReports() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    month: '',
    status: '',
    producerId: ''
  });
  const [expandedPayout, setExpandedPayout] = useState<string | null>(null);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('producer_payouts')
        .select(`
          *,
          producer:profiles!producer_id (
            first_name,
            last_name,
            email
          )
        `);

      // Apply filters
      if (filters.month) query = query.eq('month', filters.month);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.producerId) query = query.eq('producer_id', filters.producerId);

      const { data, error } = await query;

      if (error) throw error;
      setPayouts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchPayouts();
  }, [user, filters]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Producer Payouts Report', 14, 20);
    
    // Filters info
    doc.setFontSize(12);
    let yPos = 30;
    if (filters.month) doc.text(`Month: ${filters.month}`, 14, yPos);
    if (filters.status) doc.text(`Status: ${filters.status}`, 14, yPos + 10);
    if (filters.producerId) {
      const producer = payouts.find(p => p.producer_id === filters.producerId)?.producer;
      if (producer) {
        doc.text(`Producer: ${producer.first_name} ${producer.last_name}`, 14, yPos + 20);
      }
    }
    
    // Table
    autoTable(doc, {
      startY: yPos + 30,
      head: [['ID', 'Producer', 'Amount', 'Status', 'Month']],
      body: payouts.map(payout => [
        payout.id.slice(0, 8),
        `${payout.producer.first_name} ${payout.producer.last_name}`,
        `$${payout.amount.toFixed(2)}`,
        payout.status,
        payout.month
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save('payouts-report.pdf');
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Producer', 'Amount', 'Status', 'Month'];
    const rows = payouts.map(payout => [
      payout.id,
      `${payout.producer.first_name} ${payout.producer.last_name}`,
      payout.amount.toFixed(2),
      payout.status,
      payout.month
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(row => row.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payouts-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <X className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Payout Reports</h2>
        <div className="flex space-x-3">
          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilters({...filters, month: e.target.value})}
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
            placeholder="Filter by month"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filters.producerId}
            onChange={(e) => setFilters({...filters, producerId: e.target.value})}
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
          >
            <option value="">All Producers</option>
            {Array.from(new Set(payouts.map(p => p.producer_id))).map(id => {
              const producer = payouts.find(p => p.producer_id === id)?.producer;
              return (
                <option key={id} value={id}>
                  {producer?.first_name} {producer?.last_name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payouts.map((payout) => (
                <React.Fragment key={payout.id}>
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedPayout(expandedPayout === payout.id ? null : payout.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {payout.producer.first_name} {payout.producer.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{payout.producer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payout.status)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">{payout.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payout.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {expandedPayout === payout.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {expandedPayout === payout.id && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Payout ID</p>
                            <p className="text-sm font-medium">{payout.id}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Created</p>
                            <p className="text-sm font-medium">
                              {new Date(payout.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
