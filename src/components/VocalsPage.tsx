import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Track } from '../types';
import { TrackCard } from './TrackCard';
import { SearchBox } from './SearchBox';
import { useAuth } from '../contexts/AuthContext';
import { SyncProposalDialog } from './SyncProposalDialog';

export function VocalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async (filters?: any) => {
    try {
      setLoading(true);
      let query = supabase
        .from('tracks')
        .select(`
          id,
          title,
          artist,
          genres,
          sub_genres,
          moods,
          bpm,
          audio_url,
          image_url,
          has_sting_ending,
          is_one_stop,
          duration,
          mp3_url,
          trackouts_url,
          has_vocals,
          vocals_usage_type,
          producer:profiles!producer_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('has_vocals', true);

      // Apply search filters if provided
      if (filters) {
        const conditions = [];

        if (filters.query) {
          conditions.push(`title.ilike.%${filters.query}%`);
          conditions.push(`artist.ilike.%${filters.query}%`);
        }

        // Genre filters
        if (filters.genres?.length > 0) {
          const genreConditions = filters.genres.map((genre: string) => 
            `genres.cs.{"${genre.toLowerCase()}"}`
          );
          conditions.push(genreConditions.join(','));
        }

        // Mood filters
        if (filters.moods?.length > 0) {
          const moodConditions = filters.moods.map((mood: string) => 
            `moods.cs.{"${mood.toLowerCase()}"}`
          );
          conditions.push(moodConditions.join(','));
        }

        // Apply all conditions
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }

        if (filters.minBpm) {
          query = query.gte('bpm', filters.minBpm);
        }
        if (filters.maxBpm) {
          query = query.lte('bpm', filters.maxBpm);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Filter out any tracks with undefined IDs before mapping
        const validTracks = data.filter(track => track && track.id);
        
        const formattedTracks = validTracks.map(track => ({
          id: track.id,
          title: track.title,
          artist: track.producer?.first_name || track.producer?.email?.split('@')[0] || 'Unknown Artist',
          genres: Array.isArray(track.genres)
            ? track.genres
            : track.genres?.split(',').map(g => g.trim()) || [],
          subGenres: Array.isArray(track.sub_genres)
            ? track.sub_genres
            : track.sub_genres?.split(',').map(g => g.trim()) || [],
          moods: Array.isArray(track.moods)
            ? track.moods
            : track.moods?.split(',').map(m => m.trim()) || [],
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
          producer: track.producer ? {
            id: track.producer.id,
            firstName: track.producer.first_name || '',
            lastName: track.producer.last_name || '',
            email: track.producer.email
          } : undefined
        }));
        setTracks(formattedTracks);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setError('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: any) => {
    fetchTracks(filters);
  };

  const handleTrackSelect = (track: Track) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (track.hasVocals && track.vocalsUsageType === 'sync_only') {
      setSelectedTrack(track);
      setShowProposalDialog(true);
    } else {
      navigate(`/license/${track.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4 flex items-center">
          <Mic className="w-8 h-8 mr-3" />
          Licensable Full Tracks with Vocals
        </h1>
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-300">
                Browse our collection of full tracks featuring vocals. Perfect for:
              </p>
              <ul className="list-disc list-inside mt-2 text-gray-300 space-y-1">
                <li>TV shows and films</li>
                <li>Advertising campaigns</li>
                <li>Video game soundtracks</li>
                <li>Corporate videos</li>
              </ul>
            </div>
          </div>
        </div>
        <SearchBox onSearch={handleSearch} />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {!user && (
        <div className="mb-8 p-6 glass-card rounded-lg text-center">
          <p className="text-xl text-white mb-6">
            Preview our vocal tracks below. Sign up or login to access our complete library and start licensing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/pricing')}
              className="btn-primary"
            >
              View Membership Options
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary"
            >
              Login to Your Account
            </button>
          </div>
        </div>
      )}

      {tracks.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-lg">
          <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No vocal tracks found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onSelect={handleTrackSelect}
            />
          ))}
        </div>
      )}

      {selectedTrack && (
        <SyncProposalDialog
          isOpen={showProposalDialog}
          onClose={() => {
            setShowProposalDialog(false);
            setSelectedTrack(null);
          }}
          track={selectedTrack}
        />
      )}
    </div>
  );
}
