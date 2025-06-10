import React, { useState } from 'react';
import { DeleteTrackDialog } from './DeleteTrackDialog';
import { TrackProposalsDialog } from './TrackProposalsDialog';
import { RevenueBreakdownDialog } from './RevenueBreakdownDialog';
import { ProposalNegotiationDialog } from './ProposalNegotiationDialog';
import { ProposalHistoryDialog } from './ProposalHistoryDialog';
import { ProposalConfirmDialog } from './ProposalConfirmDialog';

interface ProducerDashboardProps {
  user?: {
    id: string;
  };
}

export const ProducerDashboard: React.FC<ProducerDashboardProps> = ({ user }) => {
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTrackProposalsDialog, setShowTrackProposalsDialog] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string>('');

  const confirmDeleteTrack = async () => {
    // Implementation for delete track
  };

  const fetchDashboardData = async () => {
    // Implementation for fetching dashboard data
  };

  const handleProposalStatusChange = async () => {
    // Implementation for handling proposal status change
  };

  return (
    <>
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
    </>
  );
};