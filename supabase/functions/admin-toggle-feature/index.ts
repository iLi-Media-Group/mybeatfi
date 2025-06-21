// Edge Function: admin-toggle-feature
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Important: Use Service Role key for DB write access
);

serve(async (req) => {
  const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');

  const { clientId, field, value, adminPassword } = await req.json();

  if (adminPassword !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid admin password.' }), { status: 401 });
  }

  if (!clientId || !field) {
    return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400 });
  }

  const { error } = await supabaseClient
    .from('white_label_clients')
    .update({ [field]: value })
    .eq('id', clientId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
