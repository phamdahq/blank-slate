/**
 * Expense service — offline-first.
 *
 * Writes land in Dexie immediately and are queued in the outbox, so logging
 * an expense works with no connectivity and syncs to Supabase later.
 */
import { db, isBrowser, type Expense } from "@/db/dexie";
import { expensesRepo } from "@/db/repositories";
import { supabase } from "@/lib/supabase";

export type { Expense };
export type ExpenseType = Expense["type"];

function newId(): string {
  if (isBrowser && "randomUUID" in crypto) return crypto.randomUUID();
  return `exp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** All expenses for a pharmacy, newest first. */
export async function listExpenses(pharmacyId: string): Promise<Expense[]> {
  if (!isBrowser || !pharmacyId) return [];
  const rows = await expensesRepo.list(pharmacyId);
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export interface NewExpenseInput {
  pharmacyId: string;
  name: string;
  type: ExpenseType;
  amount: number;
  date?: string;
}

/** Persist a new expense locally (and queue the Supabase insert). */
export async function logExpense(input: NewExpenseInput): Promise<Expense> {
  const name = input.name.trim();
  if (!input.pharmacyId) throw new Error("No pharmacy selected.");
  if (!name) throw new Error("Expense name is required.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  const row: Expense = {
    id: newId(),
    pharmacy_id: input.pharmacyId,
    name,
    type: input.type,
    amount: Math.round(input.amount * 100) / 100,
    date: input.date || todayIso(),
    created_at: new Date().toISOString(),
  };
  await expensesRepo.add(row);
  return row;
}

/**
 * "Mark paid" on a recurring expense = log the next occurrence, dated one
 * month after the previous one.
 */
export async function markRecurringPaid(source: Expense): Promise<Expense> {
  return logExpense({
    pharmacyId: source.pharmacy_id,
    name: source.name,
    type: "Recurring",
    amount: source.amount,
    date: nextDueDate(source.date),
  });
}

/** Same day next month, clamped to the end of a shorter month. */
export function nextDueDate(date: string): string {
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return todayIso();
  const day = base.getDate();
  const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
    next.getDate(),
  ).padStart(2, "0")}`;
}

export interface UpcomingExpense {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  source: Expense;
}

/**
 * One upcoming row per distinct recurring expense name, based on its most
 * recent occurrence plus one month.
 */
export function upcomingRecurring(rows: Expense[]): UpcomingExpense[] {
  const latest = new Map<string, Expense>();
  for (const row of rows) {
    if (row.type !== "Recurring") continue;
    const key = row.name.toLowerCase();
    const current = latest.get(key);
    if (!current || row.date > current.date) latest.set(key, row);
  }
  return [...latest.values()]
    .map((source) => ({
      id: source.id,
      name: source.name,
      amount: source.amount,
      dueDate: nextDueDate(source.date),
      source,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Totals for a date window (inclusive, YYYY-MM-DD). */
export function totalsInRange(rows: Expense[], from: string, to: string) {
  const inRange = rows.filter((r) => r.date >= from && r.date <= to);
  const total = inRange.reduce((sum, r) => sum + r.amount, 0);
  const recurring = inRange
    .filter((r) => r.type === "Recurring")
    .reduce((sum, r) => sum + r.amount, 0);
  return { rows: inRange, total, recurring, oneTime: total - recurring };
}

/** Pull the remote slice down into Dexie (used at startup / on reconnect). */
export async function pullExpenses(pharmacyId: string): Promise<void> {
  if (!isBrowser || !navigator.onLine || !pharmacyId) return;
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("pharmacy_id", pharmacyId);
  if (error || !data) return;
  await db.expenses.bulkPut(data as Expense[]);
}
