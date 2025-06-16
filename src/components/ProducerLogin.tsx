import React, { useState } from 'react';
import { LogIn, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function ProducerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      const loginEmail = email.toLowerCase().trim();

      // Check if user is an admin (include knockriobeats2@gmail.com)
      const isAdmin = ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(loginEmail);
      
      if (!isAdmin) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('email', loginEmail)
          .maybeSingle();

        if (profileError) {
          if (profileError.code !== 'PGRST116') {
            console.error('Profile lookup error:', profileError);
            throw new Error('Failed to verify account type');
          }
          // If no profile found, continue with login for admin emails
          if (!isAdmin) {
            throw new Error('Please use the client login page');
          }
        }

        // If no profile found or account type is not producer
        if ((!profileData || profileData.account_type !== 'producer') && !isAdmin) {
          throw new Error('Please use the client login page');
        }
      }

      // Attempt to sign in
      const { error: signInError } = await signIn(loginEmail, password);
      
      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password');
        }
        throw signInError;
      }

      // Redirect to producer dashboard
      navigate('/producer/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      
      // Sign out if authentication succeeded but authorization failed
      if (err instanceof Error && err.message === 'Please use the client login page') {
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
            Producer Login
          </h2>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-center font-medium">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
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
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
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
