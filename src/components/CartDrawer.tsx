import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../lib/supabase';
import { Order } from '../types';
import { X, Trash2, Plus, Minus, Banknote, Clock, ArrowRight, CheckCircle2, LogIn, QrCode, UtensilsCrossed, Package, UserCheck } from 'lucide-react';

interface CartDrawerProps {
  onOrderPlaced: (order: Order) => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOrderPlaced, onOpenAuth }) => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, isCartOpen, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash_at_counter' | 'upi_counter'>('cash_at_counter');
  const [pickupType, setPickupType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [studentRoll, setStudentRoll] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const maxPrepTime = items.reduce((max, it) => Math.max(max, it.food_item.prep_time_mins), 5);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (!user) {
      if (onOpenAuth) {
        onOpenAuth('login');
      }
      return;
    }

    setIsPlacing(true);
    setErrorMsg(null);

    try {
      const studentId = user.id;
      const studentName = user.full_name || user.email || 'Student';

      const placedOrder = await createOrder(
        studentId,
        studentName,
        items,
        notes,
        {
          paymentMethod,
          pickupType,
          studentRoll,
          studentPhone: user.phone,
        }
      );
      clearCart();
      setNotes('');
      setStudentRoll('');
      setIsCartOpen(false);
      onOrderPlaced(placedOrder);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMsg(err?.message || 'Could not place order. Please try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-panel bg-white/95 border-l border-orange-100 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-5 border-b border-stone-200/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                🛒
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Your Canteen Tray</h2>
                <p className="text-xs text-stone-500">Pick up & pay at Counter #1</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Close tray"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            {items.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 mb-3 text-2xl">
                  🍽️
                </div>
                <h3 className="text-sm font-semibold text-stone-800">Your tray is empty</h3>
                <p className="text-xs text-stone-500 max-w-xs mt-1">
                  Browse our hot samosas, buttery dosas, and cold coffees to add items!
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors cursor-pointer"
                >
                  Explore Canteen Menu
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((ci) => (
                    <div
                      key={ci.food_item.id}
                      className="p-3 rounded-xl bg-stone-50/80 border border-stone-200/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={ci.food_item.image_url}
                          alt={ci.food_item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-stone-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/src/assets/images/dish_samosa_chaat_1792759611219.jpg';
                          }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {ci.food_item.name}
                          </h4>
                          <span className="text-[11px] font-mono text-stone-500 tabular-nums">
                            ₹{ci.food_item.price.toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quantity Stepper */}
                        <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(ci.food_item.id, ci.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-bold tabular-nums">
                            {ci.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(ci.food_item.id, ci.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <span className="font-mono font-bold text-xs text-stone-900 tabular-nums w-12 text-right">
                          ₹{(ci.food_item.price * ci.quantity).toFixed(2)}
                        </span>

                        <button
                          onClick={() => removeItem(ci.food_item.id)}
                          className="text-stone-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preparation Time Preview */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center gap-2.5 text-xs text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Estimated preparation: <strong className="font-semibold">~{maxPrepTime} mins</strong> once placed.
                  </span>
                </div>

                {/* Dine-In vs Takeaway */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5">
                    Dining Preference
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPickupType('dine_in')}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        pickupType === 'dine_in'
                          ? 'bg-orange-50 border-orange-500 text-orange-950 shadow-xs ring-1 ring-orange-400'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                      <span>Dine-In (Canteen)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupType('takeaway')}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        pickupType === 'takeaway'
                          ? 'bg-orange-50 border-orange-500 text-orange-950 shadow-xs ring-1 ring-orange-400'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 text-orange-600" />
                      <span>Takeaway (Pack)</span>
                    </button>
                  </div>
                </div>

                {/* Student Roll / ID (Optional) */}
                <div>
                  <label htmlFor="student-roll" className="block text-xs font-medium text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>College Roll No / Student ID</span>
                    <span className="text-[10px] text-stone-400">(Optional for token call)</span>
                  </label>
                  <input
                    id="student-roll"
                    type="text"
                    value={studentRoll}
                    onChange={(e) => setStudentRoll(e.target.value)}
                    placeholder="e.g. PIT-2024-CS-042"
                    className="w-full text-xs rounded-xl border border-stone-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  />
                </div>

                {/* Special Cooking Instructions */}
                <div>
                  <label htmlFor="order-notes" className="block text-xs font-medium text-stone-700 mb-1.5">
                    Cooking or packaging notes (optional)
                  </label>
                  <textarea
                    id="order-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., extra mint chutney, mild spices, pack spoon..."
                    rows={2}
                    className="w-full text-xs rounded-xl border border-stone-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  />
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_at_counter')}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        paymentMethod === 'cash_at_counter'
                          ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-400'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cash at Counter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi_counter')}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        paymentMethod === 'upi_counter'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-400'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>UPI Scan & Pay</span>
                    </button>
                  </div>
                </div>

                {/* Notice depending on payment method */}
                {paymentMethod === 'cash_at_counter' ? (
                  <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/60 flex items-start gap-2.5 text-xs text-orange-950">
                    <Banknote className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Pay Cash at Counter #1</span>
                      <span className="text-orange-900/80 text-[11px]">
                        Place your order, receive your live token number, and pay exact cash at Counter #1 when collecting your food.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-2.5 text-xs text-emerald-950">
                    <QrCode className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold block">Instant UPI Counter Payment</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                          VPA: pitcanteen@upi
                        </span>
                      </div>
                      <span className="text-emerald-900/80 text-[11px] block mt-0.5">
                        Pay ₹{totalAmount.toFixed(2)} via GPay, PhonePe, Paytm, or BHIM at the pickup desk. Token generated instantly.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer: Summary & Checkout Button */}
          {items.length > 0 && (
            <div className="p-6 border-t border-stone-200/70 bg-stone-50/90 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Campus Subsidy / Taxes</span>
                  <span className="text-emerald-600 font-semibold">₹0.00 (Student Waived)</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                  <span>Total Amount</span>
                  <span className="font-mono text-base text-orange-600 tabular-nums">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isPlacing}
                className={`w-full py-3 px-4 ${
                  !user 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700' 
                    : paymentMethod === 'upi_counter'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                } text-white font-bold rounded-xl shadow-md hover:shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98`}
              >
                {isPlacing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Placing Order with Canteen...
                  </span>
                ) : !user ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Place Order</span>
                  </>
                ) : (
                  <>
                    <span>
                      {paymentMethod === 'upi_counter'
                        ? `Confirm & Generate Token (₹${totalAmount.toFixed(2)} UPI)`
                        : `Place Order (Cash at Counter ₹${totalAmount.toFixed(2)})`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
