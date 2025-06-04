Here's the fixed version with all missing closing brackets added:

```javascript
                </div>
                {sortedAndFilteredFavorites.length === 0 ? (
                  <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No favorite tracks yet</p>
                    <Link
                      to="/catalog"
                      className="inline-block mt-4 text-purple-400 hover:text-purple-300"
                    >
                      Browse the catalog
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
                            <h4 className="text-lg font-semibold text-white mb-1">{track.title}</h4>
                            <p className="text-sm text-gray-400">{track.genres.join(', ')} • {track.bpm} BPM</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleLicenseClick(track)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                              License
                            </button>
                            <button
                              onClick={() => handleRemoveFavorite(track.id)}
                              disabled={removingFavorite === track.id}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                            >
                              {removingFavorite === track.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <FileMusic className="w-5 h-5 mr-2 text-purple-400" />
                  New Releases
                </h3>
                {newTracks.length === 0 ? (
                  <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No new tracks available</p>
                  </div>
                ) : (
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
                            <h4 className="text-lg font-semibold text-white mb-1">{track.title}</h4>
                            <p className="text-sm text-gray-400">{track.genres.join(', ')} • {track.bpm} BPM</p>
                          </div>
                          <button
                            onClick={() => handleLicenseClick(track)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                          >
                            License
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showProfileDialog && (
          <ClientProfile onClose={() => setShowProfileDialog(false)} />
        )}

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
    </div>
  );
}
```