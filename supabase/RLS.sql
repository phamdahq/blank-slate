-- ==========================================================
-- COMPLETE SYSTEM RLS & SECURITY SETUP (Optimized & Verified)
-- ==========================================================

-- 1. Helper Function: Is the current auth user an active platform owner?
CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE id = _user_id
      AND role = 'platform_owner'
      AND is_active IS DISTINCT FROM false
  );
$$;

-- 2. Helper Function: Get current user's pharmacy_id securely
CREATE OR REPLACE FUNCTION public.get_user_pharmacy_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pharmacy_id FROM public.users
  WHERE id = _user_id AND is_active IS DISTINCT FROM false;
$$;


-- ==========================================================
-- 1. GLOBAL PLATFORM TABLES (platform_admins, platform_config)
-- ==========================================================

-- ---------- platform_admins ----------
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read own record" ON public.platform_admins;
CREATE POLICY "Admins read own record"
ON public.platform_admins FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_platform_owner(auth.uid()));

-- ---------- platform_config (Public readable for POS checkout / Support) ----------
GRANT SELECT ON public.platform_config TO authenticated;
GRANT ALL ON public.platform_config TO service_role;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read platform config" ON public.platform_config;
CREATE POLICY "Anyone authenticated can read platform config"
ON public.platform_config FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform owners manage platform config" ON public.platform_config;
CREATE POLICY "Platform owners manage platform config"
ON public.platform_config FOR ALL
TO authenticated
USING (public.is_platform_owner(auth.uid()))
WITH CHECK (public.is_platform_owner(auth.uid()));


-- ==========================================================
-- 2. MASTER CATALOGS (products, medicine_packs - Shared Data)
-- ==========================================================

-- ---------- products ----------
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read products" ON public.products;
CREATE POLICY "Anyone authenticated can read products"
ON public.products FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform owners manage products" ON public.products;
CREATE POLICY "Platform owners manage products"
ON public.products FOR ALL
TO authenticated
USING (public.is_platform_owner(auth.uid()))
WITH CHECK (public.is_platform_owner(auth.uid()));

-- ---------- medicine_packs ----------
GRANT SELECT, INSERT, UPDATE ON public.medicine_packs TO authenticated;
GRANT ALL ON public.medicine_packs TO service_role;
ALTER TABLE public.medicine_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read medicine packs" ON public.medicine_packs;
CREATE POLICY "Anyone authenticated can read medicine packs"
ON public.medicine_packs FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform owners manage medicine packs" ON public.medicine_packs;
CREATE POLICY "Platform owners manage medicine packs"
ON public.medicine_packs FOR ALL
TO authenticated
USING (public.is_platform_owner(auth.uid()))
WITH CHECK (public.is_platform_owner(auth.uid()));


-- ==========================================================
-- 3. TENANT & STAFF MANAGEMENT (pharmacies, users)
-- ==========================================================

-- ---------- pharmacies ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform owners create pharmacies" ON public.pharmacies;
CREATE POLICY "Platform owners create pharmacies"
ON public.pharmacies FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_owner(auth.uid()));

DROP POLICY IF EXISTS "Members read their pharmacy" ON public.pharmacies;
CREATE POLICY "Members read their pharmacy"
ON public.pharmacies FOR SELECT
TO authenticated
USING (
  public.is_platform_owner(auth.uid())
  OR id = public.get_user_pharmacy_id(auth.uid())
);

DROP POLICY IF EXISTS "Owners or platform admins update pharmacy" ON public.pharmacies;
CREATE POLICY "Owners or platform admins update pharmacy"
ON public.pharmacies FOR UPDATE
TO authenticated
USING (
  public.is_platform_owner(auth.uid())
  OR (id = public.get_user_pharmacy_id(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner'
  ))
);

-- ---------- users (tenant staff & profile access) ----------
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own user row or pharmacy colleagues" ON public.users;
CREATE POLICY "Read own user row or pharmacy colleagues"
ON public.users FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
);

DROP POLICY IF EXISTS "Platform owners or pharmacy owners insert users" ON public.users;
CREATE POLICY "Platform owners or pharmacy owners insert users"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_owner(auth.uid())
  OR (
    pharmacy_id = public.get_user_pharmacy_id(auth.uid()) 
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  )
);

DROP POLICY IF EXISTS "Users update own profile or owners manage staff" ON public.users;
CREATE POLICY "Users update own profile or owners manage staff"
ON public.users FOR UPDATE
TO authenticated
USING (
  id = auth.uid() 
  OR public.is_platform_owner(auth.uid())
  OR (
    pharmacy_id = public.get_user_pharmacy_id(auth.uid()) 
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  )
);


-- ==========================================================
-- 4. TENANT OPERATIONAL DATA (Per Pharmacy Isolation + POS)
-- ==========================================================

-- ---------- pharmacy_settings ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_settings TO authenticated;
GRANT ALL ON public.pharmacy_settings TO service_role;
ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pharmacy members manage settings" ON public.pharmacy_settings;
CREATE POLICY "Pharmacy members manage settings"
ON public.pharmacy_settings FOR ALL
TO authenticated
USING (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
)
WITH CHECK (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
);

-- ---------- batches (Inventory reading & managing) ----------
GRANT SELECT, INSERT, UPDATE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pharmacy staff manage batches" ON public.batches;
CREATE POLICY "Pharmacy staff manage batches"
ON public.batches FOR ALL
TO authenticated
USING (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
)
WITH CHECK (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
);

-- ---------- sales (POS execution for owners & pharmacists/cashiers) ----------
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pharmacy staff manage sales" ON public.sales;
CREATE POLICY "Pharmacy staff manage sales"
ON public.sales FOR ALL
TO authenticated
USING (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
)
WITH CHECK (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
);

-- ---------- expenses ----------
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pharmacy members manage expenses" ON public.expenses;
CREATE POLICY "Pharmacy members manage expenses"
ON public.expenses FOR ALL
TO authenticated
USING (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
)
WITH CHECK (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
);

-- ---------- platform_payouts (Owners insert/read, Platform admins manage all) ----------
GRANT SELECT, INSERT, UPDATE ON public.platform_payouts TO authenticated;
GRANT ALL ON public.platform_payouts TO service_role;
ALTER TABLE public.platform_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins and pharmacy owners manage payouts" ON public.platform_payouts;
CREATE POLICY "Platform admins and pharmacy owners manage payouts"
ON public.platform_payouts FOR ALL
TO authenticated
USING (
  public.is_platform_owner(auth.uid())
  OR pharmacy_id = public.get_user_pharmacy_id(auth.uid())
)
WITH CHECK (
  public.is_platform_owner(auth.uid())
  OR (
    pharmacy_id = public.get_user_pharmacy_id(auth.uid()) 
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'owner')
  )
);