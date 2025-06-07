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
    const { proposalId, action, trackTitle, clientEmail } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Send email notification
    const { error } = await supabaseClient.auth.admin.sendRawEmail({
      email: clientEmail,
      subject: `Sync Proposal ${action === 'accept' ? 'Accepted' : 'Rejected'} - ${trackTitle}`,
      template: `
        <p>Your sync proposal for "${trackTitle}" has been ${action === 'accept' ? 'accepted' : 'rejected'}.</p>
        ${action === 'accept' ? `
          <p>Next steps:</p>
          <ol>
            <li>Review and sign the licensing agreement</li>
            <li>Complete the payment process</li>
            <li>Download your files</li>
          </ol>
        ` : `
          <p>Don't worry! There are many other great tracks available in our catalog.</p>
          <p>Feel free to submit another proposal or browse our collection for alternatives.</p>
        `}
        <p>Visit your dashboard to view the details.</p>
      `
    });

    if (error) throw error;

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