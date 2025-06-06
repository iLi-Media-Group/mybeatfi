import React, { useState, useEffect } from 'react';
import { X, Search, Music, Plus, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';

interface AddToPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  onTracksAdded: () => void;
  existingTrackIds?: string[];
}

export function AddToPlaylistDialog({ 
  isOpen, 
  onClose, 
  playlistId, 
  onTracksAdded,
  existingTrackIds = []
}: AddToPlaylistDialogProps) {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [addingTracks, setAddingTracks] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTracks();
    }
  }, [isOpen, searchQuery]);

  const fetchAvailableTracks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      let query = supabase
        .from('tracks')
        .select(`
          id,
          title,
          artist,
          genres,
          bpm,
          audio_url,
          image_url,
          producer:profiles!producer_id (
            first_name,
            last_name,
            email
          )
        `)
        .is('deleted_at', null);

      // Filter out tracks that are already in the playlist
      if (existingTrackIds.length > 0) {
        query = query.not('id', 'in', `(${existingTrackIds.join(',')})`);
      }

      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%,genres.ilike.%${searchQuery}%`);
      }

      // Limit results
      query = query.limit(50);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data) {
        const formattedTracks = data.map(track => ({
          id: track.id,
          title: track.title,
          artist: track.producer?.first_name 
            ? `${track.producer.first_name} ${track.producer.last_name || ''}`
            : track.artist,
          genres: track.genres.split(',').map((g: string) => g.trim()),
          bpm: track.bpm,
          audioUrl: track.audio_url,
          image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
          producerId: track.producer_id
        }));
        setTracks(formattedTracks);
      }
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrackSelection = (trackId: string) => {
    if (selectedTracks.includes(trackId)) {
      setSelectedTracks(selectedTracks.filter(id => id !== trackId));
    } else {
      setSelectedTracks([...selectedTracks, trackId]);
    }
  };

  const handleAddTracks = async () => {
    if (!user || selectedTracks.length === 0) return;

    try {
      setAddingTracks(true);
      setError('');

      // Get the current highest position in the playlist
      const { data: positionData, error: positionError } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      if (positionError) throw positionError;

      const startPosition = positionData && positionData.length > 0 
        ? positionData[0].position + 1 
        : 1;

      // Prepare tracks to add
      const tracksToAdd = selectedTracks.map((trackId, index) => ({
        playlist_id: playlistId,
        track_id: trackId,
        position: startPosition + index,
        added_at: new Date().toISOString()
      }));

      // Add tracks to playlist
      const { error: addError } = await supabase
        .from('playlist_tracks')
        .insert(tracksToAdd);

      if (addError) throw addError;

      onTracksAdded();
      onClose();
    } catch (err) {
      console.error('Error adding tracks to playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to add tracks to playlist');
    } finally {
      setAddingTracks(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Add Tracks to Playlist</h2>
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

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring focus:ring-purple-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchQuery 
                  ? "No tracks found matching your search" 
                  : "No tracks available to add"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`p-3 rounded-lg flex items-center space-x-3 cursor-pointer transition-colors ${
                    selectedTracks.includes(track.id)
                      ? 'bg-purple-600/20 border border-purple-500/40'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                  onClick={() => toggleTrackSelection(track.id)}
                >
                  <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                    <img 
                      src={track.image} 
                      alt={track.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>{track.genres[0]}</span>
                    <span>•</span>
                    <span>{track.bpm} BPM</span>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-purple-500/40 flex items-center justify-center">
                    {selectedTracks.includes(track.id) && (
                      <Check className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <p className="text-gray-400">
            {selectedTracks.length} track{selectedTracks.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={addingTracks}
            >
              Cancel
            </button>
            <button
              onClick={handleAddTracks}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
              disabled={selectedTracks.length === 0 || addingTracks}
            >
              {addingTracks ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Add to Playlist
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}