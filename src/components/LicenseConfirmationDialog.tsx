import React from 'react';
import { CheckCircle, Download, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LicenseConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trackTitle: string;
  licenseType: string;
  licenseId: string;
}

export function LicenseConfirmationDialog({
  isOpen,
  onClose,
  trackTitle,
  licenseType,
  licenseId
}: LicenseConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-xl border border-green-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
            <h3 className="text-xl font-bold text-white">License Created!</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300">
            You have successfully licensed "{trackTitle}" under the {licenseType} plan.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to={`/license-agreement/${licenseId}`}
            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Download License Agreement
          </Link>

          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
