import React, { useState } from 'react';
import { Calendar, Music, Link as LinkIcon, Users, FileText, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GENRES, SUB_GENRES } from '../types';
import { ProducerSearch } from './ProducerSearch';

export function CustomSyncRequest() {
  const { user } = useAuth();
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [syncFee, setSyncFee] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedSubGenres, setSelectedSubGenres] = useState<string[]>([]);
  const [referenceArtist, setReferenceArtist] = useState('');
  const [referenceSong, setReferenceSong] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [isOpenRequest, setIsOpenRequest] = useState(false);
  const [hasPreferredProducer, setHasPreferredProducer] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState('');
  const [submissionInstructions, setSubmissionInstructions] = useState('');
  const [submissionEmail, setSubmissionEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('custom_sync_requests')
        .insert({
          client_id: user.id,
          project_title: projectTitle,
          project_description: projectDescription,
          sync_fee: parseFloat(syncFee),
          end_date: endDate,
          genre: selectedGenre,
          sub_genres: selectedSubGenres,
          reference_artist: referenceArtist || null,
          reference_song: referenceSong || null,
          reference_url: referenceUrl || null,
          is_open_request: isOpenRequest,
          preferred_producer_id: hasPreferredProducer ? selectedProducer : null,
          submission_instructions: submissionInstructions,
          submission_email: submissionEmail,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        // Reset form
        setProjectTitle('');
        setProjectDescription('');
        setSyncFee('');
        setEndDate('');
        setSelectedGenre('');
        setSelectedSubGenres([]);
        setReferenceArtist('');
        setReferenceSong('');
        setReferenceUrl('');
        setIsOpenRequest(false);
        setHasPreferredProducer(false);
        setSelectedProducer('');
        setSubmissionInstructions('');
        setSubmissionEmail('');
      }, 3000);
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Create Custom Sync Request</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-center">Sync request submitted successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Title
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Description
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={4}
              className="w-full"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sync Fee Budget
              </label>
              <input
                type="number"
                value={syncFee}
                onChange={(e) => setSyncFee(e.target.value)}
                className="w-full"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Submission End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  setSelectedSubGenres([]);
                }}
                className="w-full"
                required
              >
                <option value="">Select Genre</option>
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            {selectedGenre && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sub-Genres (Optional)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {SUB_GENRES[selectedGenre as keyof typeof SUB_GENRES].map((subGenre) => (
                    <label key={subGenre} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedSubGenres.includes(subGenre)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubGenres([...selectedSubGenres, subGenre]);
                          } else {
                            setSelectedSubGenres(selectedSubGenres.filter(sg => sg !== subGenre));
                          }
                        }}
                        className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-300">{subGenre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Reference Track (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Artist Name
                </label>
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={referenceArtist}
                    onChange={(e) => setReferenceArtist(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Song Title
                </label>
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={referenceSong}
                    onChange={(e) => setReferenceSong(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reference URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  className="w-full pl-10"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isOpenRequest}
                onChange={(e) => {
                  setIsOpenRequest(e.target.checked);
                  if (e.target.checked) {
                    setHasPreferredProducer(false);
                    setSelectedProducer('');
                  }
                }}
                className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-300">Make this an open request (visible to all producers)</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={hasPreferredProducer}
                onChange={(e) => {
                  setHasPreferredProducer(e.target.checked);
                  if (e.target.checked) {
                    setIsOpenRequest(false);
                  } else {
                    setSelectedProducer('');
                  }
                }}
                className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-300">Select Preferred Producer</span>
            </label>

            <div className="pl-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Typing the Producer Name and Choose
              </label>
              <ProducerSearch
                value={selectedProducer}
                onChange={setSelectedProducer}
                disabled={!hasPreferredProducer}
                required={hasPreferredProducer}
              />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">How to Submit</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Special Instructions
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={submissionInstructions}
                  onChange={(e) => setSubmissionInstructions(e.target.value)}
                  rows={4}
                  className="w-full pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Submission Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={submissionEmail}
                  onChange={(e) => setSubmissionEmail(e.target.value)}
                  className="w-full pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Sync Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
