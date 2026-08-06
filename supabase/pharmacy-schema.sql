CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL, 

  -- Geographic Coordinates (Pinned by you during physical onboarding)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_verified_by_admin BOOLEAN DEFAULT FALSE,

  -- Subscription/Billing Fields
  tier TEXT DEFAULT 'pro' CHECK (tier IN ('basic', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'expired')),
  cycle_type TEXT DEFAULT 'monthly' CHECK (cycle_type IN ('monthly', 'yearly')),
  next_payment_due DATE,              -- The actual calendar date their next payment is due
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Users Table (Staff & Admins)
CREATE TABLE IF NOT EXISTS pharmacy_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase Auth user ID
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'pharmacist', 'cashier')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Pharmacy's Global Settings
CREATE TABLE IF NOT EXISTS pharmacy_settings (
  pharmacy_id UUID PRIMARY KEY REFERENCES pharmacies(id) ON DELETE CASCADE,
  expire_level INTEGER DEFAULT 90,
  deadstock INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Batches Table (The Inventory)
CREATE TABLE IF NOT EXISTS pharmacy_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Database-generated UUID
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  supplier_name TEXT,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,

  -- Price tracking per batch
  purchase_cost DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Sales Table
CREATE TABLE IF NOT EXISTS pharmacy_sales (
  id UUID PRIMARY KEY, 
  transaction_id TEXT,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES pharmacy_batches(id), -- Fixed reference

  -- Financial Snapshot
  quantity_sold INTEGER NOT NULL,
  cost_price_at_sale DECIMAL(10, 2) NOT NULL,
  selling_price_at_sale DECIMAL(10, 2) NOT NULL,
  
  sold_by UUID REFERENCES pharmacy_users(id) ON DELETE CASCADE,
  
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS pharmacy_expenses (
  id UUID PRIMARY KEY, -- Generated on the client side
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Recurring', 'One-time')),
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- Purchase Orders 
CREATE TABLE IF NOT EXISTS pharmacies_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL, -- NULL if buying from an unregistered/ad-hoc supplier
    supplier_name_fallback VARCHAR(255) NULL, -- Stores name if unregistered
    order_date DATE NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    left_balance DECIMAL(12, 2) DEFAULT 0.00, -- Remaining credit balance (0 means fully paid)
    status VARCHAR(50) NOT NULL DEFAULT 'Received' CHECK (status IN ('Pending', 'Approved', 'Received', 'Cancelled')), -- Fulfillment status only
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Purchase Items Table
CREATE TABLE IF NOT EXISTS pharmacy_purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.pharmacies_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  supplier_batch_id UUID REFERENCES public.supplier_batches(id) ON DELETE SET NULL,
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  batch_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

