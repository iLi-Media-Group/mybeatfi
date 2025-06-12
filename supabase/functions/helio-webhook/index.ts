import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helio webhook secret for verification
const HELIO_WEBHOOK_SECRET = Deno.env.get('HELIO_WEBHOOK_SECRET') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('helio-signature');
    if (!signature) {
      throw new Error('Missing Helio signature');
    }

    // TODO: Implement proper signature verification with HELIO_WEBHOOK_SECRET
    // This would typically involve comparing a HMAC of the request body with the signature

    const payload = await req.json();
    const { event, data } = payload;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process different event types
    if (event === 'payment.completed') {
      const { 
        id: payment_id,
        amount,
        status,
        metadata
      } = data;

      // Extract metadata
      const { user_id, product_id, track_id, license_type, proposal_id } = metadata || {};

      if (!user_id) {
        throw new Error('Missing user_id in metadata');
      }

      // Record the payment in our database
      const { error: paymentError } = await supabaseClient
        .from('crypto_payments')
        .insert({
          payment_id,
          user_id,
          amount: parseFloat(amount.amount),
          currency: amount.currency,
          status,
          product_id,
          track_id,
          metadata
        });

      if (paymentError) {
        throw paymentError;
      }

      // If this is a track license purchase
      if (track_id && license_type) {
        // Get track details to get producer_id
        const { data: trackData, error: trackError } = await supabaseClient
          .from('tracks')
          .select('id, producer_id')
          .eq('id', track_id)
          .single();
        
        if (trackError) {
          throw trackError;
        }
        
        // Get user profile for licensee info
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user_id)
          .single();
        
        if (profileError) {
          throw profileError;
        }
        
        // Create license record
        const { error: saleError } = await supabaseClient
          .from('sales')
          .insert({
            track_id: trackData.id,
            producer_id: trackData.producer_id,
            buyer_id: user_id,
            license_type,
            amount: parseFloat(amount.amount),
            payment_method: 'crypto',
            transaction_id: payment_id,
            created_at: new Date().toISOString(),
            licensee_info: {
              name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
              email: profileData.email
            }
          });
        
        if (saleError) {
          throw saleError;
        }
      }

      // If this is a sync proposal payment
      if (proposal_id) {
        // Update proposal payment status
        const { error: updateError } = await supabaseClient
          .from('sync_proposals')
          .update({
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            invoice_id: payment_id
          })
          .eq('id', proposal_id);
          
        if (updateError) {
          throw updateError;
        }
        
        // Get proposal details
        const { data: proposalData, error: proposalError } = await supabaseClient
          .from('sync_proposals')
          .select(`
            id, 
            track_id, 
            client_id,
            track:tracks!inner (
              producer_id,
              title
            )
          `)
          .eq('id', proposal_id)
          .single();
          
        if (proposalError) {
          throw proposalError;
        }
        
        // Get producer email for notification
        const { data: producerData, error: producerError } = await supabaseClient
          .from('profiles')
          .select('email')
          .eq('id', proposalData.track.producer_id)
          .single();
          
        if (producerError) {
          throw producerError;
        }
        
        // Get client email for notification
        const { data: clientData, error: clientError } = await supabaseClient
          .from('profiles')
          .select('email')
          .eq('id', proposalData.client_id)
          .single();
          
        if (clientError) {
          throw clientError;
        }
        
        // Send notifications
        try {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-proposal-update`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              proposalId: proposal_id,
              action: 'payment_complete',
              trackTitle: proposalData.track.title,
              producerEmail: producerData.email,
              clientEmail: clientData.email
            })
          });
        } catch (notifyError) {
          console.error('Error sending payment notification:', notifyError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Helio webhook:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process webhook' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
