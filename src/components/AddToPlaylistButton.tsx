import React, { useState, useEffect } from 'react';
import { ListPlus, Plus, Loader2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';

interface AddToPlaylistButtonProps {
  trackId: string;
  variant?: 'icon' | 'full';
  className?: string;
}

interface Playlist {
  id: string;
  name: string;
  track_count: number;
}

export function AddToPlaylistButton({ trackId, variant = 'full', className = '' }: AddToPlaylistButtonProps) {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (showDropdown && user) {
      fetchUserPlaylists();
    }
  }, [showDropdown, user]);

  const fetchUserPlaylists = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          track_count:playlist_tracks (
            count
          )
        `)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        const processedData = data.map(playlist => ({
          ...playlist,
          track_count: playlist.track_count.length
        }));
        setPlaylists(processedData);
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!user) return;

    try {
      setAddingToPlaylist(playlistId);
      setError('');
      setSuccess(null);

      // Check if track is already in the playlist
      const { data: existingTrack, error: checkError } = await supabase
        .from('playlist_tracks')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingTrack) {
        throw new Error('Track is already in this playlist');
      }

      // Get the current highest position in the playlist
      const { data: positionData, error: positionError } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      if (positionError) throw positionError;

      const nextPosition = positionData && positionData.length > 0 
        ? positionData[0].position + 1 
        : 1;

      // Add track to playlist
      const { error: addError } = await supabase
        .from('playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: trackId,
          position: nextPosition,
          added_at: new Date().toISOString()
        });

      if (addError) throw addError;

      // Get playlist name for success message
      const playlist = playlists.find(p => p.id === playlistId);
      setSuccess(playlist ? playlist.name : 'playlist');
      
      // Close dropdown after a delay
      setTimeout(() => {
        setShowDropdown(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Error adding track to playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to add track to playlist');
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleCreatePlaylist = async (name: string, description: string, isPublic: boolean, coverImageUrl: string | null) => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      // Create new playlist
      const { data: playlistData, error: playlistError } = await supabase
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

      if (playlistError) throw playlistError;

      if (playlistData) {
        // Add track to the new playlist
        const { error: addError } = await supabase
          .from('playlist_tracks')
          .insert({
            playlist_id: playlistData.id,
            track_id: trackId,
            position: 1,
            added_at: new Date().toISOString()
          });

        if (addError) throw addError;

        setSuccess(playlistData.name);
        
        // Close dialogs after a delay
        setTimeout(() => {
          setShowCreateDialog(false);
          setShowDropdown(false);
          setSuccess(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDropdown && !target.closest('.playlist-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="relative playlist-dropdown">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`${
            variant === 'icon'
              ? 'p-2 rounded-full bg-white/10 hover:bg-white/20'
              : 'px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg'
          } transition-colors flex items-center ${className}`}
        >
          <ListPlus className={variant === 'icon' ? 'w-5 h-5 text-white' : 'w-5 h-5 mr-2'} />
          {variant === 'full' && <span>Add to Playlist</span>}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-md border border-purple-500/20 rounded-lg shadow-lg z-10 overflow-hidden">
            <div className="p-3 border-b border-purple-500/20">
              <h3 className="text-white font-medium">Add to Playlist</h3>
            </div>

            {error && (
              <div className="p-3 text-red-400 text-sm border-b border-purple-500/20">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-green-400 text-sm border-b border-purple-500/20 flex items-center">
                <Check className="w-4 h-4 mr-1" />
                Added to "{success}"
              </div>
            )}

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                </div>
              ) : playlists.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  You don't have any playlists yet
                </div>
              ) : (
                <div>
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-purple-600/20 transition-colors flex items-center justify-between"
                      disabled={addingToPlaylist === playlist.id}
                    >
                      <div className="truncate">{playlist.name}</div>
                      {addingToPlaylist === playlist.id ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowCreateDialog(true);
                setShowDropdown(false);
              }}
              className="w-full p-3 text-left text-purple-400 hover:bg-purple-600/20 transition-colors flex items-center border-t border-purple-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Playlist
            </button>
          </div>
        )}
      </div>

      <CreatePlaylistDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />
    </>
  );
}
