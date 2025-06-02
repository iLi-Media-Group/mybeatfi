import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Coins, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PRODUCTS } from '../stripe-config';
import { createCheckoutSession, getUserSubscription } from '../lib/stripe';

export function PricingCarousel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const subscription = await getUserSubscription();
      setCurrentSubscription(subscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const handleSubscribe = async (product: typeof PRODUCTS[0]) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setLoadingProductId(product.id);
      setError(null);

      // If user already has a subscription, redirect to dashboard
      if (currentSubscription?.subscription_id && product.mode === 'subscription') {
        navigate('/dashboard');
        return;
      }

      const checkoutUrl = await createCheckoutSession(product.priceId, product.mode);
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setLoading(false);
      setLoadingProductId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
      {error && (
        <div className="col-span-full mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {PRODUCTS.map((product) => (
        <div
          key={product.id}
          className={`bg-white/5 backdrop-blur-sm rounded-2xl border ${
            product.popular ? 'border-purple-500/40' : 'border-blue-500/20'
          } p-8 h-full hover:border-blue-500/40 transition-colors relative`}
        >
          {product.popular && (
            <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
              Popular
            </div>
          )}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
            <p className="text-gray-400 mb-4">{product.description}</p>
            <div className="flex items-baseline justify-center">
              <span className="text-4xl font-bold text-white">
                ${(product.price / 100).toFixed(2)}
              </span>
              <span className="text-gray-400 ml-2">
                {product.mode === 'subscription' ? '/month' : ''}
              </span>
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            {product.features.map((feature, i) => (
              <li key={i} className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-white mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {!product.mode.includes('subscription') && (
            <button
              onClick={() => handleSubscribe(product)}
              disabled={loading}
              className="w-full py-3 px-6 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-white font-semibold transition-all flex items-center justify-center"
            >
              {loadingProductId === product.id ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <>Browse Tracks</>
              )}
            </button>
          )}

          {product.mode.includes('subscription') && (
            <div className="space-y-4">
              <button
                onClick={() => handleSubscribe(product)}
                disabled={loading || (currentSubscription?.subscription_id && currentSubscription?.status === 'active')}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProductId === product.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>
                      {currentSubscription?.subscription_id && currentSubscription?.status === 'active'
                        ? 'Current Plan'
                        : 'Subscribe with Card'}
                    </span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleSubscribe(product)}
                disabled={loading || (currentSubscription?.subscription_id && currentSubscription?.status === 'active')}
                className="w-full py-3 px-6 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProductId === product.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    <span>Subscribe with Crypto</span>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-400 mt-4">
                Accepts USDC, USDT, and Solana
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}