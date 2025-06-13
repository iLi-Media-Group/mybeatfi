import React, { useState, useEffect } from 'react';
import { PricingCarousel } from './PricingCarousel';
import { getUserSubscription, getMembershipPlanFromPriceId, formatDate } from '../lib/stripe';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Calendar, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PricingPage() {
  const { user, refreshMembership } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const subscriptionData = await getUserSubscription();
      setSubscription(subscriptionData);
      
      // If we have a subscription, refresh the membership info
      if (subscriptionData?.subscription_id && subscriptionData?.status === 'active') {
        await refreshMembership();
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {user && subscription && subscription.subscription_id && subscription.status === 'active' && (
        <div className="max-w-3xl mx-auto mb-12 bg-white/5 backdrop-blur-sm rounded-xl border border-green-500/20 p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-green-500/20 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">You have an active subscription</h3>
              <p className="text-gray-300 mb-4">
                You're currently subscribed to the {getMembershipPlanFromPriceId(subscription.price_id)} plan.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 rounded-lg px-4 py-2 flex items-center">
                  <Calendar className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-sm text-gray-300">
                    Renews: {formatDate(subscription.current_period_end)}
                  </span>
                </div>
                {subscription.payment_method_brand && (
                  <div className="bg-white/10 rounded-lg px-4 py-2 flex items-center">
                    <CreditCard className="w-4 h-4 text-blue-400 mr-2" />
                    <span className="text-sm text-gray-300">
                      {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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