// src/components/admin/InvoiceInvoiceSection.tsx
// @ts-nocheck
"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export default function InvoiceInvoiceSection({
  invoice,
  items,
  branding,
  company,
  onDownloadPdf,
  onClose
}) {
  if (!invoice) return null;

  return (
    <div className="invoice-view-modal max-w-5xl w-full">
      {/* Buttons (hidden on print) */}
      <div className="flex justify-end gap-2 mb-4 no-print">
        <Button variant="outline" onClick={() => onDownloadPdf(invoice)}>Download PDF</Button>
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      {/* HEADER */}
      <div className="invoice-header">
        <div style={{ maxWidth: "60%" }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {company?.name || "Company Name"}
          </div>
          {company?.address && (
            <div style={{ marginTop: 6, fontSize: 12 }}>{company.address}</div>
          )}
          {company?.phone && (
            <div style={{ marginTop: 6, fontSize: 12 }}>Phone: {company.phone}</div>
          )}
        </div>

        <div style={{ textAlign: "right", minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Invoice</div>
          <div style={{ marginTop: 8 }}>
            Invoice #: <strong>{invoice.invoice_number}</strong>
          </div>
          <div>Date: {invoice.created_at?.substring(0, 10)}</div>
          {invoice.reference_by && <div>Reference: {invoice.reference_by}</div>}
        </div>
      </div>

      {/* CUSTOMER */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700 }}>Bill To:</div>
        <div style={{ marginTop: 6 }}>{invoice.customer_name}</div>
        {invoice.customer_phone && (
          <div style={{ marginTop: 4, fontSize: 12 }}>
            Phone: {invoice.customer_phone}
          </div>
        )}
        {invoice.customer_state && (
          <div style={{ marginTop: 4, fontSize: 12 }}>
            State: {invoice.customer_state}
          </div>
        )}
      </div>

      {/* ITEMS TABLE */}
      <div style={{ marginTop: 18, overflowX: "auto" }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead style={{ background: "#f5f5f5" }}>
            <tr>
              <th style={th}>#</th>
              <th style={th}>Description</th>
              <th style={th}>HSN</th>
              <th style={thRight}>Qty</th>
              <th style={thRight}>Unit</th>
              <th style={thRight}>Disc %</th>
              <th style={thRight}>Disc ₹</th>
              <th style={thRight}>Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={td}>{idx + 1}</td>
                <td style={td}>{it.description}</td>
                <td style={td}>{it.hsn_code || "-"}</td>
                <td style={tdRight}>{it.quantity}</td>
                <td style={tdRight}>₹{Number(it.unit_price).toFixed(2)}</td>
                <td style={tdRight}>{it.discount_percent || "-"}</td>
                <td style={tdRight}>₹{Number(it.discount_amount || 0).toFixed(2)}</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>
                  ₹{Number(it.total).toFixed(2)}
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td style={{ padding: 16, textAlign: "center" }} colSpan={8}>
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div className="flex justify-end mt-6">
        <div style={{ width: 260 }}>
          {renderSummary("Subtotal", invoice.subtotal)}
          {renderSummary("Total Discount", invoice.total_discount, true)}
          {renderSummary("Taxable", invoice.taxable_amount)}
          {renderSummary("CGST", invoice.cgst)}
          {renderSummary("SGST", invoice.sgst)}

          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              paddingTop: 8,
              marginTop: 8,
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700
            }}
          >
            <div>Grand Total</div>
            <div>₹{Number(invoice.grand_total).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ marginTop: 26, borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Payment Instructions:</div>
        <div style={{ marginTop: 6 }}>
          {branding?.payment_instructions || "Payment due within 10 days."}
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>Payment UPI:</div>
            <div style={{ marginTop: 6 }}>{branding?.payment_upi || "-"}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>Bank Details:</div>
            <div style={{ marginTop: 6 }}>{branding?.bank_name || "-"}</div>
            <div>A/C: {branding?.bank_account_number || "-"}</div>
            <div>IFSC: {branding?.bank_ifsc || "-"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, marginTop: 18 }}>
          <div>
            {branding?.signature_url ? (
              <img src={branding.signature_url} style={{ maxWidth: 200 }} />
            ) : (
              <div>Authorized Signature</div>
            )}
          </div>

          <div>
            {branding?.seal_url && (
              <img src={branding.seal_url} style={{ maxWidth: 100 }} />
            )}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>Thank you for choosing our services.</div>
      </div>
    </div>
  );
}

/* ---- STYLES ---- */
const th = { padding: 8, borderBottom: "1px solid #ddd", textAlign: "left" };
const thRight = { ...th, textAlign: "right" };
const td = { padding: 8 };
const tdRight = { padding: 8, textAlign: "right" };

function renderSummary(label, value, negative = false) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <div>{label}</div>
      <div>
        {negative ? "- " : ""}
        ₹{Number(value || 0).toFixed(2)}
      </div>
    </div>
  );
}
