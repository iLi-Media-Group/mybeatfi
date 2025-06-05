export function ClientDashboard() {
  // ... [all existing code remains the same until the last few lines]

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