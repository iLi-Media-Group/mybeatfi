import React, { useState, useEffect } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { Track } from '../types';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TrackCardProps {
  track: Track;
  onSelect: () => void;
}

export function TrackCard({ track, onSelect }: TrackCardProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isSyncOnly = track.hasVocals && track.vocalsUsageType === 'sync_only';

  useEffect(() => {
    if (user && track?.id) {
      checkFavoriteStatus();
    }
  }, [user, track?.id]);

  const checkFavoriteStatus = async () => {
    try {
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user?.id)
        .eq('track_id', track.id)
        .maybeSingle();

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      setLoading(true);
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', track.id);
        setIsFavorite(false);
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            track_id: track.id
          });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 overflow-hidden transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.image}
          alt={track.title}
          className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Favorite Button */}
        {user && (
          <button
            onClick={toggleFavorite}
            disabled={loading}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10 opacity-0 group-hover:opacity-100"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={`w-5 h-5 ${
                isFavorite ? 'text-yellow-400 fill-current' : 'text-white'
              }`}
            />
          </button>
        )}

        {/* Play Button Overlay */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
        >
          <div className="p-4 rounded-full bg-blue-600/90 hover:bg-blue-600 transform transition-transform duration-300 hover:scale-110">
            <Play className="w-8 h-8 text-white" />
          </div>
        </button>
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 truncate">{track.title}</h3>
          <p className="text-gray-400">{track.artist}</p>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2">
          {track.genres.slice(0, 3).map((genre) => (
            <span key={genre} className="tag text-blue-300">
              <Music className="w-3 h-3 mr-1" />
              {genre}
            </span>
          ))}
          {track.moods.slice(0, 2).map((mood) => (
            <span key={mood} className="tag text-purple-300">
              <Tag className="w-3 h-3 mr-1" />
              {mood}
            </span>
          ))}
        </div>

        {/* Track Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-400">
            <Clock className="w-4 h-4 mr-2" />
            {track.duration}
          </div>
          <div className="flex items-center text-gray-400">
            <Hash className="w-4 h-4 mr-2" />
            {track.bpm} BPM
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-3 text-sm">
          {track.hasVocals && (
            <div className="flex items-center text-purple-400">
              <Mic className="w-4 h-4 mr-1" />
              <span>{isSyncOnly ? 'Sync Only' : 'Full Vocals'}</span>
            </div>
          )}
          {track.mp3Url && (
            <div className="flex items-center text-green-400">
              <FileMusic className="w-4 h-4 mr-1" />
              <span>MP3</span>
            </div>
          )}
          {track.trackoutsUrl && (
            <div className="flex items-center text-blue-400">
              <Layers className="w-4 h-4 mr-1" />
              <span>Stems</span>
            </div>
          )}
        </div>

        {/* Audio Player */}
        <div className="pt-2">
          <AudioPlayer url={track.audioUrl} title={track.title} />
        </div>

        {/* Action Button */}
        <button
          onClick={onSelect}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
            isSyncOnly 
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <span className="transform transition-transform group-hover:translate-x-1">
            {isSyncOnly ? 'Submit Proposal →' : 'License Track →'}
          </span>
        </button>
      </div>
    </div>
  );
}