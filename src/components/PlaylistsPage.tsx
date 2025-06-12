import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Plus, Search, Filter, Grid, List, ArrowUpDown, Lock, Globe, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { PlaylistCard } from './PlaylistCard';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_image_url: string | null;
  created_at: string;
  user_id: string;
  track_count: number;
  creator: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export function PlaylistsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'my' | 'public'>('all');
  const [sortField, setSortField] = useState<'name' | 'created_at' | 'track_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPlaylists();
  }, [user, filter, sortField, sortOrder, searchQuery]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('playlists')
        .select(`
          *,
          creator:profiles!user_id (
            first_name,
            last_name,
            email
          ),
          track_count:playlist_tracks (
            count
          )
        `);

      // Apply filters
      if (filter === 'my' && user) {
        query = query.eq('user_id', user.id);
      } else if (filter === 'public') {
        query = query.eq('is_public', true);
      } else if (user) {
        // 'all' filter - show user's playlists and public playlists
        query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
      } else {
        // Not logged in, only show public playlists
        query = query.eq('is_public', true);
      }

      // Apply search
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      // Apply sorting
      if (sortField === 'track_count') {
        // For track_count, we need to handle this in JavaScript after fetching
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order(sortField, { ascending: sortOrder === 'asc' });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data) {
        // Process the data to get the track count
        const processedData = data.map(playlist => ({
          ...playlist,
          track_count: playlist.track_count.length
        }));

        // If sorting by track_count, do it here
        if (sortField === 'track_count') {
          processedData.sort((a, b) => {
            return sortOrder === 'asc' 
              ? a.track_count - b.track_count
              : b.track_count - a.track_count;
          });
        }

        setPlaylists(processedData);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (name: string, description: string, isPublic: boolean, coverImageUrl: string | null) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          is_public: isPublic,
          cover_image_url: coverImageUrl
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        navigate(`/playlist/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError('Failed to create playlist');
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Playlists</h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Playlist
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlists..."
              className="pl-10 pr-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center space-x-2 bg-white/5 border border-purple-500/20 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center ${
                filter === 'my'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 mr-1" />
              My Playlists
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center ${
                filter === 'public'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4 mr-1" />
              Public
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white/5 border border-purple-500/20 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field as typeof sortField);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="pl-9 pr-8 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white appearance-none"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="track_count-desc">Most Tracks</option>
              <option value="track_count-asc">Fewest Tracks</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8 text-center">
          <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No playlists found</h2>
          <p className="text-gray-400 mb-6">
            {filter === 'my' 
              ? "You haven't created any playlists yet." 
              : filter === 'public' 
                ? "No public playlists are available." 
                : "No playlists match your search criteria."}
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Playlist
          </button>
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard 
                key={playlist.id} 
                playlist={playlist} 
                onRefresh={fetchPlaylists}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Creator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tracks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Visibility</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {playlists.map((playlist) => (
                  <tr 
                    key={playlist.id} 
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => navigate(`/playlist/${playlist.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-purple-900/30">
                          {playlist.cover_image_url ? (
                            <img 
                              src={playlist.cover_image_url} 
                              alt={playlist.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-5 h-5 text-purple-400" />
                            </div>
                          )}
                        </div>
                        <div className="font-medium text-white">{playlist.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {playlist.creator.first_name && playlist.creator.last_name
                        ? `${playlist.creator.first_name} ${playlist.creator.last_name}`
                        : playlist.creator.email.split('@')[0]}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{playlist.track_count}</td>
                    <td className="px-6 py-4">
                      {playlist.is_public ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Globe className="w-3 h-3 mr-1" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(playlist.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <CreatePlaylistDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />
    </div>
  );
}
