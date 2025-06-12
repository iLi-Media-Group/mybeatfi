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
    const {
      product_id,
      price,
      name,
      description,
      success_url,
      cancel_url,
      metadata = {}
    } = await req.json();

    // Validate required fields
    if (!product_id || !price || !name || !success_url || !cancel_url) {
      throw new Error('Missing required fields');
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

    // Create checkout session with Helio
    const helioResponse = await fetch(`${HELIO_API_URL}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HELIO_API_KEY}`
      },
      body: JSON.stringify({
        amount: {
          amount: price.toString(),
          currency: 'USD'
        },
        merchant_data: {
          name: name,
          description: description,
          image_url: 'https://mybeatfi.io/logo.png'
        },
        success_url: success_url,
        cancel_url: cancel_url,
        metadata: {
          user_id: user.id,
          product_id: product_id,
          ...metadata
        }
      })
    });

    if (!helioResponse.ok) {
      const errorData = await helioResponse.json();
      throw new Error(`Helio API error: ${errorData.message || 'Unknown error'}`);
    }

    const helioData = await helioResponse.json();

    return new Response(
      JSON.stringify({ url: helioData.checkout_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Helio checkout:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create checkout' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
