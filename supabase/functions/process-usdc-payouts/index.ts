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

// Solana configuration
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com';

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

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData || !['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'].includes(adminData.email)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Parse request body
    const { month, dryRun = false } = await req.json();

    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }

    // 1. Query eligible producer payouts
    const { data: payouts, error: payoutsError } = await supabaseClient
      .from('producer_payouts')
      .select(`
        id,
        producer_id,
        amount_usdc,
        month,
        status,
        producer:profiles!producer_id (
          first_name,
          last_name,
          email,
          usdc_address
        )
      `)
      .eq('month', month)
      .eq('status', 'pending')
      .gt('amount_usdc', 0);

    if (payoutsError) throw payoutsError;

    if (!payouts || payouts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No eligible payouts found for the specified month' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process results
    const results = [];
    const failedPayouts = [];
    const successfulPayouts = [];

    // Process each payout
    for (const payout of payouts) {
      try {
        // 2. Check if producer has a USDC wallet address
        if (!payout.producer?.usdc_address) {
          results.push({
            payoutId: payout.id,
            producerId: payout.producer_id,
            producerName: `${payout.producer?.first_name || ''} ${payout.producer?.last_name || ''}`.trim(),
            amount: payout.amount_usdc,
            status: 'skipped',
            reason: 'No USDC wallet address provided'
          });

          // Update payout status to skipped
          if (!dryRun) {
            await supabaseClient
              .from('producer_payouts')
              .update({
                status: 'skipped',
                updated_at: new Date().toISOString()
              })
              .eq('id', payout.id);
          }
          
          continue;
        }

        // Skip actual payment in dry run mode
        if (dryRun) {
          results.push({
            payoutId: payout.id,
            producerId: payout.producer_id,
            producerName: `${payout.producer?.first_name || ''} ${payout.producer?.last_name || ''}`.trim(),
            amount: payout.amount_usdc,
            walletAddress: payout.producer.usdc_address,
            status: 'simulated',
            reason: 'Dry run mode'
          });
          continue;
        }

        // 3. Trigger USDC transfer via Helio API
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

        // 4. Update payout record as "paid"
        await supabaseClient
          .from('producer_payouts')
          .update({
            status: 'paid',
            payment_txn_id: transactionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', payout.id);

        // Add to successful payouts
        successfulPayouts.push({
          payoutId: payout.id,
          producerId: payout.producer_id,
          producerName: `${payout.producer?.first_name || ''} ${payout.producer?.last_name || ''}`.trim(),
          amount: payout.amount_usdc,
          walletAddress: payout.producer.usdc_address,
          status: 'paid',
          transactionId
        });

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

        results.push({
          payoutId: payout.id,
          producerId: payout.producer_id,
          producerName: `${payout.producer?.first_name || ''} ${payout.producer?.last_name || ''}`.trim(),
          amount: payout.amount_usdc,
          walletAddress: payout.producer.usdc_address,
          status: 'paid',
          transactionId
        });
      } catch (err) {
        console.error(`Error processing payout ${payout.id}:`, err);
        
        // Add to failed payouts
        failedPayouts.push({
          payoutId: payout.id,
          producerId: payout.producer_id,
          producerName: `${payout.producer?.first_name || ''} ${payout.producer?.last_name || ''}`.trim(),
          amount: payout.amount_usdc,
          status: 'failed',
          error: err.message
        });

        results.push({
          payoutId: payout.id,
          producerId: payout.producer_id,
          producerName: `${payout.producer?.first_name || ''} ${payout.producer?.last_name || ''}`.trim(),
          amount: payout.amount_usdc,
          status: 'failed',
          error: err.message
        });
      }
    }

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        month,
        summary: {
          total: payouts.length,
          successful: successfulPayouts.length,
          failed: failedPayouts.length,
          skipped: payouts.length - successfulPayouts.length - failedPayouts.length
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing USDC payouts:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process USDC payouts' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
