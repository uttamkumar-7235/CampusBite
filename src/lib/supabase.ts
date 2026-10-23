import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FoodItem, Order, OrderItem, OrderStatus, Profile } from '../types';
import { INITIAL_FOOD_ITEMS } from '../data/initialMenu';

const STORAGE_KEY_URL = 'campusbite_supabase_url';
const STORAGE_KEY_KEY = 'campusbite_supabase_anon_key';
const STORAGE_KEY_LOCAL_ORDERS = 'campusbite_local_orders';
const STORAGE_KEY_LOCAL_MENU = 'campusbite_local_menu';

export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem(STORAGE_KEY_URL);
  const localKey = localStorage.getItem(STORAGE_KEY_KEY);

  const url = (envUrl && envUrl !== 'https://your-project-ref.supabase.co') ? envUrl : localUrl || '';
  const key = (envKey && envKey !== 'your-anon-publishable-key') ? envKey : localKey || '';

  return { url, key, isConfigured: Boolean(url && key) };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function saveCustomCredentials(url: string, key: string) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  else localStorage.removeItem(STORAGE_KEY_KEY);

  supabaseInstance = null;
  // Trigger storage event for reactivity
  window.dispatchEvent(new Event('supabase_config_changed'));
}

// ---------------------------------------------------------------------------
// Local Reactive In-Memory / LocalStorage Store (Fallback & Instant Prototyping)
// ---------------------------------------------------------------------------
function getLocalMenu(): FoodItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_MENU);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return INITIAL_FOOD_ITEMS;
}

function saveLocalMenu(items: FoodItem[]) {
  localStorage.setItem(STORAGE_KEY_LOCAL_MENU, JSON.stringify(items));
}

function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_ORDERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  // Initial seed orders for demonstration if empty
  const initialDemoOrders: Order[] = [
    {
      id: 'ord-demo-01',
      user_id: 'std-rahul-01',
      order_number: 1041,
      total: 135,
      status: 'preparing',
      payment_method: 'cash_at_counter',
      payment_status: 'pending',
      notes: 'Less spicy please',
      created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      profile: { full_name: 'Rahul Sharma (Student)', phone: '+91 98765 43210' },
      order_items: [
        {
          id: 'item-1',
          food_id: 'f102-masala-dosa',
          item_name: 'Crispy Masala Dosa',
          unit_price: 80,
          quantity: 1,
          subtotal: 80,
        },
        {
          id: 'item-2',
          food_id: 'f104-cold-coffee',
          item_name: 'Frosted Cold Coffee',
          unit_price: 55,
          quantity: 1,
          subtotal: 55,
        },
      ],
    },
    {
      id: 'ord-demo-02',
      user_id: 'std-ananya-02',
      order_number: 1042,
      total: 95,
      status: 'ready',
      payment_method: 'cash_at_counter',
      payment_status: 'paid',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      profile: { full_name: 'Ananya Verma (Student)', phone: '+91 91234 56789' },
      order_items: [
        {
          id: 'item-3',
          food_id: 'f101-paneer-roll',
          item_name: 'Paneer Tikka Kathi Roll',
          unit_price: 95,
          quantity: 1,
          subtotal: 95,
        },
      ],
    },
  ];
  localStorage.setItem(STORAGE_KEY_LOCAL_ORDERS, JSON.stringify(initialDemoOrders));
  return initialDemoOrders;
}

function saveLocalOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY_LOCAL_ORDERS, JSON.stringify(orders));
  // Dispatch local realtime event
  window.dispatchEvent(new CustomEvent('campusbite_order_update', { detail: orders }));
}

// ---------------------------------------------------------------------------
// Unified Service Layer (Supabase with Automatic Resilient Fallback)
// ---------------------------------------------------------------------------

export async function fetchFoodItems(): Promise<FoodItem[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) return data as FoodItem[];
    } catch (err) {
      console.warn('Supabase fetchFoodItems failed, using persistent local menu:', err);
    }
  }
  return getLocalMenu();
}

export async function saveFoodItem(item: Partial<FoodItem> & { name: string; price: number }): Promise<FoodItem> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      if (item.id) {
        const { data, error } = await supabase
          .from('food_items')
          .update(item)
          .eq('id', item.id)
          .select()
          .single();
        if (error) throw error;
        return data as FoodItem;
      } else {
        const { data, error } = await supabase
          .from('food_items')
          .insert(item)
          .select()
          .single();
        if (error) throw error;
        return data as FoodItem;
      }
    } catch (err) {
      console.warn('Supabase saveFoodItem failed, updating local store:', err);
    }
  }

  const items = getLocalMenu();
  if (item.id) {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...item } as FoodItem;
      saveLocalMenu(items);
      return items[idx];
    }
  }
  const newItem: FoodItem = {
    id: 'f-' + Date.now(),
    name: item.name,
    description: item.description || '',
    price: Number(item.price),
    category: item.category || 'Snacks',
    image_url: item.image_url || '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
    is_veg: item.is_veg ?? true,
    is_available: item.is_available ?? true,
    prep_time_mins: item.prep_time_mins || 10,
    calories: item.calories || 250,
  };
  items.unshift(newItem);
  saveLocalMenu(items);
  return newItem;
}

export async function deleteFoodItem(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('food_items').delete().eq('id', id);
      if (error) throw error;
      return;
    } catch (err) {
      console.warn('Supabase deleteFoodItem error:', err);
    }
  }
  const items = getLocalMenu().filter((i) => i.id !== id);
  saveLocalMenu(items);
}

export async function createOrder(
  userId: string,
  userName: string,
  cartItems: { food_item: FoodItem; quantity: number }[],
  notes?: string
): Promise<Order> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      // Use trusted PostgreSQL function create_order_secure if available
      const payloadItems = cartItems.map((ci) => ({
        food_id: ci.food_item.id,
        quantity: ci.quantity,
      }));

      const { data, error } = await supabase.rpc('create_order_secure', {
        p_items: payloadItems,
        p_notes: notes || null,
      });

      if (!error && data?.order_id) {
        // Fetch newly created order with details
        const { data: newOrder, error: fetchErr } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', data.order_id)
          .single();

        if (!fetchErr && newOrder) {
          return newOrder as Order;
        }
      }
    } catch (err) {
      console.warn('Supabase RPC create_order_secure failed, falling back to local transaction:', err);
    }
  }

  // Fallback transactional order creation (computes strictly from menu prices)
  const currentMenu = getLocalMenu();
  let verifiedTotal = 0;
  const orderId = 'ord-' + Date.now();
  const orderNumber = Math.floor(1000 + Math.random() * 9000);

  const orderItems: OrderItem[] = cartItems.map((ci, index) => {
    const verifiedDish = currentMenu.find((d) => d.id === ci.food_item.id) || ci.food_item;
    const unitPrice = verifiedDish.price;
    const subtotal = unitPrice * ci.quantity;
    verifiedTotal += subtotal;

    return {
      id: `oi-${orderId}-${index}`,
      order_id: orderId,
      food_id: verifiedDish.id,
      item_name: verifiedDish.name,
      unit_price: unitPrice,
      quantity: ci.quantity,
      subtotal,
    };
  });

  const newOrder: Order = {
    id: orderId,
    user_id: userId,
    order_number: orderNumber,
    total: verifiedTotal,
    status: 'placed',
    payment_method: 'cash_at_counter',
    payment_status: 'pending',
    notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_items: orderItems,
    profile: { full_name: userName },
  };

  const orders = getLocalOrders();
  orders.unshift(newOrder);
  saveLocalOrders(orders);
  return newOrder;
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) return data as Order[];
    } catch (err) {
      console.warn('Supabase fetchUserOrders error:', err);
    }
  }
  return getLocalOrders().filter((o) => o.user_id === userId);
}

export async function fetchAllOrdersAdmin(): Promise<Order[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), profiles(full_name, phone)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((o: any) => ({
          ...o,
          profile: o.profiles ? { full_name: o.profiles.full_name, phone: o.profiles.phone } : undefined,
        })) as Order[];
      }
    } catch (err) {
      console.warn('Supabase fetchAllOrdersAdmin error:', err);
    }
  }
  return getLocalOrders();
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Attempt secure admin RPC
      const { data, error } = await supabase.rpc('update_order_status_admin', {
        p_order_id: orderId,
        p_status: status,
      });

      if (!error) return true;

      // Direct update fallback if RPC policy permits
      const { error: directErr } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (!directErr) return true;
    } catch (err) {
      console.warn('Supabase updateOrderStatus error:', err);
    }
  }

  const orders = getLocalOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx !== -1) {
    orders[idx].status = status;
    orders[idx].updated_at = new Date().toISOString();
    saveLocalOrders(orders);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Realtime Subscriptions
// ---------------------------------------------------------------------------
export function subscribeToUserOrders(userId: string, callback: (payload: any) => void): () => void {
  const supabase = getSupabaseClient();

  if (supabase && userId) {
    try {
      const channel = supabase
        .channel(`realtime:orders:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            callback(payload);
          }
        )
        .subscribe();

      const localListener = (e: Event) => {
        const ce = e as CustomEvent;
        const orders: Order[] = Array.isArray(ce.detail) ? ce.detail : [ce.detail];
        const userOrders = orders.filter((o) => o && o.user_id === userId);
        if (userOrders.length > 0) {
          callback({ eventType: 'UPDATE', new: userOrders });
        }
      };
      window.addEventListener('campusbite_order_update', localListener);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('campusbite_order_update', localListener);
      };
    } catch (err) {
      console.warn('Supabase user realtime subscription failed:', err);
    }
  }

  // Local event listener fallback
  const listener = (e: Event) => {
    const ce = e as CustomEvent;
    const orders: Order[] = Array.isArray(ce.detail) ? ce.detail : [ce.detail];
    const userOrders = orders.filter((o) => o && o.user_id === userId);
    if (userOrders.length > 0) {
      callback({ eventType: 'UPDATE', new: userOrders });
    }
  };
  window.addEventListener('campusbite_order_update', listener);
  return () => {
    window.removeEventListener('campusbite_order_update', listener);
  };
}

export function subscribeToOrderChanges(callback: (payload: any) => void): () => void {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const channel = supabase
        .channel('realtime:orders:all')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            callback(payload);
          }
        )
        .subscribe();

      const localListener = (e: Event) => {
        const ce = e as CustomEvent;
        callback({ eventType: 'UPDATE', new: ce.detail });
      };
      window.addEventListener('campusbite_order_update', localListener);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('campusbite_order_update', localListener);
      };
    } catch (err) {
      console.warn('Supabase realtime subscription failed:', err);
    }
  }

  // Fallback to Window events for instantaneous local sync
  const listener = (e: Event) => {
    const ce = e as CustomEvent;
    callback({ eventType: 'UPDATE', new: ce.detail });
  };
  window.addEventListener('campusbite_order_update', listener);
  return () => {
    window.removeEventListener('campusbite_order_update', listener);
  };
}
