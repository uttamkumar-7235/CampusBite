import React, { createContext, useContext, useState } from 'react';
import { BellRing, CheckCircle2, Info, X, ChevronRight } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'ready' | 'completed' | 'info' | 'error';
  title: string;
  message: string;
  orderNumber?: number;
  orderId?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function playChime(type: 'ready' | 'completed') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'ready') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {
    // Audio playback policy safe catch
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newToast: ToastItem = { ...toast, id };

    if (toast.type === 'ready' || toast.type === 'completed') {
      playChime(toast.type);
    }

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 7 seconds
    setTimeout(() => {
      removeToast(id);
    }, 7000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };



  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}

      {/* Floating Toast Notification Container (Top-Right) */}
      <div className="fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isReady = toast.type === 'ready';
          const isCompleted = toast.type === 'completed';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
                isReady
                  ? 'bg-emerald-900/95 text-white border-emerald-500/50 shadow-emerald-900/30'
                  : isCompleted
                  ? 'bg-stone-900/95 text-white border-stone-700 shadow-stone-900/30'
                  : 'bg-white/95 text-stone-900 border-stone-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isReady
                      ? 'bg-emerald-500 text-white animate-bounce'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {isReady ? (
                    <BellRing className="w-5 h-5" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold truncate leading-tight">
                      {toast.title}
                    </h4>
                    <button
                      onClick={() => removeToast(toast.id)}
                      className="text-stone-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                      aria-label="Close notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs opacity-90 mt-1 leading-relaxed">
                    {toast.message}
                  </p>

                  {/* Actionable button to open order tracking modal */}
                  {toast.onAction && (
                    <button
                      onClick={() => {
                        toast.onAction?.();
                        removeToast(toast.id);
                      }}
                      className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        isReady
                          ? 'bg-white text-emerald-950 hover:bg-emerald-50 active:scale-95'
                          : isCompleted
                          ? 'bg-white text-stone-900 hover:bg-stone-100 active:scale-95'
                          : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'
                      }`}
                    >
                      <span>{toast.actionLabel || 'View Live Token Details'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
