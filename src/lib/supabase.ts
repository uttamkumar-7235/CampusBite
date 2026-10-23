import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FoodItem, Order, OrderItem, OrderStatus, Profile } from '../types';
import { INITIAL_FOOD_ITEMS } from '../data/initialMenu';

const STORAGE_KEY_URL = 'campusbite_supabase_url';
const STORAGE_KEY_KEY = 'campusbite_supabase_anon_key';
const STORAGE_KEY_LOCAL_ORDERS = 'campusbite_local_orders';
const STORAGE_KEY_LOCAL_MENU = 'campusbite_local_menu';

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let cleaned = rawUrl.trim();
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned.replace(/\/+$/, '');
}

export function getSupabaseCredentials() {
  const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = normalizeSupabaseUrl(localStorage.getItem(STORAGE_KEY_URL) || '');
  const localKey = localStorage.getItem(STORAGE_KEY_KEY);

  const url = (envUrl && envUrl !== 'https://your-project-ref.supabase.co') ? envUrl : localUrl || '';
  const key = (envKey && envKey !== 'your-anon-publishable-key') ? envKey.trim() : (localKey ? localKey.trim() : '');

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
      if (data && data.length > 0) {
        // Cache to local for high-performance offline resilience
        saveLocalMenu(data as FoodItem[]);
        return data as FoodItem[];
      }

      // If data returned 0 rows, auto-seed with canonical dishes into Supabase!
      if (data && data.length === 0) {
        console.info('Canteen database table empty: auto-seeding canonical dishes to Supabase...');
        const seedRows = INITIAL_FOOD_ITEMS.map((item) => ({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image_url: item.image_url,
          is_veg: item.is_veg,
          is_available: item.is_available,
          prep_time_mins: item.prep_time_mins,
          calories: item.calories || 250,
        }));

        const { data: insertedData, error: seedError } = await supabase
          .from('food_items')
          .insert(seedRows)
          .select();

        if (!seedError && insertedData && insertedData.length > 0) {
          saveLocalMenu(insertedData as FoodItem[]);
          return insertedData as FoodItem[];
        }
      }
    } catch (err) {
      console.warn('Supabase fetchFoodItems failed, using persistent local menu:', err);
    }
  }
  return getLocalMenu();
}

export async function saveFoodItem(item: Partial<FoodItem> & { name: string; price: number }): Promise<FoodItem> {
  const supabase = getSupabaseClient();
  let savedItem: FoodItem | null = null;

  if (supabase) {
    try {
      const isUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);
      if (isUuid) {
        const updatePayload: Record<string, any> = {
          name: item.name.trim(),
          price: Number(item.price),
          updated_at: new Date().toISOString(),
        };
        if (item.description !== undefined) updatePayload.description = item.description.trim();
        if (item.category !== undefined) updatePayload.category = item.category;
        if (item.image_url !== undefined) updatePayload.image_url = item.image_url.trim();
        if (item.is_veg !== undefined) updatePayload.is_veg = item.is_veg;
        if (item.is_available !== undefined) updatePayload.is_available = item.is_available;
        if (item.prep_time_mins !== undefined) updatePayload.prep_time_mins = Number(item.prep_time_mins);
        if (item.calories !== undefined) updatePayload.calories = Number(item.calories);

        const { data, error } = await supabase
          .from('food_items')
          .update(updatePayload)
          .eq('id', item.id)
          .select()
          .single();
        if (error) throw error;
        if (data) savedItem = data as FoodItem;
      } else {
        const insertPayload = {
          name: item.name.trim(),
          description: item.description?.trim() || '',
          price: Number(item.price),
          category: item.category || 'Snacks',
          image_url: item.image_url?.trim() || '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
          is_veg: item.is_veg ?? true,
          is_available: item.is_available ?? true,
          prep_time_mins: Number(item.prep_time_mins) || 10,
          calories: item.calories ? Number(item.calories) : 250,
        };

        const { data, error } = await supabase
          .from('food_items')
          .insert(insertPayload)
          .select()
          .single();
        if (error) throw error;
        if (data) savedItem = data as FoodItem;
      }
    } catch (err) {
      console.warn('Supabase saveFoodItem failed, updating local store:', err);
    }
  }

  const items = getLocalMenu();
  if (savedItem) {
    const idx = items.findIndex((i) => i.id === savedItem!.id || i.name.toLowerCase() === savedItem!.name.toLowerCase());
    if (idx !== -1) {
      items[idx] = savedItem;
    } else {
      items.unshift(savedItem);
    }
    saveLocalMenu(items);
    window.dispatchEvent(new CustomEvent('campusbite_menu_update', { detail: savedItem }));
    return savedItem;
  }

  // Local storage fallback
  if (item.id) {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...item } as FoodItem;
      saveLocalMenu(items);
      window.dispatchEvent(new CustomEvent('campusbite_menu_update', { detail: items[idx] }));
      return items[idx];
    }
  }

  const newItem: FoodItem = {
    id: 'f-' + Date.now(),
    name: item.name.trim(),
    description: item.description?.trim() || '',
    price: Number(item.price),
    category: item.category || 'Snacks',
    image_url: item.image_url?.trim() || '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
    is_veg: item.is_veg ?? true,
    is_available: item.is_available ?? true,
    prep_time_mins: Number(item.prep_time_mins) || 10,
    calories: item.calories ? Number(item.calories) : 250,
  };
  items.unshift(newItem);
  saveLocalMenu(items);
  window.dispatchEvent(new CustomEvent('campusbite_menu_update', { detail: newItem }));
  return newItem;
}

export async function deleteFoodItem(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const { error } = await supabase.from('food_items').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (err) {
      console.warn('Supabase deleteFoodItem error:', err);
    }
  }
  const items = getLocalMenu().filter((i) => i.id !== id);
  saveLocalMenu(items);
  window.dispatchEvent(new CustomEvent('campusbite_menu_update', { detail: { deletedId: id } }));
}

export interface CreateOrderDetails {
  paymentMethod?: 'cash_at_counter' | 'upi_counter';
  pickupType?: 'dine_in' | 'takeaway';
  studentRoll?: string;
  studentPhone?: string;
}

export async function createOrder(
  userId: string,
  userName: string,
  cartItems: { food_item: FoodItem; quantity: number }[],
  notes?: string,
  details?: CreateOrderDetails
): Promise<Order> {
  const supabase = getSupabaseClient();
  const currentMenu = getLocalMenu();

  let verifiedTotal = 0;
  const paymentMethod = details?.paymentMethod || 'cash_at_counter';
  const pickupType = details?.pickupType || 'dine_in';
  const studentRoll = details?.studentRoll?.trim() || '';

  const composedNotes = [
    pickupType === 'takeaway' ? '[Takeaway Pack]' : '[Dine-In]',
    studentRoll ? `[Roll: ${studentRoll}]` : '',
    notes?.trim(),
  ].filter(Boolean).join(' ');

  const tempOrderId = 'ord-' + Date.now();
  const generatedToken = Math.floor(1000 + Math.random() * 9000);

  const calculatedItems: OrderItem[] = cartItems.map((ci, index) => {
    const verifiedDish = currentMenu.find((d) => d.id === ci.food_item.id) || ci.food_item;
    const unitPrice = verifiedDish.price;
    const subtotal = unitPrice * ci.quantity;
    verifiedTotal += subtotal;

    return {
      id: `oi-${tempOrderId}-${index}`,
      order_id: tempOrderId,
      food_id: verifiedDish.id,
      item_name: verifiedDish.name,
      unit_price: unitPrice,
      quantity: ci.quantity,
      subtotal,
    };
  });

  // Attempt Supabase storage if connected and user is authenticated
  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      // Method A: If secure RPC function exists and all food IDs are UUIDs
      if (isUuid) {
        try {
          const payloadItems = cartItems.map((ci) => ({
            food_id: ci.food_item.id,
            quantity: ci.quantity,
          }));

          const { data: rpcData, error: rpcErr } = await supabase.rpc('create_order_secure', {
            p_items: payloadItems,
            p_notes: composedNotes || null,
          });

          if (!rpcErr && rpcData?.order_id) {
            const { data: fullOrder, error: fetchErr } = await supabase
              .from('orders')
              .select('*, order_items(*)')
              .eq('id', rpcData.order_id)
              .single();

            if (!fetchErr && fullOrder) {
              const liveOrder: Order = {
                ...fullOrder,
                payment_method: paymentMethod,
                pickup_type: pickupType,
                student_roll: studentRoll,
                profile: { full_name: userName, phone: details?.studentPhone },
              };
              const localList = getLocalOrders();
              localList.unshift(liveOrder);
              saveLocalOrders(localList);
              return liveOrder;
            }
          }
        } catch (rpcEx) {
          // Fall through to direct table insert
        }

        // Method B: Direct Supabase Table Insert
        const { data: insertedOrder, error: orderErr } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            total: verifiedTotal,
            status: 'placed',
            payment_method: paymentMethod,
            payment_status: 'pending',
            notes: composedNotes || null,
          })
          .select()
          .single();

        if (!orderErr && insertedOrder) {
          // Insert order items
          const dbOrderItems = calculatedItems.map((it) => ({
            order_id: insertedOrder.id,
            food_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.food_id)
              ? it.food_id
              : '00000000-0000-0000-0000-000000000000',
            item_name: it.item_name,
            unit_price: it.unit_price,
            quantity: it.quantity,
            subtotal: it.subtotal,
          }));

          const { data: insertedItems } = await supabase
            .from('order_items')
            .insert(dbOrderItems)
            .select();

          const finalLiveOrder: Order = {
            ...insertedOrder,
            payment_method: paymentMethod,
            pickup_type: pickupType,
            student_roll: studentRoll,
            order_items: (insertedItems && insertedItems.length > 0) ? (insertedItems as OrderItem[]) : calculatedItems,
            profile: { full_name: userName, phone: details?.studentPhone },
          };

          const localList = getLocalOrders();
          localList.unshift(finalLiveOrder);
          saveLocalOrders(localList);
          return finalLiveOrder;
        }
      }
    } catch (err) {
      console.warn('Supabase order insert error, saving to local store:', err);
    }
  }

  // Reliable Fallback / Demo Transaction
  const newOrder: Order = {
    id: tempOrderId,
    user_id: userId,
    order_number: generatedToken,
    total: verifiedTotal,
    status: 'placed',
    payment_method: paymentMethod,
    payment_status: 'pending',
    pickup_type: pickupType,
    student_roll: studentRoll,
    notes: composedNotes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_items: calculatedItems,
    profile: { full_name: userName, phone: details?.studentPhone },
  };

  const orders = getLocalOrders();
  orders.unshift(newOrder);
  saveLocalOrders(orders);
  return newOrder;
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const supabase = getSupabaseClient();
  const localUserOrders = getLocalOrders().filter((o) => o.user_id === userId);

  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUuid) {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Merge remote orders with any local orders
          const remoteIds = new Set(data.map((d: any) => d.id));
          const combined = [
            ...data,
            ...localUserOrders.filter((lo) => !remoteIds.has(lo.id)),
          ] as Order[];
          return combined;
        }
      }
    } catch (err) {
      console.warn('Supabase fetchUserOrders error:', err);
    }
  }
  return localUserOrders;
}

export async function fetchAllOrdersAdmin(): Promise<Order[]> {
  const supabase = getSupabaseClient();
  const localOrders = getLocalOrders();

  if (supabase) {
    try {
      // First try with profiles join
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), profiles(full_name, phone)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedRemote = data.map((o: any) => ({
          ...o,
          profile: o.profiles ? { full_name: o.profiles.full_name, phone: o.profiles.phone } : undefined,
        }));
        const remoteIds = new Set(mappedRemote.map((m: any) => m.id));
        const combined = [
          ...mappedRemote,
          ...localOrders.filter((lo) => !remoteIds.has(lo.id)),
        ] as Order[];
        return combined;
      }

      // If profiles join fails, try plain select
      const { data: plainData, error: plainErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (!plainErr && plainData) {
        const remoteIds = new Set(plainData.map((d: any) => d.id));
        return [
          ...plainData,
          ...localOrders.filter((lo) => !remoteIds.has(lo.id)),
        ] as Order[];
      }
    } catch (err) {
      console.warn('Supabase fetchAllOrdersAdmin error:', err);
    }
  }
  return localOrders;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      if (isUuid) {
        // Attempt secure admin RPC
        const { error: rpcErr } = await supabase.rpc('update_order_status_admin', {
          p_order_id: orderId,
          p_status: status,
        });

        if (!rpcErr) {
          // Also sync locally
          const orders = getLocalOrders();
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx !== -1) {
            orders[idx].status = status;
            orders[idx].updated_at = new Date().toISOString();
            saveLocalOrders(orders);
          }
          return true;
        }

        // Direct update fallback
        const { error: directErr } = await supabase
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', orderId);

        if (!directErr) {
          const orders = getLocalOrders();
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx !== -1) {
            orders[idx].status = status;
            orders[idx].updated_at = new Date().toISOString();
            saveLocalOrders(orders);
          }
          return true;
        }
      }
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

export async function cancelOrder(orderId: string): Promise<boolean> {
  return updateOrderStatus(orderId, 'cancelled');
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
