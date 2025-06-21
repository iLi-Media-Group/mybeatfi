import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  {
    global: {
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      }
    }
  }
);

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const ADMIN_PASSWORD = Deno.env.get("ADMIN_EDGE_PASSWORD");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (token !== ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Incorrect admin password" }),
      { status: 401 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400 }
    );
  }

  const { clientId, field, value } = body;

  if (!clientId || typeof field !== "string" || typeof value === "undefined") {
    return new Response(
      JSON.stringify({ error: "Missing required fields: clientId, field, value" }),
      { status: 400 }
    );
  }

  const allowedFields = ["ai_recommendation_enabled"];
  if (!allowedFields.includes(field)) {
    return new Response(
      JSON.stringify({ error: `Field "${field}" is not allowed to be updated.` }),
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("white_label_clients")
    .update({ [field]: value })
    .eq("id", clientId);

  if (error) {
    console.error("Supabase update error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update client feature." }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
 