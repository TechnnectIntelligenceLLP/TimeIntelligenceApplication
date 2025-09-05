import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

export const handler = async (req: Request) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { org_id, note, start_at, end_at, project_id } = await req.json();

  const { data, error } = await supabase.from("time_logs")
    .insert({ org_id, note, start_at, end_at, project_id, status: "draft" })
    .select("id")
    .single();

  if (error) return new Response(error.message, { status: 400 });

  // Kick off classifier
  await fetch(`${SUPABASE_URL}/functions/v1/ai-classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ org_id, time_log_id: data.id }),
  }).catch(() => {});

  return new Response(JSON.stringify({ id: data.id }), { status: 200 });
};
