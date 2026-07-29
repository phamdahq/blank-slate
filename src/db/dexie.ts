/**
 * Local IndexedDB mirror of the Supabase schema (see supabase/schema.sql).
 * Tables are named to mirror the Postgres tables 1:1 so repos can move data
 * in either direction without a translation layer.
 *
 * All writes to mutable domain tables (sales, batches) are also mirrored to
 * the `outbox` table which the sync engine drains when connectivity returns.
 */
import Dexie, { type Table } from "dexie";

// ---------- Row types (mirror supabase/schema.sql) ----------

export type ProductCategory =
  | "pharmaceutical"
  | "cosmetic"
  | "medical_device"
  | "supplies";

export interface Product {
  id: string;
  name: string;
  generic_name?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  UOM: string;
  release_type?: string | null; // IR | DR | ER | ODT
  category?: ProductCategory | null;
  created_at?: string;
}

export interface MedicinePack {
  id: string;
  product_id: string;
  pack_size: number;
}

export interface Pharmacy {
  id: string;
  name: string;
  country: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  location_verified_by_admin?: boolean;
  tier?: "basic" | "pro" | "enterprise";
  subscription_status?: "trial" | "active" | "suspended" | "expired";
  billing_cycle_day?: number;
  next_payment_due?: string | null;
  created_at?: string;
}

export interface PharmacySettings {
  pharmacy_id: string;
  expire_level: number; // days
  deadstock: number; // days
  created_at?: string;
}

export interface Batch {
  id: string;
  pharmacy_id: string;
  product_id: string;
  batch_number: string;
  supplier_name?: string | null;
  expiry_date: string; // ISO date (YYYY-MM-DD)
  quantity: number;
  purchase_cost: number;
  selling_price: number;
  created_at?: string;
}

export interface SaleRow {
  id: string;
  transaction_id?: string | null;
  pharmacy_id: string;
  product_id: string;
  batch_id: string;
  quantity_sold: number;
  cost_price_at_sale: number;
  selling_price_at_sale: number;
  sale_date: string; // YYYY-MM-DD
  created_at?: string;
}

export interface Expense {
  id: string;
  pharmacy_id: string;
  name: string;
  type: "Recurring" | "One-time";
  amount: number;
  date: string;
  created_at?: string;
}

export interface UserRow {
  id: string;
  pharmacy_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email?: string | null;
  role: "owner" | "pharmacist" | "cashier";
  is_active: boolean;
  created_at?: string;
}

// ---------- Sync outbox ----------

/** Pharmacy-level payment destinations shown at POS checkout. */
export interface PaymentAccount {
  id: string;
  pharmacy_id: string;
  provider: "telebirr" | "cbe";
  account_name: string;
  account_number: string;
  is_active: boolean;
  created_at?: string;
}

export type OutboxOp =
  | { kind: "sales.insert"; row: SaleRow }
  | { kind: "batches.upsert"; row: Batch }
  | { kind: "expenses.insert"; row: Expense }
  | { kind: "pharmacy_settings.upsert"; row: PharmacySettings }
  | { kind: "users.update"; id: string; patch: Partial<UserRow> };

export interface OutboxEntry {
  /** auto-increment surrogate; op payload carries the domain UUID */
  id?: number;
  op: OutboxOp;
  created_at: number; // epoch ms
  attempts: number;
  last_error?: string;
  status: "pending" | "in-flight" | "failed";
}

export interface Meta {
  key: string;
  value: unknown;
}

// ---------- Dexie DB ----------

class PhamdaDB extends Dexie {
  products!: Table<Product, string>;
  medicine_packs!: Table<MedicinePack, string>;
  pharmacies!: Table<Pharmacy, string>;
  pharmacy_settings!: Table<PharmacySettings, string>;
  batches!: Table<Batch, string>;
  sales!: Table<SaleRow, string>;
  expenses!: Table<Expense, string>;
  users!: Table<UserRow, string>;
  payment_accounts!: Table<PaymentAccount, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<Meta, string>;

  constructor() {
    super("phamda");
    this.version(1).stores({
      products: "id, name, generic_name, category",
      medicine_packs: "id, product_id",
      pharmacies: "id",
      pharmacy_settings: "pharmacy_id",
      batches: "id, product_id, pharmacy_id, expiry_date, [product_id+expiry_date]",
      sales: "id, product_id, batch_id, pharmacy_id, sale_date, created_at",
      expenses: "id, pharmacy_id, date, type",
      users: "id, pharmacy_id, email",
      outbox: "++id, status, created_at",
      meta: "key",
    });
    this.version(2).stores({
      payment_accounts: "id, pharmacy_id, provider, [pharmacy_id+provider]",
    });
  }
}

export const db = new PhamdaDB();

/** True on the browser only. Guards against SSR access to IndexedDB. */
export const isBrowser = typeof window !== "undefined" && typeof indexedDB !== "undefined";
