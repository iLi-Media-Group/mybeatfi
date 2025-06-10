import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Trash2, Tag, Hash, Layers, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { DeleteLicenseDialog } from './DeleteLicenseDialog';

interface License {
  id: string;
  track_id: string;
  license_type: string;
  amount: number;
  created_at: string;
  expiry_date: string;
  track: {
    id: string;
    title: string;
    artist: string;
    genres: string[];
    bpm: number;
    audio_url: string;
    image_url: string;
  };
}

export function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [selectedLicenseToDelete, setSelectedLicenseToDelete] = useState<License | null>(null);

  useEffect(() => {
    if (user) {
      fetchLicenses();
    }
  }, [user]);

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          track_id,
          license_type,
          amount,
          created_at,
          expiry_date,
          tracks:track_id (
            id,
            title,
            artist,
            genres,
            bpm,
            audio_url,
            image_url
          )
        `)
        .eq('buyer_id', user?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedLicenses = data?.map(license => ({
        id: license.id,
        track_id: license.track_id,
        license_type: license.license_type,
        amount: license.amount,
        created_at: license.created_at,
        expiry_date: license.expiry_date,
        track: {
          id: license.tracks.id,
          title: license.tracks.title,
          artist: license.tracks.artist,
          genres: license.tracks.genres || [],
          bpm: license.tracks.bpm,
          audio_url: license.tracks.audio_url,
          image_url: license.tracks.image_url
        }
      })) || [];

      setLicenses(formattedLicenses);
    } catch (error) {
      console.error('Error fetching licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewLicenseAgreement = async (licenseId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('handle-license-agreement', {
        body: { licenseId }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing license agreement:', error);
    }
  };

  const handleDeleteLicense = async (licenseId: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', licenseId);

      if (error) throw error;

      setLicenses(licenses.filter(license => license.id !== licenseId));
      setSelectedLicenseToDelete(null);
    } catch (error) {
      console.error('Error deleting license:', error);
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring-soon';
    return 'active';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading your licenses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Licenses</h1>
          <p className="text-gray-400">Manage your purchased track licenses</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Licensed Tracks ({licenses.length})</h2>
            <button
              onClick={() => navigate('/catalog')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Browse More Tracks
            </button>
          </div>

          <div className="space-y-4">
            {licenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No licenses found</p>
                  <p className="text-sm">Purchase your first track to get started</p>
                </div>
                <button
                  onClick={() => navigate('/catalog')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              licenses.map((license) => {
                const expiryStatus = getExpiryStatus(license.expiry_date);
                
                return (
                  <div key={license.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-600 rounded-lg flex-shrink-0 overflow-hidden">
                        {license.track.image_url ? (
                          <img
                            src={license.track.image_url}
                            alt={license.track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <button
                              onClick={() => navigate(`/track/${license.track.id}`)}
                              className="text-lg font-semibold text-white hover:text-blue-400 transition-colors text-left"
                            >
                              {license.track.title}
                            </button>
                            <div className="flex items-center space-x-2 mt-2 md:mt-0">
                              <button
                                onClick={() => handleViewLicenseAgreement(license.id)}
                                className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View Agreement
                              </button>
                              <button
                                onClick={() => setSelectedLicenseToDelete(license)}
                                className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                            <span className="flex items-center">
                              <Tag className="w-4 h-4 mr-1" />
                              {license.track.genres.join(', ')}
                            </span>
                            <span className="flex items-center">
                              <Hash className="w-4 h-4 mr-1" />
                              {license.track.bpm} BPM
                            </span>
                            <span className="flex items-center">
                              <Layers className="w-4 h-4 mr-1" />
                              {license.license_type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                expiryStatus === 'expired' ? 'bg-red-500/20 text-red-400' :
                                expiryStatus === 'expiring-soon' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {expiryStatus === 'expired' ? 'Expired' :
                                 expiryStatus === 'expiring-soon' ? 'Expiring Soon' :
                                 'Active'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {expiryStatus === 'expired' ? 'Expired' : 'Expires'}: {new Date(license.expiry_date).toLocaleDateString()}
                              </span>
                            </div>
                            {license.track.audio_url && (
                              <AudioPlayer
                                src={license.track.audio_url}
                                isPlaying={currentlyPlaying === license.track.id}
                                onToggle={() => {
                                  if (currentlyPlaying === license.track.id) {
                                    setCurrentlyPlaying(null);
                                  } else {
                                    setCurrentlyPlaying(license.track.id);
                                  }
                                }}
                                size="sm"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedLicenseToDelete && (
        <DeleteLicenseDialog
          license={selectedLicenseToDelete}
          onConfirm={() => handleDeleteLicense(selectedLicenseToDelete.id)}
          onCancel={() => setSelectedLicenseToDelete(null)}
        />
      )}
    </div>
  );
}