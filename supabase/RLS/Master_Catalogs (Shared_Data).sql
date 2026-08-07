-- ==========================================
-- PRODUCTS & MEDICINE PACKS
-- ==========================================

-- ---------- products ----------
GRANT SELECT, INSERT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read products" ON public.products;
CREATE POLICY "Authenticated users read products"
ON public.products FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users create products" ON public.products;
DROP POLICY IF EXISTS "Only platform admins can insert products" ON public.products;
CREATE POLICY "Only platform admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

-- ---------- medicine_packs ----------
GRANT SELECT, INSERT ON public.medicine_packs TO authenticated;
GRANT ALL ON public.medicine_packs TO service_role;
ALTER TABLE public.medicine_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read medicine packs" ON public.medicine_packs;
CREATE POLICY "Authenticated users read medicine packs"
ON public.medicine_packs FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users create medicine packs" ON public.medicine_packs;
DROP POLICY IF EXISTS "Only platform admins can insert medicine packs" ON public.medicine_packs;
CREATE POLICY "Only platform admins can insert medicine packs"
ON public.medicine_packs FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));