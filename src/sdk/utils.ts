import { SupabaseClient } from "@supabase/supabase-js";

async function getRoomIdByCode(code: string, supabase: SupabaseClient) {
  const result = await supabase
    .from("engagement_session")
    .select("id")
    .eq("code", code)
    .single();
  if (result.error) {
    throw result.error;
  }
  return result.data.id;
}

export { getRoomIdByCode };
