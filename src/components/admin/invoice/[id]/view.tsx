// src/components/admin/invoice/[id]/view.tsx
// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function InvoiceView() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [profileSettings, setProfileSettings] = useState(null);

  useEffect(() => {
    loadInvoice();
  }, []);

  async function loadInvoice() {
    const { data: inv } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    const { data: it } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id);

    const { data: settings } = await supabase
      .from("profile_invoice_settings")
      .select("*")
      .eq("id", inv.user_id)
      .single();

    setInvoice(inv);
    setItems(it || []);
    setProfileSettings(settings);
  }

  if (!invoice) return <div>Loading…</div>;

  const subtotal = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const total = Number(invoice.total_amount || 0);

  return (
    <div className="p-8 bg-white text-black">

      {/* BUTTONS (not shown on print) */}
      <div className="no-print flex justify-between mb-4">
        <Button onClick={() => window.print()}>Print</Button>
        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>

      {/* PRINT AREA */}
      <div id="invoice-print-area" className="max-w-3xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between">
          <div>
            <h2 className="font-bold text-xl">{invoice.company_name || "Safe Sight Eye Care"}</h2>
            <div>{invoice.company_address}</div>
            <div>Phone: {invoice.company_phone}</div>
          </div>

          <div className="text-right">
            <div className="font-semibold text-lg">INVOICE</div>
            <div>Invoice #: {invoice.invoice_number}</div>
            <div>Date: {invoice.created_at?.substring(0, 10)}</div>
            {invoice.reference_by && <div>Reference: {invoice.reference_by}</div>}
          </div>
        </div>

        {/* BILL TO */}
        <div className="mt-6">
          <h4 className="font-semibold">Bill To:</h4>
          <div>{invoice.customer_name}</div>
          <div>{invoice.customer_phone}</div>
        </div>

        {/* ITEMS TABLE */}
        <table className="w-full text-sm mt-6 border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Unit</th>
              <th className="p-2 text-right">Discount</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{it.description}</td>
                <td className="p-2 text-right">{it.quantity}</td>
                <td className="p-2 text-right">{it.unit_price.toFixed(2)}</td>
                <td className="p-2 text-right">{it.discount_amount?.toFixed(2) || "0.00"}</td>
                <td className="p-2 text-right">{it.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY */}
        <div className="flex justify-end mt-6 text-sm">
          <div className="w-48">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-bold mt-1">
              <span>Grand Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* AMOUNT IN WORDS */}
        <div className="mt-4 text-sm">
          <strong>Amount in words:</strong> {invoice.amount_words}
        </div>

        {/* PAYMENT DETAILS */}
        <div className="mt-8 text-sm">
          <strong>Payment Instructions:</strong>
          <div>Payment due within 10 days. Thank you for your business!</div>

          <div className="flex mt-4 gap-16">
            <div>
              <strong>Payment UPI:</strong><br />
              {profileSettings?.upi_id || "-"}
            </div>

            <div>
              <strong>Bank Details:</strong><br />
              Bank: {profileSettings?.bank_name || "-"}<br />
              A/C: {profileSettings?.bank_account_number || "-"}<br />
              IFSC: {profileSettings?.bank_ifsc || "-"}
            </div>
          </div>
        </div>

        {/* SIGNATURE */}
        <div className="flex justify-between mt-10">
          <div>
            <div>Authorized Signature</div>
            {profileSettings?.signature_url && (
              <img src={profileSettings.signature_url} className="h-40 mt-2" />
            )}
          </div>

          <div>
            {profileSettings?.seal_url && (
              <img src={profileSettings.seal_url} className="h-32 opacity-70" />
            )}
          </div>
        </div>

        <div className="mt-10 text-center text-sm">
          Thank you for choosing our services.
        </div>

      </div>

      {/* PRINT FIX — SCOPED TO THIS COMPONENT ONLY */}
      <style jsx>{`
        @media print {

          /* Hide everything except invoice */
          body * {
            visibility: hidden;
          }

          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible;
          }

          /* Force invoice to full A4 page */
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 20mm !important;
          }

          /* A4 print settings */
          @page {
            size: A4;
            margin: 12mm;
          }

          /* Fix clipping in Chrome */
          html, body {
            overflow: visible !important;
            height: auto !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
