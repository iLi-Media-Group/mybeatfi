import React, { useState } from 'react';
import { Music, Zap, Brain, Globe, Shield, DollarSign, Mail, User, MessageSquare, Wallet } from 'lucide-react';

export function WhiteLabelPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Send the message to the edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-contact-form`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: 'White Label Inquiry',
          message: formData.message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Error submitting message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <header className="bg-black/30 shadow-lg border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <Music className="w-8 h-8 text-blue-400 mr-3" />
            <h1 className="text-2xl font-bold text-white">White-Label Music Licensing</h1>
          </div>
          <a href="#contact" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Get Started
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16">
        <section className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Launch Your Own Music Licensing Platform in Days</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Automated payouts. Crypto-ready. AI tagging. Fully branded. Zero hassle.
          </p>
          <a href="#contact" className="mt-8 inline-block bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg transition-colors shadow-lg shadow-blue-500/25">
            Request a Demo
          </a>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <Wallet className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Automated Payouts</h3>
            <p className="text-gray-300">Handle Stripe & USDC payouts with detailed reports and no manual work.</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <Brain className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">AI-Powered Metadata</h3>
            <p className="text-gray-300">Genre & mood detection powered by AI to enhance discoverability and accuracy.</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <Globe className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">White-Label Ready</h3>
            <p className="text-gray-300">Your brand, your domain. Sell licenses, receive payments, and scale your business.</p>
          </div>
        </section>

        <section className="bg-blue-900/20 p-10 rounded-xl border border-blue-500/20 mb-20">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Choose Your Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 text-center transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
              <h4 className="text-xl font-bold text-white mb-2">Starter</h4>
              <p className="text-gray-400 mb-4">For indie creators and small teams</p>
              <p className="text-3xl font-bold text-white mb-4">$999 <span className="text-lg text-gray-400">+ $49/mo</span></p>
              <ul className="text-sm text-gray-300 mb-6 space-y-2">
                <li className="flex items-center"><Zap className="w-4 h-4 text-blue-400 mr-2" /> Basic licensing tools</li>
                <li className="flex items-center"><DollarSign className="w-4 h-4 text-blue-400 mr-2" /> Stripe payout</li>
                <li className="flex items-center"><Shield className="w-4 h-4 text-blue-400 mr-2" /> Custom branding</li>
              </ul>
              <a href="#contact" className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Start Now
              </a>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border-2 border-purple-500/40 text-center transform scale-105 shadow-xl shadow-purple-500/10">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h4 className="text-xl font-bold text-white mb-2 mt-2">Pro</h4>
              <p className="text-gray-400 mb-4">For boutique sync agencies</p>
              <p className="text-3xl font-bold text-white mb-4">$5,000 <span className="text-lg text-gray-400">+ $299/mo</span></p>
              <ul className="text-sm text-gray-300 mb-6 space-y-2">
                <li className="flex items-center"><Zap className="w-4 h-4 text-purple-400 mr-2" /> All Starter features</li>
                <li className="flex items-center"><Wallet className="w-4 h-4 text-purple-400 mr-2" /> USDC on Solana</li>
                <li className="flex items-center"><Brain className="w-4 h-4 text-purple-400 mr-2" /> AI metadata tagging</li>
                <li className="flex items-center"><DollarSign className="w-4 h-4 text-purple-400 mr-2" /> Advanced reports</li>
              </ul>
              <a href="#contact" className="block w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Get Pro
              </a>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 text-center transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
              <h4 className="text-xl font-bold text-white mb-2">Enterprise</h4>
              <p className="text-gray-400 mb-4">For full-scale licensing businesses</p>
              <p className="text-3xl font-bold text-white mb-4">$25,000+ <span className="text-lg text-gray-400">+ custom</span></p>
              <ul className="text-sm text-gray-300 mb-6 space-y-2">
                <li className="flex items-center"><Zap className="w-4 h-4 text-blue-400 mr-2" /> All Pro features</li>
                <li className="flex items-center"><Shield className="w-4 h-4 text-blue-400 mr-2" /> Custom SLAs</li>
                <li className="flex items-center"><MessageSquare className="w-4 h-4 text-blue-400 mr-2" /> Dedicated support</li>
                <li className="flex items-center"><Shield className="w-4 h-4 text-blue-400 mr-2" /> Licensing compliance tools</li>
              </ul>
              <a href="#contact" className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </section>

        <section id="contact" className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Interested in a Demo or Custom Quote?</h3>
          <p className="mb-6 text-gray-300 text-center">
            Leave your contact information and our team will reach out shortly.
          </p>
          
          {success ? (
            <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
              <h4 className="text-xl font-semibold text-green-400 mb-2">Message Sent!</h4>
              <p className="text-gray-300">
                Thank you for your interest. Our team will contact you shortly to discuss your white-label solution.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-center">{error}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tell us about your needs
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="w-full"
                  placeholder="What kind of music licensing platform are you looking to build? What features are most important to you?"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/25"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="bg-black/40 border-t border-blue-500/20 py-8 text-center text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} MyBeatFi Sync. All rights reserved.</p>
          <p className="mt-2">Powered by the same technology that runs MyBeatFi Sync.</p>
        </div>
      </footer>
    </div>
  );
}