import { useNavigate } from 'react-router-dom';
import { DollarSign, Music, X } from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import LicenseDialog from '@/components/LicenseDialog';
import SyncProposalDialog from '@/components/SyncProposalDialog';
import ClientProfile from '@/components/ClientProfile';
import EditRequestDialog from '@/components/EditRequestDialog';
import DeleteLicenseDialog from '@/components/DeleteLicenseDialog';
import LicenseActionButton from '@/components/LicenseActionButton';

export default function Dashboard() {
  // ...state, hooks, functions defined above (not shown for brevity)

  return (
    <div className="py-8">
      {/* ...other components and elements above */}

      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Music className="w-5 h-5 mr-2 text-purple-500" />
          Favorites
        </h3>
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="text-center py-6 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
              <p className="text-gray-400">You haven’t favorited any tracks yet</p>
            </div>
          ) : (
            favorites.map((track) => (
              <div key={track.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center space-x-4">
                  <img
                    src={track.image}
                    alt={track.title}
                    className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                    onClick={() => navigate(`/track/${track.id}`)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <button 
                        onClick={() => navigate(`/track/${track.id}`)}
                        className="text-white font-medium hover:text-blue-400 transition-colors truncate text-left"
                      >
                        {track.title}
                      </button>
                      <button
                        onClick={() => handleRemoveFavorite(track.id)}
                        disabled={removingFavorite === track.id}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        aria-label="Remove from favorites"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      {track.genres.join(', ')} • {track.bpm} BPM
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <AudioPlayer url={track.audioUrl} title={track.title} />
                      <LicenseActionButton
                        track={track}
                        onLicenseClick={() => handleLicenseClick(track)}
                        onSubmitProposalClick={() => {
                          setSelectedTrackToLicense(track);
                          setShowProposalDialog(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Music className="w-5 h-5 mr-2 text-purple-500" />
          New Releases
        </h3>
        <div className="space-y-4">
          {newTracks.length === 0 ? (
            <div className="text-center py-6 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
              <p className="text-gray-400">No new tracks available</p>
            </div>
          ) : (
            newTracks.map((track) => (
              <div key={track.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center space-x-4">
                  <img
                    src={track.image}
                    alt={track.title}
                    className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                    onClick={() => navigate(`/track/${track.id}`)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => navigate(`/track/${track.id}`)}
                        className="text-white font-medium hover:text-blue-400 transition-colors truncate text-left"
                      >
                        {track.title}
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      {track.genres.join(', ')} • {track.bpm} BPM
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <AudioPlayer url={track.audioUrl} title={track.title} />
                      <LicenseActionButton
                        track={track}
                        onLicenseClick={() => handleLicenseClick(track)}
                        onSubmitProposalClick={() => {
                          setSelectedTrackToLicense(track);
                          setShowProposalDialog(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialogs */}
      {selectedRequest && showEditDialog && (
        <EditRequestDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onSave={(updates) => handleUpdateRequest(selectedRequest.id, updates)}
        />
      )}

      {selectedLicenseToDelete && (
        <DeleteLicenseDialog
          isOpen={true}
          onClose={() => setSelectedLicenseToDelete(null)}
          license={selectedLicenseToDelete}
          onConfirm={handleDeleteLicense}
        />
      )}

      <ClientProfile
        isOpen={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
      />

      {selectedTrackToLicense && showLicenseDialog && (
        <LicenseDialog
          isOpen={showLicenseDialog}
          onClose={() => {
            setShowLicenseDialog(false);
            setSelectedTrackToLicense(null);
          }}
          track={selectedTrackToLicense}
          membershipType={userStats.membershipType || 'Single Track'}
          remainingLicenses={userStats.remainingLicenses}
          onLicenseCreated={() => {
            if (user) {
              setLoading(true);
              const fetchData = async () => {
                try {
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
                      expiry_date: license.expiry_date || calculateExpiryDate(license.created_at, userStats.membershipType || 'Single Track'),
                      track: {
                        ...license.track,
                        genres: license.track.genres.split(',').map((g: string) => g.trim()),
                        image: license.track.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop'
                      }
                    }));
                    setLicenses(formattedLicenses);
                  }

                  if (userStats.membershipType === 'Gold Access') {
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);

                    const { count } = await supabase
                      .from('sales')
                      .select('id', { count: 'exact' })
                      .eq('buyer_id', user.id)
                      .gte('created_at', startOfMonth.toISOString());

                    const totalLicenses = count || 0;
                    const remainingLicenses = 10 - totalLicenses;

                    setUserStats(prev => ({
                      ...prev,
                      totalLicenses,
                      remainingLicenses
                    }));
                  }
                } catch (err) {
                  console.error('Error refreshing licenses:', err);
                } finally {
                  setLoading(false);
                }
              };
              fetchData();
            }
          }}
        />
      )}

      {selectedTrackToLicense && showProposalDialog && (
        <SyncProposalDialog
          isOpen={showProposalDialog}
          onClose={() => {
            setShowProposalDialog(false);
            setSelectedTrackToLicense(null);
          }}
          track={selectedTrackToLicense}
        />
      )}
    </div>
  );
}
