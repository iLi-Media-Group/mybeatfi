import { supabase } from './supabase';

export async function createCheckoutSession(priceId: string, mode: 'payment' | 'subscription', trackId?: string) {
  try {
    // Get the current session - this implicitly handles refresh
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to make a purchase');
    }

    // Prepare metadata for the checkout session
    let checkoutMetadata = {};
    if (trackId) {
      checkoutMetadata = { track_id: trackId };
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/pricing`,
        mode,
        metadata: checkoutMetadata
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function getUserSubscription() {
  try {
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

export async function getUserOrders() {
  try {
    const { data, error } = await supabase
      .from('stripe_user_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

export function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function getMembershipPlanFromPriceId(priceId: string) {
  switch (priceId) {
    case 'price_1RVXvoIkn3xpidKHRzHgSFn1':
      return 'Ultimate Access';
    case 'price_1RVXurIkn3xpidKH18dW0FYC':
      return 'Platinum Access';
    case 'price_1RVXu9Ikn3xpidKHqxoSb6bC':
      return 'Gold Access';
    case 'price_1RVXtSIkn3xpidKHaI8hnYLU':
      return 'Single Track';
    default:
      return 'Unknown Plan';
  }
}