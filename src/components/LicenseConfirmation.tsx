import React, { useState } from 'react';
import { Check, Download, ShoppingBag, Mail, HelpCircle, Music, Star, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SpecialOfferPopup } from './SpecialOfferPopup';

interface LicenseConfirmationProps {
  clientName: string;
  trackTitle: string;
  licenseTier: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  licenseDate: string;
  expirationDate?: string;
  purchaseAmount: number;
  onDownload: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "When does my license start?",
    answer: "Your license begins immediately upon successful purchase."
  },
  {
    question: "Can I use the track on multiple platforms?",
    answer: "Yes, you can use the track across any online platforms within a single production."
  },
  {
    question: "What if I need to renew my license?",
    answer: "You can renew your license 24 hours before expiration through your dashboard."
  },
  {
    question: "Can I monetize my content?",
    answer: "Yes, you can monetize any content featuring the licensed track on platforms like YouTube, Spotify, or TikTok."
  }
];

export function LicenseConfirmation({
  clientName,
  trackTitle,
  licenseTier,
  licenseDate,
  expirationDate,
  purchaseAmount,
  onDownload
}: LicenseConfirmationProps) {
  const [showFAQ, setShowFAQ] = useState(false);
  const [showSpecialOffer, setShowSpecialOffer] = useState(licenseTier === 'Single Track');

  return (
    <>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-green-500/20 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Thank You for Licensing with MyBeatFi Sync!
          </h1>
          
          <p className="text-gray-300 text-center mb-8">
            Your license for "{trackTitle}" has been successfully generated.
          </p>

          <div className="bg-white/5 rounded-lg p-6 mb-8 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">License Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Client Name</p>
                <p className="text-white font-medium">{clientName}</p>
              </div>
              
              <div>
                <p className="text-gray-400">Track Name</p>
                <p className="text-white font-medium">{trackTitle}</p>
              </div>
              
              <div>
                <p className="text-gray-400">License Tier</p>
                <p className="text-white font-medium">{licenseTier}</p>
              </div>
              
              <div>
                <p className="text-gray-400">License Start Date</p>
                <p className="text-white font-medium">{new Date(licenseDate).toLocaleDateString()}</p>
              </div>

              {expirationDate && licenseTier !== 'Ultimate Access' && (
                <div>
                  <p className="text-gray-400">License Expiration</p>
                  <p className="text-white font-medium">{new Date(expirationDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
              <p className="text-gray-300">
                You are authorized to use the track for online media production according to our Terms & Conditions.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
              <p className="text-gray-300">
                You may monetize your project on platforms like YouTube, Spotify, or TikTok.
              </p>
            </div>

            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
              <p className="text-gray-300">
                Your downloadable license document has been emailed to you and is available below.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-6">
            <button
              onClick={onDownload}
              className="w-full max-w-md py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Your License (.pdf)</span>
            </button>

            {/* Upsell Section */}
            <div className="w-full bg-blue-900/20 border border-blue-500/20 rounded-lg p-6 mt-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Sparkles className="w-6 h-6 text-blue-400 mr-2" />
                Ready for Your Next Project?
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-blue-400" />
                  <p className="text-gray-300">Discover exclusive new tracks daily</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Music className="w-5 h-5 text-blue-400" />
                  <p className="text-gray-300">Find the perfect sound for your next creation</p>
                </div>
              </div>

              <Link
                to="/catalog"
                className="block w-full py-3 px-6 bg-blue-600/50 hover:bg-blue-600/70 text-white font-semibold rounded-lg transition-colors text-center"
              >
                Explore More Tracks
              </Link>
            </div>

            <button
              onClick={() => setShowFAQ(!showFAQ)}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span>Questions about your license? See our FAQ</span>
            </button>
          </div>

          {showFAQ && (
            <div className="mt-8 bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Frequently Asked Questions</h3>
              <div className="space-y-6">
                {FAQ_ITEMS.map((item, index) => (
                  <div key={index}>
                    <h4 className="text-lg font-medium text-white mb-2">{item.question}</h4>
                    <p className="text-gray-300">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SpecialOfferPopup
        isOpen={showSpecialOffer}
        onClose={() => setShowSpecialOffer(false)}
        purchaseAmount={purchaseAmount}
      />
    </>
  );
}
