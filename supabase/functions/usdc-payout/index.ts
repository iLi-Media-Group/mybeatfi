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
      .select(`
        id,
        producer_id,
        amount_usdc,
        month,
        status,
        retry_count,
        producer:profiles!producer_id (
          first_name,
          last_name,
          email,
          usdc_address
        )
      `)
      .eq('id', payoutId)
      .single();

    if (payoutError) throw payoutError;
    if (!payout) throw new Error('Payout not found');
    
    // Validate payout status
    if (payout.status !== 'pending') {
      throw new Error(`Payout is not in pending status (current: ${payout.status})`);
    }

    // Validate USDC address
    if (!payout.producer?.usdc_address) {
      // Update payout status to skipped
      await supabaseClient
        .from('producer_payouts')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString()
        })
        .eq('id', payout.id);
        
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payout skipped: No USDC wallet address provided' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment retry count
    await supabaseClient
      .from('producer_payouts')
      .update({
        retry_count: (payout.retry_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', payout.id);

    // Send USDC payment via Helio API
    const paymentResponse = await fetch(`${HELIO_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELIO_API_KEY}`
      },
      body: JSON.stringify({
        amount: {
          amount: payout.amount_usdc.toString(),
          currency: 'USDC'
        },
        destination: payout.producer.usdc_address,
        metadata: {
          payout_id: payout.id,
          producer_id: payout.producer_id,
          month: payout.month,
          description: `MyBeatFi Sync payout for ${payout.month}`
        }
      })
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      throw new Error(`Helio payment failed: ${errorData.message || 'Unknown error'}`);
    }

    const paymentData = await paymentResponse.json();
    const transactionId = paymentData.transaction_id;

    // Update payout record
    await supabaseClient
      .from('producer_payouts')
      .update({
        status: 'paid',
        payment_txn_id: transactionId,
        payment_method: 'usdc_solana',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payout.id);

    // Send email notification to producer
    try {
      await supabaseClient.auth.admin.sendRawEmail({
        email: payout.producer.email,
        subject: `Your USDC Payout for ${payout.month} Has Been Sent`,
        template: `
          <p>Hello ${payout.producer.first_name},</p>
          <p>We've sent your USDC payout of $${payout.amount_usdc.toFixed(2)} for ${payout.month} to your wallet address:</p>
          <p><code>${payout.producer.usdc_address}</code></p>
          <p>Transaction ID: ${transactionId}</p>
          <p>Thank you for being a part of MyBeatFi Sync!</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Continue processing even if email fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        payout: {
          id: payout.id,
          producerId: payout.producer_id,
          producerName: `${payout.producer.first_name || ''} ${payout.producer.last_name || ''}`.trim(),
          amount: payout.amount_usdc,
          month: payout.month,
          status: 'paid',
          transactionId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing USDC payout:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process USDC payout' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
