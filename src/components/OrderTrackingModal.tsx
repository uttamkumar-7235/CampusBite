import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { subscribeToOrderChanges, cancelOrder } from '../lib/supabase';
import { OrderSlipModal } from './OrderSlipModal';
import { playCanteenChime, requestNotificationPermission, getNotificationPermission } from '../lib/notifications';
import {
  X,
  CheckCircle2,
  Clock,
  ChefHat,
  BellRing,
  PackageCheck,
  AlertCircle,
  Printer,
  Copy,
  Check,
  XCircle,
  UtensilsCrossed,
  Package,
  QrCode,
  Volume2,
  FileText
} from 'lucide-react';

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
  const [copiedToken, setCopiedToken] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(getNotificationPermission());

  useEffect(() => {
    setCurrentOrder(initialOrder);
    setCancelSuccess(false);
    setNotifPermission(getNotificationPermission());
  }, [initialOrder]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
    playCanteenChime('ready');
  };

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

  const handleCopyToken = () => {
    if (!currentOrder) return;
    navigator.clipboard?.writeText(String(currentOrder.order_number));
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleCancelOrder = async () => {
    if (!currentOrder || currentOrder.status !== 'placed') return;
    if (!confirm('Are you sure you want to cancel this canteen order?')) return;

    setIsCancelling(true);
    try {
      await cancelOrder(currentOrder.id);
      setCurrentOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      setCancelSuccess(true);
    } catch (err) {
      console.error('Cancel order error:', err);
    } finally {
      setIsCancelling(false);
    }
  };

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

      <div className="relative glass-panel bg-white/95 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-orange-100 my-8 overflow-hidden print:p-0 print:border-none print:shadow-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer print:hidden"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Token Banner */}
        <div className="text-center pb-5 border-b border-stone-200/60">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-orange-600 tracking-wider uppercase">
              Prasad Institute of Technology Canteen
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="text-4xl sm:text-5xl font-mono font-black text-stone-900 tracking-tight">
              #{currentOrder.order_number}
            </div>
            <button
              onClick={handleCopyToken}
              title="Copy Token Number"
              className="p-2 rounded-xl bg-stone-100 hover:bg-orange-50 text-stone-600 hover:text-orange-600 border border-stone-200/80 transition-colors cursor-pointer print:hidden"
            >
              {copiedToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-stone-500 mt-1">
            Ordered at {new Date(currentOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {currentOrder.profile?.full_name ? ` · ${currentOrder.profile.full_name}` : ''}
          </p>
        </div>

        {/* Status Alert Highlight */}
        {currentOrder.status === 'ready' && (
          <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-600/25 border border-emerald-400/40">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
                <BellRing className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black tracking-tight">Your Food is Ready!</h4>
                  <button
                    onClick={() => playCanteenChime('ready')}
                    title="Play chime sound"
                    className="p-1 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer text-[10px] flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Chime</span>
                  </button>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Freshly cooked and packed at <strong className="text-white">Counter #2</strong>. Please present Token <strong className="text-white font-mono">#{currentOrder.order_number}</strong> or your printed slip.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setIsSlipOpen(true)}
                    className="px-3 py-1.5 bg-white text-emerald-900 font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Print Pickup Slip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Browser Alert Permission Prompt if not enabled yet */}
        {notifPermission === 'default' && currentOrder.status !== 'completed' && currentOrder.status !== 'cancelled' && (
          <div className="my-3 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Get notified the instant your food is ready</span>
            </div>
            <button
              onClick={handleRequestPermission}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shrink-0"
            >
              Enable Alerts
            </button>
          </div>
        )}

        {currentOrder.status === 'cancelled' && (
          <div className="my-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold">Order Cancelled</h4>
              <p className="text-[11px] text-red-600">This order has been cancelled.</p>
            </div>
          </div>
        )}

        {/* Vertical Step Tracker */}
        {currentOrder.status !== 'cancelled' && (
          <div className="py-5 space-y-5 print:hidden">
            {STAGES.map((stage, idx) => {
              const isPast = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const Icon = stage.icon;

              return (
                <div key={stage.key} className="flex items-start gap-4 relative">
                  {/* Vertical connecting line */}
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 w-0.5 h-9 -ml-px transition-colors ${
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

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
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
              Instructions: "{currentOrder.notes}"
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-500">Payment:</span>
              <span className="font-semibold text-stone-800 bg-white px-2 py-0.5 rounded border border-stone-200">
                {currentOrder.payment_method === 'upi_counter' ? 'UPI Scan & Pay' : 'Cash at Counter #1'}
              </span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={() => setIsSlipOpen(true)}
                className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="View & print thermal canteen slip"
              >
                <Printer className="w-3.5 h-3.5 text-stone-500" />
                <span>Print Slip / KOT</span>
              </button>

              {currentOrder.status === 'placed' && (
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isCancelling ? 'Cancelling...' : 'Cancel Order'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Thermal Print Slip Modal */}
      <OrderSlipModal
        order={currentOrder}
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
      />
    </div>
  );
};
