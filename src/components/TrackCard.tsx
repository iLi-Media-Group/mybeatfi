import React, { useState } from 'react';
import { Play, Pause, Heart, Download } from 'lucide-react';
import { formatDuration } from '../utils/dateUtils';
import { Track } from '../types';

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
  onPause?: () => void;
  onSelect?: (track: Track) => void;
}

export function TrackCard({
  track,
  isPlaying = false,
  onPlay,
  onPause,
  onSelect
}: TrackCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.(track);
    }
  };

  const handleSelect = () => {
    onSelect?.(track);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img 
          src={track.image} 
          alt={track.title} 
          className="w-full h-48 object-cover"
        />
        <button
          onClick={handlePlayPause}
          className="absolute bottom-4 right-4 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 truncate">{track.title}</h3>
            <p className="text-sm text-gray-600">{track.artist}</p>
          </div>
          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
              isFavorite ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {track.genres?.map((genre, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
            >
              {genre}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
          <span>{track.duration ? formatDuration(track.duration) : '--:--'}</span>
          <span>{track.bpm} BPM</span>
        </div>

        <button
          onClick={handleSelect}
          className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={16} />
          License Track
        </button>
      </div>
    </div>
  );
}