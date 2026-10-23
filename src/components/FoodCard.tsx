import React, { useState } from 'react';
import { FoodItem } from '../types';
import { useCart } from '../context/CartContext';
import { Clock, Plus, Minus, UtensilsCrossed } from 'lucide-react';

interface FoodCardProps {
  item: FoodItem;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item }) => {
  const { items, addItem, updateQuantity } = useCart();
  const [imageError, setImageError] = useState(false);

  const cartEntry = items.find((ci) => ci.food_item.id === item.id);
  const inCartCount = cartEntry ? cartEntry.quantity : 0;

  return (
    <article className="group glass-card glass-card-hover rounded-2xl overflow-hidden flex flex-col justify-between border border-stone-200/60 shadow-sm relative transition-all">
      {/* Top Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        {!imageError ? (
          <img
            src={item.image_url}
            alt={item.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800 p-4 text-center">
            <UtensilsCrossed className="w-10 h-10 mb-2 opacity-60 text-orange-600" />
            <span className="text-xs font-semibold">{item.name}</span>
            <span className="text-[10px] text-amber-700/80">{item.category}</span>
          </div>
        )}

        {/* Veg/Non-Veg icon (Indian FSSAI standard: green square with green circle) */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md p-1 rounded-md shadow-xs flex items-center justify-center">
          <div
            className={`w-3.5 h-3.5 border-2 flex items-center justify-center rounded-xs ${
              item.is_veg ? 'border-emerald-600' : 'border-red-600'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            />
          </div>
        </div>

        {/* Preparation time badge */}
        <div className="absolute top-3 right-3 bg-stone-900/75 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
          <Clock className="w-3 h-3 text-orange-400" />
          <span>{item.prep_time_mins}m</span>
        </div>

        {/* Sold out overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
            <span className="text-xs font-bold tracking-wider uppercase text-white bg-red-600 px-3 py-1 rounded-full shadow-md">
              Sold Out Today
            </span>
          </div>
        )}
      </div>

      {/* Card Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata: Category & Calories (Unboxed text with bullet separator) */}
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <span>{item.category}</span>
            {item.calories && (
              <>
                <span aria-hidden="true">·</span>
                <span>{item.calories} kcal</span>
              </>
            )}
          </div>

          <h3 className="text-base font-bold text-stone-900 tracking-tight leading-snug group-hover:text-orange-600 transition-colors line-clamp-1">
            {item.name}
          </h3>

          <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Bottom Price & Purchase Row */}
        <div className="mt-4 pt-3 border-t border-stone-200/50 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs text-stone-400 block -mb-0.5">Price</span>
            <span className="text-lg font-bold text-stone-900 font-mono tabular-nums">
              ₹{item.price.toFixed(2)}
            </span>
          </div>

          {/* Interactive Buy Control */}
          {item.is_available ? (
            inCartCount === 0 ? (
              <button
                onClick={() => addItem(item, 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            ) : (
              <div className="flex items-center bg-orange-100/80 border border-orange-200 text-orange-900 rounded-xl p-0.5 shadow-xs">
                <button
                  onClick={() => updateQuantity(item.id, inCartCount - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-orange-800 transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-7 text-center font-mono font-bold text-xs tabular-nums">
                  {inCartCount}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, inCartCount + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-orange-800 transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )
          ) : (
            <span className="text-xs text-stone-400 font-medium">Unavailable</span>
          )}
        </div>
      </div>
    </article>
  );
};
