import React, { useState, useEffect } from 'react';
import { User, Mail, X, Phone, MapPin, Building2, Hash, Music, Info, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProducerProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export function ProducerProfile({ isOpen, onClose, onProfileUpdated }: ProducerProfileProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [producerNumber, setProducerNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [ipiNumber, setIpiNumber] = useState('');
  const [performingRightsOrg, setPerformingRightsOrg] = useState('');
  const [usdcAddress, setUsdcAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*, ipi_number, performing_rights_org, usdc_address, company_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setEmail(data.email || '');
        setCompanyName(data.company_name || '');
        setProducerNumber(data.producer_number || '');
        setPhoneNumber(data.phone_number || '');
        setStreetAddress(data.street_address || '');
        setCity(data.city || '');
        setState(data.state || '');
        setPostalCode(data.postal_code || '');
        setCountry(data.country || '');
        setIpiNumber(data.ipi_number || '');
        setPerformingRightsOrg(data.performing_rights_org || '');
        setUsdcAddress(data.usdc_address || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim() || null,
          company_name: companyName.trim() || null,
          phone_number: phoneNumber.trim() || null,
          street_address: streetAddress.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          postal_code: postalCode.trim() || null,
          country: country.trim() || null,
          ipi_number: ipiNumber.trim() || null,
          performing_rights_org: performingRightsOrg.trim() || null,
          usdc_address: usdcAddress.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onProfileUpdated) {
          onProfileUpdated();
        }
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Producer Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-center">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-center">Profile updated successfully!</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Producer Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={producerNumber}
                    className="w-full pl-10 opacity-50"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    className="w-full pl-10 opacity-50"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10"
                  placeholder="Your publishing company or label name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10"
                  placeholder="International format"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Music Rights Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  IPI Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={ipiNumber}
                    onChange={(e) => setIpiNumber(e.target.value)}
                    className={`w-full pl-10 ${!ipiNumber.trim() ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {!ipiNumber.trim() && (
                  <p className="mt-1 text-sm text-red-400">IPI Number is required</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Your Interested Parties Information number from your PRO
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Performing Rights Organization <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={performingRightsOrg}
                    onChange={(e) => setPerformingRightsOrg(e.target.value)}
                    className={`w-full pl-10 ${!performingRightsOrg ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="">Select your PRO</option>
                    <option value="ASCAP">ASCAP</option>
                    <option value="BMI">BMI</option>
                    <option value="SESAC">SESAC</option>
                    <option value="GMR">Global Music Rights</option>
                    <option value="PRS">PRS for Music (UK)</option>
                    <option value="SOCAN">SOCAN (Canada)</option>
                    <option value="APRA">APRA AMCOS (Australia/NZ)</option>
                    <option value="SACEM">SACEM (France)</option>
                    <option value="GEMA">GEMA (Germany)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                {!performingRightsOrg && (
                  <p className="mt-1 text-sm text-red-400">PRO is required</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                USDC Wallet Address
              </label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={usdcAddress}
                  onChange={(e) => setUsdcAddress(e.target.value)}
                  className="w-full pl-10"
                  placeholder="Enter your USDC wallet address (Solana or Polygon)"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                This address will be used for USDC payouts. We support both Solana and Polygon networks.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Address Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Street Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State/Province/Region
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
