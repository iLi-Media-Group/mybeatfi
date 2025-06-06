import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Trash2, Plus, UserCog, Loader2, FileText, BarChart3, Filter, Search, MessageSquare, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { ProducerProfile } from './ProducerProfile';
import { EditTrackModal } from './EditTrackModal';
import { DeleteTrackDialog } from './DeleteTrackDialog';
import { TrackProposalsDialog } from './TrackProposalsDialog';
import { RevenueBreakdownDialog } from './RevenueBreakdownDialog';
import { ProposalNegotiationDialog } from './ProposalNegotiationDialog';
import { ProposalHistoryDialog } from './ProposalHistoryDialog';
import { ProposalConfirmDialog } from './ProposalConfirmDialog';

interface ProducerStats {
  totalTracks: number;
  totalSales: number;
  totalRevenue: number;
  pendingBalance: number;
  availableBalance: number;
  lifetimeEarnings: number;
}

interface SyncProposal {
  id: string;
  track_id: string;
  track: {
    id: string;
    title: string;
    producer_id: string;
  };
  client_id: string;
  client: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  project_type: string;
  sync_fee: number;
  expiration_date: string;
  is_urgent: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

export function ProducerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<ProducerStats>({
    totalTracks: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingBalance: 0,
    availableBalance: 0,
    lifetimeEarnings: 0
  });
  const [sortField, setSortField] = useState<'created_at' | 'title' | 'bpm'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTrackProposalsDialog, setShowTrackProposalsDialog] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  const [proposals, setProposals] = useState<SyncProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<SyncProposal | null>(null);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject'>('accept');
  const [proposalFilter, setProposalFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');

      // Fetch producer profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, email')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch producer tracks
      const { data: tracksData } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          genres,
          bpm,
          key,
          audio_url,
          image_url,
          has_sting_ending,
          is_one_stop,
          has_vocals,
          vocals_usage_type,
          created_at
        `)
        .eq('producer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tracksData) {
        const formattedTracks = tracksData.map(track => ({
          id: track.id,
          title: track.title,
          genres: track.genres.split(',').map(g => g.trim()),
          bpm: track.bpm,
          key: track.key,
          audioUrl: track.audio_url,
          image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
          hasStingEnding: track.has_sting_ending,
          isOneStop: track.is_one_stop,
          hasVocals: track.has_vocals,
          vocalsUsageType: track.vocals_usage_type,
          createdAt: track.created_at
        }));
        setTracks(formattedTracks);
        setStats(prev => ({ ...prev, totalTracks: formattedTracks.length }));
      }

      // Fetch producer balance
      const { data: balanceData } = await supabase
        .from('producer_balances')
        .select('pending_balance, available_balance, lifetime_earnings')
        .eq('producer_id', user.id)
        .maybeSingle();

      if (balanceData) {
        setStats(prev => ({
          ...prev,
          pendingBalance: balanceData.pending_balance || 0,
          availableBalance: balanceData.available_balance || 0,
          lifetimeEarnings: balanceData.lifetime_earnings || 0
        }));
      }

      // Fetch sales data
      const { data: salesData, count: salesCount } = await supabase
        .from('sales')
        .select('amount', { count: 'exact' })
        .eq('producer_id', user.id)
        .is('deleted_at', null);

      if (salesData) {
        const totalRevenue = salesData.reduce((sum, sale) => sum + sale.amount, 0);
        setStats(prev => ({
          ...prev,
          totalSales: salesCount || 0,
          totalRevenue
        }));
      }

      // Fetch sync proposals
      const { data: proposalsData } = await supabase
        .from('sync_proposals')
        .select(`
          id,
          track_id,
          track:tracks (
            id,
            title,
            producer_id
          ),
          client_id,
          client:profiles!client_id (
            id,
            first_name,
            last_name,
            email
          ),
          project_type,
          sync_fee,
          expiration_date,
          is_urgent,
          status,
          created_at
        `)
        .eq('track.producer_id', user.id)
        .order('created_at', { ascending: false });

      if (proposalsData) {
        setProposals(proposalsData);
      }

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
      setSortOrder('desc');
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

      setTracks(tracks.filter(t => t.id !== selectedTrack.id));
      setShowDeleteDialog(false);
      setSelectedTrack(null);
    } catch (err) {
      console.error('Error deleting track:', err);
      setError('Failed to delete track');
    }
  };

  const handleProposalStatusChange = async (action: 'accept' | 'reject') => {
    if (!selectedProposal || !user) return;
    
    try {
      // Update proposal status
      const { error } = await supabase
        .from('sync_proposals')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'rejected',
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
          new_status: action === 'accept' ? 'accepted' : 'rejected',
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
          action,
          trackTitle: selectedProposal.track.title,
          clientEmail: selectedProposal.client.email
        })
      });

      // Update local state
      setProposals(proposals.map(p => 
        p.id === selectedProposal.id 
          ? { ...p, status: action === 'accept' ? 'accepted' : 'rejected' } 
          : p
      ));
      
      setShowConfirmDialog(false);
      setSelectedProposal(null);
    } catch (err) {
      console.error(`Error ${action}ing proposal:`, err);
      setError(`Failed to ${action} proposal`);
    }
  };

  const filteredTracks = tracks
    .filter(track => !selectedGenre || track.genres.includes(selectedGenre))
    .filter(track => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        track.title.toLowerCase().includes(query) ||
        track.genres.some(g => g.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'created_at':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * modifier;
        case 'title':
          return a.title.localeCompare(b.title) * modifier;
        case 'bpm':
          return (a.bpm - b.bpm) * modifier;
        default:
          return 0;
      }
    });

  const filteredProposals = proposals
    .filter(proposal => {
      if (proposalFilter === 'all') return true;
      return proposal.status === proposalFilter;
    })
    .filter(proposal => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        proposal.track.title.toLowerCase().includes(query) ||
        (proposal.client.first_name && proposal.client.first_name.toLowerCase().includes(query)) ||
        (proposal.client.last_name && proposal.client.last_name.toLowerCase().includes(query)) ||
        proposal.client.email.toLowerCase().includes(query)
      );
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
              <Upload className="w-5 h-5 mr-2" />
              Upload Track
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
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

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Available Balance</p>
                <p className="text-3xl font-bold text-white">${stats.availableBalance.toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
            <Link
              to="/producer/banking"
              className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Manage Payments
            </Link>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Pending Balance</p>
                <p className="text-3xl font-bold text-white">${stats.pendingBalance.toFixed(2)}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-500" />
            </div>
            <button
              onClick={() => setShowRevenueBreakdown(true)}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              View Earnings Breakdown
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Tracks</h2>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tracks..."
                    className="pl-10 pr-4 py-2 bg-white/5 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="bg-white/5 border border-purple-500/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Genres</option>
                  {Array.from(new Set(tracks.flatMap(t => t.genres))).map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredTracks.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No tracks found</p>
                <Link
                  to="/producer/upload"
                  className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Upload Your First Track
                </Link>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredTracks.map((track) => (
                  <div
                    key={track.id}
                    className="bg-white/5 rounded-lg p-4 border border-purple-500/10"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white">{track.title}</h3>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedTrack(track);
                                setShowEditModal(true);
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
                        <div className="flex flex-wrap gap-2 mt-2">
                          {track.genres.map((genre) => (
                            <span
                              key={genre}
                              className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-gray-300"
                            >
                              {genre}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-gray-300">
                            {track.bpm} BPM
                          </span>
                          {track.hasVocals && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                              {track.vocalsUsageType === 'sync_only' ? 'Sync Only' : 'Vocals'}
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <AudioPlayer url={track.audioUrl} title={track.title} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Sync Proposals</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setProposalFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    proposalFilter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setProposalFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    proposalFilter === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setProposalFilter('accepted')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    proposalFilter === 'accepted'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Accepted
                </button>
                <button
                  onClick={() => setProposalFilter('rejected')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    proposalFilter === 'rejected'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Rejected
                </button>
              </div>
            </div>

            {filteredProposals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No proposals found</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredProposals.map((proposal) => {
                  const isExpired = new Date(proposal.expiration_date) < new Date();
                  const isPending = proposal.status === 'pending';
                  
                  return (
                    <div
                      key={proposal.id}
                      className="bg-white/5 rounded-lg p-4 border border-purple-500/10"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {proposal.track.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            From: {proposal.client.first_name} {proposal.client.last_name}
                          </p>
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-green-400 font-semibold">${proposal.sync_fee.toFixed(2)}</span>
                            <span className="text-gray-400 text-sm">
                              Expires: {new Date(proposal.expiration_date).toLocaleDateString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                              proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              isExpired ? 'bg-gray-500/20 text-gray-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {isExpired && proposal.status === 'pending' ? 'Expired' : 
                               proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                            </span>
                            {proposal.is_urgent && (
                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedProposal(proposal);
                              setShowHistoryDialog(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                            title="View History"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          {isPending && !isExpired && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedProposal(proposal);
                                  setShowNegotiationDialog(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-400/10"
                                title="Negotiate"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProposal(proposal);
                                  setConfirmAction('accept');
                                  setShowConfirmDialog(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-green-400 transition-colors rounded-lg hover:bg-green-400/10"
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
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 bg-black/20 rounded-lg p-3">
                        <p className="text-gray-300 text-sm line-clamp-2">{proposal.project_type}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Sales</h2>
            <Link
              to="/producer/banking"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              View All Earnings
            </Link>
          </div>

          {/* This would be populated with actual sales data */}
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Sales data will appear here</p>
          </div>
        </div>
      </div>

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
          onUpdate={() => {
            fetchDashboardData();
            setShowEditModal(false);
            setSelectedTrack(null);
          }}
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

      {selectedTrack && showTrackProposalsDialog && (
        <TrackProposalsDialog
          isOpen={showTrackProposalsDialog}
          onClose={() => {
            setShowTrackProposalsDialog(false);
            setSelectedTrack(null);
          }}
          trackId={selectedTrack.id}
          trackTitle={selectedTrack.title}
        />
      )}

      <RevenueBreakdownDialog
        isOpen={showRevenueBreakdown}
        onClose={() => setShowRevenueBreakdown(false)}
        producerId={user?.id}
      />

      {selectedProposal && showNegotiationDialog && (
        <ProposalNegotiationDialog
          isOpen={showNegotiationDialog}
          onClose={() => {
            setShowNegotiationDialog(false);
            setSelectedProposal(null);
          }}
          proposalId={selectedProposal.id}
          currentOffer={selectedProposal.sync_fee}
          clientName={`${selectedProposal.client.first_name || ''} ${selectedProposal.client.last_name || ''}`.trim() || selectedProposal.client.email}
          trackTitle={selectedProposal.track.title}
        />
      )}

      {selectedProposal && showHistoryDialog && (
        <ProposalHistoryDialog
          isOpen={showHistoryDialog}
          onClose={() => {
            setShowHistoryDialog(false);
            setSelectedProposal(null);
          }}
          proposalId={selectedProposal.id}
        />
      )}

      {selectedProposal && showConfirmDialog && (
        <ProposalConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => {
            setShowConfirmDialog(false);
            setSelectedProposal(null);
          }}
          onConfirm={() => handleProposalStatusChange(confirmAction)}
          action={confirmAction}
          trackTitle={selectedProposal.track.title}
          clientName={`${selectedProposal.client.first_name || ''} ${selectedProposal.client.last_name || ''}`.trim() || selectedProposal.client.email}
        />
      )}
    </div>
  );
}