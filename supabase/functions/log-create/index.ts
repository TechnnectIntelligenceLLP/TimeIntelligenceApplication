import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

export const handler = async (req: Request) => {
  const SUPABASE_URL = Deno.env.get("628a36c7747607871fbd7ed780ba2ed4e84e9626b9341a4621e9bdeaf00bfab0")!;
  const SERVICE_KEY = Deno.env.get("b680746fbb8e9ff1c246266d7eb40f9301b6ec4d637425f13cc74486cdf0ed3d")!;
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
