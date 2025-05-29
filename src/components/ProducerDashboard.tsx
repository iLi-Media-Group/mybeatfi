import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Music, Upload, X, Calendar, ArrowUpDown, AlertCircle, Edit, Trash2, Plus, UserCog, RefreshCw, BarChart3, DollarSign, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { EditTrackModal } from './EditTrackModal';
import { DeleteTrackDialog } from './DeleteTrackDialog';
import { ProducerProfile } from './ProducerProfile';
import { ProposalAnalytics } from './ProposalAnalytics';
import { calculateTimeRemaining } from '../utils/dateUtils';

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
  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    monthlyTrends: [],
    topTracks: []
  });
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
    fetchSalesAnalytics();
    fetchProposals();
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

  const fetchSalesAnalytics = async () => {
    try {
      const { data: analytics, error } = await supabase
        .from('sales_analytics')
        .select('*')
        .eq('producer_id', user?.id)
        .order('month', { ascending: false });

      if (error) throw error;

      if (analytics && analytics.length > 0) {
        setSalesStats({
          totalSales: analytics[0].producer_sales_count || 0,
          totalRevenue: analytics[0].producer_revenue || 0,
          monthlyTrends: analytics,
          topTracks: analytics[0].top_tracks || []
        });
      }
    } catch (err) {
      console.error('Error fetching sales analytics:', err);
    }
  };

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_proposals')
        .select(`
          *,
          track:tracks!inner(
            id,
            title,
            producer_id
          ),
          client:profiles!client_id(
            first_name,
            last_name,
            email
          )
        `)
        .eq('tracks.producer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProposals(data);
    } catch (err) {
      console.error('Error fetching proposals:', err);
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

  const handleProposalAction = async (proposalId: string, action: 'accept' | 'reject') => {
    try {
      const { error } = await supabase
        .from('sync_proposals')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId);

      if (error) throw error;

      // Add to proposal history
      const { error: historyError } = await supabase
        .from('proposal_history')
        .insert({
          proposal_id: proposalId,
          previous_status: 'pending',
          new_status: action === 'accept' ? 'accepted' : 'rejected',
          changed_by: user?.id,
          changed_at: new Date().toISOString()
        });

      if (historyError) throw historyError;

      setProposals(proposals.filter(p => p.id !== proposalId));
      setConfirmAction(null);

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId,
          action,
          trackTitle: proposals.find(p => p.id === proposalId)?.track.title,
          clientEmail: proposals.find(p => p.id === proposalId)?.client.email
        })
      });
    } catch (err) {
      console.error('Error updating proposal:', err);
      setError('Failed to update proposal status');
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Sales</p>
                <p className="text-3xl font-bold text-white">{salesStats.totalSales}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-white">
                  ${salesStats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Active Tracks</p>
                <p className="text-3xl font-bold text-white">{tracks.length}</p>
              </div>
              <Music className="w-12 h-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Pending Proposals</p>
                <p className="text-3xl font-bold text-white">
                  {proposals.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <h2 className="text-xl font-bold text-white mb-6">Sync Proposal Analytics</h2>
            <ProposalAnalytics />
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Media and Sync Proposals</h2>
            </div>
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className={`bg-white/5 rounded-lg p-6 border ${
                    proposal.is_urgent ? 'border-yellow-500/20' : 'border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-white">
                          {proposal.track.title}
                        </h3>
                        {proposal.is_urgent && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                            URGENT
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-300">
                        From: {proposal.client.first_name} {proposal.client.last_name}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <span className="font-medium">Project Type:</span> {proposal.project_type}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {proposal.duration}
                        </div>
                        <div>
                          <span className="font-medium">Rights:</span>{' '}
                          {proposal.is_exclusive ? 'Exclusive' : 'Non-exclusive'}
                        </div>
                        <div>
                          <span className="font-medium">Sync Fee:</span>{' '}
                          ${proposal.sync_fee.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-blue-400">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {calculateTimeRemaining(proposal.expiration_date)} remaining
                        </div>
                        <div className="text-gray-400">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Expires: {new Date(proposal.expiration_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => {
                          setSelectedProposal(proposal);
                          setShowNegotiationDialog(true);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Negotiate
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProposalId(proposal.id);
                          setShowHistoryDialog(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        View History
                      </button>
                      <button 
                        onClick={() => setConfirmAction({
                          action: 'accept',
                          proposalId: proposal.id,
                          trackTitle: proposal.track.title,
                          clientName: `${proposal.client.first_name} ${proposal.client.last_name}`
                        })}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => setConfirmAction({
                          action: 'reject',
                          proposalId: proposal.id,
                          trackTitle: proposal.track.title,
                          clientName: `${proposal.client.first_name} ${proposal.client.last_name}`
                        })}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {proposals.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No sync proposals yet</p>
                </div>
              )}
            </div>
          </div>

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