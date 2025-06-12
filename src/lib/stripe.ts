import Stripe from 'stripe';
import { supabase } from './supabase';
import { PRODUCTS } from '../stripe-config';
import { calculateTimeRemaining, formatDuration } from '../utils/dateUtils';

export function getMembershipPlanFromPriceId(priceId) {
  // Your existing implementation
}

export function getUserSubscription(subscriptionId: string) {
  const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY!);
  return stripe.subscriptions.retrieve(subscriptionId);
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

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export async function createCheckoutSession(params: {
  productId: string;
  name: string;
  description: string;
  price: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY!);
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: params.name,
          description: params.description,
        },
        unit_amount: Math.round(params.price * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      product_id: params.productId
    }
  });

  return session;
}
