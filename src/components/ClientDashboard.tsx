import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { calculateTimeRemaining } from '../utils/dateUtils';
import { ClientProfile } from './ClientProfile';
import { LicenseDialog } from './LicenseDialog';

interface UserStats {
  totalTracks: number;
  membershipType: string;
  membershipExpiry: string | null;
  downloadCredits: number;
}

interface DashboardState {
  tracks: Track[];
  loading: boolean;
  error: string | null;
  favorites: Track[];
  newReleases: Track[];
  userStats: UserStats;
}

export function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalTracks: 0,
    membershipType: '',
    membershipExpiry: null,
    downloadCredits: 0
  });
  const [selectedLicenseTrack, setSelectedLicenseTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [tracksData, favoritesData, statsData] = await Promise.all([
          supabase.from('tracks').select('*').order('created_at', { ascending: false }),
          supabase.from('favorites').select('*').eq('user_id', user.id),
          supabase.from('user_stats').select('*').eq('user_id', user.id).single()
        ]);

        if (tracksData.error) throw new Error(tracksData.error.message);
        if (favoritesData.error) throw new Error(favoritesData.error.message);
        if (statsData.error) throw new Error(statsData.error.message);

        setTracks(tracksData.data);
        setFavorites(favoritesData.data);
        setNewReleases(tracksData.data.slice(0, 5));
        setUserStats(statsData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
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
    setSelectedLicenseTrack(track);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2">
          <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Your Favorites</h2>
            <div className="space-y-6">
              {favorites.map(track => (
                <div key={track.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Music className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold">{track.title}</h3>
                        <p className="text-gray-600">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <AudioPlayer url={track.audioUrl} />
                      <button
                        onClick={() => handleLicenseTrack(track)}
                        className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>License Track</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6">New Releases</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newReleases.map(track => (
                <div key={track.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-4">
                      <Music className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold">{track.title}</h3>
                        <p className="text-gray-600">{track.artist}</p>
                      </div>
                    </div>
                    <AudioPlayer url={track.audioUrl} />
                    <button
                      onClick={() => handleLicenseTrack(track)}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      License Track
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="col-span-1">
          <ClientProfile stats={userStats} />
        </div>
      </div>

      {selectedLicenseTrack && (
        <LicenseDialog
          isOpen={true}
          onClose={() => setSelectedLicenseTrack(null)}
          track={selectedLicenseTrack}
          licenseType={userStats.membershipType || 'Single Track'}
          price={7.99}
        />
      )}
    </div>
  );
}