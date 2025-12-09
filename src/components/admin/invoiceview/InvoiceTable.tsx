// src/components/admin/invoiceview/InvoiceTable.tsx
"use client";

import React, { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InvoiceTableProps = {
  loading: boolean;
  invoices: any[];

  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  onDownloadPdf: (inv: any) => Promise<void> | void;
  onOpenPayment: (inv: any) => void;
  onViewInvoice: (inv: any) => void;
  onChangeStatus: (inv: any, status: "unpaid" | "partial" | "paid") => void;
};

export default function InvoiceTable({
  loading,
  invoices,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onDownloadPdf,
  onOpenPayment,
  onViewInvoice,
  onChangeStatus,
}: InvoiceTableProps) {
  // PREVENT MULTIPLE PDF DOWNLOADS
  const isGeneratingRef = useRef(false);

  const handlePdfButtonClick = async (inv: any) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    try {
      await onDownloadPdf(inv);
    } catch (err) {
      console.error("Parent PDF action failed:", err);
      alert("Unable to generate PDF.");
    } finally {
      setTimeout(() => {
        isGeneratingRef.current = false;
      }, 400);
    }
  };

  const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  // top pagination UI helper
  const gotoFirst = () => onPageChange(1);
  const gotoPrev = () => onPageChange(Math.max(1, page - 1));
  const gotoNext = () => onPageChange(Math.min(totalPages, page + 1));
  const gotoLast = () => onPageChange(totalPages);

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Invoices</CardTitle>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {/* --- TOP PAGINATION & CONTROLS --- */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={gotoFirst}>
              First
            </Button>
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={gotoPrev}>
              Prev
            </Button>

            <div className="flex items-center gap-2 px-2">
              <span className="text-sm">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(e) => {
                  const v = Number(e.target.value || 1);
                  if (!isNaN(v)) onPageChange(Math.min(Math.max(1, v), totalPages));
                }}
                className="border rounded w-16 p-1 text-center"
              />
              <span className="text-sm">/ {totalPages}</span>
            </div>

            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={gotoNext}>
              Next
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={gotoLast}>
              Last
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page:</span>
            <select
              className="border p-1 rounded text-sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-6">
            Loading invoices…
          </div>
        ) : (
          <>
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-100 border-b text-left">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Paid</th>
                  <th className="p-2">Remaining</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((inv) => {
                  const total = Number(inv.grand_total ?? 0);
                  const paid = Number(inv.paid_amount ?? 0);
                  const remaining = Math.max(0, total - paid);

                  return (
                    <tr key={inv.id} className="border-b">
                      {/* <td className="p-2">{inv.created_at}</td> */}
                      <td className="p-2">
  {new Date(inv.created_at).toLocaleDateString("en-CA")}
</td>

                      <td className="p-2">{inv.invoice_number}</td>
                      <td className="p-2">{inv.customer_name}</td>
                      <td className="p-2">₹{total.toFixed(2)}</td>
                      <td className="p-2">₹{paid.toFixed(2)}</td>
                      <td className="p-2">₹{remaining.toFixed(2)}</td>

                      {/* Status dropdown */}
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {inv.status !== "paid" && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                              ⚠️ Overdue
                            </span>
                          )}

                          <select
                            className="border p-1 rounded text-sm"
                            value={inv.status}
                            onChange={(e) =>
                              onChangeStatus(inv, e.target.value as any)
                            }
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                      </td>

                      <td className="p-2">
                        {inv.created_at ? inv.created_at.substring(0, 10) : ""}
                      </td>

                      {/* Actions */}
                      <td className="p-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => void handlePdfButtonClick(inv)}>
                          PDF
                        </Button>

                        <Button size="sm" variant="outline" onClick={() => onOpenPayment(inv)}>
                          Pay
                        </Button>

                        <Button size="sm" onClick={() => onViewInvoice(inv)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination controls (below table) */}
            <div className="flex justify-between items-center mt-4">
              {/* Page size selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm">Rows per page:</span>
                <select
                  className="border p-1 rounded text-sm"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={gotoPrev}>
                  Prev
                </Button>

                <span className="text-sm">
                  Page {totalPages === 0 ? 0 : page} of {totalPages}
                </span>

                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={gotoNext}>
                  Next
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                Showing {Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)} of {totalCount}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
