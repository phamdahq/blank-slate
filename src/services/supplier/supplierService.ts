/**
 * Supplier identity + company profile service.
 *
 * Every supplier screen resolves its tenant through `fetchSupplierContext()`,
 * which maps the signed-in auth user onto its `supplier_users` row. All reads
 * and writes below are scoped by that supplier id and additionally guarded by
 * RLS on the server.
 */
import { supabase } from "@/lib/supabase";

export interface SupplierContext {
  userId: string;
  supplierId: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyName: string;
}

export interface SupplierProfile {
  supplier_id: string;
  company_name: string;
  city: string;
  country: string;
  tier: string;
  subscription_status: string;
  cycle_type: string;
  next_payment_due: string | null;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone: string;
  company_phone: string;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You must be signed in to use the supplier portal.");
  return data.user.id;
}

export async function fetchSupplierContext(): Promise<SupplierContext> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("supplier_users")
    .select("id, suppliers_id, role, first_name, last_name, email, phone_number, suppliers(name)")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("This account is not linked to a supplier company.");

  const row = data as Record<string, unknown>;
  const supplierId = row["suppliers_id"] as string | null;
  if (!supplierId) throw new Error("This account is not linked to a supplier company.");

  const company = row["suppliers"] as { name?: string } | null;

  return {
    userId,
    supplierId,
    role: (row["role"] as string) ?? "staff",
    firstName: (row["first_name"] as string) ?? "",
    lastName: (row["last_name"] as string) ?? "",
    email: (row["email"] as string | null) ?? null,
    phone: (row["phone_number"] as string | null) ?? null,
    companyName: company?.name ?? "Supplier",
  };
}

export async function fetchSupplierProfile(ctx: SupplierContext): Promise<SupplierProfile> {
  const [{ data: company, error: cErr }, { data: contact }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, city, country, tier, subscription_status, cycle_type, next_payment_due")
      .eq("id", ctx.supplierId)
      .maybeSingle(),
    supabase
      .from("supplier_contacts")
      .select("phone_number")
      .eq("supplier_id", ctx.supplierId)
      .maybeSingle(),
  ]);

  if (cErr) throw new Error(cErr.message);
  if (!company) throw new Error("Supplier company record not found.");

  const c = company as Record<string, unknown>;
  return {
    supplier_id: c["id"] as string,
    company_name: (c["name"] as string) ?? "",
    city: (c["city"] as string) ?? "",
    country: (c["country"] as string) ?? "",
    tier: (c["tier"] as string) ?? "pro",
    subscription_status: (c["subscription_status"] as string) ?? "trial",
    cycle_type: (c["cycle_type"] as string) ?? "monthly",
    next_payment_due: (c["next_payment_due"] as string | null) ?? null,
    contact_first_name: ctx.firstName,
    contact_last_name: ctx.lastName,
    contact_email: ctx.email ?? "",
    contact_phone: ctx.phone ?? "",
    company_phone: ((contact as { phone_number?: string } | null)?.phone_number ?? "") as string,
  };
}

export interface SupplierProfileUpdate {
  company_name: string;
  city: string;
  country: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone: string;
  company_phone: string;
}

export async function updateSupplierProfile(
  ctx: SupplierContext,
  input: SupplierProfileUpdate,
): Promise<void> {
  const { error: companyErr } = await supabase
    .from("suppliers")
    .update({
      name: input.company_name.trim(),
      city: input.city.trim(),
      country: input.country.trim(),
    })
    .eq("id", ctx.supplierId);
  if (companyErr) throw new Error(companyErr.message);

  const { error: userErr } = await supabase
    .from("supplier_users")
    .update({
      first_name: input.contact_first_name.trim(),
      last_name: input.contact_last_name.trim(),
      email: input.contact_email.trim() || null,
      phone_number: input.contact_phone.trim(),
    })
    .eq("id", ctx.userId);
  if (userErr) throw new Error(userErr.message);

  if (input.company_phone.trim()) {
    const { error: contactErr } = await supabase
      .from("supplier_contacts")
      .upsert(
        { supplier_id: ctx.supplierId, phone_number: input.company_phone.trim() },
        { onConflict: "supplier_id" },
      );
    if (contactErr) throw new Error(contactErr.message);
  }
}
