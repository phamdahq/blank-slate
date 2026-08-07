/**
 * Public marketing contact form. Writes inquiries into `contact_messages`.
 */
import { supabase } from "@/lib/supabase";

export type ContactMessageInput = {
  pharmacyName: string;
  ownerName: string;
  email: string;
  phoneNumber: string;
  message: string;
};

export async function submitContactMessage(input: ContactMessageInput): Promise<void> {
  const { error } = await supabase.from("contact_messages").insert({
    pharmacy_name: input.pharmacyName.trim(),
    owner_name: input.ownerName.trim(),
    email: input.email.trim(),
    phone_number: input.phoneNumber.trim(),
    message: input.message.trim(),
    status: "pending",
  });
  if (error) throw new Error(error.message);
}
