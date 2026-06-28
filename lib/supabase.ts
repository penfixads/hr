import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Client is created lazily; will throw at runtime if env vars are missing
let _client: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured.')
    }
    _client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _client
}

// Convenience default export — safe to import anywhere; only throws when called
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return getSupabase()[prop as keyof ReturnType<typeof createClient>]
  },
})
