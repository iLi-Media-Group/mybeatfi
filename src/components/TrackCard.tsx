import React from 'react';
import { Play, Pause, Heart, Download } from 'lucide-react';
import { Track, License } from '../types';

interface TrackCardProps {
  track: Track;
  licenses?: License[];
  isPlaying?: boolean;
  onPlay?: (trackId: string) => void;
  onPause?: () => void;
  onLicense?: (track: Track) => void;
  onFavorite?: (trackId: string) => void;
  isFavorited?: boolean;
}

export function TrackCard({
  track,
  licenses,
  isPlaying = false,
  onPlay,
  onPause,
  onLicense,
  onFavorite,
  isFavorited = false
}: TrackCardProps) {
  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.(track.id);
    }
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/(\d+):(\d+)/);
    if (match) {
      const [, minutes, seconds] = match;
      return `${minutes}:${seconds.padStart(2, '0')}`;
    }
    return duration;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        {track.image_url && (
          <img
            src={track.image_url}
            alt={track.title}
            className="w-full h-48 object-cover"
          />
        )}
        <button
          onClick={handlePlayPause}
          className="absolute bottom-4 right-4 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {track.title}
            </h3>
            <p className="text-sm text-gray-600">{track.artist}</p>
          </div>
          <button
            onClick={() => onFavorite?.(track.id)}
            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
              isFavorited ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            <Heart className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {track.genres?.map((genre) => (
            <span
              key={genre}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
            >
              {genre}
            </span>
          ))}
        </div>

        <div className="flex justify-between text-sm text-gray-600 mb-4">
          <span>{track.bpm} BPM</span>
          <span>{track.key}</span>
          <span>{formatDuration(track.duration)}</span>
        </div>

        {licenses && licenses.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-sm text-gray-600 mb-2">Starting from</p>
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-primary">
                ${Math.min(...licenses.map(l => Number(l.base_price))).toFixed(2)}
              </span>
              <button
                onClick={() => onLicense?.(track)}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                License Track
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}