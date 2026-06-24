import { categories, foodItems } from '../data';
import { SearchBar } from './SearchBar';
import { FoodGrid } from './FoodGrid';
import { SupportChat } from './SupportChat';
import { supabase } from '../lib/supabase';

interface FoodFixMainProps {
  session?: any;
}

export const FoodFixMain = ({ session }: FoodFixMainProps) => {
  const userEmail = session?.user?.email;
  const userName = session?.user?.user_metadata?.full_name || userEmail?.split('@')[0];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <nav className="bg-white border-b border-slate-100 py-4 px-8 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-orange-500 tracking-tight">Food<span className="text-slate-800">Fix</span></h1>
        
        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Welcome, <strong className="text-slate-800">{userName}</strong></span>
              <button 
                id="btn_signout"
                onClick={handleSignOut}
                className="text-xs bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Sandbox Mode
            </span>
          )}
        </div>
      </nav>

      <header className="py-12 bg-orange-50 text-center px-4">
        <h2 className="text-4xl font-bold text-slate-900 mb-6">Hungry? We've got you covered.</h2>
        <SearchBar />
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <section className="mb-12">
          <div className="flex gap-6 overflow-x-auto pb-4 justify-between">
            {categories.map(c => (
              <button key={c.id} className="flex flex-col items-center gap-2 min-w-20 bg-white p-4 rounded-2xl border border-slate-100 hover:border-orange-200 transition cursor-pointer">
                <span className="text-3xl">{c.icon}</span>
                <span className="font-semibold text-xs text-slate-600">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-bold text-slate-900 mb-6">Popular near you</h3>
          <FoodGrid items={foodItems} />
        </section>
      </main>
      
      <SupportChat />
    </div>
  );
};
