// src/components/admin/invoiceview/DailyIncomePanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/* ===============================================
   Types
=============================================== */

type InvoiceRow = Tables<"invoices">;

export type PaymentRow = {
  id: string;
  invoice_id?: string | null;
  payment_date: string;
  amount: number;
  payment_method?: string | null;
  invoice_date?: string | null;
};

type MergedRow = PaymentRow & {
  invoice_total: number;
  invoice_created_at?: string | null;
  invoice_paid_amount?: number;
  overdue_amount: number;
};

export type DailyIncomePanelProps = {
  dailyIncomeRows: PaymentRow[];
  incomeStart: string;
  incomeEnd: string;
  setIncomeStart: (v: string) => void;
  setIncomeEnd: (v: string) => void;
};

/* ===============================================
   Utility fns
=============================================== */

type MethodGroup = "ALL" | "UPI" | "CASH" | "BANK" | "OTHER";

function normalizeMethod(m?: string | null): string {
  return (m ?? "").trim().toLowerCase();
}

function methodToGroup(m?: string | null): MethodGroup {
  const s = normalizeMethod(m);
  if (!s) return "OTHER";

  const upi = ["upi", "gpay", "phonepe", "paytm", "bhim"];
  const cash = ["cash", "cod", "on_delivery"];
  const bank = ["bank", "bank_transfer", "neft", "rtgs", "imps"];

  if (upi.some((k) => s.includes(k))) return "UPI";
  if (cash.some((k) => s.includes(k))) return "CASH";
  if (bank.some((k) => s.includes(k))) return "BANK";

  return "OTHER";
}

function toYMD(x?: string | null): string {
  if (!x) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(x)) return x.substring(0, 10);
  const d = new Date(x);
  return isNaN(d.getTime()) ? "" : d.toISOString().substring(0, 10);
}

/* ===============================================
   Component
=============================================== */

export default function DailyIncomePanel({
  dailyIncomeRows,
  incomeStart,
  incomeEnd,
  setIncomeStart,
  setIncomeEnd,
}: DailyIncomePanelProps) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [dateFilters, setDateFilters] = useState<Record<string, MethodGroup>>({});

  /* -------------------------------- Fetch invoices -------------------------------- */

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await supabase.from("invoices").select("*");
      if (!mounted) return;

      if (res.error) {
        console.error("Invoice fetch error:", res.error);
        setInvoices([]);
        return;
      }

      setInvoices((res.data ?? []) as InvoiceRow[]);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------------------- Invoice lookup -------------------------------- */

  const invoiceLookup = useMemo(() => {
    const byId = new Map<string, InvoiceRow>();
    const byNumber = new Map<string, InvoiceRow>();

    for (const inv of invoices) {
      if (inv.id) byId.set(inv.id, inv);
      if (inv.invoice_number) byNumber.set(inv.invoice_number, inv);
    }

    return { byId, byNumber };
  }, [invoices]);

  /* -------------------------------- Merge payments + invoice info -------------------------------- */

  const mergedRows = useMemo<MergedRow[]>(() => {
    return dailyIncomeRows.map((p) => {
      const key = p.invoice_id ?? "";
      let inv = invoiceLookup.byId.get(key);
      if (!inv && key) inv = invoiceLookup.byNumber.get(key);

      const invoice_total = inv ? Number(inv.grand_total ?? 0) : 0;
      const invoice_created_at = inv ? toYMD(inv.created_at) : toYMD(p.invoice_date);
      const invoice_paid_amount = inv ? Number(inv.paid_amount ?? 0) : 0;
      const overdue_amount = Math.max(invoice_total - invoice_paid_amount, 0);

      return {
        ...p,
        invoice_total,
        invoice_created_at,
        invoice_paid_amount,
        overdue_amount,
      };
    });
  }, [dailyIncomeRows, invoiceLookup]);

  /* -------------------------------- Date filter for payment rows -------------------------------- */

  const filtered = useMemo(() => {
    return mergedRows.filter((r) => {
      if (incomeStart && r.payment_date < incomeStart) return false;
      if (incomeEnd && r.payment_date > incomeEnd) return false;
      return true;
    });
  }, [mergedRows, incomeStart, incomeEnd]);

  /* -------------------------------- Build Invoice totals by created date -------------------------------- */

  const invoicesByDate = useMemo(() => {
    const map: Record<string, { totalInvoice: number; totalOverdue: number }> = {};

    for (const inv of invoices) {
      const d = toYMD(inv.created_at);
      if (!d) continue;

      if (!map[d]) {
        map[d] = { totalInvoice: 0, totalOverdue: 0 };
      }

      const total = Number(inv.grand_total ?? 0);
      const paid = Number(inv.paid_amount ?? 0);
      const remaining = Math.max(total - paid, 0);

      map[d].totalInvoice += total;
      map[d].totalOverdue += remaining;
    }

    return map;
  }, [invoices]);

  /* -------------------------------- Summary -------------------------------- */

  type SummaryRow = {
    date: string;
    totalInvoice: number;
    totalOverdue: number;
    totalPaid: number;
    totalOldOverduePaid: number;
    totalCollectable: number;
  };

  const summary = useMemo<SummaryRow[]>(() => {
    const map: Record<string, SummaryRow> = {};

    // 1) From payments
    for (const r of filtered) {
      const d = r.payment_date;

      if (!map[d]) {
        map[d] = {
          date: d,
          totalInvoice: 0,
          totalOverdue: 0,
          totalPaid: 0,
          totalOldOverduePaid: 0,
          totalCollectable: 0,
        };
      }

      const entry = map[d];
      entry.totalPaid += r.amount;

      if (r.invoice_created_at && r.invoice_created_at < d) {
        entry.totalOldOverduePaid += r.amount;
      }

      entry.totalCollectable =
        entry.totalPaid + entry.totalOldOverduePaid;
    }

    // 2) From invoice creation dates
    for (const d in map) {
      if (invoicesByDate[d]) {
        map[d].totalInvoice = invoicesByDate[d].totalInvoice;
        map[d].totalOverdue = invoicesByDate[d].totalOverdue;
      }
    }

    return Object.values(map).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filtered, invoicesByDate]);

  /* -------------------------------- Footer totals -------------------------------- */
  const footerTotals = useMemo(() => {
    return summary.reduce(
      (acc, s) => {
        acc.invoice += s.totalInvoice;
        acc.paid += s.totalPaid;
        acc.overdue += s.totalOverdue;
        acc.oldOverdue += s.totalOldOverduePaid;
        acc.collectable += s.totalCollectable;
        return acc;
      },
      { invoice: 0, paid: 0, overdue: 0, oldOverdue: 0, collectable: 0 }
    );
  }, [summary]);

  /* -------------------------------- Toggles + Filters -------------------------------- */

  const toggleExpand = (d: string) =>
    setExpandedDates((prev) => ({ ...prev, [d]: !prev[d] }));

  const setDateFilter = (date: string, group: MethodGroup) =>
    setDateFilters((prev) => ({ ...prev, [date]: group }));

  /* -------------------------------- CSV Export -------------------------------- */

  function rowsToCsv(rows: MergedRow[]): string {
    const headers = [
      "Invoice",
      "Amount",
      "Overdue",
      "OldPaidOverdue",
      "Method",
      "PaymentDate",
      "InvoiceTotal",
    ];

    const lines = [headers.join(",")];

    for (const r of rows) {
      const oldPaidOverdue =
        r.invoice_created_at && r.invoice_created_at < r.payment_date
          ? r.amount
          : 0;

      const row = [
        `"${(r.invoice_id ?? "").replace(/"/g, '""')}"`,
        r.amount.toFixed(2),
        r.overdue_amount.toFixed(2),
        oldPaidOverdue.toFixed(2),
        `"${(r.payment_method ?? "").replace(/"/g, '""')}"`,
        `"${r.payment_date}"`,
        r.invoice_total.toFixed(2),
      ].join(",");

      lines.push(row);
    }

    return lines.join("\n");
  }

  function downloadCsvForDate(date: string) {
    const allRows = mergedRows.filter((r) => r.payment_date === date);
    const f = dateFilters[date] ?? "ALL";

    const visible =
      f === "ALL"
        ? allRows
        : allRows.filter((r) => methodToGroup(r.payment_method) === f);

    const csv = rowsToCsv(visible);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `daily_${date}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /* -------------------------------- Presets -------------------------------- */

  const setPreset = (p: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();

    if (p === "today") {
      const t = toYMD(now.toISOString());
      setIncomeStart(t);
      setIncomeEnd(t);
      return;
    }

    if (p === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const d = toYMD(y.toISOString());
      setIncomeStart(d);
      setIncomeEnd(d);
      return;
    }

    if (p === "week") {
      const day = now.getDay();
      const diff = (day + 6) % 7;
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      setIncomeStart(toYMD(start.toISOString()));
      setIncomeEnd(toYMD(end.toISOString()));
      return;
    }

    if (p === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setIncomeStart(toYMD(start.toISOString()));
      setIncomeEnd(toYMD(end.toISOString()));
    }
  };

  /* ===============================================
     RENDER
=============================================== */

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Daily Incoming Amounts</CardTitle>
      </CardHeader>

      <CardContent>
        {/* Presets */}
        <div className="flex gap-2 mb-4 flex-wrap">
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

        {/* Date range */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <label className="text-xs">From</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={incomeStart}
              onChange={(e) => setIncomeStart(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs">To</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={incomeEnd}
              onChange={(e) => setIncomeEnd(e.target.value)}
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIncomeStart("");
              setIncomeEnd("");
            }}
          >
            Reset
          </Button>
        </div>

        {/* ===================== SUMMARY TABLE ===================== */}
        <table className="w-full text-sm border">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Date</th>
              <th className="p-2">Total Invoice</th>
              <th className="p-2">Total Paid</th>
              <th className="p-2">Total Overdue</th>
              <th className="p-2">Old Paid Overdue</th>
              <th className="p-2">Collectable</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {summary.map((s) => {
              const rowsForDay = mergedRows.filter((r) => r.payment_date === s.date);
              const open = expandedDates[s.date] === true;
              const f = dateFilters[s.date] ?? "ALL";

              const visible =
                f === "ALL"
                  ? rowsForDay
                  : rowsForDay.filter((r) => methodToGroup(r.payment_method) === f);

              const counts = {
                ALL: rowsForDay.length,
                UPI: rowsForDay.filter((r) => methodToGroup(r.payment_method) === "UPI").length,
                CASH: rowsForDay.filter((r) => methodToGroup(r.payment_method) === "CASH").length,
                BANK: rowsForDay.filter((r) => methodToGroup(r.payment_method) === "BANK").length,
                OTHER: rowsForDay.filter((r) => methodToGroup(r.payment_method) === "OTHER").length,
              };

              return (
                <React.Fragment key={s.date}>
                  <tr className="border-b">
                    <td className="p-2">{s.date}</td>
                    <td className="p-2">₹{s.totalInvoice.toFixed(2)}</td>
                    <td className="p-2">₹{s.totalPaid.toFixed(2)}</td>
                    <td className="p-2">₹{s.totalOverdue.toFixed(2)}</td>
                    <td className="p-2">₹{s.totalOldOverduePaid.toFixed(2)}</td>
                    <td className="p-2 font-semibold">₹{s.totalCollectable.toFixed(2)}</td>

                    <td className="p-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleExpand(s.date)}>
                        {open ? "Hide ▲" : "Show ▼"}
                      </Button>

                      <Button size="sm" variant="ghost" onClick={() => downloadCsvForDate(s.date)}>
                        CSV
                      </Button>
                    </td>
                  </tr>

                  {/* EXPANDED */}
                  {open && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={7} className="p-3">
                        {/* FILTER BAR */}
                        <div className="flex justify-between mb-3">
                          <div className="flex gap-2 items-center text-sm">
                            <span className="text-xs text-gray-600">Filter:</span>

                            <Button
                              size="sm"
                              variant={f === "ALL" ? "default" : "outline"}
                              onClick={() => setDateFilter(s.date, "ALL")}
                            >
                              All ({counts.ALL})
                            </Button>

                            <Button
                              size="sm"
                              variant={f === "UPI" ? "default" : "outline"}
                              onClick={() => setDateFilter(s.date, "UPI")}
                            >
                              UPI ({counts.UPI})
                            </Button>

                            <Button
                              size="sm"
                              variant={f === "CASH" ? "default" : "outline"}
                              onClick={() => setDateFilter(s.date, "CASH")}
                            >
                              CASH ({counts.CASH})
                            </Button>

                            <Button
                              size="sm"
                              variant={f === "BANK" ? "default" : "outline"}
                              onClick={() => setDateFilter(s.date, "BANK")}
                            >
                              BANK ({counts.BANK})
                            </Button>

                            <Button
                              size="sm"
                              variant={f === "OTHER" ? "default" : "outline"}
                              onClick={() => setDateFilter(s.date, "OTHER")}
                            >
                              OTHER ({counts.OTHER})
                            </Button>
                          </div>

                          <div className="text-sm text-gray-600">
                            Showing {visible.length} of {rowsForDay.length}
                          </div>
                        </div>

                        {/* DETAIL TABLE */}
                        <table className="w-full text-xs border">
                          <thead className="bg-gray-200">
                            <tr>
                              <th className="p-2">Invoice</th>
                              <th className="p-2">Amount</th>
                              <th className="p-2">Overdue</th>
                              <th className="p-2">Old Paid Overdue</th>
                              <th className="p-2">Method</th>
                              <th className="p-2">Invoice Total</th>
                            </tr>
                          </thead>

                          <tbody>
                            {visible.map((r) => {
                              const oldPaidOverdue =
                                r.invoice_created_at &&
                                r.invoice_created_at < r.payment_date
                                  ? r.amount
                                  : 0;

                              return (
                                <tr key={r.id} className="border-b">
                                  <td className="p-2">{r.invoice_id ?? "-"}</td>
                                  <td className="p-2">₹{r.amount.toFixed(2)}</td>
                                  <td className="p-2">
                                    {r.overdue_amount > 0
                                      ? `₹${r.overdue_amount.toFixed(2)}`
                                      : "-"}
                                  </td>
                                  <td className="p-2">
                                    {oldPaidOverdue > 0
                                      ? `₹${oldPaidOverdue.toFixed(2)}`
                                      : "-"}
                                  </td>
                                  <td className="p-2">
                                    {(r.payment_method ?? "").toUpperCase()}
                                  </td>
                                  <td className="p-2">₹{r.invoice_total.toFixed(2)}</td>
                                </tr>
                              );
                            })}

                            {visible.length === 0 && (
                              <tr>
                                <td colSpan={6} className="p-3 text-center text-gray-500">
                                  No transactions match this filter
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {/* FOOTER TOTALS */}
            <tr className="bg-gray-900 text-white font-semibold">
              <td className="p-2">TOTAL</td>
              <td className="p-2">₹{footerTotals.invoice.toFixed(2)}</td>
              <td className="p-2">₹{footerTotals.paid.toFixed(2)}</td>
              <td className="p-2">₹{footerTotals.overdue.toFixed(2)}</td>
              <td className="p-2">₹{footerTotals.oldOverdue.toFixed(2)}</td>
              <td className="p-2">₹{footerTotals.collectable.toFixed(2)}</td>
              <td className="p-2">—</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
