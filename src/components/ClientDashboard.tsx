import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Music, Calendar, DollarSign, Clock, Plus, Search, Filter, Eye, MessageSquare, FileText, Star, StarOff } from 'lucide-react';
import { SyncProposalDialog } from './SyncProposalDialog';
import { ProposalDetailDialog } from './ProposalDetailDialog';
import { ProposalNegotiationDialog } from './ProposalNegotiationDialog';
import { ProposalHistoryDialog } from './ProposalHistoryDialog';
import { SyncProposalAcceptDialog } from './SyncProposalAcceptDialog';
import { CustomSyncRequest } from './CustomSyncRequest';
import { AudioPlayer } from './AudioPlayer';
import { AddToPlaylistButton } from './AddToPlaylistButton';

interface Track {
  id: string;
  title: string;
  artist: string;
  genres: string[];
  sub_genres: string[];
  moods: string[];
  bpm: number;
  duration: string;
  audio_url: string;
  image_url: string;
  key: string;
  has_vocals: boolean;
  vocals_usage_type: string;
  producer_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface SyncProposal {
  id: string;
  track_id: string;
  client_id: string;
  project_type: string;
  duration: string;
  is_exclusive: boolean;
  sync_fee: number;
  payment_terms: string;
  expiration_date: string;
  is_urgent: boolean;
  status: string;
  negotiation_status: string;
  client_status: string;
  payment_status: string;
  created_at: string;
  tracks: Track;
}

export function ClientDashboard() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [proposals, setProposals] = useState<SyncProposal[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showProposalAccept, setShowProposalAccept] = useState(false);
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<SyncProposal | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const genres = ['Hip Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Country', 'Classical'];
  const moods = ['Energetic', 'Chill', 'Dark', 'Happy', 'Sad', 'Aggressive', 'Romantic', 'Mysterious'];

  useEffect(() => {
    if (user) {
      fetchTracks();
      fetchProposals();
      fetchFavorites();
    }
  }, [user]);

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          profiles:producer_id (
            first_name,
            last_name,
            email
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure genres, sub_genres, and moods are arrays
      const processedData = (data || []).map(track => ({
        ...track,
        genres: Array.isArray(track.genres) ? track.genres : (track.genres ? track.genres.split(',').map((g: string) => g.trim()) : []),
        sub_genres: Array.isArray(track.sub_genres) ? track.sub_genres : (track.sub_genres ? track.sub_genres.split(',').map((g: string) => g.trim()) : []),
        moods: Array.isArray(track.moods) ? track.moods : (track.moods ? track.moods.split(',').map((m: string) => m.trim()) : [])
      }));
      
      setTracks(processedData);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_proposals')
        .select(`
          *,
          tracks (
            id,
            title,
            artist,
            audio_url,
            image_url,
            profiles:producer_id (
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('track_id')
        .eq('user_id', user?.id);

      if (error) throw error;
      setFavorites(data?.map(f => f.track_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (trackId: string) => {
    try {
      const isFavorited = favorites.includes(trackId);
      
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user?.id)
          .eq('track_id', trackId);
        
        if (error) throw error;
        setFavorites(favorites.filter(id => id !== trackId));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user?.id,
            track_id: trackId
          });
        
        if (error) throw error;
        setFavorites([...favorites, trackId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = !selectedGenre || track.genres.includes(selectedGenre);
    const matchesMood = !selectedMood || track.moods.includes(selectedMood);
    
    return matchesSearch && matchesGenre && matchesMood;
  });

  const handleCreateProposal = (track: Track) => {
    setSelectedTrack(track);
    setShowSyncDialog(true);
  };

  const handleViewProposal = (proposal: SyncProposal) => {
    setSelectedProposal(proposal);
    setShowProposalDetail(true);
  };

  const handleNegotiate = (proposal: SyncProposal) => {
    setSelectedProposal(proposal);
    setShowNegotiationDialog(true);
  };

  const handleViewHistory = (proposal: SyncProposal) => {
    setSelectedProposal(proposal);
    setShowHistoryDialog(true);
  };

  const handleAcceptProposal = (proposal: SyncProposal) => {
    setSelectedProposal(proposal);
    setShowProposalAccept(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Dashboard</h1>
        <p className="text-gray-600">Discover tracks and manage your sync proposals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Music className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tracks</p>
              <p className="text-2xl font-bold text-gray-900">{tracks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Proposals</p>
              <p className="text-2xl font-bold text-gray-900">{proposals.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Favorites</p>
              <p className="text-2xl font-bold text-gray-900">{favorites.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Proposals</p>
              <p className="text-2xl font-bold text-gray-900">
                {proposals.filter(p => p.status === 'pending' || p.status === 'accepted').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setShowCustomRequest(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Custom Request
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
              Browse Tracks
            </button>
            <button className="border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              My Proposals
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>

          <select
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">All Moods</option>
            {moods.map(mood => (
              <option key={mood} value={mood}>{mood}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTracks.map((track) => (
          <div key={track.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="relative">
              <img
                src={track.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'}
                alt={track.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => toggleFavorite(track.id)}
                  className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                >
                  {favorites.includes(track.id) ? (
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  ) : (
                    <StarOff className="h-5 w-5 text-gray-600" />
                  )}
                </button>
                <AddToPlaylistButton trackId={track.id} />
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{track.title}</h3>
              <p className="text-gray-600 mb-2">by {track.artist}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {track.genres.slice(0, 2).map((genre) => (
                  <span key={genre} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {genre}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{track.bpm} BPM</span>
                <span>{track.key}</span>
                <span>{track.duration}</span>
              </div>

              {track.audio_url && (
                <div className="mb-4">
                  <AudioPlayer
                    src={track.audio_url}
                    title={track.title}
                    artist={track.artist}
                    isPlaying={currentlyPlaying === track.id}
                    onPlay={() => setCurrentlyPlaying(track.id)}
                    onPause={() => setCurrentlyPlaying(null)}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleCreateProposal(track)}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Create Proposal
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Proposals Section */}
      {proposals.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Proposals</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Track
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sync Fee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={proposal.tracks.image_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100'}
                            alt={proposal.tracks.title}
                            className="h-10 w-10 rounded object-cover"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {proposal.tracks.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {proposal.tracks.artist}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {proposal.project_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${proposal.sync_fee.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(proposal.status)}`}>
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewProposal(proposal)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleNegotiate(proposal)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewHistory(proposal)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          {proposal.status === 'accepted' && proposal.client_status === 'pending' && (
                            <button
                              onClick={() => handleAcceptProposal(proposal)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Accept
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <SyncProposalDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        track={selectedTrack}
        onSuccess={() => {
          setShowSyncDialog(false);
          fetchProposals();
        }}
      />

      <ProposalDetailDialog
        isOpen={showProposalDetail}
        onClose={() => setShowProposalDetail(false)}
        proposal={selectedProposal}
        onAccept={handleAcceptProposal}
      />

      <ProposalNegotiationDialog
        isOpen={showNegotiationDialog}
        onClose={() => setShowNegotiationDialog(false)}
        proposal={selectedProposal}
      />

      <ProposalHistoryDialog
        isOpen={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
        proposalId={selectedProposal?.id}
      />

      <SyncProposalAcceptDialog
        isOpen={showProposalAccept}
        onClose={() => setShowProposalAccept(false)}
        proposal={selectedProposal}
        onComplete={() => {
          setShowProposalAccept(false);
          fetchProposals();
        }}
      />

      <CustomSyncRequest
        isOpen={showCustomRequest}
        onClose={() => setShowCustomRequest(false)}
        onSuccess={() => {
          setShowCustomRequest(false);
        }}
      />
    </div>
  );
}