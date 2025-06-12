import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Music, Star, Zap, Gift, PlayCircle, Video, Headphones, FileCheck, Loader2, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PRODUCTS } from '../stripe-config';
import { createCheckoutSession } from '../lib/stripe';

export function WelcomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get user info from location state
  const state = location.state as {
    newUser?: boolean;
    email?: string;
    firstName?: string;
    redirectTo?: string;
    productId?: string;
  } | null;
  
  // If user navigated here directly without being a new user, redirect to home
  useEffect(() => {
    if (!state?.newUser && !user) {
      navigate('/');
    }
  }, [state, user, navigate]);
  
  // If user was redirected here after signup with a specific product, handle that
  useEffect(() => {
    const handleInitialRedirect = async () => {
      if (state?.newUser && state?.redirectTo === 'pricing' && state?.productId && user) {
        const product = PRODUCTS.find(p => p.id === state.productId);
        if (product) {
          await handleSubscribe(product);
        }
      }
    };
    
    handleInitialRedirect();
  }, [state, user]);

  const handleSubscribe = async (product: typeof PRODUCTS[0]) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setLoadingProductId(product.id);
      setError(null);
      
      // Create checkout session
      const checkoutUrl = await createCheckoutSession(
        product.priceId, 
        product.mode
      );
      
      // Redirect to checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setLoading(false);
      setLoadingProductId(null);
    }
  };
  
  const handleSkip = () => {
    // Navigate to dashboard with Single Track as default
    navigate('/dashboard');
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Welcome to MyBeatFi Sync{state?.firstName ? `, ${state.firstName}` : ''}!
          </h1>
          <p className="text-xl text-gray-300">
            Your account has been created successfully. Now let's choose the perfect plan for your needs.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8 mb-12">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-6">Choose Your Membership Plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {PRODUCTS.filter(p => p.mode === 'subscription').map((product) => (
              <div
                key={product.id}
                className={`bg-white/5 backdrop-blur-sm rounded-xl border ${
                  product.popular ? 'border-purple-500/40' : 'border-blue-500/20'
                } p-6 hover:border-blue-500/40 transition-colors relative`}
              >
                {product.popular && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-medium">
                    Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-2xl font-bold text-white">
                    ${(product.price / 100).toFixed(2)}
                  </span>
                  <span className="text-gray-400 ml-2">
                    {product.name === 'Ultimate Membership' ? '/year' : '/month'}
                  </span>
                </div>
                
                <ul className="space-y-2 mb-6">
                  {product.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleSubscribe(product)}
                  disabled={loading && loadingProductId === product.id}
                  className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all flex items-center justify-center"
                >
                  {loading && loadingProductId === product.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Choose {product.name}</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <button
              onClick={handleSkip}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Continue with Single Track License
            </button>
            <p className="mt-2 text-sm text-gray-400">
              You can upgrade anytime from your dashboard
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
            <Video className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">YouTube Series</h3>
            <p className="text-gray-300">
              Launch your channel with a signature sound that sets you apart.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
            <PlayCircle className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Client Videos</h3>
            <p className="text-gray-300">
              Produce client content faster without licensing headaches.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
            <Headphones className="w-8 h-8 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Podcasts & More</h3>
            <p className="text-gray-300">
              Create podcasts, trailers, and promos — cleared and stress-free.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
