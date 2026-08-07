-- Helper: Is the current user an active platform admin?
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE id = _user_id
      AND is_active IS DISTINCT FROM false
  );
$$;

-- Helper: Get current active pharmacy_id securely
CREATE OR REPLACE FUNCTION public.get_pharmacy_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pharmacy_id FROM public.pharmacy_users
  WHERE id = _user_id AND is_active IS DISTINCT FROM false;
$$;

-- Helper: Get current active suppliers_id securely
CREATE OR REPLACE FUNCTION public.get_supplier_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT suppliers_id FROM public.supplier_users
  WHERE id = _user_id AND is_active IS DISTINCT FROM false;
$$;