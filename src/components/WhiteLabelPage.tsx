import React, { useState } from 'react'; import { Music, Zap, Brain, Globe, Shield, DollarSign, Mail, User, MessageSquare, Wallet, Check, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export function WhiteLabelPage() { const [formData, setFormData] = useState({ name: '', email: '', message: '', company: '' }); const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState('');

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setError('');

try {
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

return ( <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900"> {/* ... existing header, features, how it works, pricing, testimonials, FAQ ... */}

{/* Optional Feature Add-Ons */}
  <section id="addons" className="py-20 bg-black/30">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Optional Feature Add-Ons</h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          Customize your white-label platform even further with these powerful feature modules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Producer Onboarding */}
        <div className="bg-white/5 p-6 rounded-xl border border-blue-500/20">
          <h3 className="text-xl font-semibold text-white mb-3">Producer Onboarding Process</h3>
          <p className="text-gray-300 mb-4">
            Let producers apply to join your library. Applications are automatically ranked by genre to help you select the best fits.
          </p>
          <p className="text-blue-400 font-bold mb-4">$249</p>
          <a href="#contact" className="text-blue-400 hover:underline">Add to My Demo Request</a>
        </div>

        {/* AI Search Assistance */}
        <div className="bg-white/5 p-6 rounded-xl border border-blue-500/20">
          <h3 className="text-xl font-semibold text-white mb-3">AI Search Assistance</h3>
          <p className="text-gray-300 mb-4">
            Help clients discover music based on their previous searches, favorites, or licensed tracks. AI-driven suggestions in real time.
          </p>
          <p className="text-blue-400 font-bold mb-4">$249</p>
          <a href="#contact" className="text-blue-400 hover:underline">Add to My Demo Request</a>
        </div>

        {/* Deep Media Search Options */}
        <div className="bg-white/5 p-6 rounded-xl border border-blue-500/20">
          <h3 className="text-xl font-semibold text-white mb-3">Deep Media Search Options</h3>
          <p className="text-gray-300 mb-4">
            Let producers tag tracks with recommended media types (TV shows, films, commercials, podcasts, YouTube, etc.). Add media filters for your clients.
          </p>
          <p className="text-blue-400 font-bold mb-4">$249</p>
          <a href="#contact" className="text-blue-400 hover:underline">Add to My Demo Request</a>
        </div>
      </div>

      {/* Bundle Discounts */}
      <div className="mt-16 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">Bundle and Save</h3>
        <ul className="text-gray-300 space-y-2">
          <li>✅ Any 2 Add-Ons for <span className="text-blue-400 font-bold">$449</span> (Save $49)</li>
          <li>✅ All 3 Add-Ons for <span className="text-blue-400 font-bold">$599</span> (Save $148)</li>
        </ul>
        <a href="#contact" className="mt-4 inline-block py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 transition-colors">
          Request Bundle Pricing
        </a>
      </div>
    </div>
  </section>

  {/* ... existing contact form, FAQ, footer ... */}
</div>

); }

