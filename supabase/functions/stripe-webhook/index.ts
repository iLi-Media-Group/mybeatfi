import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing Stripe signature');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    );

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process different event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { 
        id: payment_id,
        amount_total,
        currency,
        payment_status,
        metadata
      } = session;

      const { user_id, product_id, track_id, license_type, proposal_id } = metadata;

      if (!user_id) {
        throw new Error('Missing user_id in metadata');
      }

      // Record the payment in our database
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          payment_id,
          user_id,
          amount: amount_total / 100, // Convert back to dollars
          currency,
          status: payment_status,
          payment_method: 'stripe',
          product_id,
          track_id,
          metadata
        });

      if (paymentError) {
        throw paymentError;
      }

      // Handle track license purchases
      if (track_id && license_type) {
        // Similar logic to Helio webhook for license creation
        // ...
      }

      // Handle sync proposal payments
      if (proposal_id) {
        // Similar logic to Helio webhook for proposal updates
        // ...
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process webhook' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
