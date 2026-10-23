import { Order } from '../types';

/**
 * Audio synthesizer for canteen notifications using Web Audio API.
 * Produces crisp, pleasant chimes without needing external audio files.
 */
export function playCanteenChime(type: 'ready' | 'preparing' | 'completed' | 'alert' = 'ready') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (type === 'ready') {
      // 3-tone ascending bright chime (F5 -> A5 -> C6) for "Order Ready!"
      const notes = [698.46, 880.0, 1046.5];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = ctx.currentTime + index * 0.12;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    } else if (type === 'completed') {
      // Gentle two-tone chord for completion
      [523.25, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = ctx.currentTime + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } else {
      // Subtle single ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn('Audio playback error (browser policy):', e);
  }
}

/**
 * Check if the browser supports standard Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Request permission from user to show native system notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return Notification.permission || 'denied';
  }
}

/**
 * Send an Order Ready system notification (with audio chime and haptic vibration)
 */
export function sendOrderReadyNotification(
  order: Order,
  onClick?: () => void
): boolean {
  // 1. Play high-priority auditory chime
  playCanteenChime('ready');

  // 2. Trigger hardware vibration if supported (mobile device in pocket)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 350]);
    } catch {
      // Ignore vibration error
    }
  }

  // 3. Dispatch native browser notification if granted
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const title = `🔔 Order #${order.order_number} is READY for Pickup!`;
      const body = `Your meal is hot & packed at Counter #2. Please show your token to collect.`;

      const notification = new Notification(title, {
        body,
        icon: '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
        badge: '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
        tag: `order-ready-${order.id}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (onClick) onClick();
      };

      return true;
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }

  return false;
}
