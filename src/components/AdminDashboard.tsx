import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  LogIn
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onBrowseMenu: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenAuth, onBrowseMenu }) => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Edit / Create food item modal state
  const [editingItem, setEditingItem] = useState<Partial<FoodItem> | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

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
    try {
      await saveFoodItem(editingItem as any);
      await loadData();
      setEditingItem(null);
    } catch (err) {
      console.error('Save item error:', err);
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
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign In as Canteen Admin
            </button>
            <button
              onClick={onBrowseMenu}
              className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Return to Student Menu
            </button>
          </div>
          <div className="pt-4 border-t border-stone-200/60 text-xs text-stone-500 text-left space-y-1">
            <p className="font-semibold text-stone-700">How to Log In as Canteen Admin:</p>
            <p>• <strong>Offline / Demo Mode:</strong> Enter email <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">suresh.manager@campusbite.edu</code> and password <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">admin123</code> in the Sign In form.</p>
            <p>• <strong>Live Supabase Mode:</strong> Sign in with any Supabase user account whose profile has been assigned the <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">role = 'admin'</code> in PostgreSQL.</p>
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
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
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
              onClick={() =>
                setEditingItem({
                  name: '',
                  description: '',
                  price: 50,
                  category: 'Snacks',
                  is_veg: true,
                  is_available: true,
                  prep_time_mins: 10,
                  image_url: '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
                })
              }
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={() => setEditingItem(null)} />
          <div className="relative glass-panel bg-white/95 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-4">
              {editingItem.id ? 'Edit Menu Item' : 'Add New Canteen Dish'}
            </h3>

            <form onSubmit={handleSaveItemModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Masala Dosa"
                  className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Ingredients and culinary notes..."
                  className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={editingItem.price || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Category</label>
                  <select
                    value={editingItem.category || 'Snacks'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="Meals">Meals</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Prep Time (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.prep_time_mins || 10}
                    onChange={(e) => setEditingItem({ ...editingItem, prep_time_mins: parseInt(e.target.value) || 5 })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    value={editingItem.image_url || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                    placeholder="/src/assets/images/... or https://"
                    className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.is_veg ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_veg: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Vegetarian Dish</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingItem.is_available ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Currently Available</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSavingItem ? 'Saving...' : 'Save Dish'}
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
