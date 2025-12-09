// src/components/admin/invoicing/InvoicingPaymentPanel.tsx
// @ts-nocheck
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const InvoicingPaymentPanel = ({
  form,
  setForm,
  subtotal,
  totalDiscount,
  taxableAmount,
  cgst,
  sgst,
  igst,
  grandTotal,
  remainingAmount,
  numberToWords
}) => {

  /* PAYMENT STATUS CHANGE */
  const handlePaymentStatusChange = (status) => {
    setForm(prev => {
      let paid = prev.paid_amount;
      if (status === "unpaid") paid = 0;
      if (status === "paid") paid = grandTotal;
      if (status === "partial" && (paid <= 0 || paid > grandTotal)) paid = 0;
      return { ...prev, payment_status: status, paid_amount: paid };
    });
  };

  /* PARTIAL PAID AMOUNT */
  const handlePaidAmountChange = (value) => {
    const amt = Number(value || 0);
    setForm(prev => {
      const capped = Math.max(0, Math.min(grandTotal, amt));
      let status = "partial";
      if (capped === 0) status = "unpaid";
      else if (capped === grandTotal) status = "paid";
      return { ...prev, paid_amount: capped, payment_status: status };
    });
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader><CardTitle>Payment & Tax</CardTitle></CardHeader>

      <CardContent className="space-y-4">

        {/* Payment Status */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <select
            className="border rounded p-3 w-full md:w-48"
            value={form.payment_status}
            onChange={(e) => handlePaymentStatusChange(e.target.value)}
          >
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>

          {form.payment_status === "partial" && (
            <input
              type="number"
              className="border rounded p-3 w-full md:w-48"
              placeholder="Paid amount"
              value={form.paid_amount}
              onChange={(e) => handlePaidAmountChange(e.target.value)}
            />
          )}
        </div>

        {/* Payment Method */}
        <div className="flex gap-3 items-center">
          <label className="text-sm">Payment Method:</label>

          <select
            className="border rounded p-2"
            value={form.payment_method}
            onChange={(e) =>
              setForm(prev => ({ ...prev, payment_method: e.target.value }))
            }
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>

          <div className="ml-auto text-sm text-gray-600">
            Subtotal: ₹{subtotal.toFixed(2)}
          </div>
        </div>

        {/* Tax Type */}
        <div className="flex gap-4 items-center">
          <label className="text-sm">Tax Type:</label>

          <select
            className="border rounded p-2"
            value={form.taxType}
            onChange={(e) =>
              setForm(prev => ({ ...prev, taxType: e.target.value }))
            }
          >
            <option value="CGST_SGST">CGST + SGST</option>
            <option value="IGST">IGST</option>
            <option value="NONE">No Tax</option>
          </select>

          <label className="text-sm">Tax %</label>
          <input
            type="number"
            className="border rounded p-2 w-20"
            value={form.taxPercent}
            onChange={(e) =>
              setForm(prev => ({
                ...prev,
                taxPercent: Number(e.target.value || 0)
              }))
            }
          />
        </div>

        {/* Summary Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">

          <div className="p-3 border rounded">
            <div className="text-xs text-gray-500">Subtotal</div>
            <div className="font-semibold">₹{subtotal.toFixed(2)}</div>
          </div>

          <div className="p-3 border rounded">
            <div className="text-xs text-gray-500">Total Discount</div>
            <div className="font-semibold">- ₹{totalDiscount.toFixed(2)}</div>
          </div>

          <div className="p-3 border rounded">
            <div className="text-xs text-gray-500">Taxable Amount</div>
            <div className="font-semibold">₹{taxableAmount.toFixed(2)}</div>
          </div>

          <div className="p-3 border rounded">
            <div className="text-xs text-gray-500">Taxes</div>
            <div className="font-semibold">
              {form.taxType === "CGST_SGST" && (
                <>
                  CGST: ₹{cgst.toFixed(2)} <br />
                  SGST: ₹{sgst.toFixed(2)}
                </>
              )}
              {form.taxType === "IGST" && <>IGST: ₹{igst.toFixed(2)}</>}
              {form.taxType === "NONE" && <>₹0.00</>}
            </div>
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-500">Amount in words</div>
            <div className="font-medium">{numberToWords(grandTotal)}</div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Grand Total</div>
            <div className="text-2xl font-bold">₹{grandTotal.toFixed(2)}</div>
            <div className="text-xs text-gray-500">
              Remaining: ₹{remainingAmount.toFixed(2)}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default InvoicingPaymentPanel;
