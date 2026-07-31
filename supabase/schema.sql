-- ==========================================
-- 1. DETAILED MASTER CATALOGS
-- ==========================================

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY ,
  name TEXT NOT NULL,
  generic_name TEXT, 
  dosage_form TEXT,  
  strength TEXT,     
  UOM TEXT NOT NULL, 
  release_type TEXT DEFAULT 'IR',
  category TEXT CHECK (category IN ('pharmaceutical', 'cosmetic', 'medical_device', 'supplies')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE medicine_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  pack_size INTEGER NOT NULL      -- e.g., 'Box of 100', 'Blister of 10', 'Bottle'
);

CREATE TABLE pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL, 

  -- Geographic Coordinates (Pinned by you during physical onboarding)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_verified_by_admin BOOLEAN DEFAULT FALSE,

  -- Subscription/Billing Fields
  tier TEXT DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'expired')),
  next_payment_due DATE,              -- The actual calendar date their next payment is due
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Pharmacy's Global Settings
CREATE TABLE pharmacy_settings (
  pharmacy_id UUID PRIMARY KEY REFERENCES pharmacies(id) ON DELETE CASCADE,
  expire_level INTEGER DEFAULT 90,
  deadstock INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Batches Table (The Inventory)
CREATE TABLE batches (
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
CREATE TABLE sales (
  id UUID PRIMARY KEY, -- No default! Provided from the frontend
  transaction_id TEXT,
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id),

  -- Financial Snapshot
  quantity_sold INTEGER NOT NULL,
  cost_price_at_sale DECIMAL(10, 2) NOT NULL,
  selling_price_at_sale DECIMAL(10, 2) NOT NULL,
  
  sale_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY, -- Generated on the client side
  pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Recurring', 'One-time')),
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Users Table (Staff & Admins)
CREATE TABLE users (
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

-- ==========================================
-- 1. Platform Support & Payment Configuration
-- ==========================================
CREATE TABLE platform_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_full_name TEXT,
    support_phone_number TEXT NOT NULL, -- Displayed in each pharmacy POS for troubleshooting/support
    cbe_account_number TEXT,            -- Payment destination account shown to pharmacies
    telebirr TEXT,                      -- Payment destination number shown to pharmacies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 2. Platform Administrators Table (Global SaaS Management)
-- ==========================================
CREATE TABLE platform_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'platform_owner' CHECK (role IN ('platform_owner', 'support_admin', 'finance_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 3. Platform Payouts / Revenue Tracking
-- ==========================================
CREATE TABLE platform_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    platform_config_id UUID REFERENCES platform_config(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'CBE', 'Telebirr')),
    transaction_reference TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

create table cities (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  country text not null default 'Ethiopia',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);