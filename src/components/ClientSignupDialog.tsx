import React, { useState, useEffect } from 'react';
import { SignupForm } from './SignupForm';
import { useSearchParams } from 'react-router-dom';

interface ClientSignupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClientSignupDialog({ isOpen, onClose }: ClientSignupDialogProps) {
  const [searchParams] = useSearchParams();
  const [shouldOpen, setShouldOpen] = useState(isOpen);
  
  // Check if we have email and redirect params that should trigger opening the dialog
  useEffect(() => {
    const email = searchParams.get('email');
    const redirect = searchParams.get('redirect');
    
    if (email && redirect === 'pricing') {
      setShouldOpen(true);
    } else {
      setShouldOpen(isOpen);
    }
  }, [searchParams, isOpen]);
  
  if (!shouldOpen) return null;
  return <SignupForm onClose={onClose} />;
}
