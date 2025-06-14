import React, { useState } from 'react';
import { X, Music } from 'lucide-react';
import { GENRES, MOODS_CATEGORIES, MOODS } from '../types';
import { supabase } from '../lib/supabase';

interface EditTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: {
    id: string;
    title: string;
    genres: string[];
    moods: string[];
    hasVocals?: boolean;
    vocalsUsageType?: 'normal' | 'sync_only';
  };
  onUpdate: () => void;
}

export function EditTrackModal({ isOpen, onClose, track, onUpdate }: EditTrackModalProps) {
  const normalizeGenre = (genre: string) => genre.toLowerCase().replace(/\s+/g, '');

  const initialGenres = (track.genres || []).filter(genre =>
    GENRES.some(g => normalizeGenre(g) === normalizeGenre(genre))
  ).map(genre => {
    return GENRES.find(g => normalizeGenre(g) === normalizeGenre(genre)) || genre;
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
  const [selectedMoods, setSelectedMoods] = useState<string[]>(track.moods || []);
  const [hasVocals, setHasVocals] = useState(track.hasVocals || false);
  const [isSyncOnly, setIsSyncOnly] = useState(track.vocalsUsageType === 'sync_only');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (selectedGenres.length === 0) {
        throw new Error('At least one genre is required');
      }

      const formattedGenres = selectedGenres;
      const validMoods = selectedMoods.filter(mood => MOODS.includes(mood));

      const { error: updateError } = await supabase
        .from('tracks')
        .update({
          genres: formattedGenres,
          moods: validMoods,
          has_vocals: hasVocals,
          vocals_usage_type: isSyncOnly ? 'sync_only' : 'normal',
          updated_at: new Date().toISOString()
        })
        .eq('id', track.id);

      if (updateError) throw updateError;

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating track:', err);
      setError(err instanceof Error ? err.message : 'Failed to update track. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-8 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Music className="w-6 h-6 text-blue-500 mr-2" />
            <h2 className="text-2xl font-bold text-white">Edit Track: {track.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Genres */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Genres
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {GENRES.map((genre) => (
                <label key={genre} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedGenres.some(g => normalizeGenre(g) === normalizeGenre(genre))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGenres([...selectedGenres, genre]);
                      } else {
                        setSelectedGenres(selectedGenres.filter(g => normalizeGenre(g) !== normalizeGenre(genre)));
                      }
                    }}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-gray-300">{genre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Moods */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-4">
              Moods
            </label>
            <div className="space-y-6">
              {Object.entries(MOODS_CATEGORIES).map(([category, moods]) => (
                <div key={category} className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">{category}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {moods.map((mood) => (
                      <label key={mood} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedMoods.includes(mood)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMoods([...selectedMoods, mood]);
                            } else {
                              setSelectedMoods(selectedMoods.filter(m => m !== mood));
                            }
                          }}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          disabled={loading}
                        />
                        <span className="text-gray-300">{mood}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Has Vocals */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hasVocals}
                onChange={(e) => setHasVocals(e.target.checked)}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <label className="text-gray-300">Full Track With Vocals</label>
            </div>

            {/* Sync Only */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isSyncOnly}
                onChange={(e) => setIsSyncOnly(e.target.checked)}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <label className="text-gray-300">Sync Only (Only allow for sync briefs)</label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
