import React, { useState } from 'react';
import { X, FileText, DollarSign, AlertTriangle, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { supabase } from '../lib/supabase';

interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
  membershipType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  remainingLicenses: number;
}

interface LicenseTerms {
  duration: string;
  usageRights: string[];
  restrictions: string[];
  creditRequired: boolean;
}

interface ProfileUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (firstName: string, lastName: string, email: string) => void;
}

function ProfileUpdateDialog({ isOpen, onClose, onSubmit }: ProfileUpdateDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('All fields are required');
      return;
    }
    onSubmit(firstName, lastName, email);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <h3 className="text-xl font-bold text-white mb-4">Complete Your Profile</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Last Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Save & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const LICENSE_TERMS: Record<string, LicenseTerms> = {
  'Single Track': {
    duration: '1 year',
    usageRights: [
      'Online content (social media, websites, podcasts)',
      'Single commercial project',
      'Worldwide distribution rights',
      'Monetization allowed'
    ],
    restrictions: [
      'Cannot resell or redistribute the track',
      'Cannot claim ownership of the music',
      'Cannot use in multiple projects'
    ],
    creditRequired: true
  },
  'Gold Access': {
    duration: '1 year',
    usageRights: [
      'Online content (social media, websites, podcasts)',
      'Multiple commercial projects',
      'Worldwide distribution rights',
      'Monetization allowed',
      'Priority support'
    ],
    restrictions: [
      'Cannot resell or redistribute tracks',
      'Cannot claim ownership of the music'
    ],
    creditRequired: false
  },
  'Platinum Access': {
    duration: '3 years',
    usageRights: [
      'All online and offline media',
      'Unlimited commercial projects',
      'Worldwide distribution rights',
      'Monetization allowed',
      'Priority support',
      'Extended usage rights'
    ],
    restrictions: [
      'Cannot resell or redistribute tracks',
      'Cannot claim ownership of the music'
    ],
    creditRequired: false
  },
  'Ultimate Access': {
    duration: 'Perpetual',
    usageRights: [
      'All online and offline media',
      'Unlimited commercial projects',
      'Worldwide distribution rights',
      'Monetization allowed',
      'Priority support',
      'Extended usage rights',
      'Perpetual license'
    ],
    restrictions: [
      'Cannot resell or redistribute tracks',
      'Cannot claim ownership of the music'
    ],
    creditRequired: false
  }
};

const calculateExpiryDate = (membershipType: string): Date => {
  const now = new Date();
  switch (membershipType) {
    case 'Ultimate Access':
      now.setFullYear(now.getFullYear() + 100); // Effectively perpetual
      break;
    case 'Platinum Access':
      now.setFullYear(now.getFullYear() + 3);
      break;
    default: // Single Track and Gold Access
      now.setFullYear(now.getFullYear() + 1);
  }
  return now;
};

export function LicenseDialog({ isOpen, onClose, track, membershipType, remainingLicenses }: LicenseDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'terms' | 'confirm' | 'profile'>('terms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  const terms = LICENSE_TERMS[membershipType];
  const expirationDate = calculateExpiryDate(membershipType);

  const handleProfileUpdate = async (firstName: string, lastName: string, email: string) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfile({ firstName, lastName, email });
      setStep('confirm');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };

  const handleLicense = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      // Check if profile is complete
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData.first_name || !profileData.last_name || !profileData.email) {
        setStep('profile');
        return;
      }

      // Create license record with simulated payment
      const { data: license, error: licenseError } = await supabase
        .from('sales')
        .insert({
          track_id: track.id,
          buyer_id: user.id,
          license_type: membershipType,
          amount: 0, // Free with membership
          payment_method: 'membership_included', // Simulated payment
          expiry_date: expirationDate.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (licenseError) throw licenseError;

      // Send email notification
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-license-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientName: `${profileData.first_name} ${profileData.last_name}`,
          clientEmail: profileData.email,
          trackTitle: track.title,
          licenseTier: membershipType,
          licenseDate: new Date().toISOString(),
          expirationDate: expirationDate.toISOString()
        })
      });

      // Redirect to license agreement page
      window.location.href = `/license-agreement/${license.id}`;
      onClose();
    } catch (err) {
      console.error('Error creating license:', err);
      setError(err instanceof Error ? err.message : 'Failed to create license');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  if (membershipType === 'Gold Access' && remainingLicenses <= 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-purple-500/20 w-full max-w-md">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-4">
              No Licenses Remaining
            </h3>
            <p className="text-gray-300 mb-6">
              You've used all your licenses for this month. Upgrade to Platinum Access for unlimited licenses!
            </p>
            <button
              onClick={() => window.location.href = '/upgrade'}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <ProfileUpdateDialog
        isOpen={true}
        onClose={onClose}
        onSubmit={handleProfileUpdate}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-xl border border-purple-500/20 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">License Agreement</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {step === 'terms' ? (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">License Terms</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-gray-400 mb-2">Duration: {terms.duration}</p>
                  <p className="text-gray-400">
                    Expiration: {expirationDate.toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">Usage Rights:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {terms.usageRights.map((right, index) => (
                      <li key={index} className="text-gray-300">{right}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">Restrictions:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {terms.restrictions.map((restriction, index) => (
                      <li key={index} className="text-gray-300">{restriction}</li>
                    ))}
                  </ul>
                </div>

                {terms.creditRequired && (
                  <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-400">
                      Credit Required: Please credit the track as "Music by {track.artist}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-6">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-300">
                I have read and agree to these license terms
              </span>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!acceptedTerms}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <FileText className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Confirm License
              </h3>
              <p className="text-gray-300">
                You are about to license "{track.title}" under the {membershipType} plan.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-center">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setStep('terms')}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleLicense}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                {loading ? 'Processing...' : 'Complete License'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}