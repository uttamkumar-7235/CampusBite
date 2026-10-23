import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Database, ShieldCheck, UserCheck, LogOut, Sparkles, LogIn, UserPlus, ChevronDown, Clock } from 'lucide-react';

interface NavbarProps {
  currentTab: 'menu' | 'recommendations' | 'orders' | 'admin';
  setCurrentTab: (tab: 'menu' | 'recommendations' | 'orders' | 'admin') => void;
  onOpenConfig: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenConfig,
  onOpenAuth,
}) => {
  const { user, role, logout, isSupabaseConfigured, isLoading } = useAuth();
  const { totalCount, setIsCartOpen } = useCart();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-nav px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentTab('menu')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <span className="font-bold text-sm tracking-tighter leading-none">PIT</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-stone-900 group-hover:text-orange-600 transition-colors whitespace-nowrap leading-tight">
                Campus<span className="text-orange-600">Bite</span>
              </span>
              <span className="text-[10px] text-stone-500 font-medium tracking-tight whitespace-nowrap hidden sm:block">
                Prasad Institute of Technology
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Single-line Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <button
            onClick={() => setCurrentTab('menu')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 cursor-pointer ${
              currentTab === 'menu'
                ? 'text-orange-600 border-orange-600 font-semibold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Canteen Menu
          </button>

          <button
            onClick={() => setCurrentTab('recommendations')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'recommendations'
                ? 'text-orange-600 border-orange-600 font-semibold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            AI Combos
          </button>

          <button
            onClick={() => setCurrentTab('orders')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'orders'
                ? 'text-orange-600 border-orange-600 font-semibold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            My Orders
          </button>

          <button
            onClick={() => setCurrentTab('admin')}
            className={`transition-colors whitespace-nowrap pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'admin'
                ? 'text-orange-600 border-orange-600 font-semibold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
            Admin Hub
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Supabase status + Auth buttons / Profile + Cart Tray) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Supabase status button */}
          <button
            onClick={onOpenConfig}
            title={isSupabaseConfigured ? 'Supabase Project Connected' : 'Configure Supabase Database'}
            className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border border-stone-200/80 hover:bg-stone-100/70 transition-colors text-stone-600 whitespace-nowrap cursor-pointer"
          >
            <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span>{isSupabaseConfigured ? 'Supabase Live' : 'Database Setup'}</span>
          </button>

          {/* Authentication Area */}
          {isLoading ? (
            <div className="w-20 h-8 rounded-xl bg-stone-100 animate-pulse" />
          ) : user ? (
            /* Logged In User Profile Menu */
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-orange-50/90 border border-orange-200/80 text-stone-800 hover:bg-orange-100 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                <span className="max-w-[110px] truncate">{user.full_name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                    role === 'admin'
                      ? 'bg-amber-200 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {role}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isProfileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 glass-panel bg-white/95 rounded-2xl shadow-xl p-3 z-50 text-xs border border-orange-100 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setIsProfileMenuOpen(false)}
                >
                  <div className="px-2 py-1.5 border-b border-stone-100 mb-2">
                    <p className="font-bold text-stone-900">{user.full_name}</p>
                    <p className="text-stone-500 text-[11px] font-mono truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] text-stone-400 font-medium">Role:</span>
                      <span className="text-[10px] font-bold text-stone-800 capitalize">
                        {role === 'admin' ? 'Canteen Administrator' : 'Verified Student'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-2">
                    <button
                      onClick={() => {
                        setCurrentTab('orders');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-stone-100 text-stone-700 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>My Canteen Orders</span>
                    </button>

                    {role === 'admin' && (
                      <button
                        onClick={() => {
                          setCurrentTab('admin');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-900 font-semibold transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>Canteen Operations Hub</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100">
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated: Show Sign In and Sign Up Buttons */
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-stone-200/80 bg-white/70 hover:bg-white text-stone-700 hover:text-stone-900 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-stone-500" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => onOpenAuth('signup')}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-xs hover:shadow-orange-500/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          )}

          {/* Primary Action Button: Tray Drawer Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            aria-label="View Tray"
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-orange-600 rounded-xl transition-all shadow-sm whitespace-nowrap cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Tray</span>
            <span className="inline-flex items-center justify-center bg-orange-500 text-white font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
              {totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden items-center justify-around border-t border-orange-100/60 pt-2.5 mt-2.5 text-xs font-medium text-stone-600">
        <button
          onClick={() => setCurrentTab('menu')}
          className={`py-1 ${currentTab === 'menu' ? 'text-orange-600 font-semibold' : ''}`}
        >
          Menu
        </button>
        <button
          onClick={() => setCurrentTab('recommendations')}
          className={`py-1 ${currentTab === 'recommendations' ? 'text-orange-600 font-semibold' : ''}`}
        >
          AI Combos
        </button>
        <button
          onClick={() => setCurrentTab('orders')}
          className={`py-1 ${currentTab === 'orders' ? 'text-orange-600 font-semibold' : ''}`}
        >
          Orders
        </button>
        <button
          onClick={() => setCurrentTab('admin')}
          className={`py-1 ${currentTab === 'admin' ? 'text-orange-600 font-semibold' : ''}`}
        >
          Admin
        </button>
      </div>
    </header>
  );
};
