import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Replace with your actual Helio API key
const HELIO_API_KEY = Deno.env.get('HELIO_API_KEY') || '';
const HELIO_API_URL = 'https://api.hel.io/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('Missing payment_id');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check payment status with Helio
    const helioResponse = await fetch(`${HELIO_API_URL}/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HELIO_API_KEY}`
      }
    });

    if (!helioResponse.ok) {
      const errorData = await helioResponse.json();
      throw new Error(`Helio API error: ${errorData.message || 'Unknown error'}`);
    }

    const helioData = await helioResponse.json();
    
    // Map Helio status to our status format
    let status: 'pending' | 'completed' | 'failed';
    switch (helioData.status) {
      case 'confirmed':
        status = 'completed';
        break;
      case 'failed':
      case 'expired':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    return new Response(
      JSON.stringify({ 
        status,
        transactionId: helioData.transaction_id || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking payment status:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to check payment status' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
