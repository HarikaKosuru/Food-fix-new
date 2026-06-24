import React, { useState } from 'react';
import { supabase, getIsSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, ArrowRight, Sparkles, ShieldCheck, AlertCircle, KeyRound, ArrowLeft, Loader2, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthMode = 'signin' | 'signup' | 'magic';

export const LoginPage = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [manual, setManual] = useState(false);
  const [manualLink, setManualLink] = useState('');

  const parseSupabaseHash = (input: string) => {
    let hash = input;
    if (input.includes('#')) {
      hash = input.substring(input.indexOf('#') + 1);
    } else if (input.includes('?')) {
      hash = input.substring(input.indexOf('?') + 1);
    }
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    return { access_token, refresh_token };
  };

  const handleOAuthLogin = async () => {
    if (!getIsSupabaseConfigured()) {
      setMessage({ type: 'error', text: 'Supabase is not configured. Please configure your environment variables.' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://ai.studio/apps/e393b7ae-3f3f-4a45-96c4-7df74798f25f',
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        setMessage({ 
          type: 'success', 
          text: 'Google Sign-In page opened in a new tab! Complete the login, copy the final redirected URL (containing #access_token=) from the address bar, and paste it in the Verification box below.' 
        });
        setManual(true);
      } else {
        throw new Error('OAuth URL was not generated successfully.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'OAuth Sign In failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyManualLink = async () => {
    if (!manualLink.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const { access_token, refresh_token } = parseSupabaseHash(manualLink);
      if (!access_token || !refresh_token) {
        throw new Error('The pasted URL does not contain a valid #access_token or refresh_token. Make sure you copied the FULL URL of the page after login completion.');
      }

      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Successfully authenticated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Session verification failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getIsSupabaseConfigured()) {
      setMessage({ type: 'error', text: 'Supabase is not configured. Please configure your environment variables.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Logged in successfully!' });
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registration successful! Check your email for a verification link.' });
      } else {
        // Magic link / OTP
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Magic link has been sent to your email!' });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Authentication failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Decorative ambient background elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-60"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-slate-100 shadow-2xl rounded-3xl p-8 z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex p-3 bg-orange-50 rounded-2xl text-orange-500 mb-4"
          >
            <Sparkles size={28} className="animate-pulse" />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Food<span className="text-orange-500">Fix</span> Auth
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Securely access your account or register a new one to save your orders.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 mb-6 text-sm font-medium">
          <button 
            onClick={() => { setMode('signin'); setMessage(null); }}
            className={`flex-1 pb-3 text-center transition border-b-2 ${
              mode === 'signin' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { setMode('signup'); setMessage(null); }}
            className={`flex-1 pb-3 text-center transition border-b-2 ${
              mode === 'signup' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign Up
          </button>
          <button 
            onClick={() => { setMode('magic'); setMessage(null); }}
            className={`flex-1 pb-3 text-center transition border-b-2 ${
              mode === 'magic' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {message && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-3.5 mb-5 rounded-2xl text-xs font-semibold flex items-start gap-2 ${
                message.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                  : 'bg-red-50 text-red-800 border border-red-100'
              }`}
            >
              {message.type === 'success' ? <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" /> : <AlertCircle size={16} className="text-red-500 flex-shrink-0" />}
              <span>{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Core Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
                <KeyRound size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@domain.com"
                className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white focus:outline-none transition"
              />
              <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            </div>
          </div>

          {mode !== 'magic' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm bg-slate-50 border border-slate-100 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Magic Link'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Alternative OAuth options */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
          <span className="relative bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">or sign in with</span>
        </div>

        <button 
          onClick={handleOAuthLogin}
          disabled={isLoading}
          className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.83 21.56,11.43 21.35,11.1z" fill="#4285F4" />
              <path d="M12,20.68c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.6c-0.9,0.6 -2.07,0.98 -3.3,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H2.94v2.7C4.42,18.84 8.02,20.68 12,20.68z" fill="#34A853" />
              <path d="M6.97,13.18c-0.18,-0.54 -0.28,-1.12 -0.28,-1.72s0.1,-1.18 0.28,-1.72V7.04H2.94c-0.6,1.2 -0.94,2.56 -0.94,4c0,1.44 0.34,2.8 0.94,4L6.97,13.18z" fill="#FBBC05" />
              <path d="M12,6.12c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.42,2.68 12,2.68 8.02,2.68 4.42,4.52 2.94,7.49l4.03,3.13C7.67,7.7 9.66,6.12 12,6.12z" fill="#EA4335" />
            </g>
          </svg>
          Google OAuth
        </button>

        {/* Manual OAuth Link Entry */}
        <div className="mt-8 pt-4 border-t border-slate-50 text-center">
          {!manual ? (
            <button 
              onClick={() => setManual(true)}
              className="text-[10px] text-slate-400 hover:text-orange-500 font-semibold hover:underline"
            >
              Paste verification callback manually
            </button>
          ) : (
            <div className="flex flex-col gap-2 mt-2 max-w-xs mx-auto">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="font-bold uppercase tracking-wider">Callback Verification URL</span>
                <button onClick={() => setManual(false)} className="text-red-500 hover:underline">Cancel</button>
              </div>
              <div className="flex gap-1.5">
                <input 
                  type="text"
                  placeholder="https://...#access_token=..."
                  value={manualLink}
                  onChange={(e) => setManualLink(e.target.value)}
                  className="flex-grow text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-2 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
                <button 
                  onClick={handleVerifyManualLink} 
                  className="bg-slate-950 text-white text-[11px] font-bold px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
