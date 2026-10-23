import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FoodItem, Order, OrderStatus } from '../types';
import { fetchAllOrdersAdmin, updateOrderStatus, fetchFoodItems, saveFoodItem, deleteFoodItem, subscribeToOrderChanges } from '../lib/supabase';
import {
  TrendingUp,
  Clock,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Lock,
  LogIn,
  Sparkles,
  Leaf,
  Image as ImageIcon,
  Flame,
  Zap
} from 'lucide-react';

const DISH_IMAGE_PRESETS = [
  { label: 'Paneer Roll', url: '/src/assets/images/dish_paneer_roll_1792759610497.jpg' },
  { label: 'Masala Dosa', url: '/src/assets/images/dish_masala_dosa_1792759610558.jpg' },
  { label: 'Samosa Chaat', url: '/src/assets/images/dish_samosa_chaat_1792759611219.jpg' },
  { label: 'Cold Coffee', url: '/src/assets/images/dish_cold_coffee_1792759612380.jpg' },
  { label: 'Dum Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80' },
  { label: 'Chole Bhature', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80' },
  { label: 'Cheesy Maggi', url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80' },
  { label: 'Pav Bhaji', url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80' },
  { label: 'Grilled Sandwich', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80' },
  { label: 'Kulhad Chai', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80' },
  { label: 'Mango Lassi', url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=80' },
  { label: 'Vada Pav / Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80' },
];

const QUICK_TEMPLATES = [
  {
    name: 'Mumbai Vada Pav',
    category: 'Fast Food' as const,
    price: 35,
    prep_time_mins: 4,
    calories: 290,
    is_veg: true,
    description: 'Crispy spiced potato dumpling in buttered pav bun with spicy garlic thecha and green chutney.',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'South Indian Idli Sambar (2 pcs)',
    category: 'South Indian' as const,
    price: 50,
    prep_time_mins: 5,
    calories: 180,
    is_veg: true,
    description: 'Steaming hot, fluffy fermented rice cakes served with aromatic drumstick sambar and coconut dip.',
    image_url: '/src/assets/images/dish_masala_dosa_1792759610558.jpg',
  },
  {
    name: 'Veg Hakka Noodles',
    category: 'Fast Food' as const,
    price: 85,
    prep_time_mins: 8,
    calories: 360,
    is_veg: true,
    description: 'Wok-tossed noodles with shredded cabbage, bell peppers, carrots, spring onions, and garlic chili oil.',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Fresh Sweet Lemonade (Shikanji)',
    category: 'Beverages' as const,
    price: 25,
    prep_time_mins: 3,
    calories: 90,
    is_veg: true,
    description: 'Chilled freshly squeezed lemon water with roasted cumin, black salt, and mint sprigs.',
    image_url: '/src/assets/images/dish_cold_coffee_1792759612380.jpg',
  },
];

interface AdminDashboardProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenAdminAuth?: () => void;
  onBrowseMenu: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenAuth,
  onOpenAdminAuth,
  onBrowseMenu,
}) => {
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Edit / Create food item modal state
  const [editingItem, setEditingItem] = useState<Partial<FoodItem> | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  const handleOpenAddModal = (preset?: Partial<FoodItem>) => {
    setEditingItem({
      name: '',
      description: '',
      price: 50,
      category: 'Snacks',
      is_veg: true,
      is_available: true,
      prep_time_mins: 10,
      calories: 250,
      image_url: '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
      ...preset,
    });
  };

  const loadData = async () => {
    if (role !== 'admin') {
      const fetchedMenu = await fetchFoodItems();
      setMenuItems(fetchedMenu);
      return;
    }
    const [fetchedOrders, fetchedMenu] = await Promise.all([
      fetchAllOrdersAdmin(),
      fetchFoodItems(),
    ]);
    setOrders(fetchedOrders);
    setMenuItems(fetchedMenu);
  };

  useEffect(() => {
    loadData();

    if (role === 'admin') {
      const unsubscribe = subscribeToOrderChanges(() => {
        loadData();
      });
      return () => {
        unsubscribe();
      };
    }
  }, [role]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingStatus(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleToggleAvailability = async (item: FoodItem) => {
    try {
      const updated = { ...item, is_available: !item.is_available };
      await saveFoodItem(updated);
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !item.is_available } : i))
      );
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this dish from the canteen menu?')) return;
    try {
      await deleteFoodItem(itemId);
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSaveItemModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.price) return;
    setIsSavingItem(true);
    const isNew = !editingItem.id;
    try {
      await saveFoodItem(editingItem as any);
      await loadData();
      showToast({
        type: 'info',
        title: isNew ? 'Dish Added Successfully' : 'Dish Updated',
        message: `${editingItem.name} (₹${Number(editingItem.price).toFixed(2)}) is now live on the canteen menu!`,
      });
      setEditingItem(null);
    } catch (err: any) {
      console.error('Save item error:', err);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Failed to save menu item. Please check the values.',
      });
    } finally {
      setIsSavingItem(false);
    }
  };

  // KPI Calculations
  const todayOrders = orders;
  const totalSales = todayOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
  const activeOrdersCount = todayOrders.filter((o) => ['placed', 'preparing', 'ready'].includes(o.status)).length;
  const completedOrdersCount = todayOrders.filter((o) => o.status === 'completed').length;

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'active') return ['placed', 'preparing', 'ready'].includes(o.status);
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  // Guard 1: Not authenticated
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-white/75 backdrop-blur-md border border-stone-200/80 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Staff Authentication Required</h2>
            <p className="text-sm text-stone-600 mt-2 max-w-md mx-auto leading-relaxed">
              The Canteen Operations Hub & Kitchen Dispatch Console is strictly restricted to verified canteen management staff. Please sign in with an administrative account.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAdminAuth ? onOpenAdminAuth() : onOpenAuth('login')}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-stone-900 to-stone-800 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-stone-900/15 hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              Sign In as Canteen Admin
            </button>
            <button
              onClick={onBrowseMenu}
              className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Return to Student Menu
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Guard 2: Authenticated but not an admin
  if (role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-white/75 backdrop-blur-md border border-red-200/80 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center mx-auto text-red-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
              Access Restricted (RLS Protected)
            </span>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Student Account Detected</h2>
            <p className="text-sm text-stone-600 mt-2 max-w-md mx-auto leading-relaxed">
              You are currently authenticated as <strong className="text-stone-900">{user.full_name || user.email}</strong> with role <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-semibold">{role}</code>. 
              By Supabase PostgreSQL Row Level Security (RLS) policies, only verified canteen chefs and administrators are authorized to view or manage the live kitchen queue and sales KPIs.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onBrowseMenu}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all cursor-pointer"
            >
              Back to Student Canteen Menu
            </button>
            <button
              onClick={() => onOpenAdminAuth ? onOpenAdminAuth() : onOpenAuth('login')}
              className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              Sign In with Admin Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">

      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Canteen Operations Hub
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time kitchen order queue, live token dispatch, and menu control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/80">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'orders' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Live Orders ({activeOrdersCount})
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'menu' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Menu Manager ({menuItems.length})
            </button>
          </div>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Add a new dish to canteen menu"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add New Item</span>
            <span className="sm:hidden">Add</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh canteen data"
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canteen KPI Counters Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-stone-200/60 shadow-xs">
          <span className="text-xs text-stone-500 font-medium">Today's Revenue</span>
          <div className="text-2xl font-black font-mono text-stone-900 tabular-nums mt-1">
            ₹{totalSales.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Cash at counter</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-stone-200/60 shadow-xs">
          <span className="text-xs text-stone-500 font-medium">Total Orders Today</span>
          <div className="text-2xl font-black font-mono text-stone-900 tabular-nums mt-1">
            {todayOrders.length}
          </div>
          <span className="text-[11px] text-stone-400">Tokens generated</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-stone-200/60 shadow-xs">
          <span className="text-xs text-stone-500 font-medium">Active In Kitchen</span>
          <div className="text-2xl font-black font-mono text-orange-600 tabular-nums mt-1">
            {activeOrdersCount}
          </div>
          <span className="text-[11px] text-orange-600/80">Needs preparation / ready</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-stone-200/60 shadow-xs">
          <span className="text-xs text-stone-500 font-medium">Completed Deliveries</span>
          <div className="text-2xl font-black font-mono text-stone-800 tabular-nums mt-1">
            {completedOrdersCount}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Collected by students</span>
        </div>
      </div>

      {/* TAB 1: LIVE INCOMING ORDERS */}
      {activeTab === 'orders' && (
        <section className="space-y-6">
          {/* Status Sub-Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['active', 'placed', 'preparing', 'ready', 'completed', 'all'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-stone-200/70">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-base font-bold text-stone-900">Queue is clear</h3>
              <p className="text-xs text-stone-500 mt-1">No orders currently match the selected filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOrders.map((order) => {
                const isBusy = isUpdatingStatus === order.id;

                return (
                  <div
                    key={order.id}
                    className={`glass-card rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                      order.status === 'placed'
                        ? 'border-amber-300 ring-2 ring-amber-400/10'
                        : order.status === 'preparing'
                        ? 'border-orange-300 ring-2 ring-orange-400/10'
                        : order.status === 'ready'
                        ? 'border-emerald-300 ring-2 ring-emerald-400/15'
                        : 'border-stone-200/70 opacity-90'
                    }`}
                  >
                    <div>
                      {/* Order Token & Status Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Token</span>
                          <div className="text-2xl font-mono font-black text-stone-900">
                            #{order.order_number}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              order.status === 'placed'
                                ? 'bg-amber-100 text-amber-900 border-amber-200'
                                : order.status === 'preparing'
                                ? 'bg-orange-100 text-orange-900 border-orange-200 animate-pulse'
                                : order.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : order.status === 'completed'
                                ? 'bg-stone-100 text-stone-700 border-stone-200'
                                : 'bg-red-100 text-red-700 border-red-200'
                            }`}
                          >
                            {order.status}
                          </span>
                          <span className="block text-[10px] text-stone-400 mt-0.5">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="py-2.5 text-xs text-stone-600 flex justify-between items-center">
                        <span className="font-medium text-stone-800">
                          {order.profile?.full_name || 'Student'}
                        </span>
                        {order.profile?.phone && (
                          <span className="text-stone-400 text-[11px]">{order.profile.phone}</span>
                        )}
                      </div>

                      {/* Item list */}
                      <div className="py-2 space-y-1.5 border-t border-stone-100 max-h-36 overflow-y-auto">
                        {order.order_items?.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-stone-800">
                            <span className="font-semibold">
                              {it.quantity}x <span className="font-normal text-stone-700">{it.item_name}</span>
                            </span>
                            <span className="font-mono tabular-nums text-stone-500">
                              ₹{it.subtotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {order.notes && (
                          <div className="p-2 rounded-lg bg-amber-50 text-[11px] text-amber-900 mt-1">
                            <strong>Note:</strong> {order.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Status Transition Actions */}
                    <div className="pt-4 mt-3 border-t border-stone-100">
                      <div className="flex justify-between items-center text-xs mb-3">
                        <span className="text-stone-500">Total Due:</span>
                        <span className="font-mono text-base font-bold text-stone-900 tabular-nums">
                          ₹{order.total.toFixed(2)}
                        </span>
                      </div>

                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <div className="grid grid-cols-2 gap-2">
                          {order.status === 'placed' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'preparing')}
                              disabled={isBusy}
                              className="col-span-2 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span>Start Cooking</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'ready')}
                              disabled={isBusy}
                              className="col-span-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span>Ready for Pickup</span>
                              <BellRingIcon className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'completed')}
                              disabled={isBusy}
                              className="col-span-2 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span>Mark Collected (Paid)</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: MENU MANAGER */}
      {activeTab === 'menu' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Live Canteen Menu Management</h2>
              <p className="text-xs text-stone-500">Toggle real-time item availability or adjust INR prices.</p>
            </div>

            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-stone-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/90 text-stone-500 border-b border-stone-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Dish Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price (INR)</th>
                    <th className="py-3 px-4">Prep Time</th>
                    <th className="py-3 px-4">Live Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/src/assets/images/dish_samosa_chaat_1792759611219.jpg';
                          }}
                        />
                        <div>
                          <span className="font-bold text-stone-900 block">{item.name}</span>
                          <span className="text-[11px] text-stone-500 line-clamp-1">{item.description}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-stone-600 font-medium">{item.category}</span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-stone-900 tabular-nums">
                        ₹{item.price.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-stone-600 font-mono tabular-nums">
                        {item.prep_time_mins} mins
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            item.is_available
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{item.is_available ? 'In Stock' : 'Sold Out'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Edit Dish"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Dish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Edit / Create Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4">
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingItem(null)} />
          <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top accent bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">
                    {editingItem.id ? 'Edit Canteen Dish' : 'Add New Canteen Dish'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {editingItem.id
                      ? 'Update recipe, pricing or availability in real-time.'
                      : 'New items appear instantly on the student ordering menu and AI meal combos.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <Trash2 className="w-4 h-4 sr-only" />
                <span className="text-lg leading-none font-bold">×</span>
              </button>
            </div>

            {/* Quick Starter Templates (Only when creating a brand new dish) */}
            {!editingItem.id && (
              <div className="p-3 mb-5 rounded-2xl bg-orange-50/80 border border-orange-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>Quick Starter Templates (Click to prefill):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => setEditingItem((prev) => ({ ...prev, ...tpl }))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-orange-100 text-stone-800 rounded-lg border border-orange-200 transition-colors cursor-pointer shadow-2xs"
                    >
                      + {tpl.name} (₹{tpl.price})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveItemModal} className="space-y-4 text-xs">
              {/* Dish Name */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Dish Name <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Special Paneer Dosa, Cold Coffee, Chole Bhature"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-stone-900 shadow-2xs"
                />
              </div>

              {/* Category Selector Buttons */}
              <div>
                <label className="block font-bold text-stone-800 mb-1.5">
                  Category <span className="text-orange-600">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['Snacks', 'South Indian', 'Meals', 'Fast Food', 'Beverages', 'Desserts'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, category: cat })}
                      className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer text-center ${
                        editingItem.category === cat
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price, Prep Time, and Calories in 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Price (₹ INR) <span className="text-orange-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={editingItem.price || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs text-stone-900 shadow-2xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Prep Time (mins)
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={editingItem.prep_time_mins || 10}
                      onChange={(e) => setEditingItem({ ...editingItem, prep_time_mins: parseInt(e.target.value) || 5 })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs text-stone-900 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Calories (kcal)
                  </label>
                  <div className="relative">
                    <Flame className="w-3.5 h-3.5 text-orange-500 absolute left-3 top-3" />
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={editingItem.calories || 250}
                      onChange={(e) => setEditingItem({ ...editingItem, calories: parseInt(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-xs text-stone-900 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Description & Key Ingredients <span className="text-orange-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Freshly prepared with aromatic spices, served hot with chutney..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs text-stone-900 shadow-2xs"
                />
              </div>

              {/* Photo Selection: Presets Carousel + Custom URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800">
                    Dish Photo Selection
                  </label>
                  <span className="text-[11px] text-stone-400">Click a preset thumbnail or enter URL</span>
                </div>

                {/* Preset Thumbnails */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                  {DISH_IMAGE_PRESETS.map((pst) => {
                    const isSelected = editingItem.image_url === pst.url;
                    return (
                      <button
                        key={pst.label}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, image_url: pst.url })}
                        className={`shrink-0 flex items-center gap-1.5 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <img
                          src={pst.url}
                          alt={pst.label}
                          className="w-6 h-6 rounded-lg object-cover bg-stone-200 shrink-0"
                        />
                        <span className="text-[10px] font-bold whitespace-nowrap">{pst.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom URL Input with Live Preview */}
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1">
                    <ImageIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={editingItem.image_url || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                      placeholder="/src/assets/images/... or https://"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-[11px] text-stone-800"
                    />
                  </div>

                  {editingItem.image_url && (
                    <img
                      src={editingItem.image_url}
                      alt="Preview"
                      className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/src/assets/images/dish_samosa_chaat_1792759611219.jpg';
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Toggles: Veg & Available */}
              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-3 py-2 rounded-xl border border-stone-200/80 hover:bg-stone-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingItem.is_veg ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_veg: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1.5 font-bold text-stone-800">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                    Pure Vegetarian Dish
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-3 py-2 rounded-xl border border-stone-200/80 hover:bg-stone-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingItem.is_available ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="flex items-center gap-1.5 font-bold text-stone-800">
                    <Power className="w-3.5 h-3.5 text-orange-600" />
                    Available In Stock Today
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-5 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md hover:shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  {isSavingItem ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Menu...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{editingItem.id ? 'Save Changes' : 'Add Item to Canteen'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper icon
function BellRingIcon(props: any) {
  return <TrendingUp {...props} />;
}
