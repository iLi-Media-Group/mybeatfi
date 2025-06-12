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
    const { proposalId, action, trackTitle, clientEmail, producerEmail } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine which email to send based on the action and recipient
    if (clientEmail) {
      // Email to client
      const { error } = await supabaseClient.auth.admin.sendRawEmail({
        email: clientEmail,
        subject: `Sync Proposal ${action === 'accept' ? 'Accepted' : 'Rejected'} - ${trackTitle}`,
        template: `
          <p>Your sync proposal for "${trackTitle}" has been ${action === 'accept' ? 'accepted' : 'rejected'} by the producer.</p>
          ${action === 'accept' ? `
            <p>Next steps:</p>
            <ol>
              <li>Review and accept the proposal in your dashboard</li>
              <li>Complete the payment process</li>
              <li>Download your files once available</li>
            </ol>
          ` : `
            <p>Don't worry! There are many other great tracks available in our catalog.</p>
            <p>Feel free to submit another proposal or browse our collection for alternatives.</p>
          `}
          <p>Visit your dashboard to view the details.</p>
        `
      });
      
      if (error) throw error;
    }
    
    if (producerEmail && action === 'client_accept') {
      // Email to producer when client accepts
      const { error } = await supabaseClient.auth.admin.sendRawEmail({
        email: producerEmail,
        subject: `Client Accepted Sync Proposal - ${trackTitle}`,
        template: `
          <p>Good news! The client has accepted your sync proposal for "${trackTitle}".</p>
          <p>They will now proceed with payment according to the agreed terms.</p>
          <p>You'll receive another notification when payment is complete.</p>
          <p>Visit your dashboard to view the details.</p>
        `
      });
      
      if (error) throw error;
    }
    
    if (producerEmail && action === 'payment_complete') {
      // Email to producer when payment is complete
      const { error } = await supabaseClient.auth.admin.sendRawEmail({
        email: producerEmail,
        subject: `Payment Received for Sync Proposal - ${trackTitle}`,
        template: `
          <p>Great news! Payment has been received for your sync proposal for "${trackTitle}".</p>
          <p>You can now proceed with delivering the final files to the client.</p>
          <p>Visit your dashboard to view the details and manage the delivery.</p>
        `
      });
      
      if (error) throw error;
    }

    if (clientEmail && action === 'payment_complete') {
      // Email to client when payment is complete
      const { error } = await supabaseClient.auth.admin.sendRawEmail({
        email: clientEmail,
        subject: `Payment Confirmed for Sync License - ${trackTitle}`,
        template: `
          <p>Your payment for the sync license of "${trackTitle}" has been confirmed.</p>
          <p>The producer will now prepare and deliver the final files to you.</p>
          <p>Visit your dashboard to track the progress and download your files once they're available.</p>
        `
      });
      
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ message: 'Notification sent successfully' }),
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
