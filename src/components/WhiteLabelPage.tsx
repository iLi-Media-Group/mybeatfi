import React, { useState } from 'react';
import { Music, Zap, Brain, Globe, Shield, DollarSign, Mail, User, MessageSquare, Wallet, Check, ArrowRight, Loader2 } from 'lucide-react';

export function WhiteLabelPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    company: ''
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
          subject: `White Label Inquiry from ${formData.company || formData.name}`,
          message: `Company: ${formData.company || 'Not provided'}\n\n${formData.message}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      setSuccess(true);
      setFormData({ name: '', email: '', message: '', company: '' });
    } catch (err) {
      console.error('Error submitting message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <header className="relative overflow-hidden py-20 border-b border-blue-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-purple-900/50 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-20 z-0"></div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Launch Your Own <span className="text-blue-400">Music Licensing</span> Platform
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Fully branded. Crypto-ready. AI-powered. Automated payouts. 
              Get your own white-label sync licensing business up and running in days, not months.
            </p>
            <div className="flex flex-wrap gap-4">
              <a 
                href="#contact" 
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/25 flex items-center"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Request a Demo
              </a>
              <a 
                href="#pricing" 
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors border border-blue-500/20"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Features Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need to Launch</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Our white-label solution gives you all the tools to run a successful music licensing business without the technical headaches.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                <Wallet className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-white mb-3">Automated Payouts</h3>
                <p className="text-gray-300">
                  Automatically calculate and distribute payments to your producers via Stripe or USDC on Solana/Polygon networks.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                <Brain className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Metadata</h3>
                <p className="text-gray-300">
                  Automatic genre, mood, and BPM detection for uploaded tracks. Enhance discoverability with AI-generated tags.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                <Globe className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-white mb-3">Your Brand, Your Domain</h3>
                <p className="text-gray-300">
                  Fully customizable interface with your logo, colors, and domain. Your customers will never know it's white-labeled.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                <Shield className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-white mb-3">Legal Protection</h3>
                <p className="text-gray-300">
                  Built-in license agreements, terms of service, and privacy policies customized for your business and jurisdiction.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                <DollarSign className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-white mb-3">Flexible Pricing Models</h3>
                <p className="text-gray-300">
                  Offer subscriptions, one-time purchases, or custom licensing deals. Set your own prices and commission rates.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                <MessageSquare className="w-12 h-12 text-blue-500 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-white mb-3">Built-in Communication</h3>
                <p className="text-gray-300">
                  Internal messaging system for producers and clients. Negotiate custom deals and manage sync requests.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-black/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Getting your white-label platform up and running is a simple, streamlined process.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 relative">
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">1</div>
                <h3 className="text-xl font-semibold text-white mb-3 mt-2">Consultation</h3>
                <p className="text-gray-300">
                  We'll discuss your business needs, target audience, and specific requirements for your platform.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 relative">
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">2</div>
                <h3 className="text-xl font-semibold text-white mb-3 mt-2">Customization</h3>
                <p className="text-gray-300">
                  Our team configures your platform with your branding, pricing structure, and specific features.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 relative">
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">3</div>
                <h3 className="text-xl font-semibold text-white mb-3 mt-2">Launch</h3>
                <p className="text-gray-300">
                  Your platform goes live on your domain, ready to accept producers and clients. We provide ongoing support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Transparent Pricing</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Choose the plan that fits your business needs and scale as you grow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all">
                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                <p className="text-gray-400 mb-4">For indie creators and small teams</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-white">$999</span>
                  <span className="text-gray-400 ml-2">+ $49/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Basic licensing tools</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Stripe payment processing</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Custom branding & domain</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Up to 100 tracks</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Email support</span>
                  </li>
                </ul>
                <a href="#contact" className="block w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded-lg transition-colors">
                  Start Now
                </a>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border-2 border-purple-500/40 hover:border-purple-500/60 transition-all transform scale-105 shadow-xl shadow-purple-500/10 relative z-10">
                <div className="absolute -top-4 right-8 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <p className="text-gray-400 mb-4">For boutique sync agencies</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-white">$5,000</span>
                  <span className="text-gray-400 ml-2">+ $299/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-purple-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">All Starter features</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-purple-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">USDC payments on Solana</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-purple-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">AI metadata tagging</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-purple-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Advanced analytics & reports</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-purple-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Unlimited tracks</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-purple-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Priority support</span>
                  </li>
                </ul>
                <a href="#contact" className="block w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-center font-semibold rounded-lg transition-colors shadow-lg shadow-purple-500/25">
                  Get Pro
                </a>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all">
                <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                <p className="text-gray-400 mb-4">For full-scale licensing businesses</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-white">$25,000+</span>
                  <span className="text-gray-400 ml-2">+ custom</span>
                </div>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">All Pro features</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Custom SLAs & support</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">White-glove onboarding</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Dedicated account manager</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Custom feature development</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Licensing compliance tools</span>
                  </li>
                </ul>
                <a href="#contact" className="block w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded-lg transition-colors">
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-black/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What Our Partners Say</h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Join the growing number of businesses using our white-label solution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <p className="text-gray-300 mb-6 italic">
                  "We launched our music licensing platform in just two weeks. The crypto payment integration was seamless and our producers love getting paid in USDC."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-lg mr-3">
                    JD
                  </div>
                  <div>
                    <p className="text-white font-medium">James Davis</p>
                    <p className="text-gray-400 text-sm">SoundSync Media</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <p className="text-gray-300 mb-6 italic">
                  "The AI tagging feature saved us countless hours of manual work. Our catalog is now perfectly organized and searchable without any effort from our team."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 font-bold text-lg mr-3">
                    ML
                  </div>
                  <div>
                    <p className="text-white font-medium">Maria Lopez</p>
                    <p className="text-gray-400 text-sm">Harmony Tracks</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <p className="text-gray-300 mb-6 italic">
                  "The ROI has been incredible. We've grown our licensing business by 300% in six months with minimal overhead thanks to the automated systems."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-lg mr-3">
                    RK
                  </div>
                  <div>
                    <p className="text-white font-medium">Robert Kim</p>
                    <p className="text-gray-400 text-sm">Elevate Audio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-blue-500/20">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">Get Started Today</h2>
              <p className="text-gray-300 mb-8 text-center">
                Fill out the form below and our team will contact you to discuss your white-label solution.
              </p>
              
              {success ? (
                <div className="p-8 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">Message Sent Successfully!</h3>
                  <p className="text-gray-300">
                    Thank you for your interest in our white-label solution. Our team will contact you shortly to discuss your needs.
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
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full"
                      placeholder="Optional"
                    />
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
                    className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/25 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      'Request Information'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-black/30">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <h3 className="text-xl font-semibold text-white mb-3">How long does it take to launch?</h3>
                <p className="text-gray-300">
                  Most white-label platforms can be set up and launched within 2-4 weeks, depending on the level of customization required. Our Pro and Enterprise plans include expedited setup.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <h3 className="text-xl font-semibold text-white mb-3">Can I migrate my existing catalog?</h3>
                <p className="text-gray-300">
                  Yes, we offer data migration services to import your existing music catalog, user accounts, and licensing history. This is included in Pro and Enterprise plans.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <h3 className="text-xl font-semibold text-white mb-3">How do producer payments work?</h3>
                <p className="text-gray-300">
                  You can set custom commission rates for each producer or track. Payments can be processed automatically via Stripe or USDC on Solana/Polygon networks, with detailed reporting and transaction history.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <h3 className="text-xl font-semibold text-white mb-3">What kind of support is included?</h3>
                <p className="text-gray-300">
                  All plans include technical support. Starter plans include email support with 48-hour response time. Pro plans include priority email and chat support. Enterprise plans include dedicated account managers and 24/7 emergency support.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20">
                <h3 className="text-xl font-semibold text-white mb-3">Can I customize the licensing terms?</h3>
                <p className="text-gray-300">
                  Absolutely. We'll work with you to create custom license agreements that match your business model and legal requirements. This includes territory restrictions, usage rights, and duration terms.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black/40 border-t border-blue-500/20 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <Music className="w-8 h-8 text-blue-500 mr-2" />
              <span className="text-xl font-bold text-white">MYBEATFI <span className="text-blue-400">SYNC</span></span>
            </div>
            
            <div className="flex flex-wrap gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Home</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a>
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
          
          <div className="border-t border-blue-500/20 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} MyBeatFi Sync. All rights reserved.</p>
            <p className="mt-2">Powered by the same technology that runs MyBeatFi Sync.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
