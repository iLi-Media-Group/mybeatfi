import { supabase } from './supabase';

export async function createHelioCheckout({
  productId,
  name,
  description,
  price,
  successUrl,
  cancelUrl,
  metadata
}: {
  productId: string;
  name: string;
  description: string;
  price: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  try {
    // Get the current session - this implicitly handles refresh
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to make a purchase');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helio-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        product_id: productId,
        name,
        description,
        price,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create Helio checkout');
    }

    const { checkout_url } = await response.json();
    return checkout_url;
  } catch (error) {
    console.error('Error creating Helio checkout:', error);
    throw error;
  }
}

export async function getHelioPaymentStatus(sessionId: string) {
  try {
    // Get the current session - this implicitly handles refresh
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to check payment status');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helio-payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        session_id: sessionId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to retrieve payment status');
    }

    const paymentStatus = await response.json();
    return paymentStatus;
  } catch (error) {
    console.error('Error checking Helio payment status:', error);
    throw error;
  }
}
