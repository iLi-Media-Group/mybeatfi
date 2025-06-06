Here's the fixed version with all closing brackets added:

```javascript
<DollarSign className="w-5 h-5 mr-2" />
              View All Sales
            </Link>
          </div>
        </div>

        {showProfileDialog && (
          <ProducerProfile
            onClose={() => setShowProfileDialog(false)}
            onUpdate={() => fetchDashboardData()}
          />
        )}

        {showEditModal && selectedTrack && (
          <EditTrackModal
            track={selectedTrack}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTrack(null);
            }}
            onUpdate={(updatedTrack) => {
              setTracks(tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t));
              setShowEditModal(false);
              setSelectedTrack(null);
            }}
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

        {showRevenueBreakdown && (
          <RevenueBreakdownDialog
            stats={stats}
            onClose={() => setShowRevenueBreakdown(false)}
          />
        )}

        {showNegotiationDialog && selectedProposal && (
          <ProposalNegotiationDialog
            proposal={selectedProposal}
            onClose={() => {
              setShowNegotiationDialog(false);
              setSelectedProposal(null);
            }}
            onUpdate={(updatedProposal) => {
              setProposals(proposals.map(p => p.id === updatedProposal.id ? updatedProposal : p));
              setShowNegotiationDialog(false);
              setSelectedProposal(null);
            }}
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
      </div>
    </div>
  );
}
```