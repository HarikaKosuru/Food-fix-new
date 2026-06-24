/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

const staticUrl = import.meta.env.VITE_SUPABASE_URL;
const staticKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (staticUrl && staticKey) {
  client = createClient(staticUrl, staticKey);
}

const dummyClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ data: { session: null, user: null }, error: new Error('Supabase not configured') }),
    signUp: async () => ({ data: { session: null, user: null }, error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: null }),
  },
} as unknown as SupabaseClient;

// Use Proxy so that any components importing "supabase" will dynamically pick up the client once it is configured.
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const activeClient = client || dummyClient;
    const value = Reflect.get(activeClient, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});

export let isSupabaseConfigured = !!client;

export function getIsSupabaseConfigured() {
  return !!client || isSupabaseConfigured;
}

export function setSupabaseConfig(url: string, key: string) {
  if (url && key) {
    try {
      client = createClient(url, key);
      isSupabaseConfigured = true;
      console.log('Supabase successfully configured dynamically!');
    } catch (e) {
      console.error('Error configuring Supabase dynamically:', e);
    }
  }
}
