import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setSupabaseConfig } from './lib/supabase';

async function init() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.supabaseUrl && data.supabaseAnonKey) {
      setSupabaseConfig(data.supabaseUrl, data.supabaseAnonKey);
    }
  } catch (err) {
    console.error('Failed to load Supabase configuration from server:', err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

init();
