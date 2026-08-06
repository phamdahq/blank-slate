/**
 * Mock data for the Supplier Portal (`/supplier/*`).
 *
 * Everything here is deterministic dummy data so all supplier screens render
 * fully populated before the Supabase supplier tables are wired up.
 */

export type OrderStatus = "Pending" | "Approved" | "Received" | "Cancelled";
export type PaymentStatus = "Paid" | "Credit" | "Partial";

export interface SupplierOrderItem {
  product_name: string;
  quantity: number;
  unit_cost: number;
  batch_number: string;
}

export interface SupplierOrder {
  id: string;
  pharmacy_name: string;
  order_date: string;
  total_cost: number;
  left_balance: number;
  status: OrderStatus;
  items: SupplierOrderItem[];
}

export interface SupplierProduct {
  id: string;
  name: string;
  sku: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  expiry_date: string;
}

export interface SupplierSale {
  id: string;
  pharmacy_name: string;
  date: string;
  items_sold: number;
  total_amount: number;
  left_balance: number;
}

export const PHARMACY_PARTNERS = [
  "Bole Family Pharmacy",
  "Kazanchis Care Chemist",
  "Piassa Health Pharmacy",
  "Megenagna Medico",
  "Sarbet Wellness Pharmacy",
  "Adama Central Pharmacy",
];

export const SUPPLIER_ORDERS: SupplierOrder[] = [
  {
    id: "PO-2041",
    pharmacy_name: "Bole Family Pharmacy",
    order_date: "2026-07-28",
    total_cost: 48250,
    left_balance: 48250,
    status: "Pending",
    items: [
      { product_name: "Amoxicillin 500mg Caps", quantity: 400, unit_cost: 42, batch_number: "AMX-2291" },
      { product_name: "Paracetamol 500mg Tabs", quantity: 900, unit_cost: 12, batch_number: "PCM-1180" },
      { product_name: "ORS Sachets", quantity: 500, unit_cost: 41, batch_number: "ORS-7742" },
    ],
  },
  {
    id: "PO-2039",
    pharmacy_name: "Kazanchis Care Chemist",
    order_date: "2026-07-26",
    total_cost: 91400,
    left_balance: 30000,
    status: "Approved",
    items: [
      { product_name: "Insulin Glargine 100IU", quantity: 60, unit_cost: 980, batch_number: "INS-3320" },
      { product_name: "Metformin 850mg Tabs", quantity: 1200, unit_cost: 27, batch_number: "MET-9021" },
    ],
  },
  {
    id: "PO-2036",
    pharmacy_name: "Piassa Health Pharmacy",
    order_date: "2026-07-22",
    total_cost: 27600,
    left_balance: 0,
    status: "Received",
    items: [
      { product_name: "Ibuprofen 400mg Tabs", quantity: 800, unit_cost: 18, batch_number: "IBU-4410" },
      { product_name: "Surgical Gloves (Box)", quantity: 120, unit_cost: 110, batch_number: "GLV-0098" },
    ],
  },
  {
    id: "PO-2033",
    pharmacy_name: "Megenagna Medico",
    order_date: "2026-07-19",
    total_cost: 63800,
    left_balance: 63800,
    status: "Pending",
    items: [
      { product_name: "Azithromycin 250mg Tabs", quantity: 500, unit_cost: 76, batch_number: "AZI-5512" },
      { product_name: "Vitamin C 1000mg", quantity: 700, unit_cost: 37, batch_number: "VTC-2210" },
    ],
  },
  {
    id: "PO-2030",
    pharmacy_name: "Sarbet Wellness Pharmacy",
    order_date: "2026-07-15",
    total_cost: 15250,
    left_balance: 0,
    status: "Received",
    items: [
      { product_name: "Blood Pressure Monitor", quantity: 10, unit_cost: 1200, batch_number: "BPM-0031" },
      { product_name: "Digital Thermometer", quantity: 25, unit_cost: 130, batch_number: "THM-0077" },
    ],
  },
  {
    id: "PO-2028",
    pharmacy_name: "Adama Central Pharmacy",
    order_date: "2026-07-11",
    total_cost: 38900,
    left_balance: 12400,
    status: "Approved",
    items: [
      { product_name: "Ceftriaxone 1g Vial", quantity: 200, unit_cost: 165, batch_number: "CTX-8890" },
      { product_name: "Normal Saline 500ml", quantity: 300, unit_cost: 20, batch_number: "NSL-1120" },
    ],
  },
  {
    id: "PO-2025",
    pharmacy_name: "Bole Family Pharmacy",
    order_date: "2026-07-04",
    total_cost: 9800,
    left_balance: 0,
    status: "Cancelled",
    items: [
      { product_name: "Cough Syrup 120ml", quantity: 100, unit_cost: 98, batch_number: "CGH-3312" },
    ],
  },
];

export const SUPPLIER_PRODUCTS: SupplierProduct[] = [
  { id: "sp-1", name: "Amoxicillin 500mg Caps", sku: "AMX-500-C", batch_number: "AMX-2291", quantity: 4200, unit_price: 42, expiry_date: "2027-03-01" },
  { id: "sp-2", name: "Paracetamol 500mg Tabs", sku: "PCM-500-T", batch_number: "PCM-1180", quantity: 12800, unit_price: 12, expiry_date: "2028-01-01" },
  { id: "sp-3", name: "Insulin Glargine 100IU", sku: "INS-100-V", batch_number: "INS-3320", quantity: 88, unit_price: 980, expiry_date: "2026-11-15" },
  { id: "sp-4", name: "Metformin 850mg Tabs", sku: "MET-850-T", batch_number: "MET-9021", quantity: 6400, unit_price: 27, expiry_date: "2027-08-01" },
  { id: "sp-5", name: "Azithromycin 250mg Tabs", sku: "AZI-250-T", batch_number: "AZI-5512", quantity: 310, unit_price: 76, expiry_date: "2027-05-01" },
  { id: "sp-6", name: "Ceftriaxone 1g Vial", sku: "CTX-1G-V", batch_number: "CTX-8890", quantity: 140, unit_price: 165, expiry_date: "2026-12-01" },
  { id: "sp-7", name: "Surgical Gloves (Box)", sku: "GLV-BOX", batch_number: "GLV-0098", quantity: 76, unit_price: 110, expiry_date: "2029-01-01" },
  { id: "sp-8", name: "ORS Sachets", sku: "ORS-SCH", batch_number: "ORS-7742", quantity: 9400, unit_price: 41, expiry_date: "2028-06-01" },
  { id: "sp-9", name: "Vitamin C 1000mg", sku: "VTC-1000", batch_number: "VTC-2210", quantity: 2200, unit_price: 37, expiry_date: "2027-10-01" },
  { id: "sp-10", name: "Blood Pressure Monitor", sku: "BPM-DIG", batch_number: "BPM-0031", quantity: 34, unit_price: 1200, expiry_date: "2031-01-01" },
];

export const LOW_STOCK_THRESHOLD = 150;

export const SUPPLIER_SALES: SupplierSale[] = [
  { id: "TX-88120", pharmacy_name: "Piassa Health Pharmacy", date: "2026-07-22", items_sold: 920, total_amount: 27600, left_balance: 0 },
  { id: "TX-88095", pharmacy_name: "Sarbet Wellness Pharmacy", date: "2026-07-15", items_sold: 35, total_amount: 15250, left_balance: 0 },
  { id: "TX-88061", pharmacy_name: "Adama Central Pharmacy", date: "2026-07-11", items_sold: 500, total_amount: 38900, left_balance: 12400 },
  { id: "TX-88020", pharmacy_name: "Kazanchis Care Chemist", date: "2026-06-30", items_sold: 1260, total_amount: 91400, left_balance: 30000 },
  { id: "TX-87984", pharmacy_name: "Bole Family Pharmacy", date: "2026-06-24", items_sold: 1800, total_amount: 52300, left_balance: 0 },
  { id: "TX-87940", pharmacy_name: "Megenagna Medico", date: "2026-06-12", items_sold: 640, total_amount: 41750, left_balance: 8200 },
  { id: "TX-87901", pharmacy_name: "Piassa Health Pharmacy", date: "2026-05-29", items_sold: 410, total_amount: 19800, left_balance: 0 },
  { id: "TX-87860", pharmacy_name: "Bole Family Pharmacy", date: "2026-05-18", items_sold: 2100, total_amount: 68400, left_balance: 21000 },
];

export const MONTHLY_SALES = [
  { month: "Feb", revenue: 184000 },
  { month: "Mar", revenue: 212500 },
  { month: "Apr", revenue: 198300 },
  { month: "May", revenue: 246900 },
  { month: "Jun", revenue: 285400 },
  { month: "Jul", revenue: 318750 },
];

export const TOP_PRODUCTS = [
  { name: "Paracetamol 500mg Tabs", units: 18400, revenue: 220800 },
  { name: "Amoxicillin 500mg Caps", units: 7600, revenue: 319200 },
  { name: "Metformin 850mg Tabs", units: 6100, revenue: 164700 },
  { name: "ORS Sachets", units: 5400, revenue: 221400 },
  { name: "Azithromycin 250mg Tabs", units: 2900, revenue: 220400 },
];

export const SUPPLIER_PROFILE = {
  company_name: "Nile Medical Distributors PLC",
  license_number: "ET-WHL-40219",
  contact_name: "Selam Girma",
  email: "orders@nilemed.et",
  phone: "+251 911 445 220",
  address_line: "Bole Road, Getu Commercial Center, 4th Floor",
  city: "Addis Ababa",
  country: "Ethiopia",
  bank_name: "Commercial Bank of Ethiopia",
  account_name: "Nile Medical Distributors PLC",
  account_number: "1000234567890",
  telebirr: "+251 911 445 220",
};

export function birr(n: number): string {
  return `ETB ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function paymentStatus(total: number, left: number): PaymentStatus {
  if (left <= 0) return "Paid";
  if (left >= total) return "Credit";
  return "Partial";
}
