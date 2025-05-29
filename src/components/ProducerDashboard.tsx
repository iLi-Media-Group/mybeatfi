import React, { useState, useEffect } from 'react';
import { Users, DollarSign, BarChart3, Upload, X, Mail, Calendar, ArrowUpDown, Music, Plus, Percent, Trash2, AlertCircle, Clock, Edit, Pencil, UserCog } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { EditTrackModal } from './EditTrackModal';
import { ProposalAnalytics } from './ProposalAnalytics';
import { ProposalNegotiationDialog } from './ProposalNegotiationDialog';
import { ProposalHistoryDialog } from './ProposalHistoryDialog';
import { ProposalConfirmDialog } from './ProposalConfirmDialog';
import { ProducerProfile } from './ProducerProfile';
import { calculateTimeRemaining } from '../utils/dateUtils';
import { LicenseDialog } from './LicenseDialog';

interface DashboardStats {
  totalTracks: number;
  totalSales: number;
  recentSales: {
    track: Track;
    licenseType: string;
    amount: number;
    date: string;
  }[];
  topTracks: {
    track: Track;
    sales: number;
  }[];
}

interface SyncProposal {
  id: string;
  track: {
    id: string;
    title: string;
  };
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
  project_type: string;
  duration: string;
  is_exclusive: boolean;
  sync_fee: number;
  payment_terms: 'immediate' | 'net30' | 'net60' | 'net90';
  expiration_date: string;
  is_urgent: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

export function ProducerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<SyncProposal[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>({});
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<SyncProposal | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: 'accept' | 'reject';
    proposalId: string;
    trackTitle: string;
    clientName: string;
  } | null>(null);
  const [newTracks] = useState<Track[]>([]);
  const [selectedLicenseTrack, setSelectedLicenseTrack] = useState<Track | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: { [key: string]: string } = {};
      proposals.forEach(proposal => {
        newTimeRemaining[proposal.id] = calculateTimeRemaining(proposal.expiration_date);
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [proposals]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, email')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError) throw profileError;
        if (profileData) {
          setProfile(profileData);
        }

        const { data: tracksData, error: tracksError } = await supabase
          .from('tracks')
          .select('*')
          .eq('producer_id', user.id)
          .order('created_at', { ascending: false });

        if (tracksError) throw tracksError;
        if (tracksData) {
          const formattedTracks = tracksData.map(track => ({
            ...track,
            genres: Array.isArray(track.genres) ? track.genres : track.genres.split(',').map(g => g.trim()),
            moods: Array.isArray(track.moods) ? track.moods : (track.moods || '').split(',').filter(Boolean).map(m => m.trim()),
            subGenres: Array.isArray(track.sub_genres) ? track.sub_genres : (track.sub_genres || '').split(',').filter(Boolean).map(g => g.trim()),
            audioUrl: track.audio_url,
            image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
            mp3Url: track.mp3_url,
            trackoutsUrl: track.trackouts_url,
            hasStingEnding: track.has_sting_ending,
            isOneStop: track.is_one_stop,
            hasVocals: track.has_vocals,
            vocalsUsageType: track.vocals_usage_type
          }));
          setTracks(formattedTracks);
        }

        const { data: proposalsData, error: proposalsError } = await supabase
          .from('sync_proposals')
          .select(`
            *,
            track:tracks (
              id,
              title
            ),
            client:profiles!client_id (
              first_name,
              last_name,
              email
            )
          `)
          .eq('status', 'pending')
          .order('is_urgent', { ascending: false })
          .order('created_at', { ascending: false });

        if (proposalsError) throw proposalsError;
        if (proposalsData) {
          setProposals(proposalsData as SyncProposal[]);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleImageUpdate = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error refreshing tracks:', error);
      return;
    }

    if (data) {
      const formattedTracks = data.map(track => ({
        ...track,
        genres: Array.isArray(track.genres) ? track.genres : track.genres.split(',').map(g => g.trim()),
        moods: Array.isArray(track.moods) ? track.moods : (track.moods || '').split(',').filter(Boolean).map(m => m.trim()),
        subGenres: Array.isArray(track.sub_genres) ? track.sub_genres : (track.sub_genres || '').split(',').filter(Boolean).map(g => g.trim()),
        audioUrl: track.audio_url,
        image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
        mp3Url: track.mp3_url,
        trackoutsUrl: track.trackouts_url,
        hasStingEnding: track.has_sting_ending,
        isOneStop: track.is_one_stop,
        hasVocals: track.has_vocals,
        vocalsUsageType: track.vocals_usage_type
      }));
      setTracks(formattedTracks);
    }
  };

  const handleDeleteTrack = async () => {
    if (!deleteTrackId) return;

    const track = tracks.find(t => t.id === deleteTrackId);
    if (!track) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', deleteTrackId);

      if (error) throw error;

      setTracks(tracks.filter(t => t.id !== deleteTrackId));
    } catch (err) {
      console.error('Error deleting track:', err);
      throw err;
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

  const handleLicenseTrack = (track: Track) => {
    setSelectedLicenseTrack(track);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Your Producer Dashboard</h1>
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
            <p className="text-red-400 text-center font-medium">{error}</p>
          </div>
        )}

        <div className="mb-8">
          <ProposalAnalytics />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Tracks</p>
                <p className="text-3xl font-bold text-white">{tracks.length}</p>
              </div>
              <Music className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Sales</p>
                <p className="text-3xl font-bold text-white">$0</p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Recent Activity</p>
                <p className="text-3xl font-bold text-white">24h</p>
              </div>
              <Clock className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        {proposals.length > 0 && (
          <div className="mb-8 bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <h2 className="text-xl font-bold text-white mb-6">Media and Sync Proposals</h2>
            <div className="space-y-6">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className={`p-6 rounded-lg ${
                    proposal.is_urgent ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-start gap-6">
                    {proposal.is_urgent && (
                      <div className="flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-yellow-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-1">
                            {proposal.track.title}
                          </h3>
                          <p className="text-gray-400">
                            From: {proposal.client.first_name} {proposal.client.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            ${proposal.sync_fee.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {proposal.payment_terms === 'immediate' 
                              ? 'Immediate Payment' 
                              : proposal.payment_terms.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Project Type</h4>
                            <p className="text-white">{proposal.project_type}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Duration</h4>
                            <p className="text-white">{proposal.duration}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            {proposal.is_exclusive && (
                              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                                Exclusive Rights
                              </span>
                            )}
                            {proposal.is_urgent && (
                              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                                Urgent Request
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Time Remaining</h4>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-blue-400" />
                              <span className={`${
                                timeRemaining[proposal.id] === 'Expired' ? 'text-red-400' : 'text-blue-400'
                              }`}>
                                {timeRemaining[proposal.id] || calculateTimeRemaining(proposal.expiration_date)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-1">Expiration Date</h4>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-white">
                                {new Date(proposal.expiration_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
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
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
                        <button
                          onClick={() => {
                            setSelectedTrackId(track.id);
                            setIsImageModalOpen(true);
                          }}
                          className="absolute top-0 right-0 p-1 bg-black/50 rounded-bl-lg rounded-tr-lg hover:bg-black/70 transition-colors"
                        >
                          <Edit className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">{track.title}</h3>
                        <p className="text-sm text-gray-400">
                          {track.genres.join(', ')} • {track.bpm} BPM
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
                          <Pencil className="w-4 h-4" />
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
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Music className="w-5 h-5 mr-2 text-purple-500" />
                New Releases
              </h3>
              <div className="space-y-3">
                {newTracks.length === 0 ? (
                  <div className="text-center py-6 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <p className="text-gray-400">No new tracks available</p>
                  </div>
                ) : (
                  newTracks.map((track) => (
                    <div
                      key={track.id}
                      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20 space-y-3"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={track.image}
                          alt={track.title}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{track.title}</div>
                          <div className="text-sm text-gray-400 truncate">
                            {track.genres.join(', ')} • {track.bpm} BPM
                          </div>
                        </div>
                      </div>
                      
                      <AudioPlayer url={track.audioUrl} title={track.title} />
                      
                      <button
                        onClick={() => handleLicenseTrack(track)}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        License Track
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedTrackId && (
          <TrackImageModal
            isOpen={isImageModalOpen}
            onClose={() => {
              setIsImageModalOpen(false);
              setSelectedTrackId(null);
            }}
            trackId={selectedTrackId}
            currentImage={tracks.find(t => t.id === selectedTrackId)?.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'}
            onImageUpdate={handleImageUpdate}
          />
        )}

        {deleteTrackId && (
          <DeleteTrackModal
            isOpen={true}
            onClose={() => setDeleteTrackId(null)}
            trackTitle={tracks.find(t => t.id === deleteTrackId)?.title || ''}
            onConfirm={handleDeleteTrack}
          />
        )}

        {editingTrack && (
          <EditTrackModal
            isOpen={true}
            onClose={() => setEditingTrack(null)}
            track={editingTrack}
            onUpdate={handleImageUpdate}
          />
        )}

        {selectedProposal && showNegotiationDialog && (
          <ProposalNegotiationDialog
            isOpen={true}
            onClose={() => {
              setShowNegotiationDialog(false);
              setSelectedProposal(null);
            }}
            proposalId={selectedProposal.id}
            currentOffer={selectedProposal.sync_fee}
            clientName={`${selectedProposal.client.first_name} ${selectedProposal.client.last_name}`}
            trackTitle={selectedProposal.track.title}
          />
        )}

        {selectedProposalId && showHistoryDialog && (
          <ProposalHistoryDialog
            isOpen={true}
            onClose={() => {
              setShowHistoryDialog(false);
              setSelectedProposalId(null);
            }}
            proposalId={selectedProposalId}
          />
        )}

        {confirmAction && (
          <ProposalConfirmDialog
            isOpen={true}
            onClose={() => setConfirmAction(null)}
            onConfirm={() => handleProposalAction(confirmAction.proposalId, confirmAction.action)}
            action={confirmAction.action}
            trackTitle={confirmAction.trackTitle}
            clientName={confirmAction.clientName}
          />
        )}

        {selectedLicenseTrack && (
          <LicenseDialog
            isOpen={true}
            onClose={() => setSelectedLicenseTrack(null)}
            track={selectedLicenseTrack}
            membershipType="Ultimate Access"
            remainingLicenses={999}
          />
        )}

        <ProducerProfile
          isOpen={showProfileDialog}
          onClose={() => setShowProfileDialog(false)}
        />
      </div>
    </div>
  );
}