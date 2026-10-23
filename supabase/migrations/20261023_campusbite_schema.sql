-- ==============================================================================
-- CampusBite Supabase Schema Migration
-- Database: PostgreSQL + Supabase Auth + RLS + Realtime
-- ==============================================================================

-- 1. Create Profiles Table (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on profiles role for fast authorization checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Create Food Items Table
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL CHECK (category IN ('Meals', 'Snacks', 'Beverages', 'South Indian', 'Fast Food', 'Desserts')),
  image_url TEXT NOT NULL,
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  prep_time_mins INTEGER NOT NULL DEFAULT 10 CHECK (prep_time_mins > 0),
  calories INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_food_items_category ON public.food_items(category);
CREATE INDEX IF NOT EXISTS idx_food_items_is_available ON public.food_items(is_available);
CREATE INDEX IF NOT EXISTS idx_food_items_is_veg ON public.food_items(is_veg);

-- 3. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_number SERIAL,
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'cash_at_counter',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 4. Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  food_id UUID REFERENCES public.food_items(id) ON DELETE RESTRICT NOT NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 5. Row Level Security (RLS) Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- RLS: profiles
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS: food_items (Public can view menu; only admins can modify)
CREATE POLICY "Anyone can view available food items"
  ON public.food_items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert food items"
  ON public.food_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update food items"
  ON public.food_items FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete food items"
  ON public.food_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- RLS: orders
CREATE POLICY "Students can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- RLS: order_items
CREATE POLICY "Users can view order items for their orders"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Authenticated users can insert order items for their own orders"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- 6. Trigger: Automatically create student profile on Supabase auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'student' -- Always default to student for security
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security: Prevent users from self-assigning or updating their role to 'admin'
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only canteen administrators can change user roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 7. Trusted PostgreSQL RPC: Secure Order Creation
-- Computes real prices from food_items table. Never trusts client totals!
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_total NUMERIC(10, 2) := 0;
  v_item JSONB;
  v_food_id UUID;
  v_quantity INTEGER;
  v_actual_price NUMERIC(10, 2);
  v_food_name TEXT;
  v_is_available BOOLEAN;
  v_subtotal NUMERIC(10, 2);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- 1. Create order record with provisional total 0
  INSERT INTO public.orders (user_id, total, status, payment_method, notes)
  VALUES (v_user_id, 0, 'placed', 'cash_at_counter', p_notes)
  RETURNING id INTO v_order_id;

  -- 2. Process items securely using official database prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_food_id := (v_item->>'food_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_food_id;
    END IF;

    SELECT name, price, is_available
    INTO v_food_name, v_actual_price, v_is_available
    FROM public.food_items
    WHERE id = v_food_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Food item % not found', v_food_id;
    END IF;

    IF NOT v_is_available THEN
      RAISE EXCEPTION 'Item "%" is currently sold out', v_food_name;
    END IF;

    v_subtotal := v_actual_price * v_quantity;
    v_total := v_total + v_subtotal;

    INSERT INTO public.order_items (order_id, food_id, item_name, unit_price, quantity, subtotal)
    VALUES (v_order_id, v_food_id, v_food_name, v_actual_price, v_quantity, v_subtotal);
  END LOOP;

  -- 3. Update total with verified database calculation
  UPDATE public.orders
  SET total = v_total
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'status', 'placed'
  );
END;
$$;

-- 8. Trusted PostgreSQL RPC: Admin Order Status Update
CREATE OR REPLACE FUNCTION public.update_order_status_admin(
  p_order_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: only canteen admins can update order statuses';
  END IF;

  IF p_status NOT IN ('placed', 'preparing', 'ready', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status %', p_status;
  END IF;

  UPDATE public.orders
  SET status = p_status,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

-- 9. Realtime Publication
-- Add orders and food_items to supabase_realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'food_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.food_items;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Catch if publication already includes them or running in standalone env
END $$;

-- 10. Seed Data: 12 Realistic College Canteen Dishes in INR
INSERT INTO public.food_items (name, description, price, category, image_url, is_veg, is_available, prep_time_mins, calories)
VALUES
  (
    'Paneer Tikka Kathi Roll',
    'Char-grilled cottage cheese cubes tossed in spicy tandoori mint mayo, wrapped in a flaky handmade paratha with crunchy laccha onions.',
    95.00,
    'Snacks',
    '/src/assets/images/dish_paneer_roll_1792759610497.jpg',
    true,
    true,
    10,
    380
  ),
  (
    'Crispy Masala Dosa',
    'Crisp golden fermented rice crepe filled with fragrant spiced mustard-potato mash, served with fresh coconut chutney and hot drumstick sambar.',
    80.00,
    'South Indian',
    '/src/assets/images/dish_masala_dosa_1792759610558.jpg',
    true,
    true,
    8,
    320
  ),
  (
    'Special Samosa Chaat',
    'Two golden crust potato samosas crushed and smothered with warm spiced chickpeas, sweetened beaten yogurt, tamarind and coriander chutney with crisp nylon sev.',
    60.00,
    'Snacks',
    '/src/assets/images/dish_samosa_chaat_1792759611219.jpg',
    true,
    true,
    5,
    340
  ),
  (
    'Frosted Cold Coffee',
    'Creamy blended espresso coffee with whole milk, vanilla essence, chocolate drizzle, and velvety chilled froth.',
    55.00,
    'Beverages',
    '/src/assets/images/dish_cold_coffee_1792759612380.jpg',
    true,
    true,
    4,
    210
  ),
  (
    'Royal Veg Dum Biryani',
    'Long-grain aged basmati rice slow-cooked with fresh garden vegetables, saffron milk, caramelized shallots, mint, and aromatic whole spices. Served with raita.',
    120.00,
    'Meals',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    15,
    520
  ),
  (
    'Amritsari Chole Bhature',
    'Two balloon-puffed golden fried bhaturas paired with rich slow-simmered Punjabi chickpea curry, pickled chili, and fresh onion rings.',
    110.00,
    'Meals',
    'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    12,
    580
  ),
  (
    'Cheesy Maggi Noodles',
    'The iconic canteen 2-minute masala Maggi loaded with sweet corn, capsicum, secret spice blend, and melted mozzarella cheese.',
    50.00,
    'Fast Food',
    'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    6,
    310
  ),
  (
    'Indori Poha with Sev',
    'Fluffy steamed flattened rice tempered with mustard seeds, curry leaves, turmeric, roasted peanuts, topped with Ratlami sev and fresh lime.',
    40.00,
    'Snacks',
    'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    4,
    230
  ),
  (
    'Mumbai Butter Pav Bhaji',
    'Spicy mashed vegetable curry cooked on a giant flat tawa with dollops of Amul butter, served alongside two toasted buttery ladi pavs and lemon.',
    85.00,
    'Fast Food',
    'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    8,
    460
  ),
  (
    'Triple Cheese Grilled Sandwich',
    'Jumbo multi-grain bread stuffed with cheddar, mozzarella, bell peppers, sweet corn, and house spicy green chutney, grilled till golden crisp.',
    75.00,
    'Fast Food',
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    7,
    390
  ),
  (
    'Kulhad Masala Chai',
    'Strong Assam tea brewed with crushed ginger, green cardamom, cloves, and whole milk, served piping hot in an earthen clay kulhad cup.',
    20.00,
    'Beverages',
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    3,
    110
  ),
  (
    'Alphonso Mango Lassi',
    'Thick chilled churned sweet yogurt blended with luscious Ratnagiri Alphonso mango pulp, garnished with slivered pistachios and saffron.',
    60.00,
    'Desserts',
    'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&auto=format&fit=crop&q=80',
    true,
    true,
    3,
    250
  )
ON CONFLICT DO NOTHING;
