import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DollarSign, Star, X, Loader2 } from 'lucide-react';
import { ClientProfile } from './ClientProfile';
import LicenseDialog from './LicenseDialog';
import SyncProposalDialog from './SyncProposalDialog';
import EditRequestDialog from './EditRequestDialog';
import DeleteLicenseDialog from './DeleteLicenseDialog';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [newTracks, setNewTracks] = useState([]);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [selectedTrackToLicense, setSelectedTrackToLicense] = useState(null);
  const [selectedLicenseToDelete, setSelectedLicenseToDelete] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [removingFavorite, setRemovingFavorite] = useState(null);

  useEffect(() => {
    if (user) {
      fetchLicenses();
      fetchFavorites();
      fetchNewTracks();
    }
  }, [user]);

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, tracks(*)')
        .eq('buyer_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenses(data);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, tracks(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data.map(f => f.tracks));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchNewTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setNewTracks(data);
    } catch (error) {
      console.error('Error fetching new tracks:', error);
    }
  };

  const handleLicenseClick = (track) => {
    setSelectedTrackToLicense(track);
    setShowLicenseDialog(true);
  };

  const handleRemoveFavorite = async (trackId) => {
    try {
      setRemovingFavorite(trackId);
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('track_id', trackId)
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(favorites.filter(f => f.id !== trackId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingFavorite(null);
    }
  };

  const handleUpdateRequest = async (updatedRequest) => {
    try {
      const { error } = await supabase
        .from('custom_sync_requests')
        .update(updatedRequest)
        .eq('id', updatedRequest.id);

      if (error) throw error;
      // Refresh data after update
      fetchLicenses();
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const handleDeleteLicense = async (licenseId) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', licenseId);

      if (error) throw error;
      setLicenses(licenses.filter(l => l.id !== licenseId));
      setSelectedLicenseToDelete(null);
    } catch (error) {
      console.error('Error deleting license:', error);
    }
  };

  const sortedAndFilteredFavorites = favorites
    .filter(track => track && track.id) // Filter out any null or invalid tracks
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">My Licenses</h2>
            {licenses.length === 0 ? (
              <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No licenses yet</p>
                <Link
                  to="/catalog"
                  className="inline-block mt-4 text-purple-400 hover:text-purple-300"
                >
                  Browse Catalog
                </Link>
              </div>
            ) : (
              licenses.map((license) => {
                const expiryDate = new Date(license.expiry_date);
                const now = new Date();
                const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                const expiryStatus = daysUntilExpiry <= 0 ? 'expired' :
                                   daysUntilExpiry <= 30 ? 'expiring-soon' : 'active';

                return (
                  <div
                    key={license.id}
                    className="bg-white/5 backdrop-blur-sm rounded-lg p-4 mb-4 border border-purple-500/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <img
                          src={license.tracks?.image_url || '/default-track-image.jpg'}
                          alt={license.tracks?.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {license.tracks?.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {license.license_type} License
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-sm text-gray-400">
                              Expires: {new Date(license.expiry_date).toLocaleDateString()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              expiryStatus === 'expired' ? 'bg-red-500/20 text-red-400' :
                              expiryStatus === 'expiring-soon' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {expiryStatus === 'expired' ? 'Expired' :
                               expiryStatus === 'expiring-soon' ? 'Expiring Soon' :
                               'Active'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Favorites</h2>
              {sortedAndFilteredFavorites.length === 0 ? (
                <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No favorites yet</p>
                  <Link
                    to="/catalog"
                    className="inline-block mt-4 text-purple-400 hover:text-purple-300"
                  >
                    Browse Catalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedAndFilteredFavorites.map((track) => (
                    <div
                      key={track.id}
                      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                    >
                      <div className="flex items-start space-x-4">
                        <img
                          src={track.image}
                          alt={track.title}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white mb-1">{track.title}</h3>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleLicenseClick(track)}
                                className="p-1.5 text-gray-400 hover:text-green-400 transition-colors rounded-lg hover:bg-green-400/10"
                                title="License Track"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveFavorite(track.id)}
                                disabled={removingFavorite === track.id}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                                title="Remove from Favorites"
                              >
                                {removingFavorite === track.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400">{track.genres.join(', ')} • {track.bpm} BPM</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-6">New Releases</h2>
              <div className="space-y-4">
                {newTracks.map((track) => (
                  <div
                    key={track.id}
                    className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={track.image}
                        alt={track.title}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white mb-1">{track.title}</h3>
                          <button
                            onClick={() => handleLicenseClick(track)}
                            className="p-1.5 text-gray-400 hover:text-green-400 transition-colors rounded-lg hover:bg-green-400/10"
                            title="License Track"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-400">{track.genres.join(', ')} • {track.bpm} BPM</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditDialog && selectedRequest && (
        <EditRequestDialog
          request={selectedRequest}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedRequest(null);
          }}
          onUpdate={handleUpdateRequest}
        />
      )}

      {showProfileDialog && (
        <ClientProfile
          onClose={() => setShowProfileDialog(false)}
        />
      )}

      {selectedLicenseToDelete && (
        <DeleteLicenseDialog
          license={selectedLicenseToDelete}
          onClose={() => setSelectedLicenseToDelete(null)}
          onConfirm={handleDeleteLicense}
        />
      )}

      {showLicenseDialog && selectedTrackToLicense && (
        <LicenseDialog
          track={selectedTrackToLicense}
          onClose={() => {
            setShowLicenseDialog(false);
            setSelectedTrackToLicense(null);
          }}
        />
      )}

      {showProposalDialog && selectedTrackToLicense && (
        <SyncProposalDialog
          track={selectedTrackToLicense}
          onClose={() => {
            setShowProposalDialog(false);
            setSelectedTrackToLicense(null);
          }}
        />
      )}
    </div>
  );
}

export { ClientDashboard }