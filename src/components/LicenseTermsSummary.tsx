import React, { useState } from 'react';
import { Info, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../lib/stripe';
import { PRODUCTS } from '../stripe-config';

interface LicenseTermsSummaryProps {
  licenseType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  onAccept: () => void;
  trackId?: string;
}

export function LicenseTermsSummary({ licenseType, onAccept, trackId }: LicenseTermsSummaryProps) {
  const { membershipPlan } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    // If user has a subscription plan, proceed with normal flow
    if (membershipPlan && membershipPlan !== 'Single Track') {
      onAccept();
      return;
    }

    // For Single Track users, initiate Stripe checkout
    if (trackId) {
      try {
        setLoading(true);
        setError(null);
        
        // Find the Single Track product
        const singleTrackProduct = PRODUCTS.find(p => p.name === 'Single Track License');
        
        if (!singleTrackProduct) {
          throw new Error('Single Track product not found');
        }
        const checkoutUrl = await createCheckoutSession(
          singleTrackProduct.priceId, 
          singleTrackProduct.mode,
          trackId
        );
        
        // Redirect to checkout
        window.location.href = checkoutUrl;
      } catch (err) {
        console.error('Error creating checkout session:', err);
        setError(err instanceof Error ? err.message : 'Failed to create checkout session');
      } finally {
        setLoading(false);
      }
    } else {
      // If no trackId is provided, just proceed with the normal flow
      onAccept();
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
      <div className="flex items-start space-x-3 mb-6">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">License Terms Summary</h3>
          <p className="text-gray-300">
            Please review these terms before proceeding with your {licenseType} license purchase.
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">Non-Exclusive License:</strong> You receive a non-exclusive,
            non-transferable synchronization license for the selected track.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">Permitted Use:</strong> Online media productions including
            YouTube videos, podcasts, and web series.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">Modifications:</strong> You may rearrange the track but
            cannot materially alter or add new elements.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">Project Scope:</strong> License applies to a single media
            production. New productions require separate licenses.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">Distribution:</strong> Online distribution only. Offline,
            television, or physical media requires separate licensing.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">License Duration:</strong>{' '}
            {licenseType === 'Ultimate Access' ? (
              'Perpetual license with no expiration.'
            ) : licenseType === 'Platinum Access' ? (
              '3-year license term from purchase date.'
            ) : licenseType === 'Gold Access' ? (
              '1-year license term from purchase date.'
            ) : (
              '1-year license term from purchase date.'
            )}
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">Monetization:</strong> You may monetize content featuring
            the track through online platforms.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
          <p className="text-gray-300">
            <strong className="text-white">Restrictions:</strong> No resale, redistribution, or
            claiming ownership of the music.
          </p>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-gray-300">
          By proceeding with your purchase, you acknowledge and accept these terms. A complete license
          agreement will be provided after checkout.
        </p>
      </div>

      <button
        onClick={handleAccept}
        className="mt-6 w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Processing...</span>
          </>
        ) : (
          <span>Accept Terms & Continue</span>
        )}
      </button>
    </div>
  );
}
