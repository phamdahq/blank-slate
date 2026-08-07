-- ==========================================================
-- SUPPLIER MARKETPLACE RLS CONFIGURATION
-- ==========================================================

-- ---------- Grants ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacies_purchase_orders TO authenticated;
GRANT ALL ON public.pharmacies_purchase_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_purchase_order_items TO authenticated;
GRANT ALL ON public.pharmacy_purchase_order_items TO service_role;

GRANT SELECT ON public.supplier_batches TO authenticated;
GRANT ALL ON public.supplier_batches TO service_role;

GRANT SELECT ON public.suppliers TO authenticated;
GRANT SELECT ON public.products TO authenticated;

-- ---------- Enable RLS ----------
ALTER TABLE public.pharmacies_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_batches ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 1. pharmacies_purchase_orders POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Pharmacy manages own marketplace orders" ON public.pharmacies_purchase_orders;
CREATE POLICY "Pharmacy manages own marketplace orders"
ON public.pharmacies_purchase_orders FOR ALL
TO authenticated
USING (
  pharmacy_id = public.get_pharmacy_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
  OR supplier_id IN (SELECT suppliers_id FROM public.supplier_users WHERE id = auth.uid())
)
WITH CHECK (
  pharmacy_id = public.get_pharmacy_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
  OR supplier_id IN (SELECT suppliers_id FROM public.supplier_users WHERE id = auth.uid())
);


-- ==========================================
-- 2. pharmacy_purchase_order_items POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Pharmacy manages own marketplace order items" ON public.pharmacy_purchase_order_items;
CREATE POLICY "Pharmacy manages own marketplace order items"
ON public.pharmacy_purchase_order_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pharmacies_purchase_orders po
    WHERE po.id = purchase_order_id
      AND (
        po.pharmacy_id = public.get_pharmacy_id(auth.uid())
        OR public.is_platform_admin(auth.uid())
        OR po.supplier_id IN (SELECT suppliers_id FROM public.supplier_users WHERE id = auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pharmacies_purchase_orders po
    WHERE po.id = purchase_order_id
      AND (
        po.pharmacy_id = public.get_pharmacy_id(auth.uid())
        OR public.is_platform_admin(auth.uid())
      )
  )
);


-- ==========================================
-- 3. supplier_batches POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users browse supplier stock" ON public.supplier_batches;
CREATE POLICY "Authenticated users browse supplier stock"
ON public.supplier_batches FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Suppliers manage own stock" ON public.supplier_batches;
CREATE POLICY "Suppliers manage own stock"
ON public.supplier_batches FOR ALL
TO authenticated
USING (
  supplier_id IN (SELECT suppliers_id FROM public.supplier_users WHERE id = auth.uid())
  OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
  supplier_id IN (SELECT suppliers_id FROM public.supplier_users WHERE id = auth.uid())
  OR public.is_platform_admin(auth.uid())
);  