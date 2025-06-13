import React, { useState, useEffect } from 'react';
import { X, MapPin, Music, Star, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';

interface ProducerProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  producerId: string;
}

interface ProducerProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
  bio: string | null;
  avatar_path: string | null;
  show_location: boolean;
  city: string | null;
  state: string | null;
  company_name: string | null;
  producer_number: string | null;
  stats?: {
    totalTracks: number;
    totalSales: number;
    avgRating: number;
  };
}

export function ProducerProfileDialog({ isOpen, onClose, producerId }: ProducerProfileDialogProps) {
  const [profile, setProfile] = useState<ProducerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && producerId) {
      fetchProducerProfile();
    }
  }, [isOpen, producerId]);

  const fetchProducerProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          bio,
          avatar_path,
          show_location,
          city,
          state,
          company_name,
          producer_number
        `)
        .eq('id', producerId)
        .single();

      if (profileError) throw profileError;

      // Fetch track count and track IDs
      const { data: tracks, count: trackCount, error: tracksError } = await supabase
        .from('tracks')
        .select('id', { count: 'exact' })
        .eq('producer_id', producerId)
        .is('deleted_at', null);

      if (tracksError) throw tracksError;

      // Get track IDs for sales query
      const trackIds = tracks?.map(track => track.id) || [];

      // Fetch recent sales using track IDs
      const { count: salesCount, error: salesError } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .in('track_id', trackIds)
        .is('deleted_at', null)
        .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (salesError) throw salesError;

      // Set profile with stats
      setProfile({
        ...profileData,
        stats: {
          totalTracks: trackCount || 0,
          totalSales: salesCount || 0,
          avgRating: 4.8 // Placeholder for future rating system
        }
      });
    } catch (err) {
      console.error('Error fetching producer profile:', err);
      setError('Failed to load producer profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Producer Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : profile && (
          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <ProfilePhotoUpload
                  currentPhotoUrl={profile.avatar_path}
                  onPhotoUpdate={() => {}}
                  size="lg"
                  userId={producerId}
                />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {profile.first_name} {profile.last_name}
                </h3>
                {profile.company_name && (
                  <p className="text-gray-400">{profile.company_name}</p>
                )}
                {profile.show_location && profile.city && profile.state && (
                  <p className="text-gray-400 flex items-center mt-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    {profile.city}, {profile.state}
                  </p>
                )}
                {profile.producer_number && (
                  <p className="text-sm text-gray-500 mt-1">
                    Producer ID: {profile.producer_number}
                  </p>
                )}
              </div>
            </div>

            {profile.bio && (
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <Music className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profile.stats?.totalTracks}</p>
                <p className="text-sm text-gray-400">Tracks</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 text-center">
                <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profile.stats?.totalSales}</p>
                <p className="text-sm text-gray-400">Sales (30d)</p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 text-center">
                <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{profile.stats?.avgRating}</p>
                <p className="text-sm text-gray-400">Rating</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
