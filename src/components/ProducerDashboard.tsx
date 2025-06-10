import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog, Loader2, MessageSquare, Eye, XCircle, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AudioPlayer } from './AudioPlayer';
import { DeleteTrackDialog } from './DeleteTrackDialog';
import { TrackProposalsDialog } from './TrackProposalsDialog';
import { RevenueBreakdownDialog } from './RevenueBreakdownDialog';
import { ProposalNegotiationDialog } from './ProposalNegotiationDialog';
import { ProposalHistoryDialog } from './ProposalHistoryDialog';
import { ProposalConfirmDialog } from './ProposalConfirmDialog';
import { ProducerProfile } from './ProducerProfile';
import { EditTrackModal } from './EditTrackModal';

interface Track {
  id: string;
  title: string;
  genres: string[];
  bpm: number;
  audio_url: string;
  image_url: string;
  created_at: string;
  has_vocals: boolean;
  vocals_usage_type: string | null;
  proposal_count: number;
  sale_count: number;
}

interface Proposal {
  id: string;
  track_id: string;
  track_title: string;
  client_name: string;
  client_id: string;
  project_type: string;
  sync_fee: number;
  status: string;
  negotiation_status: string;
  client_status: string;
  payment_status: string;
  created_at: string;
  expiration_date: string;
  is_urgent: boolean;
}

interface ProducerStats {
  totalTracks: number;
  totalSales: number;
  totalRevenue: number;
  pendingProposals: number;
  availableBalance: number;
  pendingBalance: number;
}

export function ProducerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<ProducerStats>({
    totalTracks: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingProposals: 0,
    availableBalance: 0,
    pendingBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'title' | 'genres' | 'bpm'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  
  // Dialog states
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTrackProposalsDialog, setShowTrackProposalsDialog] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject'>('accept');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEditTrackModal, setShowEditTrackModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, email')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch producer tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          genres,
          bpm,
          audio_url,
          image_url,
          created_at,
          has_vocals,
          vocals_usage_type
        `)
        .eq('producer_id', user?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Fetch proposal counts for each track
      const trackIds = tracksData?.map(track => track.id) || [];
      
      // Get proposal counts by fetching all proposals and counting them
      const { data: proposalsData, error: proposalCountError } = await supabase
        .from('sync_proposals')
        .select('track_id')
        .in('track_id', trackIds);

      if (proposalCountError) throw proposalCountError;

      // Count proposals per track
      const proposalCountMap = proposalsData?.reduce((acc, proposal) => {
        acc[proposal.track_id] = (acc[proposal.track_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get sale counts by fetching all sales and counting them
      const { data: salesCountData, error: saleCountError } = await supabase
        .from('sales')
        .select('track_id')
        .in('track_id', trackIds)
        .is('deleted_at', null);

      if (saleCountError) throw saleCountError;

      // Count sales per track
      const saleCountMap = salesCountData?.reduce((acc, sale) => {
        acc[sale.track_id] = (acc[sale.track_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Add proposal_count and sale_count to each track
      const tracksWithCounts = tracksData?.map(track => ({
        ...track,
        genres: typeof track.genres === 'string' ? track.genres.split(',').map(g => g.trim()) : track.genres,
        proposal_count: proposalCountMap[track.id] || 0,
        sale_count: saleCountMap[track.id] || 0
      })) || [];

      setTracks(tracksWithCounts);

      // Fetch recent proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('sync_proposals')
        .select(`
          id,
          track_id,
          client_id,
          project_type,
          sync_fee,
          status,
          negotiation_status,
          client_status,
          payment_status,
          created_at,
          expiration_date,
          is_urgent,
          tracks (
            title
          ),
          client:profiles!client_id (
            first_name,
            last_name
          )
        `)
        .in('track_id', trackIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (proposalsError) throw proposalsError;

      // Format proposals
      const formattedProposals = proposalsData?.map(proposal => ({
        id: proposal.id,
        track_id: proposal.track_id,
        track_title: proposal.tracks.title,
        client_id: proposal.client_id,
        client_name: `${proposal.client.first_name || ''} ${proposal.client.last_name || ''}`.trim() || 'Unknown Client',
        project_type: proposal.project_type,
        sync_fee: proposal.sync_fee,
        status: proposal.status,
        negotiation_status: proposal.negotiation_status,
        client_status: proposal.client_status,
        payment_status: proposal.payment_status,
        created_at: proposal.created_at,
        expiration_date: proposal.expiration_date,
        is_urgent: proposal.is_urgent
      })) || [];

      setProposals(formattedProposals);

      // Fetch producer stats
      const { data: balanceData, error: balanceError } = await supabase
        .from('producer_balances')
        .select('available_balance, pending_balance')
        .eq('producer_id', user?.id)
        .maybeSingle();

      if (balanceError) throw balanceError;

      // Calculate total sales and revenue
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('amount')
        .in('track_id', trackIds)
        .is('deleted_at', null);

      if (salesError) throw salesError;

      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0;

      // Count pending proposals
      const pendingProposals = proposalsData?.filter(p => p.status === 'pending').length || 0;

      setStats({
        totalTracks: tracksData?.length || 0,
        totalSales,
        totalRevenue,
        pendingProposals,
        availableBalance: balanceData?.available_balance || 0,
        pendingBalance: balanceData?.pending_balance || 0
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
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

  const confirmDeleteTrack = async () => {
    if (!selectedTrack) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', selectedTrack.id);

      if (error) throw error;

      setTracks(tracks.filter(track => track.id !== selectedTrack.id));
      setShowDeleteDialog(false);
      setSelectedTrack(null);
    } catch (err) {
      console.error('Error deleting track:', err);
      setError('Failed to delete track');
    }
  };

  const handleProposalStatusChange = async () => {
    if (!selectedProposal || !user) return;
    
    try {
      // Update proposal status
      const { error } = await supabase
        .from('sync_proposals')
        .update({ 
          status: confirmAction === 'accept' ? 'accepted' : 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      // Create history entry
      const { error: historyError } = await supabase
        .from('proposal_history')
        .insert({
          proposal_id: selectedProposal.id,
          previous_status: 'pending',
          new_status: confirmAction === 'accept' ? 'accepted' : 'rejected',
          changed_by: user.id
        });

      if (historyError) throw historyError;

      // Send notification to client
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-proposal-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proposalId: selectedProposal.id,
          action: confirmAction,
          trackTitle: selectedProposal.track_title,
          clientEmail: selectedProposal.client_id // This should be the client's email, but we're using ID as a placeholder
        })
      });

      // Update local state
      setProposals(proposals.map(p => 
        p.id === selectedProposal.id 
          ? { ...p, status: confirmAction === 'accept' ? 'accepted' : 'rejected' } 
          : p
      ));
      
      setShowConfirmDialog(false);
      setSelectedProposal(null);
    } catch (err) {
      console.error(`Error ${confirmAction}ing proposal:`, err);
      setError(`Failed to ${confirmAction} proposal`);
    }
  };

  const handleTrackUpdate = () => {
    fetchDashboardData(); // Refresh all data after track update
    setShowEditTrackModal(false);
    setSelectedTrack(null);
  };

  const sortedAndFilteredTracks = tracks
    .filter(track => !selectedGenre || (track.genres && track.genres.includes(selectedGenre)))
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'created_at':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * modifier;
        case 'title':
          return a.title.localeCompare(b.title) * modifier;
        case 'bpm':
          return (a.bpm - b.bpm) * modifier;
        default:
          return 0;
      }
    });

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
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Upload Track
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Tracks</p>
                <p className="text-3xl font-bold text-white">{stats.totalTracks}</p>
              </div>
              <Music className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Sales</p>
                <p className="text-3xl font-bold text-white">{stats.totalSales}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-white">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div 
                className="relative cursor-pointer group" 
                onClick={() => setShowRevenueBreakdown(true)}
                title="View revenue breakdown"
              >
                <DollarSign className="w-12 h-12 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Available Balance</p>
                <p className="text-3xl font-bold text-white">
                  ${stats.availableBalance.toFixed(2)}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Pending: ${stats.pendingBalance.toFixed(2)}
                </p>
              </div>
              <Link
                to="/producer/banking"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Tracks</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleSort('created_at')}
                  className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  <Calendar className="w-4 h-4" />
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  <span>A-Z</span>
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="bg-white/10 border border-purple-500/20 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Genres</option>
                  {Array.from(new Set(tracks.flatMap(t => t.genres || []))).map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>

            {sortedAndFilteredTracks.length === 0 ? (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No tracks found</p>
                <Link
                  to="/producer/upload"
                  className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Upload Your First Track
                </Link>
              </div>
            ) : (
              sortedAndFilteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'}
                      alt={track.title}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white mb-1">{track.title}</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedTrack(track);
                              setShowEditTrackModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                            title="Edit Track"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTrack(track);
                              setShowTrackProposalsDialog(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-400/10"
                            title="View Proposals"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {track.proposal_count > 0 && (
                              <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                {track.proposal_count}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTrack(track);
                              setShowDeleteDialog(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                            title="Delete Track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>{track.genres?.join(', ') || 'No genres'} • {track.bpm} BPM</p>
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <MessageSquare className="w-4 h-4 mr-1 text-blue-400" />
                            {track.proposal_count} Proposals
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-green-400" />
                            {track.sale_count} Sales
                          </span>
                          {track.has_vocals && (
                            <span className="flex items-center">
                              <Mic className="w-4 h-4 mr-1 text-purple-400" />
                              {track.vocals_usage_type === 'sync_only' ? 'Sync Only' : 'Vocals'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <AudioPlayer url={track.audio_url} title={track.title} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Recent Proposals</h3>
                <Link
                  to="/open-sync-briefs"
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  View Open Briefs
                </Link>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20 p-4">
                {proposals.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No proposals yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposals.slice(0, 5).map((proposal) => (
                      <div
                        key={proposal.id}
                        className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-medium">{proposal.track_title}</p>
                            <p className="text-sm text-gray-400">
                              From: {proposal.client_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-semibold">${proposal.sync_fee.toFixed(2)}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(proposal.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              proposal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                            </span>
                            {proposal.is_urgent && (
                              <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                                Urgent
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                setSelectedProposal(proposal);
                                setShowHistoryDialog(true);
                              }}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title="View History"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProposal(proposal);
                                setShowNegotiationDialog(true);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                              title="Negotiate"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            {proposal.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedProposal(proposal);
                                    setConfirmAction('accept');
                                    setShowConfirmDialog(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                                  title="Accept"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProposal(proposal);
                                    setConfirmAction('reject');
                                    setShowConfirmDialog(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Decline"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">Quick Stats</h3>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20 p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Pending Proposals</span>
                    <span className="text-white font-semibold">{stats.pendingProposals}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Available Balance</span>
                    <span className="text-green-400 font-semibold">${stats.availableBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Pending Balance</span>
                    <span className="text-yellow-400 font-semibold">${stats.pendingBalance.toFixed(2)}</span>
                  </div>
                