import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { classifyComment } from "./classifier.ts";

export const handler = async (req: Request) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { org_id, time_log_id } = await req.json();

    const { data: log } = await supabase.from("time_logs").select("*").eq("id", time_log_id).single();
    if (!log) return new Response("time_log not found", { status: 404 });

    const result = classifyComment(log.note ?? "");

    await supabase.from("ai_extractions").insert({
      org_id,
      time_log_id,
      model: "tnx-deno-classifier",
      model_version: "1.0",
      json_raw: result,
      confidence: 0.75,
    });

    await supabase.from("time_logs").update({
      activity: result["Activity"] ?? log.activity,
      note: result["Comments"] ?? log.note,
      status: "processed",
    }).eq("id", time_log_id);

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err: any) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};
