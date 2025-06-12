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
    const { amount, recipient_id, currency = 'usd', metadata = {} } = await req.json();

    // Validate required fields
    if (!amount || !recipient_id) {
      throw new Error('Missing required fields (amount, recipient_id)');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Create payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      destination: recipient_id,
      metadata: {
        user_id: user.id,
        ...metadata
      }
    });

    // Record payout in database
    const { error: dbError } = await supabaseClient
      .from('payouts')
      .insert({
        payout_id: payout.id,
        user_id: user.id,
        amount: amount,
        currency,
        status: payout.status,
        recipient_id,
        metadata
      });

    if (dbError) {
      throw dbError;
    }

    return new Response(
      JSON.stringify({ payout_id: payout.id, status: payout.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating payout:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payout' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
