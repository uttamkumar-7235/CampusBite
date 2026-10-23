import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchUserOrders, subscribeToUserOrders } from '../lib/supabase';
import { Order, OrderStatus } from '../types';

import { sendOrderReadyNotification } from '../lib/notifications';

interface RealtimeOrderTrackerProps {
  onOpenOrderModal: (order: Order) => void;
  onOpenSlipModal?: (order: Order) => void;
}

export const RealtimeOrderTracker: React.FC<RealtimeOrderTrackerProps> = ({
  onOpenOrderModal,
  onOpenSlipModal,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Track the last known status for each order to trigger transitions accurately
  const knownStatusMapRef = useRef<Map<string, OrderStatus>>(new Map());
  const isInitializedRef = useRef(false);

  // Initialize status map with existing orders to prevent spurious notifications on page load
  useEffect(() => {
    let isMounted = true;
    const initOrders = async () => {
      if (!user?.id) return;
      try {
        const existing = await fetchUserOrders(user.id);
        if (isMounted) {
          existing.forEach((o) => {
            knownStatusMapRef.current.set(o.id, o.status);
          });
          isInitializedRef.current = true;
        }
      } catch (err) {
        console.warn('RealtimeOrderTracker init error:', err);
      }
    };

    initOrders();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Subscribe to user-specific Supabase Realtime channel
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserOrders(user.id, (payload) => {
      // payload can be an array of orders (from local broadcast) or single record (from Supabase Realtime)
      let incomingOrders: Order[] = [];
      if (Array.isArray(payload.new)) {
        incomingOrders = payload.new;
      } else if (payload.new && typeof payload.new === 'object') {
        incomingOrders = [payload.new];
      }

      for (const order of incomingOrders) {
        if (!order || !order.id) continue;
        if (order.user_id !== user.id) continue;

        const prevStatus = knownStatusMapRef.current.get(order.id);
        const newStatus = order.status;

        // Save updated status
        knownStatusMapRef.current.set(order.id, newStatus);

        // Transition: Anything -> 'ready'
        if (newStatus === 'ready' && prevStatus !== 'ready') {
          // Send system notification + audio chime + vibration
          sendOrderReadyNotification(order, () => {
            if (onOpenOrderModal) onOpenOrderModal(order);
          });

          showToast({
            type: 'ready',
            title: `Order #${order.order_number} is Ready!`,
            message: 'Your hot dish is prepared and ready at Counter #2. Please present your token to collect.',
            orderNumber: order.order_number,
            orderId: order.id,
            actionLabel: 'View Token Slip',
            onAction: () => {
              if (onOpenSlipModal) {
                onOpenSlipModal(order);
              } else {
                onOpenOrderModal(order);
              }
            },
          });
        }
        // Transition: Anything -> 'completed'
        else if (newStatus === 'completed' && prevStatus !== 'completed') {
          showToast({
            type: 'completed',
            title: `Order #${order.order_number} Completed`,
            message: 'Cash payment processed at counter. Food delivered — enjoy your meal!',
            orderNumber: order.order_number,
            orderId: order.id,
            actionLabel: 'Print Receipt Slip',
            onAction: () => {
              if (onOpenSlipModal) {
                onOpenSlipModal(order);
              } else {
                onOpenOrderModal(order);
              }
            },
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, onOpenOrderModal, onOpenSlipModal, showToast]);


  return null; // Headless real-time listener component
};
