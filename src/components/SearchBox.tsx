import React, { useState } from 'react';
import { Search, Sliders } from 'lucide-react';
import { GENRES, MOODS } from '../types';

interface SearchBoxProps {
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  query: string;
  genres: string[];
  moods: string[];
  minBpm: number;
  maxBpm: number;
}

export function SearchBox({ onSearch }: SearchBoxProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    genres: [],
    moods: [],
    minBpm: 0,
    maxBpm: 300,
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(filters);
    }
  };

  const getPlaceholderText = () => {
    const examples = [
      'hip hop energetic',
      'electronic peaceful',
      'pop uplifting',
      'jazz romantic',
      'rock powerful'
    ];
    return `Search by title, genre, or mood (e.g., "${examples[Math.floor(Math.random() * examples.length)]}")`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={getPlaceholderText()}
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-4 pr-12 py-3 bg-white/5 border border-blue-500/20 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring focus:ring-blue-500/20"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="p-3 bg-white/5 border border-blue-500/20 rounded-lg text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle filters"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>

        {isFiltersOpen && (
          <div className="glass-card p-6 rounded-lg space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genres
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {GENRES.map((genre) => (
                    <label key={genre} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.genres.includes(genre)}
                        onChange={(e) => {
                          const newGenres = e.target.checked
                            ? [...filters.genres, genre]
                            : filters.genres.filter(g => g !== genre);
                          handleFilterChange('genres', newGenres);
                        }}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">{genre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Moods
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {MOODS.map((mood) => (
                    <label key={mood} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.moods.includes(mood)}
                        onChange={(e) => {
                          const newMoods = e.target.checked
                            ? [...filters.moods, mood]
                            : filters.moods.filter(m => m !== mood);
                          handleFilterChange('moods', newMoods);
                        }}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">{mood}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tempo Range (BPM)
                </label>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Min BPM</label>
                    <input
                      type="number"
                      min="0"
                      max={filters.maxBpm}
                      value={filters.minBpm}
                      onChange={(e) => handleFilterChange('minBpm', parseInt(e.target.value))}
                      className="mt-1 block w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Max BPM</label>
                    <input
                      type="number"
                      min={filters.minBpm}
                      max="300"
                      value={filters.maxBpm}
                      onChange={(e) => handleFilterChange('maxBpm', parseInt(e.target.value))}
                      className="mt-1 block w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
