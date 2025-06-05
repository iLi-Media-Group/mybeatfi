{selectedTrack && showDeleteDialog && (
  <DeleteTrackDialog
    isOpen={showDeleteDialog}
    onClose={() => {
      setShowDeleteDialog(false);
      setSelectedTrack(null);
    }}
    trackTitle={selectedTrack.title}
    onConfirm={confirmDeleteTrack}
  />
)}

{selectedTrack && showTrackProposalsDialog && (
  <TrackProposalsDialog
    isOpen={showTrackProposalsDialog}
    onClose={() => {
      setShowTrackProposalsDialog(false);
      setSelectedTrack(null);
    }}
    track={selectedTrack}
  />
)}

{showRevenueBreakdown && (
  <RevenueBreakdownDialog
    isOpen={showRevenueBreakdown}
    onClose={() => setShowRevenueBreakdown(false)}
    userId={user?.id}
  />
)}

{selectedProposal && showNegotiationDialog && (
  <ProposalNegotiationDialog
    isOpen={showNegotiationDialog}
    onClose={() => {
      setShowNegotiationDialog(false);
      setSelectedProposal(null);
    }}
    proposal={selectedProposal}
    onUpdate={fetchDashboardData}
  />
)}

{selectedProposal && showHistoryDialog && (
  <ProposalHistoryDialog
    isOpen={showHistoryDialog}
    onClose={() => {
      setShowHistoryDialog(false);
      setSelectedProposal(null);
    }}
    proposalId={selectedProposal.id}
  />
)}

{selectedProposal && showConfirmDialog && (
  <ProposalConfirmDialog
    isOpen={showConfirmDialog}
    onClose={() => {
      setShowConfirmDialog(false);
      setSelectedProposal(null);
    }}
    action={confirmAction}
    proposal={selectedProposal}
    onConfirm={handleProposalStatusChange}
  />
)}