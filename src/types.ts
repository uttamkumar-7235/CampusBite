export type UserRole = 'student' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at?: string;
}

export type FoodCategory = 'Meals' | 'Snacks' | 'Beverages' | 'South Indian' | 'Fast Food' | 'Desserts';

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: FoodCategory;
  image_url: string;
  is_veg: boolean;
  is_available: boolean;
  prep_time_mins: number;
  calories?: number;
  created_at?: string;
}

export interface CartItem {
  food_item: FoodItem;
  quantity: number;
}

export type OrderStatus = 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id?: string;
  order_id?: string;
  food_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: number;
  total: number;
  status: OrderStatus;
  payment_method: 'cash_at_counter';
  payment_status: 'pending' | 'paid' | 'refunded';
  notes?: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  profile?: {
    full_name: string;
    phone?: string;
  };
}

export interface RecommendationRequest {
  budget: number;
  dietary: 'all' | 'veg' | 'quick' | 'healthy';
  meal_time: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
}

export interface MealCombo {
  name: string;
  items: FoodItem[];
  totalPrice: number;
  savingsOrTag: string;
  reason: string;
}
