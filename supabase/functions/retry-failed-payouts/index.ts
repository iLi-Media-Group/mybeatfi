import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData || !['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'].includes(adminData.email)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Parse request body
    const { maxRetries = 3 } = await req.json();

    // Find failed payouts that haven't exceeded max retries
    const { data: failedPayouts, error: payoutsError } = await supabaseClient
      .from('producer_payouts')
      .select('id')
      .eq('status', 'pending')
      .lt('retry_count', maxRetries);

    if (payoutsError) throw payoutsError;

    if (!failedPayouts || failedPayouts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No failed payouts to retry' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process results
    const results = [];

    // Retry each payout by calling the usdc-payout function
    for (const payout of failedPayouts) {
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/usdc-payout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payoutId: payout.id
          })
        });

        const result = await response.json();
        results.push({
          payoutId: payout.id,
          success: result.success,
          ...(!result.success && { error: result.error })
        });
      } catch (err) {
        console.error(`Error retrying payout ${payout.id}:`, err);
        results.push({
          payoutId: payout.id,
          success: false,
          error: err.message
        });
      }
    }

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: failedPayouts.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error retrying failed payouts:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to retry failed payouts' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
