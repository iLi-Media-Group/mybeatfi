import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Music, Upload, X, Calendar, ArrowUpDown, AlertCircle, Edit, Trash2, Plus, UserCog, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { EditTrackModal } from './EditTrackModal';
import { DeleteTrackDialog } from './DeleteTrackDialog';
import { ProducerProfile } from './ProducerProfile';

export function ProducerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [deletedTracks, setDeletedTracks] = useState<Track[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, email')
        .eq('id', user?.id)
        .single();
          
      if (profileError) throw profileError;
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch tracks including deleted ones
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('producer_id', user?.id)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;
      if (tracksData) {
        const formattedTracks = tracksData.map(track => ({
          id: track.id,
          title: track.title,
          genres: Array.isArray(track.genres) ? track.genres : track.genres.split(',').map(g => g.trim()),
          audioUrl: track.audio_url,
          image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
          deleted_at: track.deleted_at
        }));

        // Split into active and deleted tracks
        setTracks(formattedTracks.filter(t => !t.deleted_at));
        setDeletedTracks(formattedTracks.filter(t => t.deleted_at));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrack = async () => {
    if (!deleteTrackId) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteTrackId);

      if (error) throw error;

      // Move track from active to deleted list
      const deletedTrack = tracks.find(t => t.id === deleteTrackId);
      if (deletedTrack) {
        setTracks(tracks.filter(t => t.id !== deleteTrackId));
        setDeletedTracks([...deletedTracks, { ...deletedTrack, deleted_at: new Date().toISOString() }]);
      }
    } catch (err) {
      console.error('Error deleting track:', err);
      throw err;
    }
  };

  const handleRestoreTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ deleted_at: null })
        .eq('id', trackId);

      if (error) throw error;

      // Move track from deleted to active list
      const restoredTrack = deletedTracks.find(t => t.id === trackId);
      if (restoredTrack) {
        setDeletedTracks(deletedTracks.filter(t => t.id !== trackId));
        setTracks([...tracks, { ...restoredTrack, deleted_at: null }]);
      }
    } catch (err) {
      console.error('Error restoring track:', err);
      setError('Failed to restore track');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Producer Dashboard</h1>
            {profile && (
              <p className="text-xl text-gray-300 mt-2">
                Welcome {profile.first_name || profile.email.split('@')[0]}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowProfileDialog(true)}
              className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <UserCog className="w-5 h-5 mr-2" />
              Edit Profile
            </button>
            <Link
              to="/producer/upload"
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Upload className="w-5 h-5 mr-2" />
              New Track
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <h2 className="text-xl font-bold text-white mb-6">Your Tracks</h2>
            <div className="space-y-4">
              {tracks.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No tracks uploaded yet</p>
                  <Link
                    to="/producer/upload"
                    className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Upload Your First Track
                  </Link>
                </div>
              ) : (
                tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">{track.title}</h3>
                      <p className="text-sm text-gray-400">
                        {track.genres.join(', ')}
                      </p>
                    </div>
                    <div className="w-1/3">
                      <AudioPlayer url={track.audioUrl} title={track.title} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingTrack(track)}
                        className="btn-secondary flex items-center space-x-2 px-4 py-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteTrackId(track.id)}
                        className="btn-secondary flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {deletedTracks.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-red-500/20">
              <h2 className="text-xl font-bold text-white mb-6">Deleted Tracks</h2>
              <div className="space-y-4">
                {deletedTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-full h-full object-cover rounded-lg opacity-50"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">{track.title}</h3>
                      <p className="text-sm text-gray-400">
                        Deleted on {new Date(track.deleted_at!).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="w-1/3">
                      <AudioPlayer url={track.audioUrl} title={track.title} />
                    </div>
                    <button
                      onClick={() => handleRestoreTrack(track.id)}
                      className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Restore Track
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingTrack && (
        <EditTrackModal
          isOpen={true}
          onClose={() => setEditingTrack(null)}
          track={editingTrack}
          onUpdate={fetchDashboardData}
        />
      )}

      {deleteTrackId && (
        <DeleteTrackDialog
          isOpen={true}
          onClose={() => setDeleteTrackId(null)}
          trackTitle={tracks.find(t => t.id === deleteTrackId)?.title || ''}
          onConfirm={handleDeleteTrack}
        />
      )}

      <ProducerProfile
        isOpen={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
      />
    </div>
  );
}