import React, { useState } from 'react';
import { UserPlus, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function ProducerInvitation() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const generateInvitationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from(
      { length: 12 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);

    try {
      if (!user?.email) {
        throw new Error('Admin email not found');
      }

      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Validate required fields
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('First name and last name are required');
      }

      // Check if email already exists in profiles
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, account_type')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;

      if (existingProfile) {
        if (existingProfile.account_type === 'producer') {
          throw new Error('This email is already registered as a producer');
        } else {
          throw new Error('This email is already registered with a different account type');
        }
      }

      // Check for existing invitations
      const { data: existingInvitation, error: inviteError } = await supabase
        .from('producer_invitations')
        .select('id, invitation_code, expires_at, used')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inviteError) throw inviteError;

      if (existingInvitation) {
        if (!existingInvitation.used && new Date(existingInvitation.expires_at) > new Date()) {
          throw new Error('An active invitation already exists for this email');
        }
      }

      // Generate invitation code
      const invitationCode = generateInvitationCode();

      // Create new invitation
      const { error: insertError } = await supabase
        .from('producer_invitations')
        .insert({
          email,
          first_name: firstName,
          last_name: lastName,
          invitation_code: invitationCode,
          created_by: user.email,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (insertError) {
        console.error('Invitation creation error:', insertError);
        throw new Error('Failed to create invitation');
      }

      setSuccess('Producer invitation created successfully');
      setEmail('');
      setFirstName('');
      setLastName('');
    } catch (err) {
      console.error('Error creating invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Invite Producer</h1>
            <p className="mt-2 text-gray-400">
              Create an invitation for a new producer to join the platform
            </p>
          </div>
          <UserPlus className="w-12 h-12 text-purple-500" />
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-center font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-center font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring focus:ring-purple-500/20"
                required
                disabled={loading}
                placeholder="producer@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring focus:ring-purple-500/20"
                required
                disabled={loading}
                placeholder="John"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring focus:ring-purple-500/20"
                required
                disabled={loading}
                placeholder="Doe"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Invitation...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Create Invitation
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}