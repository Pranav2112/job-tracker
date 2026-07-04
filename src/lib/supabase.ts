import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in values.')
}

// Storage adapter that respects the "remember me" preference set at sign-in.
// When persistent (default / remember me ON): tokens go to localStorage.
// When not persistent (remember me OFF): tokens go to sessionStorage, which
// the browser clears when all tabs are closed — no token survives a restart.
const sessionAwareStorage = {
  getItem(key: string): string | null {
    // Check sessionStorage first so non-persistent sessions are found even
    // if a stale persistent token exists in localStorage from a prior session.
    return sessionStorage.getItem(key) ?? localStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    const persistent = localStorage.getItem('app_remember_me') !== 'false'
    if (persistent) {
      localStorage.setItem(key, value)
    } else {
      sessionStorage.setItem(key, value)
    }
  },
  removeItem(key: string) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: sessionAwareStorage, autoRefreshToken: true, persistSession: true },
})
