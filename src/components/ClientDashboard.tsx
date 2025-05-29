import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Track {
  id: string;
  title: string;
  artist: string;
  image_url: string;
  audio_url: string;
  created_at: string;
}

interface Favorite {
  id: string;
  track: Track;
}

export function ClientDashboard() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchFavorites();
      fetchNewReleases();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data: favoritesData, error } = await supabase
        .from('favorites')
        .select(`
          id,
          track_id,
          track:tracks (
            id,
            title,
            artist,
            image_url,
            audio_url,
            created_at
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(favoritesData || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchNewReleases = async () => {
    try {
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setNewReleases(tracks || []);
    } catch (error) {
      console.error('Error fetching new releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseTrack = (trackId: string) => {
    // Navigate to license page with track ID
    window.location.href = `/license/${trackId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Favorites Section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold">Your Favorites</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={favorite.track.image_url || 'https://images.pexels.com/photos/1626481/pexels-photo-1626481.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'}
                  alt={favorite.track.title}
                  className="object-cover w-full h-48"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{favorite.track.title}</h3>
                <p className="text-gray-600 mb-4">{favorite.track.artist}</p>
                <button
                  onClick={() => handleLicenseTrack(favorite.track.id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  License Track
                </button>
              </div>
            </div>
          ))}
          {favorites.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No favorites yet. Start exploring tracks to add some!
            </div>
          )}
        </div>
      </section>

      {/* New Releases Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Music className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold">New Releases</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newReleases.map((track) => (
            <div key={track.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={track.image_url || 'https://images.pexels.com/photos/1626481/pexels-photo-1626481.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'}
                  alt={track.title}
                  className="object-cover w-full h-48"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{track.title}</h3>
                <p className="text-gray-600 mb-4">{track.artist}</p>
                <button
                  onClick={() => handleLicenseTrack(track.id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  License Track
                </button>
              </div>
            </div>
          ))}
          {newReleases.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No new releases available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}