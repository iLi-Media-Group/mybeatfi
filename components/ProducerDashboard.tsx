import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { AudioPlayer } from './AudioPlayer';
import { 
  Upload, 
  Music, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  FileText,
  History,
  User,
  Settings
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
  artist: string;
  genres: string[] | string;
  bpm: number;
  duration: string;
  audio_url: string;
  image_url: string;
  created_at: string;
  has_sting_ending: boolean;
  is_one_stop: boolean;
  key: string;
  has_vocals: boolean;
  vocals_usage_type: string;
}

interface Proposal {
  id: string;
  track_id: string;
  client_id: string;
  project_type: string;
  duration: string;
  is_exclusive: boolean;
  sync_fee: number;
  payment_terms: string;
  expiration_date: string;
  is_urgent: boolean;
  status: string;
  created_at: string;
  negotiation_status: string;
  client_status: string;
  payment_status: string;
  track: {
    title: string;
    artist: string;
  };
  client: {
    full_name: string;
    email: string;
  };
}

interface DashboardStats {
  totalTracks: number;
  totalSales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingProposals: number;
  acceptedProposals: number;
}

export default function ProducerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTracks: 0,
    totalSales: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingProposals: 0,
    acceptedProposals: 0
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
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | null>(null);
  const [profile, setProfile] = useState<{ first_name?: string, last_name?: string, email: string, avatar_path?: string | null } | null>(null);

  // Add event listener for proposal actions from the ProposalDetailDialog
  useEffect(() => {
  const handleProposalAction = (event: CustomEvent) => {
    const { action, proposal } = event.detail;
    console.log('Received proposal action event:', event.detail);

    if (proposal) {
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
        default:
          break;
      }
    }
  };

  document.addEventListener('proposal-action', handleProposalAction as EventListener);
  return () => {
    document.removeEventListener('proposal-action', handleProposalAction as EventListener);
  };
}, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, avatar_path')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch tracks
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('producer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;
      setTracks(tracksData || []);

      // Fetch proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('sync_proposals')
        .select(`
          *,
          track:tracks(title, artist),
          client:profiles!sync_proposals_client_id_fkey(full_name, email)
        `)
        .in('track_id', tracksData?.map(t => t.id) || [])
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;
      setProposals(proposalsData || []);

      // Fetch sales stats
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('amount, created_at')
        .eq('producer_id', user.id)
        .is('deleted_at', null);

      if (salesError) throw salesError;

      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = salesData?.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      }).reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;

      const pendingProposals = proposalsData?.filter(p => p.status === 'pending').length || 0;
      const acceptedProposals = proposalsData?.filter(p => p.status === 'accepted').length || 0;

      setStats({
        totalTracks: tracksData?.length || 0,
        totalSales,
        totalRevenue,
        monthlyRevenue,
        pendingProposals,
        acceptedProposals
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProposalDetails = (proposal: Proposal) => {
    setSelectedProposalForDetails(proposal);
  };

  const handleTrackEdit = (track: Track) => {
    setSelectedTrack(track);
    setShowEditModal(true);
  };

  const handleTrackDelete = (track: Track) => {
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

      setTracks(tracks.filter(t => t.id !== selectedTrack.id));
      setShowDeleteDialog(false);
      setSelectedTrack(null);
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  };

  const handleViewProposals = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackProposalsDialog(true);
  };

  const handleProposalAction = (proposal: Proposal, action: 'accept' | 'reject' | 'negotiate' | 'history') => {
    setSelectedProposal(proposal);
    
    if (action === 'negotiate') {
      setShowNegotiationDialog(true);
    } else if (action === 'history') {
      setShowHistoryDialog(true);
    } else {
      setConfirmAction(action);
      setShowConfirmDialog(true);
    }
  };

  const handleProposalStatusChange = async (action: 'accept' | 'reject') => {
    if (!selectedProposal) return;

    try {
      const { error } = await supabase
        .from('sync_proposals')
        .update({ 
          status: action === 'accept' ? 'accepted' : 'rejected',
          negotiation_status: action === 'accept' ? 'agreed' : 'declined'
        })
        .eq('id', selectedProposal.id);

      if (error) throw error;

      // Update local state
      setProposals(proposals.map(p => 
        p.id === selectedProposal.id 
          ? { ...p, status: action === 'accept' ? 'accepted' : 'rejected', negotiation_status: action === 'accept' ? 'agreed' : 'declined' }
          : p
      ));

      setShowConfirmDialog(false);
      setSelectedProposal(null);
    } catch (error) {
      console.error('Error updating proposal:', error);
    }
  };

  const handleViewTrack = (trackId: string) => {
    navigate(`/track/${trackId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'expired': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Producer Dashboard</h1>
              <p className="text-gray-300">Manage your tracks and sync proposals</p>
              {profile && (
                <p className="text-xl text-gray-300 mt-2">
                  Welcome {profile.first_name || profile.email.split('@')[0]}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowProfileDialog(true)}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <User className="w-5 h-5 mr-2" />
                Profile
              </button>
              <button
                onClick={() => setShowUploadForm(true)}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Track
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <div className="flex items-center">
              <Music className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Tracks</p>
                <p className="text-2xl font-bold text-white">{stats.totalTracks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-white">{stats.totalSales}</p>
              </div>
            </div>
          </div>

          <div 
            className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 cursor-pointer hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10" 
            onClick={() => setShowRevenueBreakdown(true)}
          >
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-blue-400 mt-1">Click for detailed breakdown</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-blue-500/20 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tracks')}
              className={`py-2 px-1 border-b-2 font-medium ${
                activeTab === 'tracks'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              My Tracks ({tracks.length})
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`py-2 px-1 border-b-2 font-medium ${
                activeTab === 'proposals'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Sync Proposals ({proposals.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
              <div className="px-6 py-4 border-b border-blue-500/20">
                <h3 className="text-lg font-medium text-white">Recent Activity</h3>
              </div>
              <div className="p-6">
                {proposals.slice(0, 5).length > 0 ? (
                  <div className="space-y-4">
                    {proposals.slice(0, 5).map((proposal) => (
                      <div 
                        key={proposal.id} 
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => handleViewProposalDetails(proposal)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            proposal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                            proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            <span className="capitalize">{proposal.status}</span>
                          </div>
                          <div>
                            <p className="font-medium text-white">{proposal.track?.title}</p>
                            <p className="text-sm text-gray-400">
                              {proposal.project_type} • ${proposal.sync_fee} • {proposal.client?.full_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
              <div className="px-6 py-4 border-b border-blue-500/20">
                <h3 className="text-lg font-medium text-white">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-blue-500/20 rounded-lg hover:border-blue-500/40 hover:bg-blue-900/20 transition-all duration-300"
                  >
                    <Upload className="w-6 h-6 text-blue-400 mr-2" />
                    <span className="text-gray-300">Upload New Track</span>
                  </button>
                  <Link
                    to="/producer/analytics"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-blue-500/20 rounded-lg hover:border-blue-500/40 hover:bg-blue-900/20 transition-all duration-300"
                  >
                    <BarChart3 className="w-6 h-6 text-blue-400 mr-2" />
                    <span className="text-gray-300">View Analytics</span>
                  </Link>
                  <Link
                    to="/producer/sales"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-blue-500/20 rounded-lg hover:border-blue-500/40 hover:bg-blue-900/20 transition-all duration-300"
                  >
                    <DollarSign className="w-6 h-6 text-blue-400 mr-2" />
                    <span className="text-gray-300">View Sales</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracks' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
            <div className="px-6 py-4 border-b border-blue-500/20">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">My Tracks</h3>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Track
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-black/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Track
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {tracks.map((track) => (
                    <tr key={track.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Link to={`/track/${track.id}`}>
                            <div className="h-12 w-12 rounded-lg overflow-hidden">
                              <img
                                className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                src={track.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'}
                                alt={track.title}
                              />
                            </div>
                          </Link>
                          <div className="ml-4">
                            <Link to={`/track/${track.id}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors">{track.title}</Link>
                            <div className="text-sm text-gray-400">{track.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {Array.isArray(track.genres) 
                            ? track.genres.join(', ') 
                            : typeof track.genres === 'string' 
                              ? track.genres.split(',').map(g => g.trim()).join(', ') 
                              : ''} • {track.bpm} BPM
                        </div>
                        <div className="text-sm text-gray-400">
                          {track.key} • {track.duration}
                        </div>
                        <div className="mt-2">
                          <AudioPlayer url={track.audio_url} title={track.title} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(track.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewProposals(track)}
                            className="text-blue-400 hover:text-blue-300"
                            title="View Proposals"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTrackEdit(track)}
                            className="text-purple-400 hover:text-purple-300"
                            title="Edit Track"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTrackDelete(track)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete Track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <Link 
                            to={`/track/${track.id}`} 
                            className="text-green-400 hover:text-green-300"
                            title="View Track Page"
                          >
                            <Music className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tracks.length === 0 && (
                <div className="text-center py-12">
                  <Music className="mx-auto h-12 w-12 text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-white">No tracks</h3>
                  <p className="mt-1 text-sm text-gray-400">Get started by uploading your first track.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowUploadForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-500/10">
                <thead className="bg-black/20">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Track
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500/10">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div 
                          className="text-sm font-medium text-white hover:text-blue-400 transition-colors cursor-pointer"
                          onClick={() => handleViewTrack(proposal.track_id)}
                        >
                          {proposal.track?.title}
                        </div>
                        <div className="text-sm text-gray-400">{proposal.track?.artist}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{proposal.client?.full_name}</div>
                        <div className="text-sm text-gray-400">{proposal.client?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{proposal.project_type}</div>
                        <div className="text-sm text-gray-400">
                          {proposal.duration} • {proposal.is_exclusive ? 'Exclusive' : 'Non-exclusive'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-green-400 font-semibold">
                        ${proposal.sync_fee.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          proposal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          <span className="capitalize">{proposal.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          {proposal.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleProposalAction(proposal, 'accept')}
                                className="text-green-400 hover:text-green-300"
                                title="Accept Proposal"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal, 'reject')}
                                className="text-red-400 hover:text-red-300"
                                title="Reject Proposal"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal, 'negotiate')}
                                className="text-blue-400 hover:text-blue-300"
                                title="Negotiate"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleProposalAction(proposal, 'history')}
                            className="text-gray-400 hover:text-gray-300"
                            title="View History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {proposals.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-white">No proposals</h3>
                  <p className="mt-1 text-sm text-gray-400">Sync proposals will appear here when clients are interested in your tracks.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl border border-purple-500/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Upload New Track</h2>
                  <button
                    onClick={() => setShowUploadForm(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <TrackUploadForm />
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
          <h3 className="text-lg font-medium text-white mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/producer/analytics"
              className="flex items-center p-4 border border-blue-500/20 rounded-lg hover:bg-white/5 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
              <span className="text-gray-300">View Analytics</span>
            </Link>
            <Link
              to="/producer/banking"
              className="flex items-center p-4 border border-blue-500/20 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Settings className="w-5 h-5 mr-2 text-blue-400" />
              <span className="text-gray-300">Banking Settings</span>
            </Link>
            <Link
              to="/producer/sales"
              className="flex items-center p-4 border border-blue-500/20 rounded-lg hover:bg-white/5 transition-colors"
            >
              <DollarSign className="w-5 h-5 mr-2 text-blue-400" />
              <span className="text-gray-300">View All Sales</span>
            </Link>
          </div>
        </div>

        {showProfileDialog && (
          <ProducerProfile
            onClose={() => setShowProfileDialog(false)}
            onUpdate={() => fetchDashboardData()}
          />
        )}

        {showEditModal && selectedTrack && (
          <EditTrackModal
            track={selectedTrack}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTrack(null);
            }}
            onUpdate={(updatedTrack) => {
              setTracks(tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t));
              setShowEditModal(false);
              setSelectedTrack(null);
            }}
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

        {showRevenueBreakdown && (
          <RevenueBreakdownDialog
            isOpen={showRevenueBreakdown}
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
    onUpdate={(updatedProposal) => {
      setProposals(proposals.map(p => p.id === updatedProposal.id ? updatedProposal : p));
      setShowNegotiationDialog(false);
      setSelectedProposal(null);
    }}
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

{showConfirmDialog && selectedProposal && confirmAction && (
  <ProposalConfirmDialog
    proposal={selectedProposal}
    action={confirmAction}
    onClose={() => {
      setShowConfirmDialog(false);
      setSelectedProposal(null);
      setConfirmAction(null); // ✅ Clear the action
    }}
    onConfirm={() => handleProposalStatusChange(confirmAction)}
  />
)}
        
        {/* Proposal Details Dialog */}
        {selectedProposalForDetails && (
          <ProposalDetailDialog
            isOpen={true}
            onClose={() => setSelectedProposalForDetails(null)}
            proposal={selectedProposalForDetails}
            onAccept={(proposalId) => {
              const proposal = selectedProposalForDetails;
              setSelectedProposalForDetails(null);
              setSelectedProposal(proposal);
              setConfirmAction('accept');
              setShowConfirmDialog(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

export { ProducerDashboard };

