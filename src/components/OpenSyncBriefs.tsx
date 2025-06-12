import React, { useState, useEffect } from 'react';
import { Calendar, ArrowUpDown, Search, X, Music, DollarSign, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SyncBrief {
  id: string;
  project_title: string;
  project_description: string;
  sync_fee: number;
  end_date: string;
  genre: string;
  sub_genres: string[];
  reference_artist: string | null;
  reference_song: string | null;
  reference_url: string | null;
  submission_instructions: string;
  submission_email: string;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface BriefDetailsProps {
  brief: SyncBrief;
  onClose: () => void;
}

function BriefDetails({ brief, onClose }: BriefDetailsProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-purple-500/20 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-purple-500/20 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">{brief.project_title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Project Details</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{brief.project_description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-1">Sync Fee</h4>
              <p className="text-xl font-semibold text-white">${brief.sync_fee.toFixed(2)}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-1">Submission Deadline</h4>
              <p className="text-white">{new Date(brief.end_date).toLocaleDateString()}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-1">Genre</h4>
              <p className="text-white">{brief.genre}</p>
            </div>

            {brief.sub_genres.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">Sub-Genres</h4>
                <p className="text-white">{brief.sub_genres.join(', ')}</p>
              </div>
            )}
          </div>

          {(brief.reference_artist || brief.reference_song || brief.reference_url) && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Reference Track</h3>
              {brief.reference_artist && (
                <p className="text-gray-300">Artist: {brief.reference_artist}</p>
              )}
              {brief.reference_song && (
                <p className="text-gray-300">Song: {brief.reference_song}</p>
              )}
              {brief.reference_url && (
                <p className="text-gray-300">
                  <a
                    href={brief.reference_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Listen to Reference
                  </a>
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">How to Submit</h3>
            <div className="bg-black/20 rounded-lg p-4">
              <p className="text-gray-300 whitespace-pre-wrap mb-4">
                {brief.submission_instructions}
              </p>
              <p className="text-gray-300">
                Send submissions to:{' '}
                <a
                  href={'mailto:' + brief.submission_email}
                  className="text-purple-400 hover:text-purple-300"
                >
                  {brief.submission_email}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OpenSyncBriefs() {
  const [briefs, setBriefs] = useState<SyncBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'end_date' | 'genre'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrief, setSelectedBrief] = useState<SyncBrief | null>(null);

  useEffect(() => {
    fetchBriefs();
  }, []);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_sync_requests')
        .select(`
          *,
          client:profiles!client_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('is_open_request', true)
        .eq('status', 'open')
        .gte('end_date', new Date().toISOString());

      if (error) throw error;
      if (data) setBriefs(data as SyncBrief[]);
    } catch (err) {
      console.error('Error fetching briefs:', err);
      setError('Failed to load sync briefs');
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

  const filteredAndSortedBriefs = briefs
    .filter(brief => {
      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        brief.project_title.toLowerCase().includes(searchLower) ||
        brief.genre.toLowerCase().includes(searchLower) ||
        brief.sub_genres.some(sg => sg.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'created_at':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier;
        case 'end_date':
          return (new Date(a.end_date).getTime() - new Date(b.end_date).getTime()) * modifier;
        case 'genre':
          return a.genre.localeCompare(b.genre) * modifier;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Open Sync Briefs</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search briefs..."
              className="pl-10 pr-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring focus:ring-purple-500/20"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden">
        <div className="p-4 border-b border-purple-500/20 flex items-center space-x-4">
          <button
            onClick={() => handleSort('created_at')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
              sortField === 'created_at'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Date</span>
            {sortField === 'created_at' && (
              <ArrowUpDown className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => handleSort('end_date')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
              sortField === 'end_date'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Deadline</span>
            {sortField === 'end_date' && (
              <ArrowUpDown className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => handleSort('genre')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
              sortField === 'genre'
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Genre</span>
            {sortField === 'genre' && (
              <ArrowUpDown className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="divide-y divide-purple-500/10">
          {filteredAndSortedBriefs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No open sync briefs found
            </div>
          ) : (
            filteredAndSortedBriefs.map((brief) => (
              <div
                key={brief.id}
                className="p-6 hover:bg-white/5 transition-colors cursor-pointer border-b border-purple-500/10"
                onClick={() => setSelectedBrief(brief)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {brief.project_title}
                    </h3>
                    <p className="text-gray-400 line-clamp-2">
                      {brief.project_description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      ${brief.sync_fee.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">
                      Due {new Date(brief.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm">
                    {brief.genre}
                  </span>
                  {brief.sub_genres.length > 0 && (
                    <span className="text-gray-400 text-sm">
                      {brief.sub_genres.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedBrief && (
        <BriefDetails
          brief={selectedBrief}
          onClose={() => setSelectedBrief(null)}
        />
      )}
    </div>
  );
}
