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
    const { email, firstName, lastName, invitationCode } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if invitation exists and is valid
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('producer_invitations')
      .select('*')
      .eq('invitation_code', invitationCode)
      .eq('email', email)
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invalid or expired invitation code');
    }

    if (invitation.used) {
      throw new Error('This invitation code has already been used');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('This invitation code has expired');
    }

    // Mark invitation as used
    const { error: updateError } = await supabaseClient
      .from('producer_invitations')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    // Create user account
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        account_type: 'producer'
      }
    });

    if (userError) throw userError;

    // Create producer profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: userData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        account_type: 'producer'
      });

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ message: 'Producer account created successfully' }),
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
