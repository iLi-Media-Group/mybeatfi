import { supabase } from './supabase';

interface CreatePayoutParams {
  amount: number;
  recipient_id: string;
  currency?: string;
  metadata?: Record<string, string>;
}

export async function createStripePayout({
  amount,
  recipient_id,
  currency = 'usd',
  metadata = {}
}: CreatePayoutParams) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to create a payout');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        amount,
        recipient_id,
        currency,
        metadata
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payout');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payout:', error);
    throw error;
  }
}

export async function getPayoutStatus(payoutId: string) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to check payout status');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-payout-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        payout_id: payoutId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to retrieve payout status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking payout status:', error);
    throw error;
  }
}
