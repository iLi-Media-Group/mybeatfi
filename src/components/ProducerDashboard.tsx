import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog, Loader2, BarChart3, FileText, MessageSquare, Eye } from 'lucide-react';
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
  sales_count: number;
  revenue: number;
}

interface Proposal {
  id: string;
  project_type: string;
  sync_fee: number;
  expiration_date: string;
  is_urgent: boolean;
  status: string;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
    email: string;
  };
  track: {
    id: string;
    title: string;
  };
}

export function ProducerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'title' | 'bpm'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  const [stats, setStats] = useState({
    totalTracks: 0,
    totalSales: 0,
    totalRevenue: 0,
    pendingProposals: 0
  });
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
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
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch tracks with sales data
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
        .eq('producer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Fetch sales data for each track
      const trackIds = tracksData?.map(track => track.id) || [];
      
      // Get sales data for all tracks at once
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('track_id, amount')
        .in('track_id', trackIds)
        .is('deleted_at', null);

      if (salesError) throw salesError;

      // Process sales data by track
      const trackSalesMap = {};
      const trackRevenueMap = {};
      
      if (salesData) {
        salesData.forEach(sale => {
          if (!trackSalesMap[sale.track_id]) {
            trackSalesMap[sale.track_id] = 0;
            trackRevenueMap[sale.track_id] = 0;
          }
          trackSalesMap[sale.track_id]++;
          trackRevenueMap[sale.track_id] += sale.amount;
        });
      }

      // Add sales data to tracks
      const tracksWithSales = tracksData?.map(track => ({
        ...track,
        genres: typeof track.genres === 'string' ? track.genres.split(',') : track.genres,
        sales_count: trackSalesMap[track.id] || 0,
        revenue: trackRevenueMap[track.id] || 0
      })) || [];

      setTracks(tracksWithSales);

      // Calculate total stats
      const totalTracks = tracksWithSales.length;
      const totalSales = Object.values(trackSalesMap).reduce((sum: number, count: number) => sum + count, 0);
      const totalRevenue = Object.values(trackRevenueMap).reduce((sum: number, amount: number) => sum + amount, 0);

      // Fetch all proposals
      const { data: allProposalsData, error: allProposalsError } = await supabase
        .from('sync_proposals')
        .select(`
          id,
          track_id,
          client_id,
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
            id,
            title
          )
        `)
        .in('track_id', trackIds)
        .order('created_at', { ascending: false });

      if (allProposalsError) throw allProposalsError;

      // Fetch recent proposals
      const { data: recentProposalsData, error: proposalsError } = await supabase
        .from('sync_proposals')
        .select(`
          id,
          track_id,
          client_id,
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
            id,
            title
          )
        `)
        .in('track_id', trackIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (proposalsError) throw proposalsError;

      setProposals(allProposalsData || []);
      setPendingProposals(recentProposalsData || []);

      // Update stats
      setStats({
        totalTracks,
        totalSales,
        totalRevenue,
        pendingProposals: recentProposalsData?.length || 0
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
      // Soft delete the track
      const { error } = await supabase
        .from('tracks')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', selectedTrack.id);

      if (error) throw error;

      // Update local state
      setTracks(tracks.filter(track => track.id !== selectedTrack.id));
      setShowDeleteDialog(false);
      setSelectedTrack(null);
    } catch (err) {
      console.error('Error deleting track:', err);
      setError('Failed to delete track');
    }
  };

  const handleProposalAction = (proposal: Proposal, action: 'negotiate' | 'history' | 'accept' | 'reject') => {
    setSelectedProposal(proposal);
    
    switch (action) {
      case 'negotiate':
        setShowNegotiationDialog(true);
        break;
      case 'history':
        setShowHistoryDialog(true);
        break;
      case 'accept':
        setConfirmAction('accept');
        setShowConfirmDialog(true);
        break;
      case 'reject':
        setConfirmAction('reject');
        setShowConfirmDialog(true);
        break;
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
          trackTitle: selectedProposal.track.title,
          clientEmail: selectedProposal.client.email
        })
      });

      // Update local state
      setProposals(proposals.map(p => 
        p.id === selectedProposal.id 
          ? { ...p, status: confirmAction === 'accept' ? 'accepted' : 'rejected' } 
          : p
      ));
      
      setPendingProposals(pendingProposals.filter(p => p.id !== selectedProposal.id));
      
      setShowConfirmDialog(false);
      setSelectedProposal(null);
      
      // Refresh dashboard data
      fetchDashboardData();
    } catch (err) {
      console.error(`Error ${confirmAction}ing proposal:`, err);
      setError(`Failed to ${confirmAction} proposal`);
    }
  };

  const sortedTracks = [...tracks]
    .filter(track => !selectedGenre || track.genres.includes(selectedGenre))
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

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 cursor-pointer" onClick={() => setShowRevenueBreakdown(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Pending Proposals</p>
                <p className="text-3xl font-bold text-white">{stats.pendingProposals}</p>
              </div>
              <FileText className="w-12 h-12 text-yellow-500" />
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
                  className="bg-white/10 border border-blue-500/20 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Genres</option>
                  {Array.from(new Set(tracks.flatMap(track => track.genres))).map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>

            {sortedTracks.length === 0 ? (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-blue-500/20">
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
              sortedTracks.map((track) => (
                <div
                  key={track.id}
                  className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20"
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
                            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                            title="View Proposals"
                          >
                            <Eye className="w-4 h-4" />
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
                        <p>{track.genres.join(', ')} • {track.bpm} BPM</p>
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-green-400" />
                            ${track.revenue.toFixed(2)}
                          </span>
                          <span className="flex items-center">
                            <BarChart3 className="w-4 h-4 mr-1 text-blue-400" />
                            {track.sales_count} sales
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
                    <AudioPlayer src={track.audio_url} title={track.title} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-yellow-400" />
                  Pending Proposals
                </h3>
                <Link
                  to="/producer/banking"
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center text-sm"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  View Earnings
                </Link>
              </div>
              <div className="space-y-4">
                {pendingProposals.length === 0 ? (
                  <div className="text-center py-6 bg-white/5 backdrop-blur-sm rounded-lg border border-blue-500/20">
                    <p className="text-gray-400">No pending proposals</p>
                  </div>
                ) : (
                  pendingProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-medium">{proposal.track.title}</h4>
                          <p className="text-sm text-gray-400">
                            From: {proposal.client.first_name} {proposal.client.last_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-green-400">${proposal.sync_fee.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            Expires: {new Date(proposal.expiration_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => handleProposalAction(proposal, 'history')}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors"
                        >
                          <Clock className="w-3 h-3 inline mr-1" />
                          History
                        </button>
                        <button
                          onClick={() => handleProposalAction(proposal, 'negotiate')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          <MessageSquare className="w-3 h-3 inline mr-1" />
                          Negotiate
                        </button>
                        <button
                          onClick={() => handleProposalAction(proposal, 'accept')}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          <Check className="w-3 h-3 inline mr-1" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleProposalAction(proposal, 'reject')}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          <X className="w-3 h-3 inline mr-1" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Sales Overview
              </h3>
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Total Revenue</span>
                      <span className="text-white font-semibold">${stats.totalRevenue.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full w-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Total Sales</span>
                      <span className="text-white font-semibold">{stats.totalSales}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">Pending Proposals</span>
                      <span className="text-white font-semibold">{stats.pendingProposals}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 rounded-full" 
                        style={{ width: `${(stats.pendingProposals / Math.max(1, stats.totalTracks)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowRevenueBreakdown(true)}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  View Detailed Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {showRevenueBreakdown && (
        <RevenueBreakdownDialog
          isOpen={showRevenueBreakdown}
          onClose={() => setShowRevenueBreakdown(false)}
          producerId={user?.id}
        />
      )}

      {selectedProposal && showNegotiationDialog && (
        <ProposalNegotiationDialog
          isOpen={showNegotiationDialog}
          onClose={() => {
            setShowNegotiationDialog(false);
            setSelectedProposal(null);
          }}
          proposal={selectedProposal}
          onNegotiationSent={() => {
            setShowNegotiationDialog(false);
            setSelectedProposal(null);
            fetchDashboardData();
          }}
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
          action={confirmAction}
          proposal={selectedProposal}
          onConfirm={handleProposalStatusChange}
        />
      )}

      {showProfileDialog && (
        <ProducerProfile
          isOpen={showProfileDialog}
          onClose={() => setShowProfileDialog(false)}
          onProfileUpdated={fetchDashboardData}
        />
      )}

      {selectedTrack && showEditTrackModal && (
        <EditTrackModal
          isOpen={showEditTrackModal}
          onClose={() => {
            setShowEditTrackModal(false);
            setSelectedTrack(null);
          }}
          track={selectedTrack}
          onUpdate={fetchDashboardData}
        />
      )}
    </div>
  );
}
