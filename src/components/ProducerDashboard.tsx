import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
import { Link } from 'react-router-dom';

interface Track {
  id: string;
  title: string;
  artist: string;
  genres: string[];
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Producer Dashboard</h1>
              <p className="text-gray-600">Manage your tracks and sync proposals</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowProfileDialog(true)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <User className="w-5 h-5 mr-2" />
                Profile
              </button>
              <button
                onClick={() => setShowUploadForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Track
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Music className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tracks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTracks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowRevenueBreakdown(true)}>
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingProposals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Accepted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.acceptedProposals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('tracks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tracks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Tracks ({tracks.length})
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'proposals'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                {proposals.slice(0, 5).length > 0 ? (
                  <div className="space-y-4">
                    {proposals.slice(0, 5).map((proposal) => (
                      <div key={proposal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                            {getStatusIcon(proposal.status)}
                            <span className="ml-1 capitalize">{proposal.status}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{proposal.track?.title}</p>
                            <p className="text-sm text-gray-600">
                              {proposal.project_type} • ${proposal.sync_fee} • {proposal.client?.full_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(proposal.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400 mr-2" />
                    <span className="text-gray-600">Upload New Track</span>
                  </button>
                  <Link
                    to="/producer/analytics"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <BarChart3 className="w-6 h-6 text-gray-400 mr-2" />
                    <span className="text-gray-600">View Analytics</span>
                  </Link>
                  <Link
                    to="/producer/sales"
                    className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    <DollarSign className="w-6 h-6 text-gray-400 mr-2" />
                    <span className="text-gray-600">View Sales</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracks' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">My Tracks</h3>
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Track
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Track
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tracks.map((track) => (
                    <tr key={track.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={track.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop'}
                            alt={track.title}
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{track.title}</div>
                            <div className="text-sm text-gray-500">{track.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {track.genres.join(', ')} • {track.bpm} BPM
                        </div>
                        <div className="text-sm text-gray-500">
                          {track.key} • {track.duration}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(track.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewProposals(track)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Proposals"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTrackEdit(track)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Track"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTrackDelete(track)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Track"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tracks.length === 0 && (
                <div className="text-center py-12">
                  <Music className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tracks</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by uploading your first track.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowUploadForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Sync Proposals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Track
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{proposal.track?.title}</div>
                        <div className="text-sm text-gray-500">{proposal.track?.artist}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{proposal.client?.full_name}</div>
                        <div className="text-sm text-gray-500">{proposal.client?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{proposal.project_type}</div>
                        <div className="text-sm text-gray-500">
                          {proposal.duration} • {proposal.is_exclusive ? 'Exclusive' : 'Non-exclusive'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${proposal.sync_fee}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                          {getStatusIcon(proposal.status)}
                          <span className="ml-1 capitalize">{proposal.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {proposal.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleProposalAction(proposal, 'accept')}
                                className="text-green-600 hover:text-green-900"
                                title="Accept Proposal"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal, 'reject')}
                                className="text-red-600 hover:text-red-900"
                                title="Reject Proposal"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleProposalAction(proposal, 'negotiate')}
                                className="text-blue-600 hover:text-blue-900"
                                title="Negotiate"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleProposalAction(proposal, 'history')}
                            className="text-gray-600 hover:text-gray-900"
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
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No proposals</h3>
                  <p className="mt-1 text-sm text-gray-500">Sync proposals will appear here when clients are interested in your tracks.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Upload New Track</h2>
                  <button
                    onClick={() => setShowUploadForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <TrackUploadForm
                  onSuccess={() => {
                    setShowUploadForm(false);
                    fetchDashboardData();
                  }}
                  onCancel={() => setShowUploadForm(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/producer/analytics"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              View Analytics
            </Link>
            <Link
              to="/producer/banking"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5 mr-2" />
              Banking Settings
            </Link>
            <Link
              to="/producer/sales"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              View All Sales
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
            stats={stats}
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
      </div>
    </div>
  );
}

export { ProducerDashboard };

