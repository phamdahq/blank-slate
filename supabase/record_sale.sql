-- Atomic sale commit for offline-first POS.
--
-- Called by the sync engine (src/db/sync.ts) for each queued sale.
-- Run this in your Supabase SQL editor once — it complements schema.sql.
--
-- Contract:
--   * Inserts the sale row idempotently (guarded by sale.id lookup) so
--     retries after a partial network failure don't double-charge stock.
--   * Decrements the target batch's quantity in the SAME UPDATE so two
--     concurrent devices can't oversell (row lock is implicit).
--   * Raises `insufficient_stock` when the batch has less than requested,
--     which the client surfaces as a sync error.
--
-- Idempotency key: sale.id (client-generated UUID from crypto.randomUUID()).
-- Conflict policy: last-write-wins on the sale row, atomic on stock.

-- Atomic sale commit for offline-first POS.
--
-- Called by the sync engine (src/db/sync.ts) for each queued sale.
-- Run this in your Supabase SQL editor once — it complements schema.sql.
--
-- Contract:
--   * Inserts the sale row idempotently (guarded by sale.id lookup) so
--     retries after a partial network failure don't double-charge stock.
--   * Decrements the target batch's quantity in the SAME UPDATE so two
--     concurrent devices can't oversell (row lock is implicit).
--   * Raises `insufficient_stock` when the batch has less than requested,
--     which the client surfaces as a sync error.
--
-- Idempotency key: sale.id (client-generated UUID from crypto.randomUUID()).
-- Conflict policy: last-write-wins on the sale row, atomic on stock.

CREATE OR REPLACE FUNCTION public.record_sale(
  p_sale_id UUID,
  p_pharmacy_id UUID,
  p_product_id UUID,
  p_batch_id UUID,
  p_quantity INTEGER,
  p_cost_price DECIMAL,
  p_selling_price DECIMAL,
  p_transaction_id TEXT DEFAULT NULL,
  p_sale_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  SELECT id INTO v_existing FROM sales WHERE id = p_sale_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  UPDATE batches
     SET quantity = quantity - p_quantity
   WHERE id = p_batch_id
     AND quantity >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO sales (
    id, transaction_id, pharmacy_id, product_id, batch_id,
    quantity_sold, cost_price_at_sale, selling_price_at_sale, sale_date
  ) VALUES (
    p_sale_id, p_transaction_id, p_pharmacy_id, p_product_id, p_batch_id,
    p_quantity, p_cost_price, p_selling_price, p_sale_date
  );

  RETURN p_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_sale(
  UUID, UUID, UUID, UUID, INTEGER, DECIMAL, DECIMAL, TEXT, DATE
) TO authenticated, service_role;