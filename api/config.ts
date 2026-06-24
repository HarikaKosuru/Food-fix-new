export default function handler(req: any, res: any) {
  // Return the configured Supabase credentials securely
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  });
}
