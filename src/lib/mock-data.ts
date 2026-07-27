export type DosageForm = "Capsule" | "Tablet" | "Liquid" | "Injection" | "Topical";
export type Category = "Analgesics" | "Antibiotics" | "Cardiovascular" | "Diabetes" | "Respiratory" | "Other";
export type ReleaseType = "IR" | "DR" | "ER" | "ODT";

export interface Batch {
  id: string;
  quantity: number;
  expiry: string; // YYYY-MM
  expiringSoon?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  strength: string;
  brand: string;
  generic: string;
  form: DosageForm;
  category: Category;
  ndc: string;
  price: number;
  stock: number;
  reorderLevel: number;
  packSize: number;
  releaseType: ReleaseType;
  batches: Batch[];
}

export const medications: Medication[] = [
  {
    id: "amox-500",
    name: "Amoxicillin",
    strength: "500mg",
    brand: "Generic (Mylan)",
    generic: "Amoxicillin",
    form: "Capsule",
    category: "Antibiotics",
    ndc: "0009-0045-01",
    price: 12.5,
    stock: 450,
    reorderLevel: 100,
    packSize: 10,
    releaseType: "IR",
    batches: [
      { id: "B205", quantity: 580, expiry: "2027-02" },
      { id: "A102", quantity: 128, expiry: "2026-04", expiringSoon: true },
    ],
  },
  {
    id: "lisi-10",
    name: "Lisinopril",
    strength: "10mg",
    brand: "Zestril",
    generic: "Lisinopril",
    form: "Tablet",
    category: "Cardiovascular",
    ndc: "0078-0112-05",
    price: 8.0,
    stock: 12,
    reorderLevel: 50,
    packSize: 30,
    releaseType: "IR",
    batches: [{ id: "L441", quantity: 12, expiry: "2025-11", expiringSoon: true }],
  },
  {
    id: "ibu-400",
    name: "Ibuprofen",
    strength: "400mg",
    brand: "Advil",
    generic: "Ibuprofen",
    form: "Tablet",
    category: "Analgesics",
    ndc: "50580-496-12",
    price: 15.99,
    stock: 350,
    reorderLevel: 80,
    packSize: 24,
    releaseType: "IR",
    batches: [{ id: "I892", quantity: 350, expiry: "2027-08" }],
  },
  {
    id: "ins-glar",
    name: "Insulin Glargine",
    strength: "100u/mL",
    brand: "Lantus",
    generic: "Insulin Glargine",
    form: "Injection",
    category: "Diabetes",
    ndc: "0088-2220-33",
    price: 245.0,
    stock: 45,
    reorderLevel: 20,
    packSize: 1,
    releaseType: "IR",
    batches: [{ id: "G018", quantity: 45, expiry: "2026-10" }],
  },
  {
    id: "atorv-40",
    name: "Atorvastatin",
    strength: "40mg",
    brand: "Lipitor",
    generic: "Atorvastatin",
    form: "Tablet",
    category: "Cardiovascular",
    ndc: "0071-0156-23",
    price: 22.0,
    stock: 820,
    reorderLevel: 200,
    packSize: 30,
    releaseType: "IR",
    batches: [{ id: "A714", quantity: 820, expiry: "2026-12" }],
  },
  {
    id: "metf-1000",
    name: "Metformin HCL",
    strength: "1000mg",
    brand: "Glucophage",
    generic: "Metformin",
    form: "Tablet",
    category: "Diabetes",
    ndc: "0087-6063-10",
    price: 10.45,
    stock: 1120,
    reorderLevel: 300,
    packSize: 60,
    releaseType: "ER",
    batches: [{ id: "M223", quantity: 1120, expiry: "2027-03" }],
  },
  {
    id: "gaba-300",
    name: "Gabapentin",
    strength: "300mg",
    brand: "Neurontin",
    generic: "Gabapentin",
    form: "Capsule",
    category: "Other",
    ndc: "0071-0803-24",
    price: 18.2,
    stock: 1200,
    reorderLevel: 250,
    packSize: 30,
    releaseType: "IR",
    batches: [{ id: "G441", quantity: 1200, expiry: "2026-09" }],
  },
  {
    id: "amlo-5",
    name: "Amlodipine",
    strength: "5mg",
    brand: "Norvasc",
    generic: "Amlodipine",
    form: "Tablet",
    category: "Cardiovascular",
    ndc: "0069-1530-66",
    price: 9.8,
    stock: 1500,
    reorderLevel: 200,
    packSize: 30,
    releaseType: "IR",
    batches: [{ id: "N812", quantity: 1500, expiry: "2026-08" }],
  },
  {
    id: "omep-20",
    name: "Omeprazole",
    strength: "20mg",
    brand: "Prilosec",
    generic: "Omeprazole",
    form: "Capsule",
    category: "Other",
    ndc: "0186-0712-31",
    price: 14.0,
    stock: 900,
    reorderLevel: 150,
    packSize: 28,
    releaseType: "DR",
    batches: [{ id: "O234", quantity: 900, expiry: "2025-10", expiringSoon: true }],
  },
  {
    id: "losa-50",
    name: "Losartan",
    strength: "50mg",
    brand: "Cozaar",
    generic: "Losartan",
    form: "Tablet",
    category: "Cardiovascular",
    ndc: "0006-0951-54",
    price: 11.6,
    stock: 600,
    reorderLevel: 150,
    packSize: 30,
    releaseType: "IR",
    batches: [{ id: "C998", quantity: 600, expiry: "2027-01" }],
  },
  {
    id: "alb-inh",
    name: "Albuterol Inhaler",
    strength: "90mcg",
    brand: "ProAir",
    generic: "Albuterol",
    form: "Liquid",
    category: "Respiratory",
    ndc: "59310-579-22",
    price: 38.4,
    stock: 78,
    reorderLevel: 30,
    packSize: 1,
    releaseType: "IR",
    batches: [{ id: "P562", quantity: 78, expiry: "2026-06" }],
  },
  {
    id: "cipro-500",
    name: "Ciprofloxacin",
    strength: "500mg",
    brand: "Cipro",
    generic: "Ciprofloxacin",
    form: "Tablet",
    category: "Antibiotics",
    ndc: "0085-3174-08",
    price: 24.75,
    stock: 18,
    reorderLevel: 50,
    packSize: 20,
    releaseType: "IR",
    batches: [{ id: "C112", quantity: 18, expiry: "2026-02", expiringSoon: true }],
  },
];

export const categories: ("All" | Category)[] = [
  "All",
  "Analgesics",
  "Antibiotics",
  "Cardiovascular",
  "Diabetes",
  "Respiratory",
  "Other",
];

export function stockStatus(med: Medication): "critical" | "low" | "ok" | "high" {
  if (med.stock <= med.reorderLevel * 0.25) return "critical";
  if (med.stock <= med.reorderLevel) return "low";
  if (med.stock >= med.reorderLevel * 5) return "high";
  return "ok";
}

export const TAX_RATE = 0.07;