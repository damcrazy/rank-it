"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

/** Singleton browser client — safe to call in any Client Component. */
export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    )
  }
  return client
}
