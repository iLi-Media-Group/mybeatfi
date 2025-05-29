Here's the fixed version with all closing brackets added:

```javascript
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
```