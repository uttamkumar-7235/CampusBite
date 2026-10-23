import React, { useState, useEffect } from 'react';
import { FoodItem, MealCombo } from '../types';
import { useCart } from '../context/CartContext';
import { Sparkles, Utensils, Zap, Heart, Check, Plus, RefreshCw, Layers } from 'lucide-react';

interface AIRecommendationsProps {
  availableDishes: FoodItem[];
}

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({ availableDishes }) => {
  const { addItem, setIsCartOpen } = useCart();
  const [budget, setBudget] = useState<number>(150);
  const [dietary, setDietary] = useState<'all' | 'veg' | 'quick' | 'healthy'>('all');
  const [mealTime, setMealTime] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');
  const [combos, setCombos] = useState<MealCombo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [source, setSource] = useState<'gemini_ai' | 'rule_based' | null>(null);
  const [addedComboIndex, setAddedComboIndex] = useState<number | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setAddedComboIndex(null);

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget,
          dietary,
          meal_time: mealTime,
          available_dishes: availableDishes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCombos(data.combos || []);
        setSource(data.source || 'rule_based');
      } else {
        fallbackRuleBased();
      }
    } catch (err) {
      console.warn('API recommendations failed, running client rule-based generator:', err);
      fallbackRuleBased();
    } finally {
      setIsLoading(false);
    }
  };

  const fallbackRuleBased = () => {
    let pool = availableDishes.filter((d) => d.is_available);
    if (dietary === 'veg') pool = pool.filter((d) => d.is_veg);
    if (dietary === 'quick') pool = pool.filter((d) => d.prep_time_mins <= 8);
    if (dietary === 'healthy') pool = pool.filter((d) => (d.calories || 300) <= 350);

    const drinks = pool.filter((d) => d.category === 'Beverages');
    const mains = pool.filter((d) => d.category !== 'Beverages');

    const generated: MealCombo[] = [];

    // Pair main + beverage
    for (const main of mains) {
      for (const drink of drinks) {
        const cost = main.price + drink.price;
        if (cost <= budget) {
          generated.push({
            name: `${main.name} + ${drink.name}`,
            items: [main, drink],
            totalPrice: cost,
            savingsOrTag: 'Popular Canteen Duo',
            reason: `Great combo ready in ~${Math.max(main.prep_time_mins, drink.prep_time_mins)} mins within ₹${budget} budget.`,
          });
          break;
        }
      }
      if (generated.length >= 2) break;
    }

    // Affordable single main option
    const affordableMains = mains.filter((m) => m.price <= budget).sort((a, b) => b.price - a.price);
    if (affordableMains.length > 0) {
      generated.push({
        name: `Signature Pick: ${affordableMains[0].name}`,
        items: [affordableMains[0]],
        totalPrice: affordableMains[0].price,
        savingsOrTag: 'Value Pick',
        reason: `Filling standalone dish for ₹${affordableMains[0].price}.`,
      });
    }

    setCombos(generated);
    setSource('rule_based');
  };

  useEffect(() => {
    if (availableDishes.length > 0) {
      fetchRecommendations();
    }
  }, [budget, dietary, mealTime, availableDishes.length]);

  const handleAddComboToCart = (combo: MealCombo, index: number) => {
    combo.items.forEach((item) => {
      addItem(item, 1);
    });
    setAddedComboIndex(index);
    setTimeout(() => {
      setAddedComboIndex(null);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>Smart Canteen Recommender</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Find Your Perfect Meal Within Budget
        </h1>
        <p className="text-xs text-stone-600 mt-2">
          Set your budget in INR and dietary choice. CampusBite curates optimal combinations from the Prasad Institute of Technology canteen kitchen.
        </p>
      </div>

      {/* Interactive Controls Filter Box */}
      <div className="glass-card rounded-2xl p-6 border border-stone-200/70 shadow-xs space-y-6">
        {/* Budget Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-stone-800">Your Spending Budget</span>
            <span className="text-base font-mono font-bold text-orange-600 tabular-nums">
              ₹{budget} INR
            </span>
          </div>
          <input
            type="range"
            min="40"
            max="300"
            step="10"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-orange-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-stone-400 mt-1 font-mono">
            <span>₹40 (Snack)</span>
            <span>₹150 (Lunch)</span>
            <span>₹300 (Feast)</span>
          </div>
        </div>

        {/* Dietary Preferences Segmented Control */}
        <div>
          <span className="block text-xs font-bold text-stone-800 mb-2">Dietary Preference</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'all', label: 'All Dishes', icon: Utensils },
              { id: 'veg', label: 'Pure Veg', icon: Heart },
              { id: 'quick', label: 'Quick (<8m)', icon: Zap },
              { id: 'healthy', label: 'Light/Healthy', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = dietary === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDietary(tab.id as any)}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Meal Time Selector */}
        <div>
          <span className="block text-xs font-bold text-stone-800 mb-2">Meal Timing</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {['breakfast', 'lunch', 'snacks', 'dinner'].map((time) => (
              <button
                key={time}
                onClick={() => setMealTime(time as any)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
                  mealTime === time
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations Output */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <div className="flex items-center gap-1.5">
            <span>Source:</span>
            <span className="font-semibold text-stone-800">
              {source === 'gemini_ai' ? 'Gemini 3.8 AI Powered' : 'Algorithmic Optimization'}
            </span>
          </div>
          <button
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : combos.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-stone-200/70">
            <h3 className="text-sm font-bold text-stone-900">No combos within ₹{budget}</h3>
            <p className="text-xs text-stone-500 mt-1">
              Try increasing the budget slider slightly or switching dietary filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {combos.map((combo, idx) => {
              const isAdded = addedComboIndex === idx;

              return (
                <div
                  key={idx}
                  className="glass-card glass-card-hover rounded-2xl p-5 border border-orange-100/80 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header Tag */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-full">
                        {combo.savingsOrTag}
                      </span>
                      <span className="text-base font-mono font-bold text-stone-900 tabular-nums">
                        ₹{combo.totalPrice.toFixed(2)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-stone-900 mb-1 leading-snug">
                      {combo.name}
                    </h3>

                    <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                      {combo.reason}
                    </p>

                    {/* Included Dishes Chips */}
                    <div className="space-y-2 mb-4">
                      {combo.items.map((dish) => (
                        <div
                          key={dish.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-stone-50/80 border border-stone-200/50 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                dish.is_veg ? 'bg-emerald-500' : 'bg-red-500'
                              }`}
                            />
                            <span className="font-medium text-stone-800">{dish.name}</span>
                          </div>
                          <span className="font-mono text-stone-500 tabular-nums">
                            ₹{dish.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add combo action */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-stone-400">
                      Under budget by ₹{(budget - combo.totalPrice).toFixed(0)}
                    </span>

                    <button
                      onClick={() => handleAddComboToCart(combo, idx)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-orange-500/20 active:scale-95'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added to Tray!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Combo to Tray</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
