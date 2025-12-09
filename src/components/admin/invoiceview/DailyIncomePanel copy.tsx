// src/components/admin/invoiceview/DailyIncomePanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Types
 */

// Invoice row from your generated types
type InvoiceRow = Tables<"invoices">;

// Payment row shape — adapt if your payment rows contain additional fields.
// I included optional fields to be resilient to missing props.
export type PaymentRow = {
  id: string;
  invoice_id?: string | null; // could be invoice id or invoice_number depending on your system
  payment_date: string; // 'YYYY-MM-DD'
  amount: number;
  payment_method?: string | null;
  invoice_date?: string | null; // optional if already present on payment row
  // any other fields are allowed
  [k: string]: any;
};

// Merged row after combining payment + invoice info
type MergedRow = PaymentRow & {
  invoice_total: number;
  invoice_created_at?: string | null; // invoice creation date (YYYY-MM-DD)
  invoice_paid_amount?: number;
  overdue_amount: number;
};

/** Props */
export type DailyIncomePanelProps = {
  dailyIncomeRows: PaymentRow[];
  incomeStart: string;
  incomeEnd: string;
  setIncomeStart: (s: string) => void;
  setIncomeEnd: (s: string) => void;
};

export default function DailyIncomePanel({
  dailyIncomeRows = [],
  incomeStart,
  incomeEnd,
  setIncomeStart,
  setIncomeEnd,
}: DailyIncomePanelProps) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 15;

  // -----------------------
  // Fetch invoices once
  // -----------------------
  // -----------------------
// Fetch invoices once (fixed typing)
// -----------------------
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      // DON'T pass a generic to .from(...) — let supabase infer
      const res = await supabase.from("invoices").select("*");

      // res may be { data: any[] | null, error: PostgrestError | null }
      // Cast data to InvoiceRow[] only when it's present and no error.
      if (!mounted) return;

      if (res.error) {
        console.error("Failed to fetch invoices:", res.error);
        setInvoices([]); // keep typed state consistent
        return;
      }

      const data = res.data as unknown as InvoiceRow[] | null;
      setInvoices(data ?? []);
    } catch (err) {
      console.error("Exception fetching invoices:", err);
      setInvoices([]);
    }
  })();

  return () => {
    mounted = false;
  };
}, []);


  // Build invoice lookup maps (key by id and invoice_number to be tolerant)
  const invoiceLookup = useMemo(() => {
    const byId = new Map<string, InvoiceRow>();
    const byNumber = new Map<string, InvoiceRow>();

    for (const inv of invoices || []) {
      if (inv.id) byId.set(inv.id, inv);
      if (inv.invoice_number) byNumber.set(String(inv.invoice_number), inv);
    }

    return { byId, byNumber };
  }, [invoices]);

  // -----------------------
  // Helper: parse to YYYY-MM-DD
  // -----------------------
  function toYMD(d?: string | null) {
    if (!d) return "";
    // if already in YYYY-MM-DD format, substring
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().substring(0, 10);
  }

  // -----------------------
  // Merge payments with invoice info (typed)
  // -----------------------
  const mergedRows = useMemo<MergedRow[]>(() => {
    return dailyIncomeRows.map((p) => {
      // try matching invoice by id first, then invoice_number
      const key = p.invoice_id ?? "";
      let inv: InvoiceRow | undefined = undefined;

      if (key && invoiceLookup.byId.has(key)) {
        inv = invoiceLookup.byId.get(key);
      } else if (key && invoiceLookup.byNumber.has(key)) {
        inv = invoiceLookup.byNumber.get(key);
      }

      const invoice_total = inv ? Number(inv.grand_total ?? 0) : 0;
      const invoice_created_at = inv ? toYMD(inv.created_at ?? null) : toYMD(p.invoice_date ?? null);
      const invoice_paid_amount = inv ? Number(inv.paid_amount ?? 0) : 0;

      // overdue calculation:
      // If invoice_total > invoice_paid_amount (paid before or stored), leftover is overdue.
      // NOTE: this uses invoice.paid_amount as the "paid before" snapshot. If invoice.paid_amount already includes this payment,
      // then the overdue computation will be off. For exact per-payment history you would fetch payment records per-invoice.
      const overdue_amount = Math.max(0, invoice_total - invoice_paid_amount);

      return {
        ...p,
        invoice_total,
        invoice_created_at,
        invoice_paid_amount,
        overdue_amount,
      };
    });
  }, [dailyIncomeRows, invoiceLookup]);

  // -----------------------
  // Filter rows by date range
  // -----------------------
  const filtered = useMemo(() => {
    return mergedRows.filter((r) => {
      if (incomeStart && r.payment_date < incomeStart) return false;
      if (incomeEnd && r.payment_date > incomeEnd) return false;
      return true;
    });
  }, [mergedRows, incomeStart, incomeEnd]);

  // -----------------------
  // Typed SummaryRow
  // -----------------------
  interface SummaryRow {
    date: string;
    totalInvoice: number; // sum of invoice_total for relevant invoices
    totalPaid: number; // sum of payments done that day
    totalOverdue: number; // overdue belonging to invoices created on that day
    totalOldOverduePaid: number; // payments on day that belong to older invoices
    totalCollectable?: number;
  }

  // -----------------------
  // Build summary (typed, no unknowns)
  // -----------------------
  const summary = useMemo<SummaryRow[]>(() => {
    const map: Record<string, SummaryRow> = {};

    for (const r of filtered) {
      const d = r.payment_date;
      if (!map[d]) {
        map[d] = {
          date: d,
          totalInvoice: 0,
          totalPaid: 0,
          totalOverdue: 0,
          totalOldOverduePaid: 0,
        };
      }

      const entry = map[d];

      // Total Invoice Value: add invoice_total (if invoice available)
      entry.totalInvoice += Number(r.invoice_total ?? 0);

      // Total Paid on the day
      entry.totalPaid += Number(r.amount ?? 0);

      // If invoice's creation date === payment date, treat overdue as belonging to that day
      if (r.invoice_created_at && r.invoice_created_at === r.payment_date) {
        entry.totalOverdue += Number(r.overdue_amount ?? 0);
      }

      // If invoice was created before payment date, this payment is old-overdue-pay (payment for previous invoice)
      if (r.invoice_created_at && r.invoice_created_at < r.payment_date) {
        entry.totalOldOverduePaid += Number(r.amount ?? 0);
      }
    }

    const arr = Object.values(map).map((row) => ({
      ...row,
      totalCollectable: row.totalPaid + row.totalOldOverduePaid,
    }));

    // sort descending by date
    arr.sort((a, b) => (a.date < b.date ? 1 : -1));
    return arr;
  }, [filtered]);

  // -----------------------
  // Detailed grouped by payment_date (paginated by groups)
  // -----------------------
  type Grouped = { date: string; rows: MergedRow[] };
  const grouped = useMemo<Grouped[]>(() => {
    const map: Record<string, MergedRow[]> = {};

    for (const r of filtered) {
      if (!map[r.payment_date]) map[r.payment_date] = [];
      map[r.payment_date].push(r);
    }

    const arr = Object.keys(map)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((d) => ({ date: d, rows: map[d] }));

    return arr;
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const paginated = grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // -----------------------
  // Preset helpers (today/yesterday/week/month)
  // -----------------------
  const setPreset = (preset: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();
    if (preset === "today") {
      const t = toYMD(now.toISOString());
      setIncomeStart(t);
      setIncomeEnd(t);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const t = toYMD(y.toISOString());
      setIncomeStart(t);
      setIncomeEnd(t);
    } else if (preset === "week") {
      const day = now.getDay();
      const diff = (day + 6) % 7; // monday start
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setIncomeStart(toYMD(start.toISOString()));
      setIncomeEnd(toYMD(end.toISOString()));
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setIncomeStart(toYMD(start.toISOString()));
      setIncomeEnd(toYMD(end.toISOString()));
    }
    setPage(1);
  };

  // -----------------------
  // UI
  // -----------------------
  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Daily Incoming Amounts</CardTitle>
      </CardHeader>

      <CardContent>
        {/* Preset Buttons */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button size="sm" variant="outline" onClick={() => setPreset("today")}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("yesterday")}>
            Yesterday
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("week")}>
            This Week
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("month")}>
            This Month
          </Button>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs">From</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={incomeStart}
              onChange={(e) => {
                setIncomeStart(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs">To</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={incomeEnd}
              onChange={(e) => {
                setIncomeEnd(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIncomeStart("");
              setIncomeEnd("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        {/* Summary (grouped) */}
        <div className="mb-4">
          <div className="text-sm mb-2 font-medium">Summary (grouped)</div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Total Invoice Value</th>
                <th className="p-2">Total Paid</th>
                <th className="p-2">Total Overdue</th>
                <th className="p-2">Old Paid Overdue</th>
                <th className="p-2">Total Collectable</th>
              </tr>
            </thead>

            <tbody>
              {summary.map((s) => (
                <tr key={s.date} className="border-b">
                  <td className="p-2">{s.date}</td>
                  <td className="p-2">₹{s.totalInvoice.toFixed(2)}</td>
                  <td className="p-2">₹{s.totalPaid.toFixed(2)}</td>
                  <td className="p-2">₹{s.totalOverdue.toFixed(2)}</td>
                  <td className="p-2">₹{s.totalOldOverduePaid.toFixed(2)}</td>
                  <td className="p-2 font-semibold">
                    ₹{(s.totalCollectable ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}

              {!summary.length && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detailed Transactions (grouped by date, paginated groups) */}
        <div>
          <div className="text-sm mb-2 font-medium">Detailed Transactions</div>

          {paginated.map((g) => (
            <div key={g.date} className="mb-6 border rounded p-3 bg-gray-50">
              <div className="font-semibold mb-2">{g.date}</div>

              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Invoice</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Overdue (if any)</th>
                    <th className="p-2">Transaction Mode</th>
                  </tr>
                </thead>

                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-2">{r.invoice_id ?? "-"}</td>
                      <td className="p-2">₹{Number(r.amount ?? 0).toFixed(2)}</td>
                      <td className="p-2">
                        {r.overdue_amount > 0 ? `₹${r.overdue_amount.toFixed(2)}` : "-"}
                      </td>
                      <td className="p-2">{(r.payment_method ?? "").toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-4">
              <Button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>

              <span>
                Page {page} of {totalPages}
              </span>

              <Button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
