import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onToggle?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AudioPlayer({ 
  src, 
  title, 
  isPlaying = false, 
  onPlay, 
  onPause, 
  onToggle,
  className = '',
  size = 'md'
}: AudioPlayerProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(isPlaying);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync internal state with external control
  useEffect(() => {
    setInternalIsPlaying(isPlaying);
    
    if (isPlaying && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
        setInternalIsPlaying(false);
        if (onPause) onPause();
      });
    } else if (!isPlaying && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const value = (audio.currentTime / audio.duration) * 100;
      setProgress(isNaN(value) ? 0 : value);
    };

    const handleError = () => {
      setError('Failed to load audio');
      setInternalIsPlaying(false);
    };

    const handleEnded = () => {
      setInternalIsPlaying(false);
      if (onPause) onPause();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = () => {
    if (onToggle) {
      onToggle();
      return;
    }

    if (audioRef.current) {
      if (internalIsPlaying) {
        audioRef.current.pause();
        setInternalIsPlaying(false);
        if (onPause) onPause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Playback error:', err);
            setError('Failed to play audio');
          });
          setInternalIsPlaying(true);
          if (onPlay) onPlay();
        }
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const width = bounds.width;
    const percentage = x / width;
    
    audio.currentTime = audio.duration * percentage;
  };

  // Render different sizes
  if (size === 'sm') {
    return (
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
        title={internalIsPlaying ? "Pause" : "Play"}
      >
        {internalIsPlaying ? (
          <Pause className="w-4 h-4 text-white" />
        ) : (
          <Play className="w-4 h-4 text-white" />
        )}
        <audio ref={audioRef} src={src} preload="metadata" />
      </button>
    );
  }

  return (
    <div className={`flex items-center space-x-4 bg-white/5 backdrop-blur-sm rounded-lg p-3 ${className}`}>
      <button
        onClick={togglePlay}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        {internalIsPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white" />
        )}
      </button>
      <div className="flex-1">
        <p className="text-sm text-gray-200">{title}</p>
        {error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : (
          <div 
            className="mt-1 h-1 bg-gray-700 rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
      <button
        onClick={toggleMute}
        className="text-gray-400 hover:text-white transition-colors"
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
