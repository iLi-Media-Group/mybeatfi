{/* Modals and Dialogs */}
import React from 'react';

export function ClientDashboard() {
  return (
    <div>
      <ProducerProfile
        isOpen={showProfileDialog}
      />

      <EditTrackModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        track={selectedTrack}
        onUpdate={(updatedTrack) => {
          setTracks(tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t));
          setShowEditModal(false);
        }}
      />

      <DeleteTrackDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteTrack}
        trackTitle={selectedTrack?.title}
      />

      <TrackProposalsDialog
        isOpen={showTrackProposalsDialog}
        onClose={() => setShowTrackProposalsDialog(false)}
        track={selectedTrack}
      />

      <RevenueBreakdownDialog
        isOpen={showRevenueBreakdown}
        onClose={() => setShowRevenueBreakdown(false)}
        userId={user?.id}
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

      <ProposalConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => handleProposalStatusChange(confirmAction)}
        action={confirmAction}
        proposal={selectedProposal}
      />

      <ProposalDetailDialog
        isOpen={showProposalDetail}
        onClose={() => setShowProposalDetail(false)}
        proposal={selectedProposal}
        onAccept={handleProposalAccept}
      />

      <SyncProposalAcceptDialog
        isOpen={showProposalAccept}
        onClose={() => setShowProposalAccept(false)}
        proposal={selectedProposal}
        onComplete={handleProposalAcceptComplete}
      />
    </div>
  );
}
```

export { ClientDashboard }