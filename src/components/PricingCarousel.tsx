import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Coins, Loader2, Mail, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PRODUCTS } from '../stripe-config';
import { createCheckoutSession, getUserSubscription } from '../lib/stripe';
import { createHelioCheckout } from '../lib/helio';

interface EmailCheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (email: string, exists: boolean) => void;
  product: typeof PRODUCTS[0];
}

function EmailCheckDialog({ isOpen, onClose, onContinue, product }: EmailCheckDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (lookupError) throw lookupError;

      onContinue(email, !!data);
    } catch (err) {
      console.error('Error checking email:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Subscribe to {product.name}</h3>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10"
                placeholder="Enter your email"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              We'll check if you already have an account
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5 mr-2" />
                Continue
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export function PricingCarousel() {
  const navigate = useNavigate();
  const { user, refreshMembership } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [showEmailCheck, setShowEmailCheck] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUCTS[0] | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const subscription = await getUserSubscription();
      setCurrentSubscription(subscription);
      
      if (subscription?.subscription_id && subscription?.status === 'active') {
        await refreshMembership();
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const handleSubscribe = async (product: typeof PRODUCTS[0]) => {
    if (!user) {
      setSelectedProduct(product);
      setShowEmailCheck(true);
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setError('Error checking your account type.');
        return;
      }

      const accountType = profile?.account_type;

      if (accountType === 'producer') {
        navigate('/producer-dashboard');
        return;
      }

      if (accountType === 'admin') {
        navigate('/admin-dashboard');
        return;
      }

      proceedWithSubscription(product);
    } catch (err) {
      console.error('Error during subscription check:', err);
      setError('Unexpected error. Please try again.');
    }
  };

  const handleEmailContinue = async (email: string, exists: boolean) => {
    setShowEmailCheck(false);

    if (exists) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('email', email.toLowerCase().trim())
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          navigate(`/login?email=${encodeURIComponent(email)}&redirect=pricing&product=${selectedProduct?.id}`);
          return;
        }

        const accountType = profile?.account_type;

        if (accountType === 'producer') {
          navigate('/producer-dashboard');
          return;
        }

        if (accountType === 'admin') {
          navigate('/admin-dashboard');
          return;
        }

        navigate(`/login?email=${encodeURIComponent(email)}&redirect=pricing&product=${selectedProduct?.id}`);
      } catch (err) {
        console.error('Error checking account type after email check:', err);
        navigate(`/login?email=${encodeURIComponent(email)}&redirect=pricing&product=${selectedProduct?.id}`);
      }
    } else {
      navigate(`/signup?email=${encodeURIComponent(email)}&redirect=pricing&product=${selectedProduct?.id}`);
    }
  };

const proceedWithSubscription = async (product: typeof PRODUCTS[0]) => {
  try {
    setLoading(true);
    setLoadingProductId(product.id);
    setError(null);

    // If user already has subscription and product is subscription type, redirect
    if (currentSubscription?.subscription_id && product.mode === 'subscription') {
      navigate('/dashboard');
      return;
    }

    // If product is crypto payment (Helio)
    if (product.mode === 'crypto') {
      if (!user) throw new Error('User not logged in');

      const helioUrl = await createHelioCheckout({
        productId: product.id,
        price: product.price,
        name: product.name,
        description: product.description,
        successUrl: `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/pricing?payment=cancel`,
        metadata: { user_id: user.id }
      });

      window.location.href = helioUrl;
      return;
    }

    // Else, handle normal checkout session (Stripe or other)
    const checkoutUrl = await createCheckoutSession(product.priceId, product.mode);
    window.location.href = checkoutUrl;

  } catch (err) {
    console.error('Error in subscription:', err);
    setError(err instanceof Error ? err.message : 'Failed to create checkout session');
  } finally {
    setLoading(false);
    setLoadingProductId(null);
  }
};


  return (
    <>
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
            } p-8 h-full hover:border-blue-500/40 transition-colors relative flex flex-col`}
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
                  ${(product.price).toFixed(2)}
                </span>
                <span className="text-gray-400 ml-2">
                  {product.name === 'Ultimate Access' ? '/year' : 
                  product.mode === 'subscription' ? '/month' : ''}
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

            <div className="mt-auto pt-8">
              {!product.mode.includes('subscription') && (
                <button
                  onClick={() => navigate('/catalog')}
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-lg bg-green-200/40 hover:bg-purple-500/60 text-white font-semibold transition-all flex items-center justify-center"
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
                    className="w-full py-3 px-6 rounded-lg bg-green-200/40 hover:bg-purple-500/60 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        ))}
      </div>

      {selectedProduct && (
        <EmailCheckDialog
          isOpen={showEmailCheck}
          onClose={() => setShowEmailCheck(false)}
          onContinue={handleEmailContinue}
          product={selectedProduct}
        />
      )}
    </>
  );
}
