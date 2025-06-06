import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Music, Edit, Share2, Play, Pause, Clock, Plus, MoreVertical, Trash2, ArrowLeft, Loader2, Globe, Lock, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AudioPlayer } from './AudioPlayer';
import { EditPlaylistDialog } from './EditPlaylistDialog';
import { AddToPlaylistDialog } from './AddToPlaylistDialog';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_image_url: string | null;
  user_id: string;
  created_at: string;
  creator: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface PlaylistTrack {
  id: string;
  track_id: string;
  position: number;
  added_at: string;
  track: {
    id: string;
    title: string;
    artist: string;
    genres: string;
    bpm: number;
    duration: string;
    audio_url: string;
    image_url: string;
    producer_id: string;
  };
}

export function PlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [trackToRemove, setTrackToRemove] = useState<string | null>(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState(false);

  useEffect(() => {
    if (playlistId) {
      fetchPlaylistDetails();
    }
  }, [playlistId, user]);

  const fetchPlaylistDetails = async () => {
    if (!playlistId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch playlist details
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select(`
          *,
          creator:profiles!user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', playlistId)
        .single();

      if (playlistError) {
        if (playlistError.code === 'PGRST116') {
          throw new Error('Playlist not found');
        }
        throw playlistError;
      }

      // Check if user has access to this playlist
      if (!playlistData.is_public && (!user || user.id !== playlistData.user_id)) {
        throw new Error('You do not have permission to view this playlist');
      }

      setPlaylist(playlistData);
      setIsOwner(user?.id === playlistData.user_id);

      // Fetch playlist tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('playlist_tracks')
        .select(`
          id,
          track_id,
          position,
          added_at,
          track:tracks (
            id,
            title,
            artist,
            genres,
            bpm,
            duration,
            audio_url,
            image_url,
            producer_id
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (tracksError) throw tracksError;

      if (tracksData) {
        setTracks(tracksData);
      }
    } catch (err) {
      console.error('Error fetching playlist details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlaylist = async (name: string, description: string, isPublic: boolean, coverImageUrl: string | null) => {
    if (!user || !playlist) return;
    
    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          name,
          description: description || null,
          is_public: isPublic,
          cover_image_url: coverImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlist.id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setShowEditDialog(false);
      fetchPlaylistDetails();
    } catch (err) {
      console.error('Error updating playlist:', err);
      setError('Failed to update playlist');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!user || !playlist) return;
    
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlist.id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      navigate('/playlists');
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setError('Failed to delete playlist');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!user || !playlist) return;
    
    try {
      setIsRemovingTrack(true);
      
      // Find the track to get its position
      const trackToDelete = tracks.find(t => t.id === trackId);
      if (!trackToDelete) return;
      
      // Delete the track from the playlist
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('id', trackId)
        .eq('playlist_id', playlist.id);
        
      if (error) throw error;
      
      // Update local state
      setTracks(tracks.filter(t => t.id !== trackId));
      
      // Reset state
      setTrackToRemove(null);
    } catch (err) {
      console.error('Error removing track:', err);
      setError('Failed to remove track from playlist');
    } finally {
      setIsRemovingTrack(false);
    }
  };

  const handleShare = () => {
    if (!playlist) return;
    
    // Create a shareable URL
    const shareUrl = `${window.location.origin}/playlist/${playlist.id}`;
    
    // Use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `${playlist.name} - MyBeatFi Sync Playlist`,
        text: playlist.description || `Check out this playlist: ${playlist.name}`,
        url: shareUrl
      }).catch(err => {
        console.error('Error sharing:', err);
        // Fallback to clipboard
        copyToClipboard(shareUrl);
      });
    } else {
      // Fallback to clipboard
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Playlist link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  const handleTrackClick = (trackId: string) => {
    navigate(`/track/${trackId}`);
  };

  const togglePlay = (trackId: string) => {
    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(trackId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-sm rounded-xl border border-red-500/20 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error || "Playlist not found"}</p>
          <button
            onClick={() => navigate('/playlists')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center mx-auto"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Playlists
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/playlists')}
          className="flex items-center text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Playlists
        </button>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Cover Image */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                {playlist.cover_image_url ? (
                  <img 
                    src={playlist.cover_image_url} 
                    alt={playlist.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-16 h-16 text-purple-400 opacity-50" />
                  </div>
                )}
              </div>
            </div>

            {/* Playlist Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {playlist.is_public ? (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 backdrop-blur-sm rounded-full">
                    <Globe className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Public</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gray-500/20 backdrop-blur-sm rounded-full">
                    <Lock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Private</span>
                  </div>
                )}
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">{playlist.name}</h1>
              
              <div className="flex items-center text-gray-400 mb-4">
                <User className="w-4 h-4 mr-1" />
                <span>
                  Created by {playlist.creator.first_name && playlist.creator.last_name
                    ? `${playlist.creator.first_name} ${playlist.creator.last_name}`
                    : playlist.creator.email.split('@')[0]}
                </span>
                <span className="mx-2">•</span>
                <span>{tracks.length} tracks</span>
                <span className="mx-2">•</span>
                <span>Created {new Date(playlist.created_at).toLocaleDateString()}</span>
              </div>

              {playlist.description && (
                <p className="text-gray-300 mb-6">{playlist.description}</p>
              )}

              <div className="flex flex-wrap gap-3">
                {isOwner && (
                  <>
                    <button
                      onClick={() => setShowEditDialog(true)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => setShowAddDialog(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tracks
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg transition-colors flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 rounded-lg transition-colors flex items-center"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden">
          <div className="p-4 border-b border-purple-500/20 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Tracks</h2>
            {isOwner && (
              <button
                onClick={() => setShowAddDialog(true)}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Tracks
              </button>
            )}
          </div>

          {tracks.length === 0 ? (
            <div className="p-8 text-center">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">This playlist is empty</p>
              {isOwner && (
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tracks
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-purple-500/10">
              {tracks.map((item) => (
                <div key={item.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={item.track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'} 
                        alt={item.track.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 
                            className="text-white font-medium hover:text-blue-400 transition-colors cursor-pointer"
                            onClick={() => handleTrackClick(item.track.track_id)}
                          >
                            {item.track.title}
                          </h3>
                          <p className="text-sm text-gray-400">{item.track.artist}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => togglePlay(item.track.track_id)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          >
                            {currentlyPlaying === item.track.track_id ? (
                              <Pause className="w-4 h-4 text-white" />
                            ) : (
                              <Play className="w-4 h-4 text-white" />
                            )}
                          </button>
                          
                          {isOwner && (
                            <div className="relative">
                              <button
                                onClick={() => setTrackToRemove(item.id)}
                                className="p-2 rounded-full bg-white/10 hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <span>{item.track.genres.split(',')[0]}</span>
                        <span className="mx-2">•</span>
                        <span>{item.track.bpm} BPM</span>
                        <span className="mx-2">•</span>
                        <span>Added {new Date(item.added_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {currentlyPlaying === item.track.track_id && (
                    <div className="mt-3">
                      <AudioPlayer url={item.track.audio_url} title={item.track.title} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Playlist Dialog */}
      {showEditDialog && (
        <EditPlaylistDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onUpdatePlaylist={handleUpdatePlaylist}
          playlist={playlist}
        />
      )}

      {/* Add to Playlist Dialog */}
      {showAddDialog && (
        <AddToPlaylistDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          playlistId={playlist.id}
          onTracksAdded={fetchPlaylistDetails}
          existingTrackIds={tracks.map(t => t.track.track_id)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-red-500/20 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Delete Playlist</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the playlist "{playlist.name}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Track Confirmation */}
      {trackToRemove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-red-500/20 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Remove Track</h3>
              <button
                onClick={() => setTrackToRemove(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to remove this track from the playlist?
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setTrackToRemove(null)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={isRemovingTrack}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveTrack(trackToRemove)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                disabled={isRemovingTrack}
              >
                {isRemovingTrack ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}