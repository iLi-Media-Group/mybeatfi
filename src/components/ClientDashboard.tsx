import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Tag, Clock, Hash, FileMusic, Layers, Mic, Star, X, Calendar, ArrowUpDown, AlertCircle, DollarSign, Edit, Check, Trash2, Plus, UserCog, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { calculateTimeRemaining } from '../utils/dateUtils';
import { ClientProfile } from './ClientProfile';

interface License {
  id: string;
  track: Track;
  license_type: string;
  created_at: string;
  expiry_date: string;
}

interface UserStats {
  totalLicenses: number;
  remainingLicenses: number;
  membershipType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  daysUntilReset: number | null;
}

interface CustomSyncRequest {
  id: string;
  project_title: string;
  project_description: string;
  sync_fee: number;
  end_date: string;
  genre: string;
  sub_genres: string[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

interface EditRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: CustomSyncRequest;
  onSave: (updatedRequest: Partial<CustomSyncRequest>) => Promise<void>;
}

interface DeleteLicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  license: License;
  onConfirm: () => Promise<void>;
}

function DeleteLicenseDialog({ isOpen, onClose, license, onConfirm }: DeleteLicenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Error deleting license:', err);
      setError('Failed to delete license');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = new Date(license.expiry_date) <= new Date();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">Delete License</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Are you sure you want to delete your license for "{license.track.title}"?
          </p>
          
          {!isExpired && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">
                This license is still valid until {new Date(license.expiry_date).toLocaleDateString()}.
                Deleting it will revoke your rights to use this track after the expiration date.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Deleting...
              </span>
            ) : (
              <span>Delete License</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditRequestDialog({ isOpen, onClose, request, onSave }: EditRequestDialogProps) {
  const [title, setTitle] = useState(request.project_title);
  const [description, setDescription] = useState(request.project_description);
  const [syncFee, setSyncFee] = useState(request.sync_fee.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      await onSave({
        project_title: title,
        project_description: description,
        sync_fee: parseFloat(syncFee)
      });

      onClose();
    } catch (err) {
      console.error('Error updating request:', err);
      setError('Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-lg">
        <h3 className="text-xl font-bold text-white mb-4">Edit Sync Request</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sync Fee
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

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const calculateExpiryDate = (purchaseDate: string, membershipType: string): string => {
  const date = new Date(purchaseDate);
  switch (membershipType) {
    case 'Ultimate Access':
      date.setFullYear(date.getFullYear() + 100);
      break;
    case 'Platinum Access':
      date.setFullYear(date.getFullYear() + 3);
      break;
    default:
      date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString();
};

const getExpiryStatus = (expiryDate: string): 'expired' | 'expiring-soon' | 'active' => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring-soon';
  return 'active';
};

export function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [newTracks, setNewTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<'renewal' | 'title' | 'genre' | 'bpm'>('renewal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [profile, setProfile] = useState<{ first_name?: string, email: string } | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalLicenses: 0,
    remainingLicenses: 0,
    membershipType: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    daysUntilReset: null
  });
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null);
  const [syncRequests, setSyncRequests] = useState<CustomSyncRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomSyncRequest | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedLicenseToDelete, setSelectedLicenseToDelete] = useState<License | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, email, membership_plan')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setUserStats(prev => ({
            ...prev,
            membershipType: profileData.membership_plan as UserStats['membershipType']
          }));
        }

        const { data: licensesData } = await supabase
          .from('sales')
          .select(`
            id,
            license_type,
            created_at,
            expiry_date,
            track:tracks (
              id,
              title,
              genres,
              bpm,
              audio_url,
              image_url,
              producer:profiles!producer_id (
                first_name,
                last_name,
                email
              )
            )
          `)
          .eq('buyer_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (licensesData) {
          const formattedLicenses = licensesData.map(license => ({
            ...license,
            expiry_date: license.expiry_date || calculateExpiryDate(license.created_at, profileData.membership_plan),
            track: {
              ...license.track,
              genres: license.track.genres.split(',').map((g: string) => g.trim()),
              image: license.track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'
            }
          }));
          setLicenses(formattedLicenses);
        }

        const { data: favoritesData } = await supabase
          .from('favorites')
          .select(`
            track_id,
            tracks (*)
          `)
          .eq('user_id', user.id);

        if (favoritesData) {
          const formattedFavorites = favoritesData.map(f => ({
            id: f.tracks.id,
            title: f.tracks.title,
            artist: f.tracks.artist,
            genres: f.tracks.genres.split(',').map((g: string) => g.trim()),
            moods: f.tracks.moods ? f.tracks.moods.split(',').map((m: string) => m.trim()) : [],
            duration: f.tracks.duration || '3:30',
            bpm: f.tracks.bpm,
            audioUrl: f.tracks.audio_url,
            image: f.tracks.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop',
            hasStingEnding: f.tracks.has_sting_ending,
            isOneStop: f.tracks.is_one_stop,
            mp3Url: f.tracks.mp3_url,
            trackoutsUrl: f.tracks.trackouts_url,
            hasVocals: f.tracks.has_vocals,
            vocalsUsageType: f.tracks.vocals_usage_type,
            subGenres: [],
            fileFormats: { stereoMp3: { format: [], url: '' }, stems: { format: [], url: '' }, stemsWithVocals: { format: [], url: '' } },
            pricing: { stereoMp3: 0, stems: 0, stemsWithVocals: 0 },
            leaseAgreementUrl: ''
          }));
          setFavorites(formattedFavorites);
        }

        const { data: newTracksData } = await supabase
          .from('tracks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (newTracksData) {
          const formattedNewTracks = newTracksData.map(track => ({
            ...track,
            genres: track.genres.split(',').map((g: string) => g.trim()),
            moods: track.moods ? track.moods.split(',').map((m: string) => m.trim()) : []
          }));
          setNewTracks(formattedNewTracks);
        }

        const { data: syncRequestsData } = await supabase
          .from('custom_sync_requests')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (syncRequestsData) {
          setSyncRequests(syncRequestsData);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleRemoveFavorite = async (trackId: string) => {
    if (!user) return;

    try {
      setRemovingFavorite(trackId);
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId);

      if (error) throw error;

      setFavorites(favorites.filter(track => track.id !== trackId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingFavorite(null);
    }
  };

  const handleLicenseClick = (trackId: string) => {
    if (!userStats.membershipType || userStats.membershipType === 'Single Track') {
      navigate('/pricing');
      return;
    }

    if (userStats.membershipType === 'Gold Access' && userStats.remainingLicenses <= 0) {
      navigate('/upgrade');
      return;
    }

    navigate(`/license/${trackId}`);
  };

  const handleUpdateRequest = async (requestId: string, updates: Partial<CustomSyncRequest>) => {
    try {
      const { error } = await supabase
        .from('custom_sync_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      setSyncRequests(requests =>
        requests.map(req =>
          req.id === requestId ? { ...req, ...updates } : req
        )
      );
    } catch (err) {
      console.error('Error updating request:', err);
      throw err;
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('custom_sync_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setSyncRequests(requests => requests.filter(req => req.id !== requestId));
    } catch (err) {
      console.error('Error deleting request:', err);
    }
  };

  const handleDeleteLicense = async () => {
    if (!selectedLicenseToDelete) return;

    const { error } = await supabase
      .from('sales')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', selectedLicenseToDelete.id);

    if (error) throw error;

    setLicenses(licenses.filter(l => l.id !== selectedLicenseToDelete.id));
  };

  const sortedAndFilteredLicenses = licenses
    .filter(license => !selectedGenre || license.track.genres.includes(selectedGenre))
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'renewal':
          return (new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()) * modifier;
        case 'title':
          return a.track.title.localeCompare(b.track.title) * modifier;
        default:
          return 0;
      }
    });

  const sortedAndFilteredFavorites = favorites
    .filter(track => !selectedGenre || track.genres.includes(selectedGenre))
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'title':
          return a.title.localeCompare(b.title) * modifier;
        case 'genre':
          return a.genres[0].localeCompare(b.genres[0]) * modifier;
        case 'bpm':
          return (a.bpm - b.bpm) * modifier;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-