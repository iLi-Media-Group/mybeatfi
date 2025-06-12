import React, { useState, useEffect } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { Track } from '../types';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, Play, User, ListMusic } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProducerProfileDialog } from './ProducerProfileDialog';

interface TrackCardProps {
  track: Track;
  onSelect: (track: Track) => void;
}

export function TrackCard({ track, onSelect }: TrackCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [showProducerProfile, setShowProducerProfile] = useState(false);
  const isSyncOnly = track.hasVocals && track.vocalsUsageType === 'sync_only';

  useEffect(() => {
    if (user && track?.id) {
      checkFavoriteStatus();
    }
    
    // Create audio element
    const audio = new Audio(track.audioUrl);
    audio.addEventListener('ended', () => setIsPlaying(false));
    setAudioRef(audio);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [user, track?.id]);

  const checkFavoriteStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user?.id)
        .eq('track_id', track.id)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || loading) return;

    try {
      setLoading(true);

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
      setLoading(false);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!audioRef) return;

    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProducerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (track.producer?.id) {
      setShowProducerProfile(true);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/track/${track.id}`);
  };

  return (
    <>
      <div 
        className="group relative bg-white/5 backdrop-blur-sm rounded-lg border border-blue-500/20 overflow-hidden transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={track.image}
            alt={track.title}
            className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 transition-opacity duration-300" />
          
          {/* Favorite Button */}
          {user && (
            <button
              onClick={toggleFavorite}
              disabled={loading}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-20 cursor-pointer"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star 
                className={`w-4 h-4 transition-colors ${
                  isFavorite ? 'text-yellow-400 fill-current' : 'text-white'
                }`}
              />
            </button>
          )}

          {/* Play Button */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <div className="p-3 rounded-full bg-blue-600/90 hover:bg-blue-600 transform transition-transform duration-300 hover:scale-110">
              <Play className={`w-6 h-6 text-white ${isPlaying ? 'hidden' : ''}`} />
              {isPlaying && <span className="block w-4 h-4 bg-white"></span>}
            </div>
          </button>
        </div>

        {/* Content Section */}
        <div className="p-3 space-y-2">
          <div>
            <h3 className="text-sm font-bold text-white mb-0.5 truncate">{track.title}</h3>
            {track.producer && (
              <button
                onClick={handleProducerClick}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center"
              >
                <User className="w-3 h-3 mr-1" />
                {track.producer.firstName} {track.producer.lastName}
              </button>
            )}
          </div>

          {/* Track Details */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {track.duration}
            </div>
            <div className="flex items-center">
              <Hash className="w-3 h-3 mr-1" />
              {track.bpm} BPM
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {track.hasVocals && (
              <div className="flex items-center text-purple-400">
                <Mic className="w-3 h-3 mr-0.5" />
                <span>{isSyncOnly ? 'Sync Only' : 'Vocals'}</span>
              </div>
            )}
            {track.mp3Url && (
              <div className="flex items-center text-green-400">
                <FileMusic className="w-3 h-3 mr-0.5" />
                <span>MP3</span>
              </div>
            )}
            {track.trackoutsUrl && (
              <div className="flex items-center text-blue-400">
                <Layers className="w-3 h-3 mr-0.5" />
                <span>Stems</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/track/${track.id}`);
              }}
              className={`py-1.5 px-3 rounded text-xs font-medium transition-all duration-300 ${
                isSyncOnly 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSyncOnly ? 'Submit Proposal' : 'License Track'}
            </button>
          </div>
        </div>
      </div>

      {showProducerProfile && track.producer?.id && (
        <ProducerProfileDialog
          isOpen={showProducerProfile}
          onClose={() => setShowProducerProfile(false)}
          producerId={track.producer.id}
        />
      )}
    </>
  );
}
