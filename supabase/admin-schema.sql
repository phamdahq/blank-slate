-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS products (
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

CREATE TABLE IF NOT EXISTS medicine_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  pack_size INTEGER NOT NULL      -- e.g., 'Box of 100', 'Blister of 10', 'Bottle'
);


-- ==========================================
-- 2. Platform Administrators Table (Global SaaS Management)
-- ==========================================
CREATE TABLE IF NOT EXISTS platform_admins (
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
-- 1. Platform Support & Payment Configuration
-- ==========================================
CREATE TABLE IF NOT EXISTS platform_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_full_name TEXT,
    support_phone_number TEXT NOT NULL, -- Displayed in each pharmacy POS for troubleshooting/support
    cbe_account_number TEXT,            -- Payment destination account shown to pharmacies
    telebirr TEXT,                      -- Payment destination number shown to pharmacies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- ==========================================
-- 3. Platform Payouts / Revenue Tracking
-- ==========================================
CREATE TABLE IF NOT EXISTS platform_pharmacies_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'CBE', 'Telebirr')),
    account_number text not null, --the account number they transfered to
    transaction_reference TEXT UNIQUE NOT NULL, --the transaction reference from the payment gateway
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS platform_suppliers_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('Cash', 'CBE', 'Telebirr')),
    account_number text not null, --the account number they transfered to
    transaction_reference TEXT UNIQUE NOT NULL, --the transaction reference from the payment gateway
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

create table IF NOT EXISTS cities (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  country text not null default 'Ethiopia',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  pharmacy_name text not null,
  owner_name text not null,
  email text not null,
  phone_number text not null,
  message text not null,
  status text default 'pending' check (status in ('pending', 'read', 'replied')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);