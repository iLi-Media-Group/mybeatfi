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
    const { bucket, path, chunks, originalName } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download and combine chunks
    const chunkBuffers = []
    for (let i = 0; i < chunks; i++) {
      const chunkPath = `${path}.part${i}`
      const { data, error } = await supabaseClient.storage
        .from(bucket)
        .download(chunkPath)

      if (error) throw error
      chunkBuffers.push(await data.arrayBuffer())

      // Clean up chunk
      await supabaseClient.storage
        .from(bucket)
        .remove([chunkPath])
    }

    // Combine chunks
    const combinedBuffer = new Uint8Array(
      chunkBuffers.reduce((acc, curr) => acc + curr.byteLength, 0)
    )
    let offset = 0
    chunkBuffers.forEach(buffer => {
      combinedBuffer.set(new Uint8Array(buffer), offset)
      offset += buffer.byteLength
    })

    // Upload combined file
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, combinedBuffer, {
        contentType: originalName.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav',
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    return new Response(
      JSON.stringify(data),
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
