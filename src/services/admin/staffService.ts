/**
 * Staff management for pharmacy owners.
 *
 * - listStaff: pharmacy colleagues (RLS: same pharmacy_id).
 * - setStaffActive: toggle is_active flag.
 * - inviteStaff: create auth user via isolated signup client (does NOT
 *   replace current session), then insert into public.users. Supabase
 *   sends the confirmation email that lets the invitee set a password.
 */
import { supabase, supabaseSignup } from "@/lib/supabase";
import type { UserRow } from "@/db/dexie";

export type StaffRole = "pharmacist" | "cashier";

export async function listStaff(pharmacyId: string): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from("pharmacy_users")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserRow[];
}

export async function setStaffActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from("pharmacy_users").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export interface InviteStaffInput {
  pharmacy_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  role: StaffRole;
}

/**
 * Provisions an auth account with a random one-time password and triggers
 * Supabase's confirmation email. The invitee follows the link, lands on
 * `/reset-password`, sets their own password, and is signed in.
 */
export async function inviteStaff(input: InviteStaffInput): Promise<UserRow> {
  const tempPassword =
    crypto.randomUUID().replace(/-/g, "") + "Aa1!";
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;

  const { data: signUpData, error: signUpError } = await supabaseSignup.auth.signUp({
    email: input.email,
    password: tempPassword,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        first_name: input.first_name,
        last_name: input.last_name,
        pharmacy_id: input.pharmacy_id,
        role: input.role,
      },
    },
  });
  if (signUpError) throw signUpError;
  const authId = signUpData.user?.id;
  if (!authId) throw new Error("Signup did not return a user id");

  const row = {
    id: authId,
    pharmacy_id: input.pharmacy_id,
    first_name: input.first_name,
    last_name: input.last_name,
    phone_number: input.phone_number,
    email: input.email,
    role: input.role,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("pharmacy_users")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as UserRow;
}