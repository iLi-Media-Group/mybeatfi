import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helio API configuration
const HELIO_API_KEY = Deno.env.get('HELIO_API_KEY') || '';
const HELIO_API_URL = 'https://api.hel.io/v1';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { payoutId } = await req.json();

    if (!payoutId) {
      throw new Error('Missing payoutId parameter');
    }

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('producer_payouts')
      .select('id, payment_txn_id, status')
      .eq('id', payoutId)
      .single();

    if (payoutError) throw payoutError;
    if (!payout) throw new Error('Payout not found');
    
    // If payout is not marked as paid or has no transaction ID, return current status
    if (payout.status !== 'paid' || !payout.payment_txn_id) {
      return new Response(
        JSON.stringify({ 
          status: payout.status,
          transactionId: payout.payment_txn_id || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check transaction status with Helio API
    const paymentResponse = await fetch(`${HELIO_API_URL}/payments/${payout.payment_txn_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HELIO_API_KEY}`
      }
    });

    if (!paymentResponse.ok) {
      // If we can't get the status, just return the current database status
      return new Response(
        JSON.stringify({ 
          status: payout.status,
          transactionId: payout.payment_txn_id,
          blockchainStatus: 'unknown'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await paymentResponse.json();
    
    return new Response(
      JSON.stringify({
        status: payout.status,
        transactionId: payout.payment_txn_id,
        blockchainStatus: paymentData.status,
        blockchainDetails: {
          confirmations: paymentData.confirmations,
          timestamp: paymentData.timestamp,
          network: paymentData.network
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking payout status:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to check payout status' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
