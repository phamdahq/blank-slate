-- ---------- pharmacies ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage pharmacies"
ON public.pharmacies FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Members read their pharmacy"
ON public.pharmacies FOR SELECT
TO authenticated
USING (id = public.get_pharmacy_id(auth.uid()));

-- ---------- pharmacy_users ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_users TO authenticated;
GRANT ALL ON public.pharmacy_users TO service_role;
ALTER TABLE public.pharmacy_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy colleagues read users"
ON public.pharmacy_users FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR id = auth.uid()
  OR pharmacy_id = public.get_pharmacy_id(auth.uid())
);

CREATE POLICY "Owners or platform admins manage users"
ON public.pharmacy_users FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR (pharmacy_id = public.get_pharmacy_id(auth.uid()) AND EXISTS (SELECT 1 FROM pharmacy_users WHERE id = auth.uid() AND role = 'owner'))
);

CREATE POLICY "Users update own profile or owners manage staff"
ON public.pharmacy_users FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR id = auth.uid()
  OR (pharmacy_id = public.get_pharmacy_id(auth.uid()) AND EXISTS (SELECT 1 FROM pharmacy_users WHERE id = auth.uid() AND role = 'owner'))
);

-- ---------- pharmacy_settings ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_settings TO authenticated;
GRANT ALL ON public.pharmacy_settings TO service_role;
ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy members manage settings"
ON public.pharmacy_settings FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()));

-- ---------- pharmacy_batches ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_batches TO authenticated;
GRANT ALL ON public.pharmacy_batches TO service_role;
ALTER TABLE public.pharmacy_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy members manage batches"
ON public.pharmacy_batches FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()));

-- ---------- pharmacy_sales ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_sales TO authenticated;
GRANT ALL ON public.pharmacy_sales TO service_role;
ALTER TABLE public.pharmacy_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy members manage sales"
ON public.pharmacy_sales FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()));

-- ---------- pharmacy_expenses ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_expenses TO authenticated;
GRANT ALL ON public.pharmacy_expenses TO service_role;
ALTER TABLE public.pharmacy_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy members manage expenses"
ON public.pharmacy_expenses FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()));

-- ---------- pharmacy_inventory_adjustments ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_inventory_adjustments TO authenticated;
GRANT ALL ON public.pharmacy_inventory_adjustments TO service_role;
ALTER TABLE public.pharmacy_inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy members manage inventory adjustments"
ON public.pharmacy_inventory_adjustments FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()));

-- ---------- pharmacy_sale_transactions ----------
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_sale_transactions TO authenticated;
GRANT ALL ON public.pharmacy_sale_transactions TO service_role;
ALTER TABLE public.pharmacy_sale_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy members manage sale transactions"
ON public.pharmacy_sale_transactions FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR pharmacy_id = public.get_pharmacy_id(auth.uid()));