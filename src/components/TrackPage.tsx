import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Music, Download, Shield, Loader2, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, User, DollarSign, ListMusic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { LicenseDialog } from './LicenseDialog';
import { ProducerProfileDialog } from './ProducerProfileDialog';
import { SyncProposalDialog } from './SyncProposalDialog';
import { createCheckoutSession } from '../lib/stripe';
import { PRODUCTS } from '../stripe-config';

interface UserStats {
  membershipType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  remainingLicenses: number;
}

export function TrackPage() {
  const { trackId } = useParams();
  const { user, membershipPlan, refreshMembership } = useAuth();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showProducerProfile, setShowProducerProfile] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    membershipType: 'Single Track',
    remainingLicenses: 0
  });
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) {
      navigate('/catalog');
      return;
    }

    if (user) {
      // Refresh membership info first to ensure we have the latest data
      refreshMembership().then(() => {
        fetchTrackData();
      });
    } else {
      fetchTrackData();
    }
  }, [trackId, user, membershipPlan]);

  const fetchTrackData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch track details
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select(`
          *,
          producer:profiles!producer_id (
            id,
            first_name,
            last_name,
            email,
            avatar_path
          )
        `)
        .eq('id', trackId)
        .single();

      if (trackError) throw trackError;
      
      if (trackData) {
        // Convert comma-separated strings to arrays
        const genres = trackData.genres ? trackData.genres.split(',').map(g => g.trim()) : [];
        const moods = trackData.moods ? trackData.moods.split(',').map(m => m.trim()) : [];
        const subGenres = trackData.sub_genres ? trackData.sub_genres.split(',').map(g => g.trim()) : [];

        // Map the database fields to the Track interface
        const mappedTrack: Track = {
          id: trackData.id,
          title: trackData.title,
          genres: genres,
          subGenres: subGenres,
          artist: trackData.producer ? `${trackData.producer.first_name} ${trackData.producer.last_name}`.trim() : 'Unknown Artist',
          audioUrl: trackData.audio_url || '',
          image: trackData.image_url || 'https://images.pexels.com/photos/1626481/pexels-photo-1626481.jpeg',
          bpm: trackData.bpm || 0,
          key: trackData.key || '',
          duration: trackData.duration || '',
          moods: moods,
          hasVocals: trackData.has_vocals || false,
          vocalsUsageType: trackData.vocals_usage_type || 'normal',
          isOneStop: trackData.is_one_stop || false,
          hasStingEnding: trackData.has_sting_ending || false,
          mp3Url: trackData.mp3_url,
          trackoutsUrl: trackData.trackouts_url,
          producerId: trackData.producer_id, // Add producer_id to the mapped track
          producer: trackData.producer ? {
            id: trackData.producer.id,
            firstName: trackData.producer.first_name || '',
            lastName: trackData.producer.last_name || '',
            email: trackData.producer.email,
            avatarPath: trackData.producer.avatar_path
          } : undefined,
          fileFormats: { 
            stereoMp3: { format: [], url: '' }, 
            stems: { format: [], url: '' }, 
            stemsWithVocals: { format: [], url: '' } 
          },
          pricing: { 
            stereoMp3: 0, 
            stems: 0, 
            stemsWithVocals: 0 
          },
          leaseAgreementUrl: ''
        };
        
        setTrack(mappedTrack);
      }

      // If user is logged in, fetch additional data
      if (user) {
        // Check favorite status
        const { data: favoriteData } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('track_id', trackId)
          .maybeSingle();

        setIsFavorite(!!favoriteData);

        // Calculate remaining licenses for Gold Access
        let remainingLicenses = 0;
        if (membershipPlan === 'Gold Access') {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { count } = await supabase
            .from('sales')
            .select('id', { count: 'exact' })
            .eq('buyer_id', user.id)
            .gte('created_at', startOfMonth.toISOString());

          remainingLicenses = 10 - (count || 0);
        }

        setUserStats({
          membershipType: membershipPlan || 'Single Track',
          remainingLicenses
        });
      }

    } catch (error) {
      console.error('Error fetching track data:', error);
      setError('Failed to load track details');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user || favoriteLoading || !track) return;

    try {
      setFavoriteLoading(true);

      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', track.id);

        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            track_id: track.id
          });

        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleActionClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!track) return;

    // For sync-only tracks, show the proposal dialog
    if (track.hasVocals && track.vocalsUsageType === 'sync_only') {
      setShowProposalDialog(true);
      return;
    }
    
    // Show the license dialog for all users
    // The LicenseTermsSummary component will handle the Stripe checkout if needed
    setShowLicenseDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-sm rounded-xl border border-red-500/20 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Track Not Found</h2>
          <p className="text-gray-300 mb-6">{error || "We couldn't find the track you're looking for."}</p>
          <button
            onClick={() => navigate('/catalog')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  const isSyncOnly = track.hasVocals && track.vocalsUsageType === 'sync_only';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column - Image */}
            <div className="md:col-span-1">
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <img
                  src={track.image}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
                {user && (
                  <button
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star 
                      className={`w-5 h-5 transition-colors ${
                        isFavorite ? 'text-yellow-400 fill-current' : 'text-white'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Middle Column - Track Details */}
            <div className="md:col-span-2">
              <h1 className="text-3xl font-bold text-white mb-2">{track.title}</h1>
              
              {track.producer && (
                <button
                  onClick={() => setShowProducerProfile(true)}
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center mb-4"
                >
                  <User className="w-4 h-4 mr-2" />
                  <span>
                    {track.producer.firstName} {track.producer.lastName}
                  </span>
                </button>
              )}

              <div className="mb-6">
                <AudioPlayer src={track.audioUrl} title={track.title} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-300">
                    <Tag className="w-5 h-5 mr-2 text-blue-400" />
                    <span>Genres: {track.genres.join(', ')}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-300">
                    <Hash className="w-5 h-5 mr-2 text-blue-400" />
                    <span>BPM: {track.bpm}</span>
                  </div>
                  
                  {track.key && (
                    <div className="flex items-center text-gray-300">
                      <Music className="w-5 h-5 mr-2 text-blue-400" />
                      <span>Key: {track.key}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {track.hasVocals && (
                    <div className="flex items-center text-gray-300">
                      <Mic className="w-5 h-5 mr-2 text-purple-400" />
                      <span>
                        Full Track with Vocals
                        {track.vocalsUsageType === 'sync_only' && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                            Sync Only
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {track.hasStingEnding && (
                    <div className="flex items-center text-gray-300">
                      <Music className="w-5 h-5 mr-2 text-blue-400" />
                      <span>Includes Sting Ending</span>
                    </div>
                  )}
                  
                  {track.isOneStop && (
                    <div className="flex items-center text-gray-300">
                      <Shield className="w-5 h-5 mr-2 text-green-400" />
                      <span>One-Stop Licensing</span>
                    </div>
                  )}
                </div>
              </div>

              {track.moods && track.moods.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-3">Moods</h3>
                  <div className="flex flex-wrap gap-2">
                    {track.moods.map((mood) => (
                      <span 
                        key={mood}
                        className="px-3 py-1 bg-white/10 rounded-full text-sm text-gray-300"
                      >
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleActionClick}
                  disabled={checkoutLoading}
                  className={`py-3 px-6 rounded-lg text-white font-semibold transition-colors flex items-center ${
                    isSyncOnly 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5 mr-2" />
                      {isSyncOnly ? 'Submit Sync Proposal' : (
                        membershipPlan === 'Single Track' 
                          ? 'Purchase License ($9.99)' 
                          : 'License This Track'
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Tracks Section - Could be added in the future */}
      </div>

      {/* Dialogs */}
      {track && (
        <>
          <LicenseDialog
            isOpen={showLicenseDialog}
            onClose={() => setShowLicenseDialog(false)}
            track={track}
            membershipType={membershipPlan || 'Single Track'}
            remainingLicenses={userStats.remainingLicenses}
            onLicenseCreated={fetchTrackData}
          />

          <SyncProposalDialog
            isOpen={showProposalDialog}
            onClose={() => setShowProposalDialog(false)}
            track={track}
          />

          {track.producer && (
            <ProducerProfileDialog
              isOpen={showProducerProfile}
              onClose={() => setShowProducerProfile(false)}
              producerId={track.producer.id}
            />
          )}
        </>
      )}
    </div>
  );
}
