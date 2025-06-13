import { supabase } from './supabase';

interface HelioCheckoutOptions {
  productId: string;
  price: number;
  name: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export async function createHelioCheckout(options: HelioCheckoutOptions): Promise<string> {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to make a purchase');
    }

    // Call our edge function to create a Helio checkout
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helio-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        product_id: options.productId,
        price: options.price,
        name: options.name,
        description: options.description,
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        metadata: {
          user_id: session.user.id,
          ...options.metadata
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create Helio checkout');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error creating Helio checkout:', error);
    throw error;
  }
}

export async function getHelioPaymentStatus(paymentId: string): Promise<{
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
}> {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to check payment status');
    }

    // Call our edge function to check payment status
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helio-payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        payment_id: paymentId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check payment status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking Helio payment status:', error);
    throw error;
  }
}
