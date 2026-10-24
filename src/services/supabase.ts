import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Checks whether valid Supabase environment variables have been supplied.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-ref') &&
    supabaseAnonKey.length > 20
  );
};

/**
 * Evaluates whether Demo Mode is permitted.
 *
 * STRICT SECURITY CONSTRAINTS:
 * 1. Must NEVER be permitted in production builds (import.meta.env.PROD).
 * 2. Must be running on localhost/127.0.0.1.
 * 3. Requires explicit opt-in via VITE_ENABLE_DEMO_MODE=true.
 */
export const isDemoModeAllowed = (): boolean => {
  if (import.meta.env.PROD) {
    return false;
  }

  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname === '::1';
    
    if (!isLocalhost) {
      return false;
    }
  }

  return import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
};

/**
 * Diagnostic status helper for the UI setup banner.
 */
export const getSupabaseConfigStatus = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    url: supabaseUrl || '',
    hasKey: Boolean(supabaseAnonKey && supabaseAnonKey.length > 20),
    demoAllowed: isDemoModeAllowed(),
  };
};

/**
 * Shared Supabase Client instance.
 * Uses real credentials when configured, or a placeholder client that keeps the app
 * from crashing on import while still surfacing misconfiguration clearly.
 */
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient(
      supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder-chirala.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key-localhandyman-chirala',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
