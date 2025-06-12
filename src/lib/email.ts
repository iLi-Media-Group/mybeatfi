import { supabase } from './supabase';

interface SendLicenseEmailParams {
  clientName: string;
  clientEmail: string;
  trackName: string;
  licenseTier: string;
  licenseDate: string;
  expirationDate?: string;
  pdfUrl: string;
}

export async function sendLicenseEmail(params: SendLicenseEmailParams): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-license-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send license email');
  }
}
