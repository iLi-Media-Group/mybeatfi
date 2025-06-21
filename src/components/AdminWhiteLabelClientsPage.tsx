import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Switch } from './ui/switch'; // Adjust import if needed

type Client = {
  id: string;
  name: string;
  email: string;
  membership_tier: string;
  ai_search_enabled: boolean;
  custom_sync_enabled: boolean;
  messaging_enabled: boolean;
};

const AdminWhiteLabelClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('white_label_clients').select('*');
    if (error) console.error(error);
    else setClients(data || []);
    setLoading(false);
  };

  const handleToggle = async (clientId: string, field: keyof Client, value: boolean) => {
    setError(null);

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTION_URL}/admin-toggle-feature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        field,
        value,
        adminPassword,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      setError(result.error || 'Unknown error.');
    } else {
      fetchClients();
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">White Label Clients</h2>

      <div className="mb-4">
        <label className="block text-gray-300 mb-2">Admin Password for Changes:</label>
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          className="w-64 px-3 py-2 rounded bg-gray-800 text-white border border-gray-600"
        />
      </div>

      {error && (
        <div className="mb-4 text-red-400">
          <p>Error: {error}</p>
        </div>
      )}

      {loading ? (
        <p>Loading clients...</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-2 border-b border-gray-600">Name</th>
              <th>Email</th>
              <th>Tier</th>
              <th>AI Search</th>
              <th>Custom Sync</th>
              <th>Messaging</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="p-2 border-b border-gray-700">{client.name}</td>
                <td>{client.email}</td>
                <td>{client.membership_tier}</td>
                <td>
                  <Switch
                    checked={client.ai_search_enabled}
                    onCheckedChange={(value) => handleToggle(client.id, 'ai_search_enabled', value)}
                  />
                </td>
                <td>
                  <Switch
                    checked={client.custom_sync_enabled}
                    onCheckedChange={(value) => handleToggle(client.id, 'custom_sync_enabled', value)}
                  />
                </td>
                <td>
                  <Switch
                    checked={client.messaging_enabled}
                    onCheckedChange={(value) => handleToggle(client.id, 'messaging_enabled', value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminWhiteLabelClientsPage;
