import React, { useState, useEffect } from 'react';
import { X, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Track } from '../types';
import { LicenseTermsSummary } from './LicenseTermsSummary';
import { sendLicenseEmail } from '../lib/email';
import { LicenseConfirmationDialog } from './LicenseConfirmationDialog';
import { CryptoPaymentButton } from './CryptoPaymentButton';

// ... (rest of the imports and interface remain the same)

export function LicenseDialog({
  isOpen,
  onClose,
  track,
  membershipType,
  remainingLicenses,
  onLicenseCreated
}: LicenseDialogProps) {
  // ... (existing state and logic remain the same)

  // License Limit Reached Dialog
  if (!isOpen) return null;
  if (membershipType === 'Gold Access' && remainingLicenses <= 0) {
    return (
      <div className="fixed inset-0 bg-black backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
          <h3 className="text-xl font-bold text-white mb-4">License Limit Reached</h3>
          <p className="text-gray-300 mb-6">
            You've used all your available licenses under the Gold Access plan.
            Upgrade to Platinum Access for unlimited licensing!
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <a
              href="/upgrade"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Upgrade Now
            </a>
            
            {/* Crypto Payment Option */}
            {membershipType === 'Single Track' && (
              <div className="mt-4">
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-600"></div>
                  <span className="flex-shrink mx-4 text-gray-400">or</span>
                  <div className="flex-grow border-t border-gray-600"></div>
                </div>
                
                <CryptoPaymentButton
                  productId={track.id}
                  productName={`License for ${track.title}`}
                  productDescription={`Single Track License for ${track.title}`}
                  price={9.99}
                  disabled={loading}
                  metadata={{
                    track_id: track.id,
                    license_type: 'Single Track'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-gray-900 p-6 rounded-xl border border-purple-500/20 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
          {/* Rest of the component remains the same */}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && createdLicenseId && (
        <LicenseConfirmationDialog
          isOpen={true}
          onClose={() => {
            setShowConfirmation(false);
            onClose();
          }}
          trackTitle={track.title}
          licenseType={membershipType}
          licenseId={createdLicenseId}
        />
      )}
    </>
  );
}
