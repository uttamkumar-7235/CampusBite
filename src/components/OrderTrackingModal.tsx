import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { subscribeToOrderChanges } from '../lib/supabase';
import { X, CheckCircle2, Clock, ChefHat, BellRing, PackageCheck, AlertCircle } from 'lucide-react';

interface OrderTrackingModalProps {
  order: Order | null;
  onClose: () => void;
}

const STAGES: { key: OrderStatus; label: string; desc: string; icon: any }[] = [
  {
    key: 'placed',
    label: 'Order Placed',
    desc: 'Sent to canteen kitchen token queue',
    icon: Clock,
  },
  {
    key: 'preparing',
    label: 'Preparing Dish',
    desc: 'Chef is sizzling & assembling your food',
    icon: ChefHat,
  },
  {
    key: 'ready',
    label: 'Ready for Pickup',
    desc: 'Head to Counter #2 with your token',
    icon: BellRing,
  },
  {
    key: 'completed',
    label: 'Completed',
    desc: 'Food handed over & enjoyed',
    icon: PackageCheck,
  },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ order: initialOrder, onClose }) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(initialOrder);

  useEffect(() => {
    setCurrentOrder(initialOrder);
  }, [initialOrder]);

  // Realtime subscription for this specific order
  useEffect(() => {
    if (!currentOrder) return;

    const unsubscribe = subscribeToOrderChanges((payload) => {
      if (payload.new) {
        if (Array.isArray(payload.new)) {
          const match = payload.new.find((o: Order) => o.id === currentOrder.id);
          if (match) setCurrentOrder((prev) => (prev ? { ...prev, ...match } : match));
        } else if (payload.new.id === currentOrder.id) {
          setCurrentOrder((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentOrder?.id]);

  if (!currentOrder) return null;

  const getStageIndex = (status: OrderStatus) => {
    if (status === 'cancelled') return -1;
    return STAGES.findIndex((s) => s.key === status);
  };

  const activeIndex = getStageIndex(currentOrder.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative glass-panel bg-white/95 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-orange-100 my-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Token Banner */}
        <div className="text-center pb-6 border-b border-stone-200/60">
          <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">
            Live Canteen Token
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-black text-stone-900 tracking-tight mt-1">
            #{currentOrder.order_number}
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Ordered at {new Date(currentOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Status Alert Highlight */}
        {currentOrder.status === 'ready' && (
          <div className="my-5 p-4 rounded-xl bg-emerald-500 text-white flex items-center gap-3 shadow-lg shadow-emerald-500/20 animate-pulse">
            <BellRing className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Your food is ready!</h4>
              <p className="text-xs text-emerald-50">Please walk to Counter #2 and show Token #{currentOrder.order_number}.</p>
            </div>
          </div>
        )}

        {currentOrder.status === 'cancelled' && (
          <div className="my-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold">Order Cancelled</h4>
              <p className="text-[11px] text-red-600">This order was cancelled by the canteen desk.</p>
            </div>
          </div>
        )}

        {/* Vertical Step Tracker */}
        {currentOrder.status !== 'cancelled' && (
          <div className="py-6 space-y-6">
            {STAGES.map((stage, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const isUpcoming = idx > activeIndex;
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="flex items-start gap-4 relative">
                  {/* Vertical connecting line */}
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 w-0.5 h-10 -ml-px transition-colors ${
                        idx < activeIndex ? 'bg-orange-500' : 'bg-stone-200'
                      }`}
                    />
                  )}

                  {/* Step icon / indicator */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isPast
                        ? 'bg-orange-500 text-white'
                        : isCurrent
                        ? 'bg-orange-600 text-white ring-4 ring-orange-100 shadow-md scale-110'
                        : 'bg-stone-100 text-stone-400 border border-stone-200'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>

                  {/* Step Info */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-sm font-bold ${
                          isCurrent
                            ? 'text-orange-600 font-extrabold'
                            : isPast
                            ? 'text-stone-900'
                            : 'text-stone-400'
                        }`}
                      >
                        {stage.label}
                      </h4>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                          Current Stage
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        isCurrent || isPast ? 'text-stone-600' : 'text-stone-400'
                      }`}
                    >
                      {stage.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Order Details Accordion / Summary */}
        <div className="pt-4 border-t border-stone-200/60 bg-stone-50/70 -mx-6 -mb-6 p-6 rounded-b-2xl">
          <div className="flex items-center justify-between mb-3 text-xs text-stone-600">
            <span className="font-semibold text-stone-800">Order Summary</span>
            <span className="font-mono font-bold text-stone-900 tabular-nums">
              Total: ₹{currentOrder.total.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {currentOrder.order_items?.map((it, i) => (
              <div key={i} className="flex justify-between text-xs text-stone-700">
                <span className="truncate">
                  {it.quantity}x {it.item_name}
                </span>
                <span className="font-mono tabular-nums text-stone-500">
                  ₹{it.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {currentOrder.notes && (
            <p className="mt-2 text-[11px] text-stone-500 italic">
              Note: "{currentOrder.notes}"
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs">
            <span className="text-stone-500">Payment Method:</span>
            <span className="font-semibold text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200">
              Cash / UPI at Counter
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
