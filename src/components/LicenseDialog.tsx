import React, { useState, useEffect } from 'react';
import { X, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Track } from '../types';
import { LicenseTermsSummary } from './LicenseTermsSummary';
import { sendLicenseEmail } from '../lib/email';
import { LicenseConfirmationDialog } from './LicenseConfirmationDialog';

interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
  membershipType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  remainingLicenses: number;
  onLicenseCreated?: () => void;
}

interface ProfileInfo {
  first_name: string;
  last_name: string;
  email: string;
}

const getExpirationDate = (licenseType: string, purchaseDate: string): string => {
  const purchase = new Date(purchaseDate);

  switch (licenseType) {
    case 'Ultimate Access':
      return 'Perpetual (No Expiration)';
    case 'Platinum Access':
      purchase.setFullYear(purchase.getFullYear() + 3); // 3 years
      break;
    case 'Gold Access':
    case 'Single Track':
    default:
      purchase.setFullYear(purchase.getFullYear() + 1); // 1 year
  }

  return purchase.toLocaleDateString();
};

export function LicenseDialog({
  isOpen,
  onClose,
  track,
  membershipType,
  remainingLicenses,
  onLicenseCreated
}: LicenseDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'terms' | 'profile' | 'confirm'>('terms');
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdLicenseId, setCreatedLicenseId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setEmail(data.email || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim()
      });
      setStep('confirm');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLicense = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      setError('');

      const purchaseDate = new Date().toISOString();

      // Create license record
      const { data: license, error: licenseError } = await supabase
        .from('sales')
        .insert({
          track_id: track.id,
          buyer_id: user.id,
          license_type: membershipType,
          amount: 0,
          payment_method: 'subscription',
          created_at: purchaseDate,
          licensee_info: {
            name: `${profile.first_name} ${profile.last_name}`,
            email: profile.email
          }
        })
        .select()
        .single();

      if (licenseError) throw licenseError;

      setCreatedLicenseId(license.id);
      setShowConfirmation(true);
      
      // Call the callback if provided
      if (onLicenseCreated) {
        onLicenseCreated();
      }
    } catch (err) {
      console.error('Error creating license:', err);
      setError('Failed to create license');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Check if user has available licenses
  if (membershipType === 'Gold Access' && remainingLicenses <= 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
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
          </div>
        </div>
      </div>
    );
  }

  const purchaseDate = new Date().toISOString();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">License Track</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          )}

          {step === 'terms' && (
            <LicenseTermsSummary
              licenseType={membershipType}
              onAccept={() => {
                if (!profile?.first_name || !profile?.last_name || !profile?.email) {
                  setStep('profile');
                } else {
                  setStep('confirm');
                }
              }}
            />
          )}

          {step === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 'confirm' && profile && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">License Summary</h4>
                <div className="space-y-3">
                  <p className="text-gray-300">
                    <span className="font-medium text-white">Track:</span> {track.title}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium text-white">License Type:</span> {membershipType}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium text-white">Purchase Date:</span>{' '}
                    {new Date(purchaseDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium text-white">Expiration Date:</span>{' '}
                    {getExpirationDate(membershipType, purchaseDate)}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium text-white">Licensee:</span>{' '}
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-gray-300">
                    <span className="font-medium text-white">Email:</span> {profile.email}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLicense}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      Confirm & License
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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