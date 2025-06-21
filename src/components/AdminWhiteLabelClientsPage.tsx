import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { AdminPasswordPrompt } from "./AdminPasswordPrompt";

interface WhiteLabelClient {
  id: string;
  company_name: string;
  email: string;
  ai_recommendation_enabled: boolean;
}

export default function AdminWhiteLabelClientsPage() {
  const [clients, setClients] = useState<WhiteLabelClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // clientId currently saving

  useEffect(() => {
    if (apiToken) {
      fetchClients();
    }
  }, [apiToken]);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("white_label_clients")
      .select("*");

    if (error) {
      setError("Failed to fetch clients.");
      console.error(error);
    } else {
      setClients(data as WhiteLabelClient[]);
    }

    setLoading(false);
  };

  const toggleAIRecommendation = async (clientId: string, enabled: boolean) => {
    if (!apiToken) return;

    setSaving(clientId);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_FUNCTION_URL}/update_white_label_feature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            clientId,
            field: "ai_recommendation_enabled",
            value: enabled,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setClients((prev) =>
          prev.map((client) =>
            client.id === clientId
              ? { ...client, ai_recommendation_enabled: enabled }
              : client
          )
        );
      } else {
        console.error("API Error:", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setSaving(null);
    }
  };

  if (!apiToken) {
    return <AdminPasswordPrompt onPasswordSet={setApiToken} />;
  }

  if (loading) return <p className="text-white">Loading clients...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">White Label Clients</h1>

      {clients.length === 0 && <p>No white label clients found.</p>}

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="py-2">Company</th>
            <th className="py-2">Email</th>
            <th className="py-2">AI Recommendation Module</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-gray-800">
              <td className="py-3">{client.company_name}</td>
              <td className="py-3">{client.email}</td>
              <td className="py-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={client.ai_recommendation_enabled}
                    onChange={(e) =>
                      toggleAIRecommendation(client.id, e.target.checked)
                    }
                    disabled={saving === client.id}
                  />
                  <span>
                    {saving === client.id
                      ? "Saving..."
                      : client.ai_recommendation_enabled
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => {
          localStorage.removeItem("adminApiToken");
          setApiToken(null);
        }}
        className="mt-6 text-sm text-blue-400 underline"
      >
        Clear Admin Password
      </button>
    </div>
  );
}
