-- platform_admins
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read own record or all if owner"
ON public.platform_admins FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_platform_admin(auth.uid()));


-- platform_config
GRANT SELECT ON public.platform_config TO authenticated;
GRANT ALL ON public.platform_config TO service_role;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read platform config"
ON public.platform_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Platform admins manage platform config"
ON public.platform_config FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));


-- platform_pharmacies_payouts
GRANT SELECT, INSERT, UPDATE ON public.platform_pharmacies_payouts TO authenticated;
GRANT ALL ON public.platform_pharmacies_payouts TO service_role;
ALTER TABLE public.platform_pharmacies_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy members view own payouts, platform admins manage all"
ON public.platform_pharmacies_payouts FOR ALL
TO authenticated
USING (
  public.is_platform_admin(auth.uid()) 
  OR pharmacy_id = public.get_pharmacy_id(auth.uid())
)
WITH CHECK (
  public.is_platform_admin(auth.uid()) 
  OR pharmacy_id = public.get_pharmacy_id(auth.uid())
);


-- cities
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users read cities"
ON public.cities FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM pharmacy_users WHERE id = auth.uid() AND is_active = true)
  OR EXISTS (SELECT 1 FROM supplier_users WHERE id = auth.uid() AND is_active = true)
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Platform admins manage cities"
ON public.cities FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));


-- contact_messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public contact submissions"
ON public.contact_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Platform admins manage contact messages"
ON public.contact_messages FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));