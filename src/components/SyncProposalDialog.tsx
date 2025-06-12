import React, { useState } from 'react';
import { X, Clock, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Track } from '../types';
import { CryptoPaymentButton } from './CryptoPaymentButton';

interface SyncProposalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
}

export function SyncProposalDialog({ isOpen, onClose, track }: SyncProposalDialogProps) {
  // ... (existing state and logic remain the same)

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 p-8 rounded-xl border border-purple-500/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Rest of the component remains the same */}
      </div>
    </div>
  );
}
