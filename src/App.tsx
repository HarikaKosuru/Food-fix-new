/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { FoodFixMain } from './components/FoodFixMain';
import { LoginPage } from './components/LoginPage';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
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

      // Retrieve current session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <p className="text-slate-400 text-xs mt-4">Verifying session...</p>
      </div>
    );
  }

  // If Supabase is configured and there's no session, show LoginPage
  if (isSupabaseConfigured && !session) {
    return <LoginPage />;
  }

  // If authenticated or if running in Sandbox Mode (Supabase not configured), show main application
  return <FoodFixMain session={session} />;
}
