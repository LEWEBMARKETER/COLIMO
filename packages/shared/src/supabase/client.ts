import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseClient(url: string, publishableKey: string): SupabaseClient {
  return createClient(url, publishableKey);
}

export type { SupabaseClient };
