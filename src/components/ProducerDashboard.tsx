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
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject'>('accept');
  const [profile, setProfile] = useState<{ first_name?: string, last_name?: string, email: string, avatar_path?: string | null } | null>(null);

  // Add event listener for proposal actions from the ProposalDetailDialog
  useEffect(() => {
    const handleProposalAction = (event: CustomEvent) => {
      console.log('Received proposal action event:', event.detail);
      // Extract action and proposal from the event
      const { action, proposal } = event.detail;
      if (proposal) {
        setSelectedProposal(proposal);
        
        if (action === 'negotiate') {
          setShowNegotiationDialog(true);
        } else if (action === 'history') {
          setShowHistoryDialog(true);
        } else if (action === 'accept' || action === 'reject') {
          setConfirmAction(action);
          setShowConfirmDialog(true);
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
                    {proposals.slice(0, 5).map((proposal) => {
                      const isExpired = new Date(proposal.expiration_date) < new Date();
                      const isPending = proposal.status === 'pending';
                      
                      return (
                        <div 
                          key={proposal.id} 
                          className="p-4 bg-white/5 rounded-lg border border-purple-500/10"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-white font-medium">
                                  {proposal.client?.full_name || 'Unknown Client'}
                                </p>
                                <div className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  proposal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                  proposal.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                  proposal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  <span className="capitalize">{proposal.status}</span>
                                </div>
                                {proposal.is_urgent && (
                                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">Urgent</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                Track: {proposal.track?.title || 'Unknown Track'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-semibold text-green-400">${proposal.sync_fee?.toFixed(2) || '0.00'}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(proposal.created_at).toLocaleDateString()} 
                                {isExpired ? ' (Expired)' : ''}
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-black/20 rounded-lg p-3 mb-3">
                            <p className="text-gray-300 line-clamp-2">{proposal.project_type}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleProposalAction(proposal, 'history')}
                              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors flex items-center"
                              type="button"
                            >
                              <History className="w-3 h-3 mr-1" />
                              View History
                            </button>
                            
                            {isPending && !isExpired && (
                              <>
                                <button
                                  onClick={() => handleProposalAction(proposal, 'negotiate')}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center"
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" />
                                  Negotiate
                                </button>
                                <button
                                  onClick={() => handleProposalAction(proposal, 'accept')}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors flex items-center"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleProposalAction(proposal, 'reject')}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors flex items-center"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Decline
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
                  {proposals.map((proposal) => {
                    const isExpired = new Date(proposal.expiration_date) < new Date();
                    const isPending = proposal.status === 'pending';
                    
                    return (
                      <div 
                        key={proposal.id} 
                        className="p-6 bg-white/5 rounded-lg border border-purple-500/10 hover:border-purple-500/20 transition-all duration-300"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-white">
                                {proposal.client?.full_name || 'Unknown Client'}
                              </h4>
                              <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposal.status)}`}>
                                {getStatusIcon(proposal.status)}
                                <span className="ml-1 capitalize">{proposal.status}</span>
                              </div>
                              {proposal.is_urgent && (
                                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 mb-1">
                              Track: <span className="text-white">{proposal.track?.title || 'Unknown Track'}</span>
                            </p>
                            <p className="text-gray-400 text-sm">
                              {proposal.client?.email}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-400">${proposal.sync_fee?.toFixed(2) || '0.00'}</p>
                            <p className="text-sm text-gray-400">
                              Submitted: {new Date(proposal.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-400">
                              Expires: {new Date(proposal.expiration_date).toLocaleDateString()}
                              {isExpired && <span className="text-red-400 ml-1">(Expired)</span>}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-black/20 rounded-lg p-4 mb-4">
                          <h5 className="text-white font-medium mb-2">Project Details</h5>
                          <p className="text-gray-300">{proposal.project_type}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-gray-400">Duration:</span>
                              <span className="text-white ml-1">{proposal.duration}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Exclusive:</span>
                              <span className="text-white ml-1">{proposal.is_exclusive ? 'Yes' : 'No'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Payment:</span>
                              <span className="text-white ml-1">{proposal.payment_terms}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <span className="text-white ml-1 capitalize">{proposal.negotiation_status || 'pending'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleViewProposalDetails(proposal)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleProposalAction(proposal, 'history')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center"
                          >
                            <History className="w-4 h-4 mr-2" />
                            View History
                          </button>
                          
                          {isPending && !isExpired && (
                            <>
                              <button
                                onClick={() => handleProposalAction(proposal, 'negotiate')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Negotiate
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal, 'accept')}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal, 'reject')}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-white">No proposals</h3>
                  <p className="mt-1 text-sm text-gray-400">Sync proposals will appear here when clients are interested in your tracks.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals and Dialogs */}
        {showUploadForm && (
          <TrackUploadForm
            onClose={() => setShowUploadForm(false)}
            onSuccess={() => {
              setShowUploadForm(false);
              fetchDashboardData();
            }}
          />
        )}

        {showEditModal && selectedTrack && (
          <EditTrackModal
            track={selectedTrack}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTrack(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedTrack(null);
              fetchDashboardData();
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

        {showProfileDialog && (
          <ProducerProfile
            onClose={() => setShowProfileDialog(false)}
          />
        )}

        {showRevenueBreakdown && (
          <RevenueBreakdownDialog
            onClose={() => setShowRevenueBreakdown(false)}
          />
        )}

        {showNegotiationDialog && selectedProposal && (
          <ProposalNegotiationDialog
            proposal={selectedProposal}
            onClose={() => {
              setShowNegotiationDialog(false);
              setSelectedProposal(null);
            }}
            onSuccess={() => {
              setShowNegotiationDialog(false);
              setSelectedProposal(null);
              fetchDashboardData();
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

export default ProducerDashboard