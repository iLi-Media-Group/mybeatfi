import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { calculateTimeRemaining } from '../utils/dateUtils';
import { ClientProfile } from './ClientProfile';
import { LicenseDialog } from './LicenseDialog';

interface UserStats {
  membershipType: string | null;
  tracksLicensed: number;
  favoriteGenres: string[];
  lastLoginDate: string;
}

interface DashboardStats {
  totalTracks: number;
  totalGenres: number;
  avgBpm: number;
}

export function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats>({
    membershipType: null,
    tracksLicensed: 0,
    favoriteGenres: [],
    lastLoginDate: '',
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTracks: 0,
    totalGenres: 0,
    avgBpm: 0,
  });
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [newTracks, setNewTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const [userStatsData, dashboardStatsData, favoritesData, newTracksData] = await Promise.all([
          supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
          supabase.from('dashboard_stats').select('*').single(),
          supabase.from('favorite_tracks').select('*').eq('user_id', user.id),
          supabase.from('tracks').select('*').order('created_at', { ascending: false }).limit(5),
        ]);

        if (userStatsData.error) throw userStatsData.error;
        if (dashboardStatsData.error) throw dashboardStatsData.error;
        if (favoritesData.error) throw favoritesData.error;
        if (newTracksData.error) throw newTracksData.error;

        setUserStats(userStatsData.data);
        setDashboardStats(dashboardStatsData.data);
        setFavoriteTracks(favoritesData.data);
        setNewTracks(newTracksData.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, navigate]);

  const handleLicenseTrack = (track: Track) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (track.hasVocals && track.vocalsUsageType === 'sync_only') {
      navigate(`/license/${track.id}`);
    } else {
      setSelectedTrack(track);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-white text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <header className="bg-white/5 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Client Dashboard</h1>
            <ClientProfile />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="text-gray-400">Membership</div>
              <UserCog className="w-5 h-5 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">
              {userStats.membershipType || 'Free'}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="text-gray-400">Tracks Licensed</div>
              <FileMusic className="w-5 h-5 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{userStats.tracksLicensed}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="text-gray-400">Favorite Genres</div>
              <Tag className="w-5 h-5 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{userStats.favoriteGenres.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="text-gray-400">Last Login</div>
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div className="mt-2 text-sm font-medium text-white">
              {calculateTimeRemaining(userStats.lastLoginDate)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Star className="w-5 h-5 mr-2 text-purple-500" />
                Favorite Tracks
              </h3>
              <div className="space-y-3">
                {favoriteTracks.length === 0 ? (
                  <div className="text-center py-6 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <p className="text-gray-400">No favorite tracks yet</p>
                  </div>
                ) : (
                  favoriteTracks.map((track) => (
                    <div
                      key={track.id}
                      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                    >
                      <div className="flex items-center space-x-3 mb-3">
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
                        className="mt-3 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
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
                      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                    >
                      <div className="flex items-center space-x-3 mb-3">
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
                        className="mt-3 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
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

        {selectedTrack && (
          <LicenseDialog
            isOpen={true}
            onClose={() => setSelectedTrack(null)}
            track={selectedTrack}
            licenseType={userStats.membershipType || 'Single Track'}
            price={0}
          />
        )}
      </main>
    </div>
  );
}