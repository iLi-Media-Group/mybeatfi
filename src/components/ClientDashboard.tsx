                </div>
              </div>

              {sortedAndFilteredFavorites.length === 0 ? (
                <div className="text-center py-8 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
                  <Star className="w-8 h-8 text-gray-400 mx-auto mb-2" />
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
                          <h4 className="text-white font-semibold truncate">{track.title}</h4>
                          <p className="text-sm text-gray-400">{track.genres.join(', ')}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLicenseClick(track)}
                            className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <FileMusic className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveFavorite(track.id)}
                            disabled={removingFavorite === track.id}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
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
                <Layers className="w-5 h-5 mr-2" />
                New Releases
              </h3>
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
                        <h4 className="text-white font-semibold truncate">{track.title}</h4>
                        <p className="text-sm text-gray-400">
                          {track.genres.join(', ')} • {track.bpm} BPM
                        </p>
                      </div>
                      <AudioPlayer url={track.audioUrl} title={track.title} />
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

      {showProposalDialog && selectedRequest && (
        <SyncProposalDialog
          request={selectedRequest}
          onClose={() => {
            setShowProposalDialog(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

                  