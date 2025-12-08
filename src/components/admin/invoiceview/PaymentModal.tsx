// src/components/admin/invoiceview/PaymentModal.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PaymentModalProps = {
  visible: boolean;
  invoice: any | null;

  newPaymentAmount: number;
  paymentMethod: "cash" | "upi" | "card";
  useDiscount: boolean;
  discountAmount: number;
  discountReason: string;

  setNewPaymentAmount: (v: number) => void;
  setPaymentMethod: (v: "cash" | "upi" | "card") => void;
  setUseDiscount: (v: boolean) => void;
  setDiscountAmount: (v: number) => void;
  setDiscountReason: (v: string) => void;

  onClose: () => void;
  onConfirm: () => void;
};

export default function PaymentModal({
  visible,
  invoice,

  newPaymentAmount,
  paymentMethod,
  useDiscount,
  discountAmount,
  discountReason,

  setNewPaymentAmount,
  setPaymentMethod,
  setUseDiscount,
  setDiscountAmount,
  setDiscountReason,

  onClose,
  onConfirm,
}: PaymentModalProps) {
  if (!visible || !invoice) return null;

  // -------------------------------
  // SAFE TOTAL, PAID & REMAINING CALCULATION
  // -------------------------------

  // No mixing ?? and || → fully safe
  const totalAmount =
    invoice.grand_total ??
    invoice.total_amount ??
    0;

  const totalPaid = Number(invoice.paid_amount ?? 0);

  const remainingBeforePayment =
    Number(totalAmount) - totalPaid;

  const afterNewPayment =
    totalPaid + Number(newPaymentAmount || 0);

  const remainingAfterPayment =
    Number(totalAmount) -
    afterNewPayment -
    (useDiscount ? Number(discountAmount || 0) : 0);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <Card className="w-full max-w-sm border shadow-xl bg-white">
        <CardHeader>
          <CardTitle>Add Payment</CardTitle>
        </CardHeader>

        <CardContent>
          {/* Header info */}
          <div className="mb-2 text-sm">
            <strong>Invoice:</strong> {invoice.invoice_number}
          </div>
          <div className="mb-2 text-sm">
            <strong>Total:</strong> ₹{Number(totalAmount).toFixed(2)}
          </div>
          <div className="mb-2 text-sm">
            <strong>Paid so far:</strong> ₹{totalPaid.toFixed(2)}
          </div>
          <div className="mb-4 text-sm">
            <strong>Remaining:</strong> ₹{remainingBeforePayment.toFixed(2)}
          </div>

          {/* Payment amount */}
          <label className="block text-xs mb-1">Payment amount</label>
          <input
            type="number"
            className="border p-2 rounded w-full mb-3"
            placeholder="Payment amount"
            value={newPaymentAmount}
            onChange={(e) => setNewPaymentAmount(Number(e.target.value || 0))}
          />

          {/* Payment method */}
          <div className="mb-3">
            <label className="text-xs block mb-1">Payment Method</label>
            <select
              className="border p-2 rounded w-full"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as "cash" | "upi" | "card")
              }
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div>

          {/* Discount Toggle */}
          <div className="mb-4 border rounded p-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useDiscount}
                onChange={(e) => setUseDiscount(e.target.checked)}
              />
              <span className="text-sm font-medium">Add Discount</span>
            </label>

            {useDiscount && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-xs block mb-1">
                    Discount amount
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="border p-2 rounded w-full"
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(Number(e.target.value || 0))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs block mb-1">
                    Reason for discount (required)
                  </label>
                  <textarea
                    className="border p-2 rounded w-full"
                    rows={3}
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                  />
                </div>

                <div className="text-xs text-gray-500">
                  Discount reduces invoice total but does not count as daily income.
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mb-2 text-sm">
            <strong>New total paid will be:</strong>{" "}
            ₹{afterNewPayment.toFixed(2)}
          </div>

          <div className="mb-4 text-sm">
            <strong>New remaining:</strong>{" "}
            ₹{remainingAfterPayment.toFixed(2)}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button onClick={onConfirm}>Add Payment</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
