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
      clientName,
      clientEmail,
      trackName,
      licenseTier,
      licenseDate,
      expirationDate,
      pdfUrl
    } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const emailTemplate = `
      Hey ${clientName},

      Thanks for licensing "${trackName}" with MyBeatFi Sync! 🎧  
      Your creativity just leveled up.

      ---

      **License Summary:**
      - Track: ${trackName}
      - License Tier: ${licenseTier}
      - Start Date: ${new Date(licenseDate).toLocaleDateString()}
      - Expiration: ${expirationDate ? new Date(expirationDate).toLocaleDateString() : 'Perpetual'} (unless Ultimate Access)

      ✅ Your license document is attached to this email.  
      ✅ You are fully cleared for online use according to our Terms.

      ---

      ## 🔥 Special Offer Just for You!

      **Level up your creativity with a bonus deal:**

      🎵 **Option 1:** Grab another track — **25% OFF your next Single Track license!**  
      Use code: **MYBEAT25** at checkout.

      🎵 **Option 2:** Or unlock unlimited tracks with **Gold Access** for just **$24.99/month** — one low price, unlimited inspiration.

      [🔑 Upgrade to Gold Access ➔](${Deno.env.get('PUBLIC_SITE_URL')}/upgrade)

      Your music deserves more freedom. 🚀

      ---

      Thanks again for creating with us.  
      We can't wait to hear what you build!

      Stay creative,  
      **The MyBeatFi Sync Team**

      ---
      *Need help?* [Contact Us](${Deno.env.get('PUBLIC_SITE_URL')}/contact)
    `;

    // Send email with license
    const { error: emailError } = await supabaseClient.auth.admin.sendRawEmail({
      email: clientEmail,
      subject: `Your MyBeatFi Sync License for "${trackName}"`,
      template: emailTemplate,
      attachments: [{
        name: 'license-agreement.pdf',
        url: pdfUrl
      }]
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({ message: 'License email sent successfully' }),
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
