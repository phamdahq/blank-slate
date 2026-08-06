-- ==========================================================
-- PURCHASE ORDERS (pharmacy -> supplier procurement)
-- Run once in the Supabase SQL editor. Complements pharmacy-schema.sql.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name_fallback TEXT,
  order_date DATE NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  left_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Received', 'Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_ordered INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  -- Optional batch metadata captured up-front so marking the order
  -- "Received" can materialise inventory batches directly.
  batch_number TEXT,
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_pharmacy_date
  ON public.purchase_orders (pharmacy_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders (pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order
  ON public.purchase_order_items (purchase_order_id);

-- ---------- Grants (PostgREST needs these explicitly) ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
GRANT SELECT ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

-- ---------- RLS ----------
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pharmacy staff manage own purchase orders" ON public.purchase_orders;
CREATE POLICY "Pharmacy staff manage own purchase orders"
ON public.purchase_orders FOR ALL
TO authenticated
USING (pharmacy_id = public.get_user_pharmacy_id(auth.uid()) OR public.is_platform_owner(auth.uid()))
WITH CHECK (pharmacy_id = public.get_user_pharmacy_id(auth.uid()));

DROP POLICY IF EXISTS "Pharmacy staff manage own purchase order items" ON public.purchase_order_items;
CREATE POLICY "Pharmacy staff manage own purchase order items"
ON public.purchase_order_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
      AND (po.pharmacy_id = public.get_user_pharmacy_id(auth.uid())
           OR public.is_platform_owner(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_id
      AND po.pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  )
);

-- suppliers directory is read-only reference data for pharmacies
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users read suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
