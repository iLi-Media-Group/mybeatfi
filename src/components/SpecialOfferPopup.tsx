import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, X, Clock } from 'lucide-react';

interface SpecialOfferPopupProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseAmount: number;
}

export function SpecialOfferPopup({ isOpen, onClose, purchaseAmount }: SpecialOfferPopupProps) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-purple-500/20 w-full max-w-lg p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <Zap className="w-12 h-12 text-yellow-400 animate-pulse" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">
            Special Offer!
          </h2>

          <p className="text-xl text-gray-300 mb-6">
            Upgrade to <span className="font-bold text-white">Gold Access</span> right now and we'll{' '}
            <span className="font-bold text-white">refund your ${purchaseAmount.toFixed(2)} purchase</span>! 🎉
          </p>

          <div className="bg-purple-900/20 rounded-lg p-6 border border-purple-500/20 mb-6">
            <p className="text-lg text-gray-300">
              Get unlimited music licenses, sync rights, and fresh tracks every month — for just{' '}
              <span className="font-bold text-white">$24.99/month</span>.
            </p>
          </div>

          <button
            onClick={() => navigate('/upgrade')}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-500/25 mb-4"
          >
            🔓 Upgrade & Save
          </button>

          <div className="flex items-center justify-center text-gray-400">
            <Clock className="w-4 h-4 mr-2" />
            <span>Offer expires in {formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
