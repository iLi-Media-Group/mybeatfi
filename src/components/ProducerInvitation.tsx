import React, { useState, useEffect } from 'react';
import { UserPlus, Send, Loader2, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function ProducerInvitation() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [producerNumber, setProducerNumber] = useState('');
  const [nextNumber, setNextNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchNextProducerNumber();
  }, []);

  const fetchNextProducerNumber = async () => {
    try {
      // Get all existing producer numbers
      const { data: existingNumbers, error: fetchError } = await supabase
        .from('profiles')
        .select('producer_number')
        .not('producer_number', 'is', null)
        .order('producer_number', { ascending: true });

      if (fetchError) throw fetchError;

      const defaultNumber = 'mbfpr-001';
      
      if (!existingNumbers || existingNumbers.length === 0) {
        setNextNumber(defaultNumber);
        setProducerNumber(defaultNumber);
        return;
      }

      // Find the first available number
      let currentNum = 1;
      for (const profile of existingNumbers) {
        const match = profile.producer_number?.match(/mbfpr-(\d{3})/);
        if (match) {
          const num = parseInt(match[1]);
          if (num !== currentNum) {
            // Found a gap, use this number
            break;
          }
          currentNum++;
        }
      }

      const nextAvailable = `mbfpr-${String(currentNum).padStart(3, '0')}`;
      setNextNumber(nextAvailable);
      setProducerNumber(nextAvailable);

    } catch (err) {
      console.error('Error fetching next producer number:', err);
      // Set default values even in case of error
      setNextNumber('mbfpr-001');
      setProducerNumber('mbfpr-001');
    }
  };

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

      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('First name and last name are required');
      }

      if (!producerNumber.match(/^mbfpr-\d{3}$/)) {
        throw new Error('Invalid producer number format. Must be mbfpr-XXX');
      }

      // Check if producer number already exists
      const { data: existingNumber } = await supabase
        .from('profiles')
        .select('id')
        .eq('producer_number', producerNumber)
        .maybeSingle();

      if (existingNumber) {
        throw new Error('This producer number is already in use');
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, account_type')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('This email is already registered');
      }

      const invitationCode = generateInvitationCode();

      const { error: insertError } = await supabase
        .from('producer_invitations')
        .insert({
          email,
          first_name: firstName,
          last_name: lastName,
          invitation_code: invitationCode,
          created_by: user.id,
          producer_number: producerNumber
        });

      if (insertError) throw insertError;

      setSuccess('Producer invitation created successfully');
      setEmail('');
      setFirstName('');
      setLastName('');
      await fetchNextProducerNumber();
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
                Producer Number
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={producerNumber}
                  onChange={(e) => setProducerNumber(e.target.value)}
                  className="w-full pl-10"
                  pattern="mbfpr-\d{3}"
                  title="Format: mbfpr-XXX (where X is a digit)"
                  placeholder={nextNumber}
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-400">
                Next available number: {nextNumber}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
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
                className="w-full"
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
                className="w-full"
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
