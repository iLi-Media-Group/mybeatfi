import { AlertCircle, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { EditRequestDialog } from './EditRequestDialog';
import { ClientProfile } from './ClientProfile';
import { DeleteLicenseDialog } from './DeleteLicenseDialog';

export default function ClientDashboard({ loading, error, profile, userStats }) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedLicenseToDelete, setSelectedLicenseToDelete] = useState(null);

  const handleUpdateRequest = async (id, updates) => {
    // Implementation would go here
  };

  const handleDeleteLicense = async () => {
    // Implementation would go here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-white text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="text-white text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Content sections would go here */}
      </div>
      
      {showEditDialog && selectedRequest && (
        <EditRequestDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          request={selectedRequest}
          onSave={(updates) => handleUpdateRequest(selectedRequest.id, updates)}
        />
      )}

      {showProfileDialog && (
        <ClientProfile
          isOpen={showProfileDialog}
          onClose={() => setShowProfileDialog(false)}
          profile={profile}
          stats={userStats}
        />
      )}

      {selectedLicenseToDelete && (
        <DeleteLicenseDialog
          isOpen={!!selectedLicenseToDelete}
          onClose={() => setSelectedLicenseToDelete(null)}
          license={selectedLicenseToDelete}
          onConfirm={handleDeleteLicense}
        />
      )}
    </div>
  );
}