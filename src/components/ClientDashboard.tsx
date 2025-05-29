import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { calculateTimeRemaining } from '../utils/dateUtils';
import { EditRequestDialog } from './EditRequestDialog';
import { ClientProfile } from './ClientProfile';
import { DeleteLicenseDialog } from './DeleteLicenseDialog';
import { LicenseDialog } from './LicenseDialog';

interface DashboardStats {
  totalLicenses: number;
  remainingLicenses: number;
  membershipType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  daysUntilReset: number | null;
}

export function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  const [userStats, setUserStats] = useState<DashboardStats>({
    totalLicenses: 0,
    remainingLicenses: 10,
    membershipType: 'Gold Access',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    daysUntilReset: 30
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [newTracks, setNewTracks] = useState<Track[]>([]);
  const [syncRequests, setSyncRequests] = useState<any[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedLicenseToDelete, setSelectedLicenseToDelete] = useState<any | null>(null);
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null);
  const [selectedTrackToLicense, setSelectedTrackToLicense] = useState<Track | null>(null);

  const calculateExpiryDate = (purchaseDate: string, membershipType: string): string => {
    const date = new Date(purchaseDate);
    switch (membershipType) {
      case 'Ultimate Access':
        date.setFullYear(date.getFullYear() + 100); // Effectively perpetual
        break;
      case 'Platinum Access':
        date.setFullYear(date.getFullYear() + 3); // 3 years
        break;
      case 'Gold Access':
      case 'Single Track':
      default:
        date.setFullYear(date.getFullYear() + 1); // 1 year
    }
    return date.toISOString();
  };

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile and stats
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, email, membership_plan')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setUserStats(prev => ({
          ...prev,
          membershipType: profileData.membership_plan as DashboardStats['membershipType']
        }));
      }

      // Calculate license usage
      const { data: salesData } = await supabase
        .from('sales')
        .select('created_at')
        .eq('buyer_id', user?.id)
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString());

      if (salesData) {
        setUserStats(prev => ({
          ...prev,
          totalLicenses: salesData.length,
          remainingLicenses: Math.max(0, 10 - salesData.length)
        }));
      }

      // Fetch licenses
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
            image_url
          )
        `)
        .eq('buyer_id', user?.id)
        .is('deleted_at', null);

      if (licensesData) {
        setLicenses(licensesData);
      }

      // Fetch favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select(`
          track_id,
          tracks (*)
        `)
        .eq('user_id', user?.id);

      if (favoritesData) {
        setFavorites(favoritesData.map(f => ({
          id: f.tracks.id,
          title: f.tracks.title,
          genres: f.tracks.genres.split(','),
          audioUrl: f.tracks.audio_url,
          image: f.tracks.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'
        })));
      }

      // Fetch new tracks
      const { data: newTracksData } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (newTracksData) {
        setNewTracks(newTracksData.map(track => ({
          id: track.id,
          title: track.title,
          genres: track.genres.split(','),
          audioUrl: track.audio_url,
          image: track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'
        })));
      }

      // Fetch sync requests
      const { data: requestsData } = await supabase
        .from('custom_sync_requests')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (requestsData) {
        setSyncRequests(requestsData);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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

  const handleLicenseTrack = (track: Track) => {
  setSelectedTrackToLicense(track);
    if (!userStats.membershipType || userStats.membershipType === 'Single Track') {
      navigate('/pricing');
      return;
    }

    if (userStats.membershipType === 'Gold Access' && userStats.remainingLicenses <= 0) {
      navigate('/upgrade');
      return;
    }

    setSelectedTrackToLicense(track);
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
    setSelectedLicenseToDelete(null);
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

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* License Usage Section */}
        <div className="mb-8 p-6 glass-card rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">License Usage</h2>
              <p className="text-gray-300">
                {userStats.membershipType === 'Gold Access' ? (
                  <>
                    You have used {userStats.totalLicenses} of your 10 monthly licenses
                    ({userStats.remainingLicenses} remaining)
                  </>
                ) : userStats.membershipType === 'Platinum Access' || userStats.membershipType === 'Ultimate Access' ? (
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
            {userStats.membershipType === 'Gold Access' && userStats.remainingLicenses < 3 && (
              <div className="flex items-center text-yellow-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>Running low on licenses</span>
              </div>
            )}
          </div>
          {userStats.membershipType === 'Gold Access' && (
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 rounded-full h-2 transition-all duration-300"
                style={{ width: `${(userStats.totalLicenses / 10) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Sync Requests Section */}
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Your Sync Requests</h2>
                <Link
                  to="/custom-sync-request"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Link>
              </div>
              <div className="space-y-4">
                {syncRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white/5 rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{request.project_title}</h3>
                        <p className="text-gray-400">{request.project_description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowEditDialog(true);
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Licensed Tracks Section */}
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-6">Your Licensed Tracks</h2>
              <div className="space-y-4">
                {licenses.map((license) => {
                  const expiryDate = license.expiry_date || calculateExpiryDate(license.created_at, license.license_type);
                  const isExpired = new Date(expiryDate) <= new Date();
                  
                  return (
                    <div
                      key={license.id}
                      className={`bg-white/5 rounded-lg p-4 border ${
                        isExpired ? 'border-red-500/20' : 'border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{license.track.title}</h3>
                          <div className="text-sm text-gray-400 space-y-1">
                            <p>Licensed on {new Date(license.created_at).toLocaleDateString()}</p>
                            <p>Expires on {new Date(expiryDate).toLocaleDateString()}</p>
                            {isExpired && (
                              <p className="text-red-400">License expired</p>
                            )}
                          </div>
                          <Link
                            to={`/license-agreement/${license.id}`}
                            className="inline-flex items-center mt-2 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View/Download License
                          </Link>
                        </div>
                        <div className="flex items-center space-x-4">
                          <AudioPlayer url={license.track.audio_url} title={license.track.title} />
                          <button
                            onClick={() => setSelectedLicenseToDelete(license)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Favorites Section */}
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-400" />
                Favorite Tracks
              </h2>
              <div className="space-y-4">
                {favorites.map((track) => (
                  <div
                    key={track.id}
                    className="bg-white/5 rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-medium truncate">{track.title}</h3>
                          <button
                            onClick={() => handleRemoveFavorite(track.id)}
                            disabled={removingFavorite === track.id}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <AudioPlayer url={track.audioUrl} title={track.title} />
                        <button
                          onClick={() => handleLicenseTrack(track)}
                          className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          License Track
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {favorites.length === 0 && (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No favorite tracks yet</p>
                    <Link
                      to="/catalog"
                      className="inline-block mt-4 text-purple-400 hover:text-purple-300"
                    >
                      Browse the catalog
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* New Releases Section */}
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Music className="w-5 h-5 mr-2 text-purple-500" />
                New Releases
              </h2>
              <div className="space-y-4">
                {newTracks.map((track) => (
                  <div
                    key={track.id}
                    className="bg-white/5 rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate mb-2">{track.title}</h3>
                        <AudioPlayer url={track.audioUrl} title={track.title} />
                        <button
                          onClick={() => handleLicenseTrack(track)}
                          className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          License Track
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {newTracks.length === 0 && (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No new tracks available</p>
                  </div>
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
          onSave={async () => {}}
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

      {selectedTrackToLicense && (
        <LicenseDialog
          isOpen={true}
          onClose={() => setSelectedTrackToLicense(null)}
          track={selectedTrackToLicense}
          membershipType={userStats.membershipType || 'Single Track'}
          remainingLicenses={userStats.remainingLicenses}
        />
      )}
    </div>
  );
}