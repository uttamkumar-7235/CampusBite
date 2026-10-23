import React, { useState } from 'react';
import { FoodCategory, FoodItem } from '../types';
import { FoodCard } from './FoodCard';
import { useAuth } from '../context/AuthContext';
import { Search, Sparkles, Leaf, Clock, ShieldCheck, LogIn, UserPlus, UserCheck, Plus } from 'lucide-react';

interface MenuViewProps {
  items: FoodItem[];
  onOpenRecommendations: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
}

const CATEGORIES: ('All' | FoodCategory)[] = [
  'All',
  'Snacks',
  'South Indian',
  'Meals',
  'Fast Food',
  'Beverages',
  'Desserts',
];

export const MenuView: React.FC<MenuViewProps> = ({
  items,
  onOpenRecommendations,
  onOpenAdmin,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<'All' | FoodCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Filtered dishes
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg = !vegOnly || item.is_veg;
    return matchesCategory && matchesSearch && matchesVeg;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Campaign Focal Area (Storefront Hero) */}
      <section className="relative overflow-hidden rounded-3xl mx-4 sm:mx-8 mt-4 p-6 sm:p-10 border border-orange-200/70 bg-gradient-to-br from-orange-50 via-[#FFF9F3] to-amber-50 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 text-orange-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              <span>Prasad Institute of Technology · Official Canteen Token System</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Hot meals, zero lines.
              <span className="block text-orange-600">PIT Canteen Token Ordering.</span>
            </h1>

            <p className="text-sm text-stone-600 leading-relaxed max-w-xl">
              Freshly grilled paneer rolls, crisp masala dosas, and frosted cold coffees for Prasad Institute of Technology students, faculty, and staff. Place your token order in seconds and pay cash at Counter #1.
            </p>

            {/* Authentication & Action Buttons in Hero */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!user ? (
                <>
                  <button
                    onClick={() => onOpenAuth('signup')}
                    className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Student Account</span>
                  </button>

                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-4 py-2.5 bg-white/90 hover:bg-white text-stone-800 border border-stone-200 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5 text-stone-600" />
                    <span>Sign In</span>
                  </button>

                  <button
                    onClick={onOpenRecommendations}
                    className="px-3.5 py-2.5 text-orange-700 hover:text-orange-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span>AI Combos</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-xl border border-stone-200/80 shadow-2xs">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-stone-900">
                      Welcome, {user.full_name}!
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-orange-100 text-orange-800">
                      {user.role}
                    </span>
                  </div>

                  {user.role === 'admin' && (
                    <button
                      onClick={onOpenAdmin}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>+ Add Dish (Manager)</span>
                    </button>
                  )}

                  <button
                    onClick={onOpenRecommendations}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Get AI Meal Combos</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-orange-500" /> ~8m avg prep
              </span>
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Cash / UPI at counter
              </span>
            </div>
          </div>

          {/* Hero Visual Spotlight */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-white/80 aspect-[4/3] group">
              <img
                src="/src/assets/images/dish_paneer_roll_1792759610497.jpg"
                alt="Signature Kathi Roll"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex items-end p-5">
                <div className="text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-300">
                    Student Favorite Today
                  </span>
                  <h3 className="text-lg font-bold">Paneer Tikka Kathi Roll</h3>
                  <p className="text-xs text-stone-200 mt-0.5">Char-grilled tandoori paneer in flaky paratha · ₹95</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search dishes (e.g. Dosa, Biryani, Coffee)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200/80 bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Pure Veg Toggle Switch */}
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer bg-white/70 px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-2xs">
              <input
                type="checkbox"
                checked={vegOnly}
                onChange={(e) => setVegOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                Pure Veg Only
              </span>
            </label>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white/80 border border-stone-200/70 text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Dishes Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Showing</span>
            <span className="font-bold text-stone-900">{filteredItems.length} dishes</span>
            {selectedCategory !== 'All' && <span>in {selectedCategory}</span>}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-stone-200/70">
            <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 mx-auto flex items-center justify-center text-xl mb-3">
              🔍
            </div>
            <h3 className="text-base font-bold text-stone-900">No canteen dishes found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              We couldn't find anything matching your search. Try resetting filters or browsing other categories.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setVegOnly(false);
              }}
              className="mt-4 px-4 py-2 bg-stone-900 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <FoodCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
