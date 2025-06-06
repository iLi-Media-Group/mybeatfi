Here's the fixed version with all missing closing brackets added:

```javascript
                  <p className="mt-1 text-sm text-gray-400">
                    Get started by uploading your first track
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowUploadForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Track
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20">
            <div className="px-6 py-4 border-b border-blue-500/20">
              <h3 className="text-lg font-medium text-white">Sync Proposals</h3>
            </div>
            <div className="p-6">
              {proposals.length > 0 ? (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <div key={proposal.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-white font-medium">{proposal.track?.title}</h4>
                          <p className="text-sm text-gray-400">{proposal.client?.full_name}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm ${getStatusColor(proposal.status)}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(proposal.status)}
                            <span>{proposal.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => handleViewProposalDetails(proposal)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-white">No proposals yet</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Proposals from clients will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals and Dialogs */}
        {showUploadForm && (
          <TrackUploadForm onClose={() => setShowUploadForm(false)} onUploadComplete={fetchDashboardData} />
        )}

        {showEditModal && selectedTrack && (
          <EditTrackModal
            track={selectedTrack}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTrack(null);
            }}
            onUpdate={fetchDashboardData}
          />
        )}

        {showDeleteDialog && selectedTrack && (
          <DeleteTrackDialog
            track={selectedTrack}
            onClose={() => {
              setShowDeleteDialog(false);
              setSelectedTrack(null);
            }}
            onConfirm={confirmDeleteTrack}
          />
        )}

        {showTrackProposalsDialog && selectedTrack && (
          <TrackProposalsDialog
            track={selectedTrack}
            onClose={() => {
              setShowTrackProposalsDialog(false);
              setSelectedTrack(null);
            }}
          />
        )}

        {showProfileDialog && (
          <ProducerProfile
            onClose={() => setShowProfileDialog(false)}
            onUpdate={fetchDashboardData}
          />
        )}

        {showRevenueBreakdown && (
          <RevenueBreakdownDialog
            onClose={() => setShowRevenueBreakdown(false)}
            stats={stats}
          />
        )}

        {showNegotiationDialog && selectedProposal && (
          <ProposalNegotiationDialog
            proposal={selectedProposal}
            onClose={() => {
              setShowNegotiationDialog(false);
              setSelectedProposal(null);
            }}
            onUpdate={fetchDashboardData}
          />
        )}

        {showHistoryDialog && selectedProposal && (
          <ProposalHistoryDialog
            proposal={selectedProposal}
            onClose={() => {
              setShowHistoryDialog(false);
              setSelectedProposal(null);
            }}
          />
        )}

        {showConfirmDialog && selectedProposal && (
          <ProposalConfirmDialog
            proposal={selectedProposal}
            action={confirmAction}
            onClose={() => {
              setShowConfirmDialog(false);
              setSelectedProposal(null);
            }}
            onConfirm={() => handleProposalStatusChange(confirmAction)}
          />
        )}

        {selectedProposalForDetails && (
          <ProposalDetailDialog
            proposal={selectedProposalForDetails}
            onClose={() => setSelectedProposalForDetails(null)}
          />
        )}
      </div>
    </div>
  );
}
```