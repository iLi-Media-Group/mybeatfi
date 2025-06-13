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
    const { month, forceRegenerate = false } = await req.json();

    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }

    // Check if payouts already exist for this month
    const { count: existingCount, error: countError } = await supabaseClient
      .from('producer_payouts')
      .select('id', { count: 'exact', head: true })
      .eq('month', month);

    if (countError) throw countError;

    if (existingCount && existingCount > 0 && !forceRegenerate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Payouts for ${month} already exist. Use forceRegenerate=true to override.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If regenerating, delete existing payouts
    if (forceRegenerate && existingCount && existingCount > 0) {
      const { error: deleteError } = await supabaseClient
        .from('producer_payouts')
        .delete()
        .eq('month', month);

      if (deleteError) throw deleteError;
    }

    // Fetch active producers with USDC addresses
    const { data: producers, error: producersError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, email, usdc_address')
      .eq('account_type', 'producer');

    if (producersError) throw producersError;

    if (!producers || producers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No producers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get compensation settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('compensation_settings')
      .select('*')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

    // Default settings if none found
    const compensationSettings = settings || {
      standard_rate: 70,
      exclusive_rate: 80,
      sync_fee_rate: 85,
      no_sales_bucket_rate: 2,
      growth_bonus_rate: 5,
      no_sale_bonus_rate: 3
    };

    // Process results
    const results = [];
    let totalPayouts = 0;

    // Process each producer
    for (const producer of producers) {
      try {
        // Calculate earnings for the month using the database function
        const { data: earningsData, error: earningsError } = await supabaseClient.rpc(
          'calculate_producer_earnings',
          {
            month_input: month,
            producer_id_input: producer.id
          }
        );

        if (earningsError) throw earningsError;

        const earnings = earningsData?.[0]?.total || 0;
        
        // Determine payout status
        let status = 'pending';
        let amount = earnings;
        
        // Skip if no earnings and no USDC address
        if (earnings <= 0 && !producer.usdc_address) {
          status = 'skipped';
        }
        
        // Create payout record
        const { data: payout, error: payoutError } = await supabaseClient
          .from('producer_payouts')
          .insert({
            producer_id: producer.id,
            amount_usdc: amount,
            month,
            status
          })
          .select()
          .single();

        if (payoutError) throw payoutError;

        results.push({
          producerId: producer.id,
          producerName: `${producer.first_name || ''} ${producer.last_name || ''}`.trim(),
          email: producer.email,
          hasUsdcAddress: !!producer.usdc_address,
          amount,
          status,
          payoutId: payout.id
        });

        if (status === 'pending') {
          totalPayouts++;
        }
      } catch (err) {
        console.error(`Error processing producer ${producer.id}:`, err);
        results.push({
          producerId: producer.id,
          producerName: `${producer.first_name || ''} ${producer.last_name || ''}`.trim(),
          email: producer.email,
          error: err.message
        });
      }
    }

    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        month,
        summary: {
          totalProducers: producers.length,
          payoutsGenerated: totalPayouts,
          skipped: producers.length - totalPayouts
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating monthly payouts:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate monthly payouts' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
