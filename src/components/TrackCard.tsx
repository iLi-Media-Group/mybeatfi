import React, { useState, useEffect } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { Track } from '../types';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star } from 'lucide-react';
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
  const isSyncOnly = track.hasVocals && track.vocalsUsageType === 'sync_only';

  useEffect(() => {
    if (user) {
      checkFavoriteStatus();
    }
  }, [user, track.id]);

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
        // Remove from favorites
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', track.id);
        setIsFavorite(false);
      } else {
        // Add to favorites
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
    <div className="glass-card hover-card rounded-xl p-4">
      <div className="aspect-square overflow-hidden rounded-lg relative group">
        <img
          src={track.image}
          alt={track.title}
          className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {user && (
          <button
            onClick={toggleFavorite}
            disabled={loading}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={`w-5 h-5 ${
                isFavorite ? 'text-yellow-400 fill-current' : 'text-white'
              }`}
            />
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-white truncate">{track.title}</h3>
          <p className="text-gray-400 text-sm">{track.artist}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {track.genres.map((genre) => (
            <span key={genre} className="tag text-primary-300">
              <Music className="w-3 h-3 mr-1" />
              {genre}
            </span>
          ))}
        </div>

        {track.moods && track.moods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {track.moods.map((mood) => (
              <span key={mood} className="tag text-blue-300">
                <Tag className="w-3 h-3 mr-1" />
                {mood}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {track.duration}
          </div>
          <div className="flex items-center">
            <Hash className="w-4 h-4 mr-1" />
            {track.bpm} BPM
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          {track.hasVocals && (
            <div className="flex items-center text-purple-400">
              <Mic className="w-4 h-4 mr-1" />
              <span>{isSyncOnly ? 'Sync Only' : 'Full Vocals'}</span>
            </div>
          )}
          {track.mp3Url && (
            <div className="flex items-center text-green-400">
              <FileMusic className="w-4 h-4 mr-1" />
              <span>MP3 Available</span>
            </div>
          )}
          {track.trackoutsUrl && (
            <div className="flex items-center text-purple-400">
              <Layers className="w-4 h-4 mr-1" />
              <span>Trackouts Available</span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <AudioPlayer url={track.audioUrl} title={track.title} />
        </div>

        <button
          onClick={onSelect}
          className={`btn w-full mt-4 group ${
            isSyncOnly 
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'btn-primary'
          }`}
        >
          <span className="group-hover:translate-x-1 transition-transform inline-block">
            {isSyncOnly ? 'Submit Proposal →' : 'License Track →'}
          </span>
        </button>
      </div>
    </div>
  );
}