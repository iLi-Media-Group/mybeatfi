import React, { useState, useEffect } from 'react';
import { LogIn, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PRODUCTS } from '../stripe-config';
import { createCheckoutSession } from '../lib/stripe';

export function ClientLogin() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  // Get redirect and product info from URL params
  const redirectTo = searchParams.get('redirect') || '';
  const productId = searchParams.get('product') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      // Check if user is an admin
      const isAdmin = ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(email);
      
      if (!isAdmin) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('email', email)
          .maybeSingle();

        if (profileError) {
          if (profileError.code !== 'PGRST116') {
            console.error('Profile lookup error:', profileError);
            // Continue with login even if profile lookup fails
          }
          // If no profile found, continue with login for admin emails
          if (!isAdmin) {
            // For non-admin emails without a profile, we'll create one after successful login
            console.log('No profile found, will create after login');
          }
        }
        
        if (profileData && profileData.account_type === 'producer' && !isAdmin) {
          throw new Error('Please use the producer login page');
        }
      }

      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }

      // Handle redirect based on URL params
      if (redirectTo === 'pricing' && productId) {
        // Find the product and proceed with subscription
        const product = PRODUCTS.find(p => p.id === productId);
        if (product) {
          try {
            const checkoutUrl = await createCheckoutSession(product.priceId, product.mode);
            window.location.href = checkoutUrl;
            return;
          } catch (err) {
            console.error('Error creating checkout session:', err);
            // If checkout fails, just navigate to pricing page
            navigate('/pricing');
            return;
          }
        }
      }

      // Default navigation
      navigate(isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
      
      // Sign out if authentication succeeded but authorization failed
      if (err instanceof Error && err.message === 'Please use the producer login page') {
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      alert('Password reset instructions have been sent to your email');
    } catch (err) {
      setError('Failed to send reset password email');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 rounded-xl">
          <div className="flex items-center justify-center mb-8">
            <LogIn className="w-12 h-12 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Client Login
          </h2>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-center font-medium">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email or Username
              </label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full rounded-md bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="mt-1 block w-full rounded-md bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full flex items-center justify-center py-2 px-4 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Forgot Password?
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
