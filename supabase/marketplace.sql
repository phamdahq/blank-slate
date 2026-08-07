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

