import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Upload, 
  Music, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Settings,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  User,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import TrackUploadForm from './TrackUploadForm';
import EditTrackModal from './EditTrackModal';
import DeleteTrackDialog from './DeleteTrackDialog';
import TrackProposalsDialog from './TrackProposalsDialog';
import ProducerProfile from './ProducerProfile';
import RevenueBreakdownDialog from './RevenueBreakdownDialog';
import ProposalNegotiationDialog from './ProposalNegotiationDialog';
import ProposalHistoryDialog from './ProposalHistoryDialog';
import ProposalConfirmDialog from './ProposalConfirmDialog';
import ProposalDetailDialog from './ProposalDetailDialog';

interface Track {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  duration: number;
  file_url: string;
  created_at: string;
  proposal_count?: number;
}

interface Proposal {
  id: string;
  status: string;
  budget: number;
  created_at: string;
  track?: Track;
  client?: {
    full_name: string;
  };
}

interface Stats {
  totalTracks: number;
  totalProposals: number;
  totalRevenue: number;
  pendingProposals: number;
}

export default function ProducerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTracks: 0,
    totalProposals: 0,
    totalRevenue: 0,
    pendingProposals: 0
  });
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTrackProposalsDialog, setShowTrackProposalsDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedProposalForDetails, setSelectedProposalForDetails] = useState<Proposal | null>(null);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject'>('accept');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select(`
          *,
          sync_proposals(count)
        `)
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      const tracksWithProposalCount = tracksData?.map(track => ({
        ...track,
        proposal_count: track.sync_proposals?.[0]?.count || 0
      })) || [];

      setTracks(tracksWithProposalCount);

      // Fetch proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('sync_proposals')
        .select(`
          *,
          tracks(title, genre),
          clients(full_name)
        `)
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;
      setProposals(proposalsData || []);

      // Calculate stats
      const totalTracks = tracksData?.length || 0;
      const totalProposals = proposalsData?.length || 0;
      const totalRevenue = proposalsData?.reduce((sum, proposal) => 
        proposal.status === 'accepted' ? sum + (proposal.budget || 0) : sum, 0) || 0;
      const pendingProposals = proposalsData?.filter(p => p.status === 'pending').length || 0;

      setStats({
        totalTracks,
        totalProposals,
        totalRevenue,
        pendingProposals
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const handleViewProposals = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackProposalsDialog(true);
  };

  const confirmDeleteTrack = async () => {
    if (!selectedTrack) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', selectedTrack.id);

      if (error) throw error;

      setShowDeleteDialog(false);
      setSelectedTrack(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  };

  const handleViewProposalDetails = (proposal: Proposal) => {
    setSelectedProposalForDetails(proposal);
  };

  const handleProposalAction = (proposal: Proposal, action: 'accept' | 'reject' | 'negotiate' | 'history') => {
    setSelectedProposal(proposal);
    
    switch (action) {
      case 'negotiate':
        setShowNegotiationDialog(true);
        break;
      case 'history':
        setShowHistoryDialog(true);
        break;
      case 'accept':
      case 'reject':
        setConfirmAction(action);
        setShowConfirmDialog(true);
        break;
    }
  };

  const handleProposalStatusChange = async (action: 'accept' | 'reject') => {
    if (!selectedProposal) return;

    try {
      const { error } = await supabase
        .from('sync_proposals')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      setShowConfirmDialog(false);
      setSelectedProposal(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating proposal status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'accepted':
        return 'bg-green-500/20 text-green-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      case 'negotiating':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'accepted':
        return <CheckCircle className="w-3 h-3" />;
      case 'rejected':
        return <XCircle className="w-3 h-3" />;
      case 'negotiating':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Producer Dashboard</h1>
            <p className="text-blue-200 mt-2">Manage your tracks and sync opportunities</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowProfileDialog(true)}
              className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-blue-500/20 text-white hover:bg-white/20 transition-colors"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </button>
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Track
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Tracks</p>
                <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
              </div>
              <Music className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Proposals</p>
                <p className="text-2xl font-bold text-white">{stats.totalProposals}</p>
              </div>
              <FileText className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setShowRevenueBreakdown(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Pending Proposals</p>
                <p className="text-2xl font-bold text-white">{stats.pendingProposals}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 backdrop-blur-sm rounded-lg p-1 border border-blue-500/20">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tracks'
                ? 'bg-purple-600 text-white'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            My Tracks
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'proposals'
                ? 'bg-purple-600 text-white'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            Proposals
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Tracks */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
              <div className="px-6 py-4 border-b border-blue-500/20">
                <h3 className="text-lg font-medium text-white">Recent Tracks</h3>
              </div>
              <div className="p-6">
                {tracks.slice(0, 3).map((track) => (
                  <div key={track.id} className="flex items-center justify-between py-3 border-b border-blue-500/10 last:border-b-0">
                    <div>
                      <h4 className="text-white font-medium">{track.title}</h4>
                      <p className="text-sm text-gray-400">{track.genre} • {track.bpm} BPM</p>
                    </div>
                    <div className="text-sm text-blue-400">
                      {track.proposal_count} proposals
                    </div>
                  </div>
                ))}
                {tracks.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No tracks uploaded yet</p>
                )}
              </div>
            </div>

            {/* Recent Proposals */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
              <div className="px-6 py-4 border-b border-blue-500/20">
                <h3 className="text-lg font-medium text-white">Recent Proposals</h3>
              </div>
              <div className="p-6">
                {proposals.slice(0, 3).map((proposal) => (
                  <div key={proposal.id} className="flex items-center justify-between py-3 border-b border-blue-500/10 last:border-b-0">
                    <div>
                      <h4 className="text-white font-medium">{proposal.track?.title}</h4>
                      <p className="text-sm text-gray-400">{proposal.client?.full_name}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(proposal.status)}`}>
                      {proposal.status}
                    </div>
                  </div>
                ))}
                {proposals.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No proposals yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracks' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
            <div className="px-6 py-4 border-b border-blue-500/20">
              <h3 className="text-lg font-medium text-white">My Tracks</h3>
            </div>
            <div className="p-6">
              {tracks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tracks.map((track) => (
                    <div key={track.id} className="bg-white/5 rounded-lg p-4 border border-blue-500/10">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-medium">{track.title}</h4>
                          <p className="text-sm text-gray-400">{track.genre}</p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleViewProposals(track)}
                            className="p-1 text-blue-400 hover:text-blue-300"
                            title="View Proposals"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditTrack(track)}
                            className="p-1 text-yellow-400 hover:text-yellow-300"
                            title="Edit Track"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTrack(track)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Delete Track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>{track.bpm} BPM • {track.key}</p>
                        <p>{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</p>
                        <p className="text-blue-400">{track.proposal_count} proposals</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="mx-auto h-12 w-12 text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-white">No tracks yet</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Get started by uploading your first track
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowUploadForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Track
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
            <div className="px-6 py-4 border-b border-blue-500/20">
              <h3 className="text-lg font-medium text-white">Sync Proposals</h3>
            </div>
            <div className="p-6">
              {proposals.length > 0 ? (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <div key={proposal.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-white font-medium">{proposal.track?.title}</h4>
                          <p className="text-sm text-gray-400">{proposal.client?.full_name}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm ${getStatusColor(proposal.status)}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(proposal.status)}
                            <span>{proposal.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => handleViewProposalDetails(proposal)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-white">No proposals yet</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Proposals from clients will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals and Dialogs */}
        {showUploadForm && (
          <TrackUploadForm onClose={() => setShowUploadForm(false)} onUploadComplete={fetchDashboardData} />
        )}

        {showEditModal && selectedTrack && (
          <EditTrackModal
            track={selectedTrack}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTrack(null);
            }}
            onUpdate={fetchDashboardData}
          />
        )}

        {showDeleteDialog && selectedTrack && (
          <DeleteTrackDialog
            track={selectedTrack}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedTrack(null);
            }}
            onConfirm={confirmDeleteTrack}
          />
        )}

        {showTrackProposalsDialog && selectedTrack && (
          <TrackProposalsDialog
            track={selectedTrack}
            onClose={() => {
              setShowTrackProposalsDialog(false);
              setSelectedTrack(null);
            }}
          />
        )}

        {showProfileDialog && (
          <ProducerProfile
            onClose={() => setShowProfileDialog(false)}
            onUpdate={fetchDashboardData}
          />
        )}

        {showRevenueBreakdown && (
          <RevenueBreakdownDialog
            onClose={() => setShowRevenueBreakdown(false)}
            stats={stats}
          />
        )}

        {showNegotiationDialog && selectedProposal && (
          <ProposalNegotiationDialog
            proposal={selectedProposal}
            onClose={() => {
              setShowNegotiationDialog(false);
              setSelectedProposal(null);
            }}
            onUpdate={fetchDashboardData}
          />
        )}

        {showHistoryDialog && selectedProposal && (
          <ProposalHistoryDialog
            proposal={selectedProposal}
            onClose={() => {
              setShowHistoryDialog(false);
              setSelectedProposal(null);
            }}
          />
        )}

        {showConfirmDialog && selectedProposal && (
          <ProposalConfirmDialog
            proposal={selectedProposal}
            action={confirmAction}
            onClose={() => {
              setShowConfirmDialog(false);
              setSelectedProposal(null);
            }}
            onConfirm={() => handleProposalStatusChange(confirmAction)}
          />
        )}

        {selectedProposalForDetails && (
          <ProposalDetailDialog
            proposal={selectedProposalForDetails}
            onClose={() => setSelectedProposalForDetails(null)}
          />
        )}
      </div>
    </div>
  );
}