import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog, Loader2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { calculateTimeRemaining } from '../utils/dateUtils';
import { ClientProfile } from './ClientProfile';
import { DeleteLicenseDialog } from './DeleteLicenseDialog';
import { EditRequestDialog } from './EditRequestDialog';
import { LicenseDialog } from './LicenseDialog';
import { SyncProposalDialog } from './SyncProposalDialog';

interface License {
  id: string;
  track: Track;
  license_type: string;
  created_at: string;
  expiry_date: string;
}

interface UserStats {
  totalLicenses: number;
  remainingLicenses: number;
  membershipType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  daysUntilReset: number | null;
}

interface CustomSyncRequest {
  id: string;
  project_title: string;
  project_description: string;
  sync_fee: number;
  end_date: string;
  genre: string;
  sub_genres: string[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

const calculateExpiryDate = (purchaseDate: string, membershipType: string): string => {
  const date = new Date(purchaseDate);
  switch (membershipType) {
    case 'Ultimate Access':
      date.setFullYear(date.getFullYear() + 100);
      break;
    case 'Platinum Access':
      date.setFullYear(date.getFullYear() + 3);
      break;
    default:
      date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString();
};

const getExpiryStatus = (expiryDate: string): 'expired' | 'expiring-soon' | 'active' => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring-soon';
  return 'active';
};

export function ClientDashboard() {
  const { user, membershipPlan, refreshMembership } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [newTracks, setNewTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<'renewal' | 'title' | 'genre' | 'bpm'>('renewal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalLicenses: 0,
    remainingLicenses: 0,
    membershipType: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    daysUntilReset: null
  });
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null);
  const [syncRequests, setSyncRequests] = useState<CustomSyncRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomSyncRequest | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedLicenseToDelete, setSelectedLicenseToDelete] = useState<License | null>(null);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [selectedTrackToLicense, setSelectedTrackToLicense] = useState<Track | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  useEffect(() => {
    if (user) {
      // Refresh membership info first to ensure we have the latest data
      refreshMembership().then(() => {
        fetchDashboardData();
      });
    }
  }, [user, membershipPlan]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, email, membership_plan')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setUserStats(prev => ({
          ...prev,
          membershipType: profileData.membership_plan as UserStats['membershipType']
        }));
      }

      const { data: licensesData } = await supabase
        .from('sales')
        .select(`
          id,
          license_type,
          created_at,
          expiry_date,
          track:tracks (
            id,
            title,
            genres,
            bpm,
            audio_url,
            image_url,
            producer_id,
            producer:profiles!tracks_producer_id_fkey (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('buyer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (licensesData) {
        const formattedLicenses = licensesData.map(license => ({
          ...license,
          expiry_date: license.expiry_date || calculateExpiryDate(license.created_at, profileData.membership_plan),
          track: {
            ...license.track,
            genres: license.track.genres.split(',').map((g: string) => g.trim()),
            image: license.track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'
          }
        }));
        setLicenses(formattedLicenses);
      }
      
      // First, get the track_ids from favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('track_id')
        .eq('user_id', user.id);

      // Then, get the track details using the track_ids
      const trackIds = favoritesData?.map(f => f.track_id) || [];
      
      const { data: tracksData } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          artist,
          genres,
          moods,
          duration,
          bpm,
          audio_url,
          image_url,
          has_sting_ending,
          is_one_stop,
          mp3_url,
          trackouts_url,
          has_vocals,
          vocals_usage_type,
          sub_genres,
          producer_id,
          producer:profiles!tracks_producer_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .in('id', trackIds);

      if (tracksData) {
        const formattedFavorites = tracksData.map(track => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          genres: track.genres.split(',').map((g: string) => g.trim()),
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
          subGenres: track.sub_genres || [],
          producerId: track.producer_id,
          producer: track.producer ? {
            id: track.producer.id,
            firstName: track.producer.first_name || '',
            lastName: track.producer.last_name || '',
            email: track.producer.email
          } : undefined,
          fileFormats: { stereoMp3: { format: [], url: '' }, stems: { format: [], url: '' }, stemsWithVocals: { format: [], url: '' } },
          pricing: { stereoMp3: 0, stems: 0, stemsWithVocals: 0 },
          leaseAgreementUrl: ''
        }));
        setFavorites(formattedFavorites);
      }

      const { data: newTracksData } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          genres,
          bpm,
          audio_url,
          image_url,
          has_vocals,
          vocals_usage_type,
          sub_genres,
          producer_id,
          producer:profiles!producer_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (newTracksData) {
        const formattedNewTracks = newTracksData.map(track => ({
          id: track.id,
          title: track.title,
          artist: track.producer?.first_name || track.producer?.email?.split('@')[0] || 'Unknown Artist',
          genres: track.genres.split(',').map((g: string) => g.trim()),
          moods: track.moods ? track.moods.split(',').map((m: string) => m.trim()) : [],
          bpm: track.bpm,
          audioUrl: track.audio_url,
          image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
          hasVocals: track.has_vocals,
          vocalsUsageType: track.vocals_usage_type,
          subGenres: track.sub_genres || [],
          producerId: track.producer_id,
          producer: track.producer ? {
            id: track.producer.id,
            firstName: track.producer.first_name || '',
            lastName: track.producer.last_name || '',
            email: track.producer.email
          } : undefined,
          fileFormats: { stereoMp3: { format: [], url: '' }, stems: { format: [], url: '' }, stemsWithVocals: { format: [], url: '' } },
          pricing: { stereoMp3: 0, stems: 0, stemsWithVocals: 0 },
          leaseAgreementUrl: ''
        }));
        setNewTracks(formattedNewTracks);
      }

      const { data: syncRequestsData } = await supabase
        .from('custom_sync_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (syncRequestsData) {
        setSyncRequests(syncRequestsData);
      }

      // Calculate remaining licenses for Gold Access
      if (membershipPlan === 'Gold Access') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count } = await supabase
          .from('sales')
          .select('id', { count: 'exact' })
          .eq('buyer_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        const totalLicenses = count || 0;
        const remainingLicenses = 10 - totalLicenses;

        setUserStats(prev => ({
          ...prev,
          totalLicenses,
          remainingLicenses,
          currentPeriodStart: startOfMonth,
          currentPeriodEnd: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0),
          daysUntilReset: Math.ceil((new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        }));
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
      setSortOrder('asc');
    }
  };

  const handleRemoveFavorite = async (trackId: string) => {
    if (!user) return;

    try {
      setRemovingFavorite(trackId);
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId);

      if (error) throw error;

      setFavorites(favorites.filter(track => track.id !== trackId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingFavorite(null);
    }
  };

  const handleLicenseClick = (track: Track) => {
    // For sync-only tracks, show the proposal dialog
    if (track.hasVocals && track.vocalsUsageType === 'sync_only') {
      setSelectedTrackToLicense(track);
      setShowProposalDialog(true);
      return;
    }
    
    // For regular tracks, show the license dialog
    setSelectedTrackToLicense(track);
    setShowLicenseDialog(true);
  };

  const handleUpdateRequest = async (requestId: string, updates: Partial<CustomSyncRequest>) => {
    try {
      const { error } = await supabase
        .from('custom_sync_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      setSyncRequests(requests =>
        requests.map(req =>
          req.id === requestId ? { ...req, ...updates } : req
        )
      );
    } catch (err) {
      console.error('Error updating request:', err);
      throw err;
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('custom_sync_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setSyncRequests(requests => requests.filter(req => req.id !== requestId));
    } catch (err) {
      console.error('Error deleting request:', err);
    }
  };

  const handleDeleteLicense = async () => {
    if (!selectedLicenseToDelete) return;

    const { error } = await supabase
      .from('sales')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', selectedLicenseToDelete.id);

    if (error) throw error;

    setLicenses(licenses.filter(l => l.id !== selectedLicenseToDelete.id));
  };

  const handleViewLicenseAgreement = (licenseId: string) => {
    navigate(`/license-agreement/${licenseId}`);
  };

  const sortedAndFilteredLicenses = licenses
    .filter(license => !selectedGenre || license.track.genres.includes(selectedGenre))
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'renewal':
          return (new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()) * modifier;
        case 'title':
          return a.track.title.localeCompare(b.track.title) * modifier;
        default:
          return 0;
      }
    });

  const sortedAndFilteredFavorites = favorites
    .filter(track => !selectedGenre || track.genres.includes(selectedGenre))
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'title':
          return a.title.localeCompare(b.title) * modifier;
        case 'genre':
          return a.genres[0].localeCompare(b.genres[0]) * modifier;
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
            <h1 className="text-3xl font-bold text-white">Your Client Dashboard</h1>
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
              to="/pricing"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Upgrade Membership
            </Link>
          </div>
        </div>

        <div className="mb-8 p-6 glass-card rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">License Usage</h2>
              <p className="text-gray-300">
                <span className="font-semibold text-white">Current Plan: {membershipPlan}</span>
                <br />
                {membershipPlan === 'Gold Access' ? (
                  <>
                    You have used {userStats.totalLicenses} of your 10 monthly licenses
                    ({userStats.remainingLicenses} remaining)
                  </>
                ) : membershipPlan === 'Platinum Access' || membershipPlan === 'Ultimate Access' ? (
                  'You have unlimited licenses available'
                ) : (
                  'Single track license'
                )}
              </p>
              {userStats.currentPeriodStart && userStats.currentPeriodEnd && (
                <p className="text-sm text-gray-400 mt-2">
                  Current period: {userStats.currentPeriodStart.toLocaleDateString()} - {userStats.currentPeriodEnd.toLocaleDateString()}
                  {userStats.daysUntilReset !== null && (
                    <span className="ml-2">
                      ({userStats.daysUntilReset} days until reset)
                    </span>
                  )}
                </p>
              )}
            </div>
            {membershipPlan === 'Gold Access' && userStats.remainingLicenses < 3 && (
              <div className="flex items-center text-yellow-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>Running low on licenses</span>
              </div>
            )}
          </div>
          {membershipPlan === 'Gold Access' && (
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${(userStats.totalLicenses / 10) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="mb-8 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Your Sync Requests</h2>
            <Link
              to="/custom-sync-request"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Link>
          </div>

          {syncRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No sync requests yet</p>
              <Link
                to="/custom-sync-request"
                className="inline-block mt-4 text-purple-400 hover:text-purple-300"
              >
                Create your first sync request
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {syncRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {request.project_title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-2">
                        {request.project_description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-purple-400">${request.sync_fee.toFixed(2)}</span>
                        <span className="text-gray-400">{request.genre}</span>
                        <span className="text-gray-400">
                          Due: {new Date(request.end_date).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          request.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          request.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          request.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowEditDialog(true);
                        }}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Edit request"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {request.status !== 'completed' && (
                        <button
                          onClick={() => handleUpdateRequest(request.id, { status: 'completed' })}
                          className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                          title="Mark as completed"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRequest(request.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Licensed Tracks</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleSort('renewal')}
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
                  {Array.from(new Set(licenses.flatMap(l => l.track.genres))).map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>

            {sortedAndFilteredLicenses.length === 0 ? (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No licensed tracks found</p>
                <Link
                  to="/catalog"
                  className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Browse Catalog
                </Link>
              </div>
            ) : (
              sortedAndFilteredLicenses.map((license) => {
                const expiryStatus = getExpiryStatus(license.expiry_date);
                
                return (
                  <div
                    key={license.id}
                    className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 border ${
                      expiryStatus === 'expired' ? 'border-red-500/20' :
                      expiryStatus === 'expiring-soon' ? 'border-yellow-500/20' :
                      'border-purple-500/20'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={license.track.image}
                        alt={license.track.title}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/track/${license.track.id}`)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => navigate(`/track/${license.track.id}`)}
                            className="text-lg font-semibold text-white mb-1 hover:text-blue-400 transition-colors text-left"
                          >
                            {license.track.title}
                          </button>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewLicenseAgreement(license.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-400/10"
                              title="View License Agreement"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedLicenseToDelete(license)}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                              title="Delete License"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          
                          </div>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>{license.track.genres.join(', ')} • {license.track.bpm} BPM</p>
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-purple-400" />
                              Licensed: {new Date(license.created_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <Clock className={`w-4 h-4 mr-1 ${
                                expiryStatus === 'expired' ? 'text-red-400' :
                                expiryStatus === 'expiring-soon' ? 'text-yellow-400' :
                                'text-purple-400'
                              }`} />
                              Expires: {new Date(license.expiry_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <AudioPlayer url={license.track.audioUrl} title={license.track.title} />
                    </div>

                    {expiryStatus === 'expired' && (
                      <div className="mt-2 flex items-center text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        License expired
                      </div>
                    )}
                    {expiryStatus === 'expiring-soon' && (
                      <div className="mt-2 flex items-center text-yellow-400 text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        License expires soon
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-400" />
                  Favorite Tracks
                </h3>
                <div className="flex space-x-2">
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="bg-white/5 border border-purple-500/20 rounded-lg px-2 py-1 text-sm text-white"
                  >
                    <option value="">All Genres</option>
                    {Array.from(new Set(favorites.flatMap(t => t.genres))).map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSort('bpm')}
                    className="px-2 py-1 bg-white/5 border border-purple-500/20 rounded-lg text-sm text-white hover:bg-white/10"
                  >
                    BPM {sortField === 'bpm' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {sortedAndFilteredFavorites.length === 0 ? (
                  <div className="text-center py-6 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <p className="text-gray-400">No favorite tracks yet</p>
                    <Link
                      to="/catalog"
                      className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                    >
                      Browse Catalog
                    </Link>
                  </div>
                ) : (
                  sortedAndFilteredFavorites.map((track) => (
                    <div
                      key={track.id}
                      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={track.image}
                          alt={track.title}
                          className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                          onClick={() => navigate(`/track/${track.id}`)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <button 
                              onClick={() => navigate(`/track/${track.id}`)}
                              className="text-white font-medium hover:text-blue-400 transition-colors truncate text-left"
                            >
                              {track.title}
                            </button>
                            <button
                              onClick={() => handleRemoveFavorite(track.id)}
                              disabled={removingFavorite === track.id}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                              aria-label="Remove from favorites"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-400">
                            {track.genres.join(', ')} • {track.bpm} BPM
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <AudioPlayer url={track.audioUrl} title={track.title} />
                            {track.hasVocals && track.vocalsUsageType === 'sync_only' ? (
                              <button
                                onClick={() => {
                                  setSelectedTrackToLicense(track);
                                  setShowProposalDialog(true);
                                }}
                                className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>Submit Proposal</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLicenseClick(track)}
                                className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>License Track</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Music className="w-5 h-5 mr-2 text-purple-500" />
                New Releases
              </h3>
              <div className="space-y-4">
                {newTracks.length === 0 ? (
                  <div className="text-center py-6 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <p className="text-gray-400">No new tracks available</p>
                  </div>
                ) : (
                  newTracks.map((track) => (
                    <div
                      key={track.id}
                      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={track.image}
                          alt={track.title}
                          className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                          onClick={() => navigate(`/track/${track.id}`)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <button
                              onClick={() => navigate(`/track/${track.id}`)}
                              className="text-white font-medium hover:text-blue-400 transition-colors truncate text-left"
                            >
                              {track.title}
                            </button>
                          </div>
                          <p className="text-sm text-gray-400">
                            {track.genres.join(', ')} • {track.bpm} BPM
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <AudioPlayer url={track.audioUrl} title={track.title} />
                            {track.hasVocals && track.vocalsUsageType === 'sync_only' ? (
                              <button
                                onClick={() => {
                                  setSelectedTrackToLicense(track);
                                  setShowProposalDialog(true);
                                }}
                                className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>Submit Proposal</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLicenseClick(track)}
                                className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>License Track</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedRequest && showEditDialog && (
        <EditRequestDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onSave={(updates) => handleUpdateRequest(selectedRequest.id, updates)}
        />
      )}

      {selectedLicenseToDelete && (
        <DeleteLicenseDialog
          isOpen={true}
          onClose={() => setSelectedLicenseToDelete(null)}
          license={selectedLicenseToDelete}
          onConfirm={handleDeleteLicense}
        />
      )}

      <ClientProfile
        isOpen={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
      />

      {selectedTrackToLicense && showLicenseDialog && (
        <LicenseDialog
          isOpen={showLicenseDialog}
          onClose={() => {
            setShowLicenseDialog(false);
            setSelectedTrackToLicense(null);
          }}
          track={selectedTrackToLicense}
          membershipType={membershipPlan || 'Single Track'}
          remainingLicenses={userStats.remainingLicenses}
          onLicenseCreated={() => {
            // Refresh the dashboard data after a new license is created
            if (user) {
              setLoading(true);
              const fetchData = async () => {
                try {
                  const { data: licensesData } = await supabase
                    .from('sales')
                    .select(`
                      id,
                      license_type,
                      created_at,
                      expiry_date,
                      track:tracks (
                        id,
                        title,
                        genres,
                        bpm,
                        audio_url,
                        image_url,
                        producer_id,
                        producer:profiles!tracks_producer_id_fkey (
                          first_name,
                          last_name,
                          email
                        )
                      )
                    `)
                    .eq('buyer_id', user.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false });
                  
                  if (licensesData) {
                    const formattedLicenses = licensesData.map(license => ({
                      ...license,
                      expiry_date: license.expiry_date || calculateExpiryDate(license.created_at, membershipPlan || 'Single Track'),
                      track: {
                        ...license.track,
                        genres: license.track.genres.split(',').map((g: string) => g.trim()),
                        image: license.track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'
                      }
                    }));
                    setLicenses(formattedLicenses);
                  }
                  
                  // Update license count for Gold Access
                  if (membershipPlan === 'Gold Access') {
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);
                    
                    const { count } = await supabase
                      .from('sales')
                      .select('id', { count: 'exact' })
                      .eq('buyer_id', user.id)
                      .gte('created_at', startOfMonth.toISOString());
                    
                    const totalLicenses = count || 0;
                    const remainingLicenses = 10 - totalLicenses;
                    
                    setUserStats(prev => ({
                      ...prev,
                      totalLicenses,
                      remainingLicenses
                    }));
                  }
                } catch (err) {
                  console.error('Error refreshing licenses:', err);
                } finally {
                  setLoading(false);
                }
              };
              
              fetchData();
            }
          }}
        />
      )}

      {selectedTrackToLicense && showProposalDialog && (
        <SyncProposalDialog
          isOpen={showProposalDialog}
          onClose={() => {
            setShowProposalDialog(false);
            setSelectedTrackToLicense(null);
          }}
          track={selectedTrackToLicense}
        />
      )}
    </div>
  );
}