import React, { useState } from 'react';
import { Play, Pause, Heart, Download } from 'lucide-react';
import { formatDuration } from '../utils/dateUtils';

interface TrackCardProps {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  audioUrl: string;
  duration: string;
  bpm: number;
  genres: string[];
  isPlaying?: boolean;
  onPlay?: (id: string) => void;
  onPause?: () => void;
  onLicense?: (id: string) => void;
}

export function TrackCard({
  id,
  title,
  artist,
  imageUrl,
  audioUrl,
  duration,
  bpm,
  genres,
  isPlaying = false,
  onPlay,
  onPause,
  onLicense
}: TrackCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.(id);
    }
  };

  const handleLicense = () => {
    onLicense?.(id);
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        <img 
          src={imageUrl} 
          alt={title} 
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
            <h3 className="text-lg font-semibold text-gray-900 truncate">{title}</h3>
            <p className="text-sm text-gray-600">{artist}</p>
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
          {genres.map((genre, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
            >
              {genre}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
          <span>{formatDuration(duration)}</span>
          <span>{bpm} BPM</span>
        </div>

        <button
          onClick={handleLicense}
          className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Download size={16} />
          License Track
        </button>
      </div>
    </div>
  );
}