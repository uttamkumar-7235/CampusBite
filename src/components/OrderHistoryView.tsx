import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { fetchUserOrders, subscribeToOrderChanges } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Clock, CheckCircle2, ChevronRight, RotateCcw, AlertCircle, ShoppingBag, Printer } from 'lucide-react';
import { OrderSlipModal } from './OrderSlipModal';

interface OrderHistoryViewProps {
  onTrackOrder: (order: Order) => void;
  onBrowseMenu: () => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
  onPrintSlip?: (order: Order) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({ onTrackOrder, onBrowseMenu, onOpenAuth, onPrintSlip }) => {
  const { user } = useAuth();
  const { addItem, setIsCartOpen } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlipOrder, setSelectedSlipOrder] = useState<Order | null>(null);

  const loadOrders = async () => {
    if (!user?.id) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const fetched = await fetchUserOrders(user.id);
    setOrders(fetched);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();

    if (user?.id) {
      const unsubscribe = subscribeToOrderChanges(() => {
        loadOrders();
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-white/75 backdrop-blur-md border border-stone-200/80 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mx-auto text-orange-600">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Sign In to Track Orders</h2>
            <p className="text-xs text-stone-600 mt-2 max-w-sm mx-auto leading-relaxed">
              Your active token numbers, live kitchen preparation status, and digital receipts are stored securely with your student account.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAuth?.('login')}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-orange-500/25 transition-all cursor-pointer"
            >
              Sign In to CampusBite
            </button>
            <button
              onClick={onBrowseMenu}
              className="w-full sm:w-auto px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Browse Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return ['placed', 'preparing', 'ready'].includes(o.status);
    if (filter === 'completed') return o.status === 'completed';
    return true;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return { label: 'Placed', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'preparing':
        return { label: 'Cooking', bg: 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse' };
      case 'ready':
        return { label: 'Ready for Pickup', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' };
      case 'completed':
        return { label: 'Collected', bg: 'bg-stone-100 text-stone-700 border-stone-200' };
      case 'cancelled':
        return { label: 'Cancelled', bg: 'bg-red-100 text-red-700 border-red-200' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Your Canteen Orders</h1>
          <p className="text-xs text-stone-500 mt-1">
            Track token statuses in real-time and review order history.
          </p>
        </div>

        {/* Interactive Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-stone-100/90 rounded-xl border border-stone-200/80 shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'active' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Active ({orders.filter((o) => ['placed', 'preparing', 'ready'].includes(o.status)).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'completed' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-stone-200/70">
          <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 mx-auto flex items-center justify-center text-2xl mb-3">
            📋
          </div>
          <h3 className="text-base font-bold text-stone-900">No orders found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            You haven't placed any orders in this category yet. Grab a quick snack from the menu!
          </p>
          <button
            onClick={onBrowseMenu}
            className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Order Food Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusMeta = getStatusBadge(order.status);
            const isLive = ['placed', 'preparing', 'ready'].includes(order.status);

            return (
              <div
                key={order.id}
                className={`glass-card rounded-2xl p-5 border transition-all ${
                  isLive ? 'border-orange-300 ring-2 ring-orange-400/10' : 'border-stone-200/70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-black text-stone-900">
                      Token #{order.order_number}
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusMeta.bg}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <span className="text-xs text-stone-400">
                    {new Date(order.created_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Items List Snapshot */}
                <div className="py-3 space-y-1.5">
                  {order.order_items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-stone-700">
                      <span>
                        {it.quantity}x {it.item_name}
                      </span>
                      <span className="font-mono tabular-nums text-stone-500">
                        ₹{it.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-[11px] text-stone-500 italic pt-1">
                      Note: "{order.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500">Total:</span>
                    <span className="font-mono text-base font-bold text-stone-900 tabular-nums">
                      ₹{order.total.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-stone-400">· Cash at counter</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onPrintSlip) {
                          onPrintSlip(order);
                        } else {
                          setSelectedSlipOrder(order);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1.5 border border-stone-200/90 shadow-2xs transition-colors cursor-pointer"
                      title="Print or view token slip"
                    >
                      <Printer className="w-3.5 h-3.5 text-stone-500" />
                      <span>Print Slip</span>
                    </button>

                    <button
                      onClick={() => onTrackOrder(order)}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Track Status</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Canteen Slip Modal */}
      <OrderSlipModal
        order={selectedSlipOrder}
        isOpen={Boolean(selectedSlipOrder)}
        onClose={() => setSelectedSlipOrder(null)}
      />
    </div>
  );
};
