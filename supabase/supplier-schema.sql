-- ==========================================
-- SUPPLIER TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS suppliers (
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
CREATE TABLE IF NOT EXISTS supplier_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase Auth user ID
  suppliers_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'staff', 'cashier')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


CREATE TABLE IF NOT EXISTS supplier_settings (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
  expire_level INTEGER DEFAULT 90,
  deadstock INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);



CREATE TABLE IF NOT EXISTS supplier_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Database-generated UUID
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS supplier_sales (
  id UUID PRIMARY KEY, 
  transaction_id TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES supplier_batches(id), -- Fixed reference

  -- Financial Snapshot
  quantity_sold INTEGER NOT NULL,
  cost_price_at_sale DECIMAL(10, 2) NOT NULL,
  selling_price_at_sale DECIMAL(10, 2) NOT NULL,

  sold_by UUID REFERENCES supplier_users(id) ON DELETE CASCADE,
  
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Expenses Table
CREATE TABLE IF NOT EXISTS supplier_expenses (
  id UUID PRIMARY KEY, -- Generated on the client side
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Recurring', 'One-time')),
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS supplier_contacts (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
)

-- ==========================================
-- 2. INVENTORY ADJUSTMENTS & SHRINKAGE LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS supplier_inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES supplier_batches(id) ON DELETE CASCADE,
    adjusted_by UUID REFERENCES supplier_users(id),
    quantity_change INTEGER NOT NULL,
    reason TEXT CHECK (reason IN ('expired', 'damaged', 'loss', 'count_correction')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 3. TRANSACTION HEADERS (Grouping Multi-Item Sales Receipts)
-- ==========================================
CREATE TABLE IF NOT EXISTS supplier_sale_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    sold_by UUID REFERENCES supplier_users(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    total_profit DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

