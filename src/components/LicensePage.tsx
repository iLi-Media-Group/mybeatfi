import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Music, Download, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { LicenseDialog } from './LicenseDialog';
import { createCheckoutSession } from '../lib/stripe';
import { PRODUCTS } from '../stripe-config';
import { SyncProposalDialog } from './SyncProposalDialog';

interface UserStats {
  membershipType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  remainingLicenses: number;
}

export function LicensePage() {
  const { trackId } = useParams();
  const { user, membershipPlan, refreshMembership } = useAuth();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    membershipType: 'Single Track',
    remainingLicenses: 0
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Refresh membership info first to ensure we have the latest data
    refreshMembership().then(() => {
      fetchData();
    });
  }, [trackId, user, navigate, membershipPlan]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch track details
      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .select(`
          *,
          producer:producer_id (
            first_name,
            last_name
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
          genre: genres,
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
          hasSting: trackData.has_sting_ending || false,
          producerId: trackData.producer_id, // Add producer_id to the mapped track
          fileFormats: [], // Default empty array for file formats
          pricing: [], // Default empty array for pricing
          leaseAgreementUrl: '', // Default empty string for lease agreement URL
        };
        
        setTrack(mappedTrack);
      }

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

    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseClick = async () => {
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

  if (!track) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-400">
          Track not found
        </div>
      </div>
    );
  }

  const isSyncOnly = track.hasVocals && track.vocalsUsageType === 'sync_only';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={track.image}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{track.title}</h1>
              <p className="text-gray-400 mb-4">{track.artist}</p>

              <div className="mb-6">
                <AudioPlayer url={track.audioUrl} title={track.title} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center text-gray-300">
                  <Music className="w-5 h-5 mr-2" />
                  <span>{track.genre.join(', ')}</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Shield className="w-5 h-5 mr-2" />
                  <span>Licensed under your {membershipPlan || 'Single Track'} plan</span>
                </div>
              </div>

              <button
                onClick={handleLicenseClick}
                disabled={checkoutLoading}
                className={`mt-8 w-full py-3 px-6 text-white font-semibold rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 ${
                  isSyncOnly 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    {isSyncOnly 
                      ? 'Submit Sync Proposal' 
                      : (membershipPlan === 'Single Track' 
                        ? 'Purchase License ($9.99)' 
                        : 'License Track')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <LicenseDialog
        isOpen={showLicenseDialog}
        onClose={() => setShowLicenseDialog(false)}
        track={track}
        membershipType={membershipPlan || 'Single Track'}
        remainingLicenses={userStats.remainingLicenses}
        onLicenseCreated={fetchData}
      />
      
      <SyncProposalDialog
        isOpen={showProposalDialog}
        onClose={() => setShowProposalDialog(false)}
        track={track}
      />
    </div>
  );
}
