import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sliders, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SearchBox } from './SearchBox';
import { TrackCard } from './TrackCard';
import { Track, GENRES, MOODS } from '../types';
import AIRecommendationWidget from './AIRecommendationWidget';

// Inside your page component:
<AIRecommendationWidget />


const TRACKS_PER_PAGE = 20;

export function CatalogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [membershipActive, setMembershipActive] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<any>(null);

  useEffect(() => {
    // Get search params
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
    const moods = searchParams.get('moods')?.split(',').filter(Boolean) || [];
    const minBpm = searchParams.get('minBpm');
    const maxBpm = searchParams.get('maxBpm');
    const trackId = searchParams.get('track');

    // Create filters object
    const filters = {
      query,
      genres,
      moods,
      minBpm: minBpm ? parseInt(minBpm) : undefined,
      maxBpm: maxBpm ? parseInt(maxBpm) : undefined,
      trackId
    };

    // Reset page and tracks when filters change
    setPage(1);
    setTracks([]);
    setHasMore(true);
    setCurrentFilters(filters);

    // Fetch tracks with filters
    fetchTracks(filters, 1);
  }, [searchParams]);

  const fetchTracks = async (filters?: any, currentPage: number = 1) => {
    try {
      if (currentPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

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
        // Remove the filter that was excluding sync_only tracks
        .is('deleted_at', null);

      // If a specific track ID is provided, fetch only that track
      if (filters?.trackId) {
        query = query.eq('id', filters.trackId);
      } else {
        // Build search conditions
        const searchConditions = [];

        if (filters?.query) {
          // Text search
          searchConditions.push(`title.ilike.%${filters.query}%`);
          searchConditions.push(`artist.ilike.%${filters.query}%`);
          
          // Search in comma-separated strings
          searchConditions.push(`genres.ilike.%${filters.query}%`);
          searchConditions.push(`moods.ilike.%${filters.query}%`);
        }

        // Genre filters
        if (filters?.genres?.length > 0) {
          filters.genres.forEach((genre: string) => {
            searchConditions.push(`genres.ilike.%${genre}%`);
          });
        }

        // Mood filters
        if (filters?.moods?.length > 0) {
          filters.moods.forEach((mood: string) => {
            searchConditions.push(`moods.ilike.%${mood}%`);
          });
        }

        // Apply search conditions
        if (searchConditions.length > 0) {
          query = query.or(searchConditions.join(','));
        }

        // Apply BPM filters
        if (filters?.minBpm !== undefined) {
          query = query.gte('bpm', filters.minBpm);
        }
        if (filters?.maxBpm !== undefined) {
          query = query.lte('bpm', filters.maxBpm);
        }

        // Add pagination
        const from = (currentPage - 1) * TRACKS_PER_PAGE;
        const to = from + TRACKS_PER_PAGE - 1;
        query = query.range(from, to);

        // Order by most recent first
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedTracks = data
          .filter(track => track && track.id)
          .map(track => ({
            id: track.id,
            title: track.title || 'Untitled',
            artist:
              track.producer?.first_name ||
              track.producer?.email?.split('@')[0] ||
              'Unknown Artist',
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
            image:
              track.image_url ||
              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
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

        if (currentPage === 1) {
          setTracks(formattedTracks);
        } else {
          setTracks(prev => [...prev, ...formattedTracks]);
        }

        setHasMore(formattedTracks.length === TRACKS_PER_PAGE);
        
        // If we're looking for a specific track and found it, navigate to its page
        if (filters?.trackId && formattedTracks.length === 1) {
          navigate(`/track/${filters.trackId}`);
        }
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = async (filters: any) => {
    // Convert all search terms to lowercase and remove extra spaces
    const normalizedFilters = {
      ...filters,
      query: filters.query?.toLowerCase().trim(),
      genres: filters.genres?.map((g: string) => g.toLowerCase().trim()),
      moods: filters.moods?.map((m: string) => m.toLowerCase().trim())
    };

    // Update URL with search params
    const params = new URLSearchParams();
    if (normalizedFilters.query) params.set('q', normalizedFilters.query);
    if (normalizedFilters.genres?.length) params.set('genres', normalizedFilters.genres.join(','));
    if (normalizedFilters.moods?.length) params.set('moods', normalizedFilters.moods.join(','));
    if (normalizedFilters.minBpm) params.set('minBpm', normalizedFilters.minBpm.toString());
    if (normalizedFilters.maxBpm) params.set('maxBpm', normalizedFilters.maxBpm.toString());

    // Update URL without reloading the page
    navigate(`/catalog?${params.toString()}`, { replace: true });
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTracks(currentFilters, nextPage);
    }
  };

  const handleTrackSelect = (track: Track) => {
    navigate(`/track/${track.id}`);
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
        <h1 className="text-3xl font-bold text-white mb-6">Music Catalog</h1>
        <SearchBox onSearch={handleSearch} />
      </div>

      {!user && (
        <div className="mb-8 p-6 glass-card rounded-lg text-center">
          <p className="text-xl text-white mb-6">
            Preview our catalog below. Sign up or login to access our complete library and start licensing tracks.
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

      {user && !membershipActive && (
        <div className="mb-8 p-4 glass-card rounded-lg">
          <p className="text-yellow-400">
            Your membership has expired. Please{' '}
            <button
              onClick={() => navigate('/pricing')}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              renew your membership here
            </button>
            .
          </p>
        </div>
      )}

      {tracks.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-lg">
          <p className="text-gray-400 text-lg">No tracks found matching your search criteria.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tracks.map((track) =>
              track && track.id ? (
                <TrackCard
                  key={track.id}
                  track={track}
                  onSelect={() => handleTrackSelect(track)}
                />
              ) : null
            )}
          </div>

          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="btn-primary flex items-center justify-center mx-auto"
              >
                {loadingMore ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Load More Tracks
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
