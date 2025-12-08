import { supabase } from "@/integrations/supabase/client";

/** ROUND DOWN — Remove paise completely */
export function roundDown(num: any): number {
  const n = Number(num || 0);
  return isNaN(n) ? 0 : Math.floor(n);
}

/** EDIT HISTORY — matches your table schema exactly */
export async function writeEditHistory({
  invoice_id,
  reason = null,
  changes = null,
}: {
  invoice_id: string;
  reason?: string | null;
  changes?: any;
}) {
  try {
    const payload = {
      invoice_id,
      reason,
      changes,
      edit_time: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from("invoice_edit_history")
      .insert([payload]);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("writeEditHistory ERROR:", err);
    return { success: false, error: err };
  }
}

/**
 * recordPaymentAndIncome
 * 1. Insert into invoice_payments
 * 2. Insert into invoice_daily_income (actual amount only)
 * 3. Returns new totalPaid
 */
export async function recordPaymentAndIncome({
  invoice_id,
  amount,
  payment_method = "cash",
  recorded_by = "system",
  payment_date = null,
}: {
  invoice_id: string;
  amount: number;
  payment_method?: "cash" | "upi" | "card";
  recorded_by?: string;
  payment_date?: string | null;
}) {
  try {
    const amt = roundDown(amount);
    if (amt <= 0) return { success: false, error: "Payment must be > 0" };

    // 1) PAYMENT record
    const paymentRow = {
      invoice_id,
      amount: amt,
      payment_method,
      recorded_by,
      created_at: new Date().toISOString(),
    };

    const { error: paymentErr } = await (supabase as any)
      .from("invoice_payments")
      .insert([paymentRow]);

    if (paymentErr) throw paymentErr;

    // 2) DAILY INCOME
    const payDate =
      payment_date || new Date().toISOString().substring(0, 10);

    await (supabase as any).from("invoice_daily_income").insert([
      {
        invoice_id,
        amount: amt,
        payment_method,
        payment_date: payDate,
      },
    ]);

    // 3) Recompute total paid
    const { data: payments, error: fetchErr } = await (supabase as any)
      .from("invoice_payments")
      .select("amount")
      .eq("invoice_id", invoice_id);

    if (fetchErr) throw fetchErr;

    const totalPaid = (payments || []).reduce(
      (s: number, p: any) => s + Number(p.amount || 0),
      0
    );

    return { success: true, totalPaid };
  } catch (err) {
    console.error("recordPaymentAndIncome ERROR:", err);
    return { success: false, error: err };
  }
}
