import React, { useState } from 'react';

type Track = {
  id: string;
  title: string;
  description: string;
  score: number;
};

const AIRecommendationWidget: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error('Failed to fetch recommendations');

      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto p-4 border rounded shadow">
      <h2 className="text-xl font-semibold mb-3">AI Music Recommendations</h2>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for mood, genre, etc."
        className="w-full border p-2 rounded mb-3"
      />

      <button
        onClick={fetchRecommendations}
        disabled={loading || !query.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Recommendations'}
      </button>

      {error && <p className="text-red-600 mt-3">{error}</p>}

      <ul className="mt-4 space-y-2">
        {results.length === 0 && !loading && <li>No recommendations yet.</li>}
        {results.map(track => (
          <li key={track.id} className="border p-3 rounded hover:bg-gray-100">
            <h3 className="font-semibold">{track.title}</h3>
            <p className="text-sm text-gray-600">{track.description}</p>
            <p className="text-xs text-gray-400">Score: {track.score.toFixed(2)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AIRecommendationWidget;
