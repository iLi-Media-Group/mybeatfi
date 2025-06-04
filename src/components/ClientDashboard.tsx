Here's the fixed script with all missing closing brackets added:

```javascript
                              {new Date(license.expiry_date).toLocaleDateString()}
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
```