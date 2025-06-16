import React, { useState, useEffect } from 'react';
import { Search, ArrowUpDown, Settings, X, Shield, Users, Mail, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  membership_plan: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  created_at: string;
}

interface ChangePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onConfirm: (plan: string, password: string) => Promise<void>;
}

function ChangePlanDialog({ isOpen, onClose, client, onConfirm }: ChangePlanDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState(client.membership_plan);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== 'admin') {
      setError('Invalid password');
      return;
    }

    try {
      setLoading(true);
      await onConfirm(selectedPlan, password);
      onClose();
    } catch (err) {
      setError('Failed to update membership plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Change Membership Plan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client
            </label>
            <p className="text-white">
              {client.first_name} {client.last_name} ({client.email})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Membership Plan
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full"
              required
            >
              <option value="Single Track">Single Track</option>
              <option value="Gold Access">Gold Access</option>
              <option value="Platinum Access">Platinum Access</option>
              <option value="Ultimate Access">Ultimate Access</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'email' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', 'client');

      if (error) throw error;

      if (data) {
        setClients(data.map(client => ({
          ...client,
          membership_plan: client.membership_plan || 'Single Track'
        })));
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load client list');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleUpdatePlan = async (plan: string, password: string) => {
    if (!selectedClient) return;

    const { error } = await supabase
      .from('profiles')
      .update({ membership_plan: plan })
      .eq('id', selectedClient.id);

    if (error) throw error;

    // Refresh client list
    await fetchClients();
  };

  const filteredAndSortedClients = clients
    .filter(client => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
      return (
        fullName.includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'name') {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
        return nameA.localeCompare(nameB) * modifier;
      }
      if (sortField === 'email') {
        return a.email.localeCompare(b.email) * modifier;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Client Management</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-10 pr-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring focus:ring-purple-500/20"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-black/20">
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Name
                  {sortField === 'name' && (
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                  {sortField === 'email' && (
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">Membership Plan</th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center text-sm font-semibold text-gray-300 hover:text-white"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Joined
                  {sortField === 'created_at' && (
                    <ArrowUpDown className="w-4 h-4 ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {filteredAndSortedClients.map((client) => (
              <tr key={client.id} className="hover:bg-white/5">
                <td className="px-6 py-4 text-white">
                  {client.first_name} {client.last_name}
                </td>
                <td className="px-6 py-4 text-gray-300">{client.email}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    {client.membership_plan}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300">
                  {new Date(client.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedClient(client)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedClient && (
        <ChangePlanDialog
          isOpen={true}
          onClose={() => setSelectedClient(null)}
          client={selectedClient}
          onConfirm={handleUpdatePlan}
        />
      )}
    </div>
  );
}
