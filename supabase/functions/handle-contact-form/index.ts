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
    const { name, email, subject, message } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert into contact_messages table
    const { error: insertError } = await supabaseClient
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        message,
        status: 'unread'
      });

    if (insertError) throw insertError;

    // Send email notification to company email
    const { error: emailError } = await supabaseClient.auth.admin.sendRawEmail({
      email: 'contactmybeatfi@gmail.com',
      subject: `New Contact Form: ${subject}`,
      template: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p>Login to your admin dashboard to respond to this message.</p>
      `
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({ message: 'Contact form submitted successfully' }),
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
