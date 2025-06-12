import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Verify admin status
    const { data: adminData, error: adminError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData || !['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'].includes(adminData.email)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Parse request
    const { payoutId, txHash, method } = await req.json();
    if (!payoutId || !method) throw new Error('Missing required fields');

    // Validate payout exists and is pending
    const { data: payout, error: payoutError } = await supabaseClient
      .from('producer_payouts')
      .select('*')
      .eq('id', payoutId)
      .eq('status', 'pending')
      .single();

    if (payoutError || !payout) throw new Error('Invalid payout ID or already processed');

    // Update status based on payment method
    const updateData = {
      status: 'paid',
      payment_method: method,
      updated_at: new Date().toISOString(),
      ...(txHash && { payment_txn_id: txHash })
    };

    const { error: updateError } = await supabaseClient
      .from('producer_payouts')
      .update(updateData)
      .eq('id', payoutId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, payoutId, method, txHash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
