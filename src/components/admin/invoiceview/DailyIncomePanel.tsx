// src/components/admin/invoiceview/DailyIncomePanel.tsx
"use client";

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DailyIncomePanel({
  dailyIncomeRows = [],
  incomeStart,
  incomeEnd,
  setIncomeStart,
  setIncomeEnd,
  reload,
}) {

  // ------ Preset Logic ------
  const setPreset = (preset: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();

    if (preset === "today") {
      const t = now.toISOString().substring(0, 10);
      setIncomeStart(t);
      setIncomeEnd(t);
    }

    if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const d = y.toISOString().substring(0, 10);
      setIncomeStart(d);
      setIncomeEnd(d);
    }

    if (preset === "week") {
      const day = now.getDay();
      const diff = (day + 6) % 7; // Monday start
      const start = new Date(now);
      start.setDate(now.getDate() - diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      setIncomeStart(start.toISOString().substring(0, 10));
      setIncomeEnd(end.toISOString().substring(0, 10));
    }

    if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setIncomeStart(start.toISOString().substring(0, 10));
      setIncomeEnd(end.toISOString().substring(0, 10));
    }
  };

  // ------ Filter rows ------
  const filtered = useMemo(() => {
    return (dailyIncomeRows || []).filter((r) => {
      if (incomeStart && r.payment_date < incomeStart) return false;
      if (incomeEnd && r.payment_date > incomeEnd) return false;
      return true;
    });
  }, [dailyIncomeRows, incomeStart, incomeEnd]);

  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) {
      map[r.payment_date] = (map[r.payment_date] || 0) + Number(r.amount || 0);
    }
    return Object.keys(map).sort((a, b) => (a < b ? 1 : -1)).map((d) => ({
      date: d,
      total: map[d],
    }));
  }, [filtered]);

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Daily Incoming Amounts</CardTitle>
      </CardHeader>

      <CardContent>
        {/* Preset Buttons */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Button size="sm" variant="outline" onClick={() => setPreset("today")}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("yesterday")}>Yesterday</Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("week")}>This Week</Button>
          <Button size="sm" variant="outline" onClick={() => setPreset("month")}>This Month</Button>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs">From</label>
            <input type="date" className="border p-2 rounded" value={incomeStart}
              onChange={(e) => setIncomeStart(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs">To</label>
            <input type="date" className="border p-2 rounded" value={incomeEnd}
              onChange={(e) => setIncomeEnd(e.target.value)} />
          </div>

          <Button size="sm" variant="outline" onClick={() => { setIncomeStart(""); setIncomeEnd(""); }}>
            Reset
          </Button>
        </div>

        {/* Summary Table */}
        <div className="mb-4">
          <div className="text-sm mb-2 font-medium">Summary (grouped)</div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr><th className="p-2">Date</th><th className="p-2">Total Incoming</th></tr>
            </thead>

            <tbody>
              {grouped.map((g) => (
                <tr key={g.date} className="border-b">
                  <td className="p-2">{g.date}</td>
                  <td className="p-2">₹{g.total.toFixed(2)}</td>
                </tr>
              ))}
              {!grouped.length && (
                <tr><td colSpan={2} className="p-4 text-center text-gray-500">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detailed Transactions */}
        <div>
          <div className="text-sm mb-2 font-medium">Detailed Transactions</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Invoice</th>
                <th className="p-2">Method</th>
                <th className="p-2">Amount</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.payment_date}</td>
                  <td className="p-2">{r.invoice_id}</td>
                  <td className="p-2">{(r.payment_method || "").toUpperCase()}</td>
                  <td className="p-2">₹{Number(r.amount).toFixed(2)}</td>
                </tr>
              ))}

              {!filtered.length && (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">No transactions</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </CardContent>
    </Card>
  );
}
