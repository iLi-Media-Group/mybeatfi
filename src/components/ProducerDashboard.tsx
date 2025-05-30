import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog, Loader2, BarChart3, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { ProducerProfile } from './ProducerProfile';
import { EditTrackModal } from './EditTrackModal';
import { DeleteTrackDialog } from './DeleteTrackDialog';
import { SyncProposalDialog } from './SyncProposalDialog';

interface UserStats {
  totalTracks: number;
  totalSales: number;
  totalRevenue: number;
  pendingProposals: number;
}

export function ProducerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ 
    first_name?: string, 
    email: string,
    avatar_path?: string | null,
    bio?: string | null,
    producer_number?: string | null
  } | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [pendingProposals, setPendingProposals] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalTracks: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingProposals: 0
  });
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, email, avatar_path, bio, producer_number')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          genres,
          sub_genres,
          moods,
          bpm,
          audio_url,
          image_url,
          has_sting_ending,
          is_one_stop,
          duration,
          mp3_url,
          trackouts_url,
          has_vocals,
          vocals_usage_type,
          created_at
        `)
        .eq('producer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      if (tracksData) {
        const formattedTracks = tracksData.map(track => ({
          id: track.id,
          title: track.title,
          artist: profileData?.first_name || profileData?.email.split('@')[0] || 'Unknown Artist',
          genres: track.genres.split(',').map((g: string) => g.trim()),
          subGenres: track.sub_genres ? track.sub_genres.split(',').map((g: string) => g.trim()) : [],
          moods: track.moods ? track.moods.split(',').map((m: string) => m.trim()) : [],
          duration: track.duration || '3:30',
          bpm: track.bpm,
          audioUrl: track.audio_url,
          image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
          hasStingEnding: track.has_sting_ending,
          isOneStop: track.is_one_stop,
          mp3Url: track.mp3_url,
          trackoutsUrl: track.trackouts_url,
          hasVocals: track.has_vocals,
          vocalsUsageType: track.vocals_usage_type,
          createdAt: track.created_at
        }));
        setTracks(formattedTracks);
        setStats(prev => ({ ...prev, totalTracks: formattedTracks.length }));
      }

      // Fetch pending proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('sync_proposals')
        .select(`
          id,
          project_type,
          sync_fee,
          expiration_date,
          is_urgent,
          status,
          created_at,
          client:profiles!client_id (
            first_name,
            last_name,
            email
          ),
          track:tracks!track_id (
            title
          )
        `)
        .eq('status', 'pending')
        .in('track_id', tracksData?.map(t => t.id) || [])
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;
      
      if (proposalsData) {
        setPendingProposals(proposalsData);
        setStats(prev => ({ ...prev, pendingProposals: proposalsData.length }));
      }

      // Fetch recent sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          license_type,
          amount,
          created_at,
          buyer:profiles!buyer_id (
            first_name,
            last_name,
            email
          ),
          track:tracks!track_id (
            title
          )
        `)
        .in('track_id', tracksData?.map(t => t.id) || [])
        .order('created_at', { ascending: false })
        .limit(5);

      if (salesError) throw salesError;
      
      if (salesData) {
        setRecentSales(salesData);
        
        // Calculate total sales and revenue
        const { data: totalSalesData, error: totalSalesError } = await supabase
          .from('sales')
          .select('amount')
          .in('track_id', tracksData?.map(t => t.id) || []);

        if (totalSalesError) throw totalSalesError;
        
        if (totalSalesData) {
          const totalSales = totalSalesData.length;
          const totalRevenue = totalSalesData.reduce((sum, sale) => sum + sale.amount, 0);
          
          setStats(prev => ({
            ...prev,
            totalSales,
            totalRevenue
          }));
        }
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTrack = (track: Track) => {
    setSelectedTrack(track);
    setShowEditModal(true);
  };

  const handleDeleteTrack = (track: Track) => {
    setSelectedTrack(track);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTrack = async () => {
    if (!selectedTrack) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', selectedTrack.id);

      if (error) throw error;

      // Remove track from state
      setTracks(tracks.filter(t => t.id !== selectedTrack.id));
      setStats(prev => ({ ...prev, totalTracks: prev.totalTracks - 1 }));
    } catch (err) {
      console.error('Error deleting track:', err);
      throw err;
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <div className="flex-shrink-0">
              <ProfilePhotoUpload
                currentPhotoUrl={profile?.avatar_path || null}
                onPhotoUpdate={(url) => {
                  setProfile(prev => prev ? { ...prev, avatar_path: url } : null);
                }}
                userId={user?.id}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Producer Dashboard</h1>
              {profile && (
                <div className="mt-2 space-y-1">
                  <p className="text-xl text-gray-300">
                    Welcome {profile.first_name || profile.email.split('@')[0]}
                  </p>
                  {profile.producer_number && (
                    <p className="text-sm text-gray-400">Producer ID: {profile.producer_number}</p>
                  )}
                  {profile.bio && (
                    <p className="text-gray-400 text-sm line-clamp-2">{profile.bio}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowProfileDialog(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center"
            >
              <UserCog className="w-5 h-5 mr-2" />
              Edit Profile
            </button>
            <Link
              to="/producer/upload"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload New Track
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Tracks</p>
                <p className="text-3xl font-bold text-white">{stats.totalTracks}</p>
              </div>
              <Music className="w-12 h-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Sales</p>
                <p className="text-3xl font-bold text-white">{stats.totalSales}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-white">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Pending Proposals</p>
                <p className="text-3xl font-bold text-white">{stats.pendingProposals}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Your Tracks Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Your Tracks</h2>
              <Link
                to="/producer/upload"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Track
              </Link>
            </div>

            {tracks.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8 text-center">
                <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-300 mb-4">You haven't uploaded any tracks yet</p>
                <Link
                  to="/producer/upload"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Your First Track
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white mb-1">{track.title}</h3>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditTrack(track)}
                              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                              title="Edit Track"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrack(track)}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                              title="Delete Track"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>{track.genres.join(', ')} • {track.bpm} BPM</p>
                          <div className="flex flex-wrap gap-2">
                            {track.hasVocals && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                                <Mic className="w-3 h-3 mr-1" />
                                {track.vocalsUsageType === 'sync_only' ? 'Sync Only' : 'Vocals'}
                              </span>
                            )}
                            {track.hasStingEnding && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                <Music className="w-3 h-3 mr-1" />
                                Sting Ending
                              </span>
                            )}
                            {track.isOneStop && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                                <Check className="w-3 h-3 mr-1" />
                                One Stop
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <AudioPlayer url={track.audioUrl} title={track.title} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Pending Proposals Section */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Pending Proposals</h3>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4">
                {pendingProposals.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">No pending proposals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingProposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedTrack({
                            id: proposal.track.id,
                            title: proposal.track.title,
                            artist: '',
                            genres: [],
                            subGenres: [],
                            moods: [],
                            duration: '',
                            bpm: 0,
                            audioUrl: '',
                            image: ''
                          });
                          setShowProposalDialog(true);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-medium">{proposal.track.title}</p>
                            <p className="text-sm text-gray-400">
                              From: {proposal.client.first_name} {proposal.client.last_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-semibold">${proposal.sync_fee.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">
                              Expires: {new Date(proposal.expiration_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {proposal.is_urgent && (
                          <div className="mt-2 flex items-center text-yellow-400 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Urgent
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Sales Section */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Recent Sales</h3>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4">
                {recentSales.length === 0 ? (
                  <div className="text-center py-6">
                    <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">No sales yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-medium">{sale.track.title}</p>
                            <p className="text-sm text-gray-400">
                              {sale.license_type} License
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-semibold">${sale.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(sale.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals and Dialogs */}
      <ProducerProfile
        isOpen={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
      />

      {selectedTrack && showEditModal && (
        <EditTrackModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTrack(null);
          }}
          track={selectedTrack}
          onUpdate={fetchDashboardData}
        />
      )}

      {selectedTrack && showDeleteDialog && (
        <DeleteTrackDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setSelectedTrack(null);
          }}
          trackTitle={selectedTrack.title}
          onConfirm={confirmDeleteTrack}
        />
      )}

      {selectedTrack && showProposalDialog && (
        <SyncProposalDialog
          isOpen={showProposalDialog}
          onClose={() => {
            setShowProposalDialog(false);
            setSelectedTrack(null);
          }}
          track={selectedTrack}
        />
      )}
    </div>
  );
}