import React, { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { MenuView } from './components/MenuView';
import { AIRecommendations } from './components/AIRecommendations';
import { OrderHistoryView } from './components/OrderHistoryView';
import { AdminDashboard } from './components/AdminDashboard';
import { CartDrawer } from './components/CartDrawer';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { AuthModal } from './components/AuthModal';
import { CanteenChatbot } from './components/CanteenChatbot';
import { RealtimeOrderTracker } from './components/RealtimeOrderTracker';
import { FoodItem, Order } from './types';
import { fetchFoodItems, fetchUserOrders, subscribeToOrderChanges } from './lib/supabase';
import { useAuth } from './context/AuthContext';

function CampusBiteContent() {
  const [currentTab, setCurrentTab] = useState<'menu' | 'recommendations' | 'orders' | 'admin'>('menu');
  const [menuItems, setMenuItems] = useState<FoodItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Modals state
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const { user } = useAuth();

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const loadMenu = async () => {
    setIsLoadingMenu(true);
    const items = await fetchFoodItems();
    setMenuItems(items);
    setIsLoadingMenu(false);
  };

  useEffect(() => {
    loadMenu();

    const unsubscribe = subscribeToOrderChanges(() => {
      // Refresh menu when real-time availability changes
      loadMenu();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOrderPlaced = (order: Order) => {
    setActiveTrackingOrder(order);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FFFDF9] text-stone-800">
      {/* Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main View Body */}
      <main className="flex-1">
        {currentTab === 'menu' && (
          <MenuView
            items={menuItems}
            onOpenRecommendations={() => setCurrentTab('recommendations')}
            onOpenAdmin={() => setCurrentTab('admin')}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentTab === 'recommendations' && (
          <AIRecommendations availableDishes={menuItems} />
        )}

        {currentTab === 'orders' && (
          <OrderHistoryView
            onTrackOrder={(order) => setActiveTrackingOrder(order)}
            onBrowseMenu={() => setCurrentTab('menu')}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            onOpenAuth={handleOpenAuth}
            onBrowseMenu={() => setCurrentTab('menu')}
          />
        )}
      </main>

      {/* Slide-over Tray Drawer */}
      <CartDrawer 
        onOrderPlaced={handleOrderPlaced} 
        onOpenAuth={handleOpenAuth}
      />

      {/* Live Order Status Tracking Modal */}
      <OrderTrackingModal
        order={activeTrackingOrder}
        onClose={() => setActiveTrackingOrder(null)}
      />

      {/* Database Setup & SQL Migration Modal */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />

      {/* Realtime User Order Tracker (Supabase Realtime Listener) */}
      <RealtimeOrderTracker onOpenOrderModal={(order) => setActiveTrackingOrder(order)} />

      {/* Multi-turn AI Assistant Chatbot */}
      <CanteenChatbot />

      {/* Minimal Editorial Footer */}
      <footer className="mt-16 border-t border-stone-200/60 bg-white/60 py-8 px-4 sm:px-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 tracking-tight">CampusBite</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-stone-700">Prasad Institute of Technology Canteen</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">Counter #1 & #2 Open</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsConfigOpen(true)}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Supabase Migration & SQL
            </button>
            <button
              onClick={() => setCurrentTab('admin')}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Canteen Staff Portal
            </button>
            <span className="text-stone-400">© 2026 CampusBite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <CampusBiteApp />
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function CampusBiteApp() {
  return <CampusBiteContent />;
}
