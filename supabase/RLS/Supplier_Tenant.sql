-- ---------- suppliers ----------
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage suppliers"
ON public.suppliers FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Members read their supplier"
ON public.suppliers FOR SELECT
TO authenticated
USING (id = public.get_supplier_id(auth.uid()));

-- ---------- supplier_users ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_users TO authenticated;
GRANT ALL ON public.supplier_users TO service_role;
ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier colleagues read users"
ON public.supplier_users FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR id = auth.uid()
  OR suppliers_id = public.get_supplier_id(auth.uid())
);

CREATE POLICY "Owners or platform admins insert supplier users"
ON public.supplier_users FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR (suppliers_id = public.get_supplier_id(auth.uid()) AND EXISTS (SELECT 1 FROM supplier_users WHERE id = auth.uid() AND role = 'owner'))
);

CREATE POLICY "Users update own profile or supplier owners manage staff"
ON public.supplier_users FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR id = auth.uid()
  OR (suppliers_id = public.get_supplier_id(auth.uid()) AND EXISTS (SELECT 1 FROM supplier_users WHERE id = auth.uid() AND role = 'owner'))
);

-- ---------- supplier_settings ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_settings TO authenticated;
GRANT ALL ON public.supplier_settings TO service_role;
ALTER TABLE public.supplier_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier members manage settings"
ON public.supplier_settings FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()));

-- ---------- supplier_batches ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_batches TO authenticated;
GRANT ALL ON public.supplier_batches TO service_role;
ALTER TABLE public.supplier_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier members manage batches"
ON public.supplier_batches FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()));

-- ---------- supplier_sales ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_sales TO authenticated;
GRANT ALL ON public.supplier_sales TO service_role;
ALTER TABLE public.supplier_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier members manage sales"
ON public.supplier_sales FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()));

-- ---------- supplier_expenses ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_expenses TO authenticated;
GRANT ALL ON public.supplier_expenses TO service_role;
ALTER TABLE public.supplier_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier members manage expenses"
ON public.supplier_expenses FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()));

-- ---------- supplier_contacts ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_contacts TO authenticated;
GRANT ALL ON public.supplier_contacts TO service_role;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier members manage contacts"
ON public.supplier_contacts FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()));

-- ---------- supplier_inventory_adjustments ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_inventory_adjustments TO authenticated;
GRANT ALL ON public.supplier_inventory_adjustments TO service_role;
ALTER TABLE public.supplier_inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier members manage inventory adjustments"
ON public.supplier_inventory_adjustments FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()));

-- ---------- supplier_sale_transactions ----------
GRANT SELECT, INSERT, UPDATE ON public.supplier_sale_transactions TO authenticated;
GRANT ALL ON public.supplier_sale_transactions TO service_role;
ALTER TABLE public.supplier_sale_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier members manage sale transactions"
ON public.supplier_sale_transactions FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()) OR supplier_id = public.get_supplier_id(auth.uid()));