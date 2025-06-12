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
      proposalId,
      uploaderId,
      fileName,
      fileUrl,
      fileType,
      fileSize,
      recipientEmail
    } = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Record file share
    const { error: fileError } = await supabaseClient
      .from('proposal_files')
      .insert({
        proposal_id: proposalId,
        uploader_id: uploaderId,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize
      });

    if (fileError) throw fileError;

    // Send email notification
    const { error: emailError } = await supabaseClient.auth.admin.sendRawEmail({
      email: recipientEmail,
      subject: 'New File Shared for Sync Proposal',
      template: `
        <p>A new file has been shared for your sync proposal:</p>
        <p>File: ${fileName}</p>
        <p>Type: ${fileType}</p>
        <p>Please log in to your dashboard to access the file.</p>
      `
    });

    if (emailError) throw emailError;

    return new Response(
      JSON.stringify({ message: 'File share processed successfully' }),
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
