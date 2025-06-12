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
      licenseId,
      licenseeEmail,
      licenseeInfo,
      trackTitle,
      licenseType,
      pdfUrl
    } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Send email with license agreement
    const { error: emailError } = await supabaseClient.auth.admin.sendRawEmail({
      email: licenseeEmail,
      subject: `Your License Agreement for "${trackTitle}"`,
      template: `
        <p>Thank you for licensing "${trackTitle}" through MyBeatFi Sync!</p>
        
        <p>Your ${licenseType} license agreement is attached. Please keep this for your records.</p>
        
        <p>You can also download your agreement here:</p>
        <p><a href="${pdfUrl}">Download License Agreement</a></p>
        
        <p>Important Next Steps:</p>
        <ol>
          <li>Download and save your license agreement</li>
          <li>Review the terms and usage rights</li>
          <li>Access your licensed track in your dashboard</li>
        </ol>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>MyBeatFi Sync Team</p>
      `
    });

    if (emailError) throw emailError;

    // Store license agreement in database
    const { error: dbError } = await supabaseClient
      .from('license_agreements')
      .insert({
        license_id: licenseId,
        pdf_url: pdfUrl,
        licensee_info: licenseeInfo,
        sent_at: new Date().toISOString()
      });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ message: 'License agreement processed successfully' }),
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
