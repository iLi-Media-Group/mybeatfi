import React from 'react';
import { PricingCarousel } from './PricingCarousel';

export function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Choose Your Membership Plan</h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Get access to our entire music catalog with flexible licensing options 
          tailored to your needs. All plans include commercial usage rights and worldwide licensing.
        </p>
      </div>

      <PricingCarousel />

      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-2">What are the usage limits?</h3>
            <p className="text-gray-300">
              Single Track and Gold Access plans have a 1-year usage limit, Platinum Access has a 3-year limit, 
              and Ultimate Access has no time limit. You can renew your license after 24 hours from purchase.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-2">Can I use the tracks commercially?</h3>
            <p className="text-gray-300">
              Yes, all plans include commercial usage rights. You can use the tracks in your videos, 
              podcasts, advertisements, and other media productions.
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-2">What happens when my license expires?</h3>
            <p className="text-gray-300">
              You'll need to renew your license to continue using the tracks. The renewal option becomes 
              available 24 hours after your initial purchase. Ultimate Access licenses never expire.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}