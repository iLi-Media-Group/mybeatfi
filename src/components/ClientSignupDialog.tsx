import React from 'react';
import { SignupForm } from './SignupForm';

interface ClientSignupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClientSignupDialog({ isOpen, onClose }: ClientSignupDialogProps) {
  if (!isOpen) return null;
  return <SignupForm onClose={onClose} />;
}