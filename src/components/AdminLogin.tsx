import React, { useState } from 'react';
import { LogIn, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AdminLogin() {
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

      // Check if the email is in the admin list
      if (!['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(email)) {
        throw new Error('Unauthorized access');
      }

      await signIn(email, password);
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid credentials or unauthorized access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-purple-500/20">
          <div className="flex items-center justify-center mb-8">
            <Shield className="w-12 h-12 text-purple-500" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Admin Access
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
                className="mt-1 block w-full rounded-md bg-white/10 border border-gray-600 text-white px-4 py-2 focus:border-purple-500 focus:ring focus:ring-purple-500/20"
                required
                disabled={loading}
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
                className="mt-1 block w-full rounded-md bg-white/10 border border-gray-600 text-white px-4 py-2 focus:border-purple-500 focus:ring focus:ring-purple-500/20"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
