-- ==========================================================
-- SUPPLIER MARKETPLACE (pharmacy buys from platform suppliers)
-- Run once in the Supabase SQL editor.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.pharmacies_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name_fallback TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  left_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Received', 'Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pharmacy_purchase_order_items (
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

CREATE INDEX IF NOT EXISTS idx_pharm_po_pharmacy_date
  ON public.pharmacies_purchase_orders (pharmacy_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_pharm_po_supplier
  ON public.pharmacies_purchase_orders (supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_pharm_po_items_order
  ON public.pharmacy_purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_batches_stock
  ON public.supplier_batches (supplier_id, product_id) WHERE quantity > 0;

-- ---------- Grants (PostgREST needs these explicitly) ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacies_purchase_orders TO authenticated;
GRANT ALL ON public.pharmacies_purchase_orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_purchase_order_items TO authenticated;
GRANT ALL ON public.pharmacy_purchase_order_items TO service_role;
GRANT SELECT ON public.supplier_batches TO authenticated;
GRANT ALL ON public.supplier_batches TO service_role;
GRANT SELECT ON public.suppliers TO authenticated;
GRANT SELECT ON public.products TO authenticated;

-- ---------- RLS ----------
ALTER TABLE public.pharmacies_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_batches ENABLE ROW LEVEL SECURITY;

-- Pharmacies manage their own marketplace orders.
DROP POLICY IF EXISTS "Pharmacy manages own marketplace orders" ON public.pharmacies_purchase_orders;
CREATE POLICY "Pharmacy manages own marketplace orders"
ON public.pharmacies_purchase_orders FOR ALL
TO authenticated
USING (
  pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (pharmacy_id = public.get_user_pharmacy_id(auth.uid()));

-- Suppliers can read (and progress) orders addressed to them.
DROP POLICY IF EXISTS "Supplier reads incoming marketplace orders" ON public.pharmacies_purchase_orders;
CREATE POLICY "Supplier reads incoming marketplace orders"
ON public.pharmacies_purchase_orders FOR SELECT
TO authenticated
USING (
  supplier_id IN (SELECT su.suppliers_id FROM public.supplier_users su WHERE su.id = auth.uid())
);

DROP POLICY IF EXISTS "Pharmacy manages own marketplace order items" ON public.pharmacy_purchase_order_items;
CREATE POLICY "Pharmacy manages own marketplace order items"
ON public.pharmacy_purchase_order_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pharmacies_purchase_orders po
    WHERE po.id = purchase_order_id
      AND (
        po.pharmacy_id = public.get_user_pharmacy_id(auth.uid())
        OR public.is_platform_owner(auth.uid())
        OR po.supplier_id IN (
          SELECT su.suppliers_id FROM public.supplier_users su WHERE su.id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pharmacies_purchase_orders po
    WHERE po.id = purchase_order_id
      AND po.pharmacy_id = public.get_user_pharmacy_id(auth.uid())
  )
);

-- Supplier stock is public reference data for signed-in buyers.
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
  supplier_id IN (SELECT su.suppliers_id FROM public.supplier_users su WHERE su.id = auth.uid())
  OR public.is_platform_owner(auth.uid())
)
WITH CHECK (
  supplier_id IN (SELECT su.suppliers_id FROM public.supplier_users su WHERE su.id = auth.uid())
);