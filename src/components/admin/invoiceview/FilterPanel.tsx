// src/components/admin/invoiceview/FilterPanel.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FilterPanelProps = {
  invoices: any[];
  customers: any[]; // ensure parent passes customers array (not invoices)
  searchText: string;
  statusFilter: string;
  customerFilter: string;
  minAmount: number | "";
  maxAmount: number | "";
  startDate: string;
  endDate: string;

  filteredInvoices: any[];

  setSearchText: (val: string) => void;
  setStatusFilter: (val: "all" | "unpaid" | "partial" | "paid") => void;
  setCustomerFilter: (val: string | "all") => void;
  setMinAmount: (v: any) => void;
  setMaxAmount: (v: any) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;

  reload: () => void;
};

export default function FilterPanel({
  invoices,
  customers,
  searchText,
  statusFilter,
  customerFilter,
  minAmount,
  maxAmount,
  startDate,
  endDate,

  filteredInvoices,

  setSearchText,
  setStatusFilter,
  setCustomerFilter,
  setMinAmount,
  setMaxAmount,
  setStartDate,
  setEndDate,

  reload,
}: FilterPanelProps) {
  // local input state + debounce
  const [localSearch, setLocalSearch] = useState(searchText || "");
  useEffect(() => setLocalSearch(searchText || ""), [searchText]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchText(localSearch.trim());
    }, 300); // 300ms debounce
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  // CSV export
  const exportCSV = () => {
    if (!filteredInvoices.length) {
      alert("No invoices to export for current filters");
      return;
    }
    const rows = filteredInvoices.map((inv) => ({
      invoice_number: inv.invoice_number,
      date: inv.created_at ? inv.created_at.substring(0, 10) : "",
      customer: inv.customer_name,
      customer_id: inv.customer_id ?? "",
      total_amount: Number(inv.grand_total || inv.total_amount || 0).toFixed(2),
      paid_amount: Number(inv.paid_amount || 0).toFixed(2),
      status: inv.status,
      reference_by: inv.reference_by || "",
    }));

    const header = Object.keys(rows[0]);
    const csvContent =
      header.join(",") +
      "\n" +
      rows
        .map((r) => header.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices_export_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Filters & Export</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs block mb-1">Search (invoice / customer)</label>
            <input
              className="border p-2 rounded w-full text-sm"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search invoice#, customer name, phone, cust_id..."
            />
            <div className="text-xs text-gray-400 mt-1">Tip: search by customer name or cust_id to fetch all their invoices.</div>
          </div>

          <div>
            <label className="text-xs block mb-1">Customer</label>
            <select
              className="border p-2 rounded w-full text-sm"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value as any)}
              disabled={!customers || customers.length === 0}
            >
              <option value="all">All customers</option>
              {customers && customers.length > 0 ? (
                customers.map((c) => (
                  <option key={c.cust_id ?? c.id} value={c.cust_id ?? c.id}>
                    {(c.cust_id ? `${c.cust_id} — ` : "") + (c.name ?? "-")}
                  </option>
                ))
              ) : (
                <option value="all" disabled>No customers</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1">Status</label>
            <select
              className="border p-2 rounded w-full text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1">Amount range</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="border p-2 rounded w-1/2 text-sm"
                placeholder="Min"
                value={minAmount as any}
                onChange={(e) => setMinAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <input
                type="number"
                className="border p-2 rounded w-1/2 text-sm"
                placeholder="Max"
                value={maxAmount as any}
                onChange={(e) => setMaxAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1">From Date</label>
            <input type="date" value={startDate} className="border p-2 rounded w-full" onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div>
            <label className="text-xs block mb-1">To Date</label>
            <input type="date" value={endDate} className="border p-2 rounded w-full" onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="flex items-end gap-2">
            <Button size="sm" onClick={() => {
              setLocalSearch("");
              setSearchText("");
              setCustomerFilter("all");
              setStatusFilter("all");
              setMinAmount("");
              setMaxAmount("");
              setStartDate("");
              setEndDate("");
            }}>
              Reset
            </Button>

            <Button size="sm" variant="outline" onClick={exportCSV}>Export CSV</Button>

            <Button size="sm" variant="outline" onClick={reload}>Refresh</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
