import React, { useState } from 'react';
import { Music, Star, Zap, Gift, PlayCircle, Video, Headphones, FileCheck, Loader2, Mail, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PRODUCTS } from '../stripe-config';
import { createCheckoutSession } from '../lib/stripe';
import { CryptoPaymentButton } from './CryptoPaymentButton';
import { supabase } from '../lib/supabase';

interface EmailCheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (email: string, exists: boolean) => void;
}

function EmailCheckDialog({ isOpen, onClose, onContinue }: EmailCheckDialogProps) {
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

      // Check if the email exists in the system
      const { data, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (lookupError) throw lookupError;

      // Continue with the appropriate flow
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
          <h3 className="text-xl font-bold text-white">Subscribe to Gold Access</h3>
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

export function GoldAccessPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailCheck, setShowEmailCheck] = useState(false);

  const handleUpgrade = async () => {
    if (user) {
      // User is already logged in, proceed with subscription
      await proceedWithSubscription();
    } else {
      // User is not logged in, show email check dialog
      setShowEmailCheck(true);
    }
  };

  const handleEmailContinue = (email: string, exists: boolean) => {
    setShowEmailCheck(false);
    
    if (exists) {
      // Account exists, redirect to login with email prefilled
      navigate(`/login?email=${encodeURIComponent(email)}&redirect=pricing&product=prod_SQOhLQJIM6Rji8`);
    } else {
      // No account exists, redirect to signup with email prefilled
      navigate(`/signup?email=${encodeURIComponent(email)}&redirect=pricing&product=prod_SQOhLQJIM6Rji8`);
    }
  };

  const proceedWithSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Find Gold Access product
      const goldProduct = PRODUCTS.find(p => p.name === 'Gold Membership');
      
      if (!goldProduct) {
        throw new Error('Gold membership product not found');
      }
      
      // Create checkout session
      const checkoutUrl = await createCheckoutSession(
        goldProduct.priceId, 
        goldProduct.mode
      );
      
      // Redirect to checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 flex items-center justify-center">
            <Music className="w-12 h-12 text-purple-500 mr-4" />
            Unlock Your Soundtrack Freedom
          </h1>
          <p className="text-xl text-gray-300">
            Create freely with unlimited downloads, full commercial rights, and new tracks added every month!
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Star className="w-6 h-6 text-purple-500 mr-2" />
                What's Included
              </h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">Unlimited Track Licenses</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">Commercial Use Rights</span>
                </div>
                <div className="flex items-center space-x-3">
                  <PlayCircle className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">Online Distribution Cleared</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Headphones className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">New Music Every Month</span>
                </div>
                <div className="flex items-center space-x-3">
                  <FileCheck className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">Sync-Ready PDFs for Every Track</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-500/20">
              <div className="text-center mb-6">
                <h3 className="text-3xl font-bold text-white mb-2">Gold Access</h3>
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">$34.99</span>
                  <span className="text-gray-400 ml-2">/month</span>
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-purple-400 mb-2">
                  <Gift className="w-5 h-5" />
                  <span className="font-semibold">Special Bonus</span>
                </div>
                <p className="text-gray-300">
                  Sign up now and get a FREE bonus track pack curated by our team!
                </p>
              </div>

              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Unlock Gold Access'
                )}
              </button>
              
              <div className="mt-4">
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-600"></div>
                  <span className="flex-shrink mx-4 text-gray-400">or</span>
                  <div className="flex-grow border-t border-gray-600"></div>
                </div>
                
                <CryptoPaymentButton
                  productId="prod_SQOhLQJIM6Rji8"
                  productName="Gold Access Membership"
                  productDescription="Monthly subscription with 10 tracks per month"
                  price={34.99}
                  disabled={loading}
                  metadata={{
                    product_type: 'subscription',
                    price_id: 'price_1RVXu9Ikn3xpidKHqxoSb6bC'
                  }}
                />
              </div>
            </div>
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

        {!user && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 text-center">
            <p className="text-gray-300 mb-4">
              Already a Single Track user? No problem — your previous licenses stay valid, and now your
              future projects can go unlimited.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Sign In to Upgrade
            </button>
          </div>
        )}
      </div>

      <EmailCheckDialog
        isOpen={showEmailCheck}
        onClose={() => setShowEmailCheck(false)}
        onContinue={handleEmailContinue}
      />
    </div>
  );
}
