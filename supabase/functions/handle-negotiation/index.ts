import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      proposalId,
      senderId,
      message,
      counterOffer,
      counterTerms,
      recipientEmail
    } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create negotiation record
    const { error: negotiationError } = await supabaseClient
      .from('proposal_negotiations')
      .insert({
        proposal_id: proposalId,
        sender_id: senderId,
        message,
        counter_offer: counterOffer,
        counter_terms: counterTerms
      });

    if (negotiationError) throw negotiationError;

    // Update proposal status
    const { error: statusError } = await supabaseClient
      .from('sync_proposals')
      .update({ negotiation_status: 'negotiating' })
      .eq('id', proposalId);

    if (statusError) throw statusError;

    // Send email notification
    const { error: emailError } = await supabaseClient.auth.admin.sendRawEmail({
      email: recipientEmail,
      subject: 'New Counter-Offer Received',
      template: `
        <p>You have received a new counter-offer for your sync proposal.</p>
        <p>Message: ${message}</p>
        ${counterOffer ? `<p>Counter Offer: $${counterOffer}</p>` : ''}
        ${counterTerms ? `<p>Proposed Terms: ${counterTerms}</p>` : ''}
        <p>Please log in to your dashboard to review and respond.</p>
      `
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({ message: 'Negotiation processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
