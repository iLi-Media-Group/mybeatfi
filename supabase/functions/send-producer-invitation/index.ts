import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, firstName, lastName, invitationCode } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Send email using Supabase's built-in email service
    const { error } = await supabaseClient.auth.admin.sendRawEmail({
      email,
      subject: 'Welcome to MYBEATFI SYNC – Submit Your Music!',
      template: `
        <p>Congratulations!</p>

        <p>You have been invited to submit your music to the MYBEATFI SYNC music library. This is your opportunity to showcase your tracks to potential clients and earn through sync licensing.</p>

        <p>To get started:</p>

        <p>Visit <a href="${Deno.env.get('PUBLIC_SITE_URL') || ''}">mybeatfi.io</a>.</p>

        <p>Sign up as a producer.</p>

        <p>Use the following one-time code during registration:</p>

        <p style="font-size: 24px; font-weight: bold; color: #9333ea; padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
          ${invitationCode}
        </p>

        <p>We're excited to have you on board and can't wait to hear your music!</p>

        <p>The MYBEATFI SYNC Team</p>
      `
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Invitation email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
