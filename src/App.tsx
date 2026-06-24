/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase, getIsSupabaseConfigured, setSupabaseConfig } from './lib/supabase';
import { FoodFixMain } from './components/FoodFixMain';
import { LoginPage } from './components/LoginPage';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(getIsSupabaseConfigured());

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch dynamic config from server first to ensure Supabase is set up (Vercel runtime secrets support)
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.supabaseUrl && data.supabaseAnonKey) {
            setSupabaseConfig(data.supabaseUrl, data.supabaseAnonKey);
          }
        }
      } catch (err) {
        console.error('Failed to load Supabase configuration from server:', err);
      }

      // Update configured state using the dynamic getter helper
      const configured = getIsSupabaseConfigured();
      setIsConfigured(configured);

      if (configured) {
        try {
          // Check if current URL contains access_token / refresh_token
          const rawHash = window.location.hash || window.location.search;
          if (rawHash && (rawHash.includes('access_token=') || rawHash.includes('refresh_token='))) {
            // Normalize prefix
            const cleanHash = rawHash.replace(/^[#?]/, '');
            const params = new URLSearchParams(cleanHash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            
            if (access_token && refresh_token) {
              setLoading(true);
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (!error) {
                // Clean up URL hash so tokens aren't visible or reprocessed
                window.history.replaceState(null, '', window.location.pathname);
              }
            }
          }
        } catch (err) {
          console.error('Error parsing auth redirect details:', err);
        }

        try {
          // Retrieve current session
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setSession(currentSession);
        } catch (err) {
          console.error('Error getting Supabase session:', err);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // Listen for auth changes after the config has been fully set up
  useEffect(() => {
    if (!isConfigured) return;

    let subscription: any = null;
    try {
      console.log('Registering active Supabase auth listener on the configured client');
      const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        console.log('Supabase auth state changed:', _event, currentSession?.user?.email);
        setSession(currentSession);
      });
      subscription = data?.subscription;
    } catch (err) {
      console.error('Error registering active auth listener:', err);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isConfigured]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <p className="text-slate-400 text-xs mt-4">Verifying session...</p>
      </div>
    );
  }

  // If Supabase is configured and there's no session, show LoginPage
  if (isConfigured && !session) {
    return <LoginPage />;
  }

  // If authenticated or if running in Sandbox Mode (Supabase not configured), show main application
  return <FoodFixMain session={session} />;
}

