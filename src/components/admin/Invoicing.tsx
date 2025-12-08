// src/components/admin/Invoicing.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ---------- Types ---------- */
type PaymentStatus = "unpaid" | "partial" | "paid";
type PaymentMethod = "cash" | "upi" | "card";

interface Customer { id: string; name: string; phone?: string | null; address?: string | null; state?: string | null; }
interface Product { id: string; name: string; item_code?: string | null; price?: number | null; offer_price?: number | null; }
interface Variant { id: string; product_id: string; color?: string | null; size?: string | null; stock_quantity?: number | null; }

interface InvoiceItemDraft {
  id?: string;
  type: "product" | "manual";
  product_id?: string | null;
  variant_id?: string | null;
  item_code?: string | null;
  description: string;
  hsn_code?: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  total: number;
}

interface InvoiceFormState {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_state?: string;
  reference_by: string;
  total_amount: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  taxType: "NONE" | "CGST_SGST" | "IGST";
  taxPercent: number;
  payment_method: PaymentMethod;
}

/* ---------- Helper: number to words (Indian) ---------- */
/* (same helper included from your original file) */
const numberToWords = (function () {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six",
    "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num) {
    if ((num = num.toString()).length > 9) return "Overflow";
    let n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{3})(\d{3})(\d{1})$/);
    if (!n) return;
    let str = "";
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || (b[n[1][0]] + " " + a[n[1][1]])) + " Crore " : "";
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || (b[n[2][0]] + " " + a[n[2][1]])) + " Thousand " : "";
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || (b[n[3][0]] + " " + a[n[3][1]])) + " Hundred " : "";
    if (Number(n[4]) !== 0) {
      str += (str !== "" ? "and " : "") + (a[Number(n[4])] || (b[n[4][0]] + " " + a[n[4][1]])) + " ";
    }
    return str.trim();
  }

  return (num) => {
    if (isNaN(num) || num === null) return "";
    const n = Math.floor(num);
    const dec = Math.round((num - n) * 100);
    const rupees = inWords(n);
    const paise = dec ? inWords(dec) + " Paise" : "";
    return `${rupees ? rupees + " Rupees" : ""}${dec ? " and " + paise : ""}`.trim() || "Zero Rupees";
  };
})();

/* ---------- Component ---------- */
const Invoicing: React.FC<{
  invoiceSessionId: string;
  onCustomerNameChange: (name: string) => void;
}> = ({ invoiceSessionId, onCustomerNameChange }) => {
  // base data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  // invoice state
  const [items, setItems] = useState<InvoiceItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_state: "",
    reference_by: "",
    total_amount: 0,
    payment_status: "unpaid",
    paid_amount: 0,
    taxType: "CGST_SGST",
    taxPercent: 18,
    payment_method: "cash",
  });

  // UI
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", state: "" });

  // customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerList, setShowCustomerList] = useState(false);

  // success popup
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // print ref
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { void loadBaseData(); }, []);

  const loadBaseData = async () => {
    try {
      const { data: cs } = await supabase.from("customers").select("*");
      const { data: pr } = await supabase.from("products").select("*");
      const { data: pv } = await supabase.from("product_variants").select("*");
      setCustomers(cs ?? []);
      setProducts(pr ?? []);
      setVariants(pv ?? []);
    } catch (err) {
      console.error("loadBaseData", err);
    }
  };

  /* ---------- session load/save ---------- */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`invoice_data_${invoiceSessionId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) setForm(parsed.form);
        if (parsed.items) setItems(parsed.items);
      } else {
        setForm(prev => ({ ...prev, customer_id: "", customer_name: "", customer_phone: "", reference_by: "", total_amount: 0, payment_status: "unpaid", paid_amount: 0, payment_method: "cash" }));
        setItems([]);
      }
    } catch (err) {
      console.error("load session", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceSessionId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`invoice_data_${invoiceSessionId}`, JSON.stringify({ form, items }));
    } catch (err) {
      console.error("save session", err);
    }
    try { onCustomerNameChange(form.customer_name || "New Invoice"); } catch (_) {}
  }, [form, items]);

  /* ---------- helpers ---------- */
  const roundRupees = (amt: number) => {
    const n = Number(amt || 0);
    if (isNaN(n)) return 0;
    return Math.floor(n);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 2200);
  };

  const getTotalProductStock = (productId?: string | null) => {
    if (!productId) return 0;
    const rel = variants.filter(v => v.product_id === productId);
    return rel.reduce((s, v) => s + Number(v.stock_quantity ?? 0), 0);
  };
  const getVariantStock = (variantId?: string | null) => {
    if (!variantId) return 0;
    const v = variants.find(x => x.id === variantId);
    return Number(v?.stock_quantity ?? 0);
  };

  /* ---------- customer search/autocomplete ---------- */
  useEffect(() => {
    if (!customerQuery || customerQuery.trim().length < 1) {
      setCustomerResults([]);
      return;
    }
    const q = customerQuery.toLowerCase().trim();
    const filtered = customers.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    ).slice(0, 10);
    setCustomerResults(filtered);
  }, [customerQuery, customers]);

  const handleSelectCustomer = (c: Customer) => {
    setForm(prev => ({ ...prev, customer_id: c.id, customer_name: c.name, customer_phone: c.phone || "", customer_state: c.state || "" }));
    setCustomerQuery("");
    setCustomerResults([]);
    setShowCustomerList(false);
    try { onCustomerNameChange(c.name); } catch (_) {}
  };

  const saveNewCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Customer name is required");
    const { data, error } = await supabase.from("customers").insert([{
      name: newCustomer.name.trim(), phone: newCustomer.phone || null, address: newCustomer.address || null, state: newCustomer.state || null
    }]).select();
    if (error) { console.error(error); return alert("Failed to save customer"); }
    const created = (data ?? [])[0];
    setCustomers(prev => [...prev, created]);
    setShowCustomerModal(false);
    setNewCustomer({ name: "", phone: "", address: "", state: "" });
    handleSelectCustomer(created);
  };

  /* ---------- items & totals ---------- */
  const recalcTotals = (list: InvoiceItemDraft[]) => {
    const total = list.reduce((s, it) => s + Number(it.total || 0), 0);
    setForm(prev => {
      let paid = prev.paid_amount;
      if (prev.payment_status === "paid") paid = total;
      if (prev.payment_status === "unpaid") paid = 0;
      if (prev.payment_status === "partial" && paid > total) paid = total;
      return { ...prev, total_amount: total, paid_amount: paid };
    });
  };

  const addProductLine = () => {
    const l = [...items, {
      type: "product",
      product_id: null,
      variant_id: null,
      item_code: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      total: 0
    }];
    setItems(l); recalcTotals(l);
  };
  const addManualLine = () => {
    const l = [...items, {
      type: "manual",
      product_id: null,
      variant_id: null,
      item_code: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      total: 0
    }];
    setItems(l); recalcTotals(l);
  };
  const removeItem = (i: number) => { const l = items.filter((_, idx) => idx !== i); setItems(l); recalcTotals(l); };

  const updateItem = (index: number, field: keyof InvoiceItemDraft | string, value: any) => {
    const list = [...items];
    const cur = { ...list[index] } as any;

    const safeNum = (v: any) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    if (field === "quantity") cur.quantity = safeNum(value);
    else if (field === "unit_price") cur.unit_price = safeNum(value);
    else if (field === "discount_percent") {
      cur.discount_percent = safeNum(value);
      cur.discount_amount = Number((cur.unit_price * (cur.discount_percent / 100)).toFixed(2));
    } else if (field === "discount_amount") {
      cur.discount_amount = safeNum(value);
      cur.discount_percent = cur.unit_price > 0 ? Number(((cur.discount_amount / cur.unit_price) * 100).toFixed(2)) : 0;
    } else if (field === "hsn_code") cur.hsn_code = value;
    else cur[field as keyof InvoiceItemDraft] = value;

    const qty = Number(cur.quantity || 0);
    const unit = Number(cur.unit_price || 0);
    const disc = Number(cur.discount_amount || 0);
    const lineTotal = Math.max(0, (unit - disc) * qty);
    cur.total = Number(lineTotal.toFixed(2));

    list[index] = cur;
    setItems(list);
    recalcTotals(list);
  };

  const handleProductSelect = (index: number, product_id: string) => {
    const prod = products.find(p => p.id === product_id);
    if (!prod) return;
    const price = Number(prod.offer_price ?? prod.price ?? 0);
    const list = [...items];
    const cur = { ...list[index] } as any;
    cur.product_id = product_id;
    cur.item_code = prod.item_code ?? "";
    cur.description = prod.name ?? "";
    cur.unit_price = price;
    if (cur.discount_percent && cur.discount_percent > 0) {
      cur.discount_amount = Number((price * (cur.discount_percent / 100)).toFixed(2));
    }
    cur.total = Number(((price - (cur.discount_amount || 0)) * (cur.quantity || 1)).toFixed(2));
    cur.variant_id = null;
    list[index] = cur;
    setItems(list);
    recalcTotals(list);
  };

  const handleVariantSelect = (index: number, variant_id: string) => {
    const variant = variants.find(v => v.id === variant_id);
    const list = [...items];
    const cur = { ...list[index] } as any;
    cur.variant_id = variant_id || null;
    if (variant) {
      const base = (cur.description || "").split(" (")[0];
      cur.description = `${base} (${variant.color ?? ""} ${variant.size ?? ""})`;
    }
    list[index] = cur;
    setItems(list);
    recalcTotals(list);
  };

  /* ---------- payment helpers ---------- */
  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setForm(prev => {
      let paid = prev.paid_amount;
      if (status === "unpaid") paid = 0;
      if (status === "paid") paid = prev.total_amount;
      if (status === "partial" && (paid <= 0 || paid > prev.total_amount)) paid = 0;
      return { ...prev, payment_status: status, paid_amount: paid };
    });
  };
  const handlePaidAmountChange = (value: string) => {
    const amt = Number(value || 0);
    setForm(prev => {
      const capped = Math.max(0, Math.min(prev.total_amount, amt));
      let status: PaymentStatus = "partial";
      if (capped === 0) status = "unpaid";
      else if (capped === prev.total_amount) status = "paid";
      return { ...prev, paid_amount: capped, payment_status: status };
    });
  };

  const remainingAmount = form.total_amount - (form.payment_status === "paid" ? form.total_amount : form.payment_status === "partial" ? form.paid_amount : 0);

  /* ---------- stock validation ---------- */
  const checkStockBeforeSave = (): boolean => {
    for (const it of items) {
      if (it.type !== "product" || !it.product_id) continue;
      if (it.variant_id) {
        const avail = getVariantStock(it.variant_id);
        if (avail < it.quantity) { alert(`Not enough stock for ${it.description}. Available: ${avail}, requested: ${it.quantity}`); return false; }
      } else {
        const avail = getTotalProductStock(it.product_id);
        if (avail < it.quantity) { const p = products.find(x => x.id === it.product_id); alert(`Not enough stock for ${p?.name ?? "product"}. Available: ${avail}, requested: ${it.quantity}`); return false; }
      }
    }
    return true;
  };

  /* ---------- small helper to write history ---------- */
  const writeEditHistory = async (payload: {
    invoice_id: string;
    action_type: string;
    old_values?: any;
    new_values?: any;
    reason?: string | null;
  }) => {
    try {
      await supabase.from("invoice_edit_history").insert([{
        invoice_id: payload.invoice_id,
        action_type: payload.action_type,
        old_values: payload.old_values ?? null,
        new_values: payload.new_values ?? null,
        reason: payload.reason ?? null,
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn("Failed to write edit history", err);
    }
  };

  /* ---------- save invoice ---------- */
  const handleSaveInvoice = async () => {
    if (!form.customer_name.trim()) return alert("Please enter customer name");
    if (items.length === 0) return alert("Please add at least one item");
    if (!checkStockBeforeSave()) return;

    setSaving(true);
    try {
      // compute summary fields to store
      const subtotal = items.reduce((s, it) => s + (Number(it.unit_price || 0) * Number(it.quantity || 0)), 0);
      const totalDiscount = items.reduce((s, it) => {
        const unit = Number(it.unit_price || 0);
        const qty = Number(it.quantity || 0);
        const disc = (it.discount_amount && it.discount_amount > 0) ? Number(it.discount_amount) : (it.discount_percent && it.discount_percent > 0 ? unit * (it.discount_percent / 100) : 0);
        return s + (disc * qty);
      }, 0);
      const taxable = Math.max(0, subtotal - totalDiscount);

      // tax splits
      let cgst = 0, sgst = 0, igst = 0;
      if (form.taxType === "CGST_SGST") {
        const halfPercent = (form.taxPercent || 0) / 2;
        cgst = Number(((taxable * halfPercent) / 100).toFixed(2));
        sgst = Number(((taxable * halfPercent) / 100).toFixed(2));
      } else if (form.taxType === "IGST") {
        igst = Number(((taxable * (form.taxPercent || 0)) / 100).toFixed(2));
      }

      const grandTotal = Number((taxable + cgst + sgst + igst).toFixed(2));

      const invoiceNumber = "INV-" + Date.now();
      const payload: any = {
        invoice_number: invoiceNumber,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone || null,
        customer_state: form.customer_state || null,
        reference_by: form.reference_by || null,
        subtotal,
        total_discount: totalDiscount,
        taxable_amount: taxable,
        cgst,
        sgst,
        igst,
        tax_percent: form.taxPercent,
        tax_type: form.taxType,
        grand_total: grandTotal,
        status: form.payment_status,
        paid_amount:
          form.payment_status === "paid"
            ? grandTotal
            : form.payment_status === "partial"
            ? form.paid_amount
            : 0,
      };

      // 1) create invoice
      const { data: invData, error: invErr } = await supabase.from("invoices").insert([payload]).select();
      if (invErr || !invData || !invData[0]) throw invErr || new Error("Failed to create invoice");
      const createdInvoice = invData[0];

      // 2) insert items
      for (const it of items) {
        const { error: iiErr } = await supabase.from("invoice_items").insert([{
          invoice_id: createdInvoice.id,
          item_code: it.item_code ?? null,
          product_id: it.product_id ?? null,
          variant_id: it.variant_id ?? null,
          description: it.description,
          hsn_code: it.hsn_code ?? null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent ?? 0,
          discount_amount: it.discount_amount ?? 0,
          total: it.total,
        }]);
        if (iiErr) throw iiErr;
      }

      // 3) deduct stock (DB RPCs)
      for (const it of items) {
        if (it.type !== "product" || !it.product_id) continue;
        if (it.variant_id) {
          const { error: rpcErr } = await supabase.rpc("deduct_variant_stock", { p_variant_id: it.variant_id, p_quantity: Math.floor(Number(it.quantity)) });
          if (rpcErr) throw rpcErr;
        } else {
          const { error: rpcErr } = await supabase.rpc("deduct_product_stock", { p_product_id: it.product_id, p_quantity: Math.floor(Number(it.quantity)) });
          if (rpcErr) throw rpcErr;
        }
      }

      // 4) if invoice has immediate paid amount, insert payment row(s), record daily income, and write history
      try {
        const paidToRecordRaw = Number(payload.paid_amount || 0);
        const paidToRecord = roundRupees(paidToRecordRaw);
        if (paidToRecord > 0) {
          // insert payment row
          const { error: payErr } = await supabase.from("invoice_payments").insert([{
            invoice_id: createdInvoice.id,
            amount: paidToRecord,
            payment_method: form.payment_method || "cash",
            recorded_by: "system",
            created_at: new Date().toISOString()
          }]);
          if (payErr) throw payErr;

          // daily income (only actual money)
          await supabase.from("invoice_daily_income").insert([{
            invoice_id: createdInvoice.id,
            amount: paidToRecord,
            payment_method: form.payment_method || "cash",
            payment_date: new Date().toISOString().substring(0, 10),
            created_at: new Date().toISOString()
          }]);

          // history: payment_add
          await writeEditHistory({
            invoice_id: createdInvoice.id,
            action_type: "payment_add",
            old_values: { paid_amount: 0 },
            new_values: { added_amount: paidToRecord, payment_method: form.payment_method || "cash" },
            reason: null
          });

          // history: invoice_paid_update
          await writeEditHistory({
            invoice_id: createdInvoice.id,
            action_type: "invoice_paid_update",
            old_values: { paid_amount: 0, status: "unpaid" },
            new_values: { paid_amount: paidToRecord, status: createdInvoice.status },
            reason: null
          });
        }
      } catch (err) {
        console.warn("Failed to record payment/daily income on invoice create", err);
      }

      showSuccess("Invoice saved successfully");
      setItems([]); setForm({
        customer_id: "", customer_name: "", customer_phone: "", customer_state: "", reference_by: "", total_amount: 0,
        payment_status: "unpaid", paid_amount: 0, taxType: "CGST_SGST", taxPercent: 18, payment_method: "cash"
      });
      await loadBaseData();
      try { sessionStorage.removeItem(`invoice_data_${invoiceSessionId}`); } catch (_) {}
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- derived totals displayed ---------- */
  const subtotal = useMemo(() => items.reduce((s, it) => s + Number(it.unit_price || 0) * Number(it.quantity || 0), 0), [items]);
  const totalDiscount = useMemo(() => items.reduce((s, it) => {
    const unit = Number(it.unit_price || 0);
    const qty = Number(it.quantity || 0);
    const disc = (it.discount_amount && it.discount_amount > 0) ? Number(it.discount_amount) : (it.discount_percent && it.discount_percent > 0 ? unit * (it.discount_percent / 100) : 0);
    return s + (disc * qty);
  }, 0), [items]);
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const cgst = form.taxType === "CGST_SGST" ? Number(((taxableAmount * (form.taxPercent || 0) / 2) / 100).toFixed(2)) : 0;
  const sgst = form.taxType === "CGST_SGST" ? Number(((taxableAmount * (form.taxPercent || 0) / 2) / 100).toFixed(2)) : 0;
  const igst = form.taxType === "IGST" ? Number(((taxableAmount * (form.taxPercent || 0)) / 100).toFixed(2)) : 0;
  const grandTotal = Number((taxableAmount + cgst + sgst + igst).toFixed(2));

  /* ---------- Print / Export (simple) ---------- (unchanged) ---------- */
  const handlePrint = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return alert("Popup blocked. Allow popups for this site to print invoices.");
    const style = `
      <style>
        body{ font-family: Arial, Helvetica, sans-serif; padding:20px; color:#111 }
        h2{ margin:0 0 8px 0 }
        table{ width:100%; border-collapse: collapse; margin-top:12px }
        th,td{ border:1px solid #222; padding:6px; font-size:12px }
        .right{ text-align:right }
        .small{ font-size:11px; color:#333 }
        .no-border{ border:none }
      </style>
    `;
    const header = `<div><h2>Invoice</h2><div class="small">Invoice #: ${"INV-" + Date.now()}</div></div>`;
    const customerHtml = `
      <div style="margin-top:8px">
        <strong>Bill To:</strong><br/>
        ${form.customer_name || "-"}<br/>
        ${form.customer_phone || ""}<br/>
        ${form.customer_state ? ("State: " + form.customer_state) : ""}
      </div>
    `;
    const rows = items.map((it, idx) => `
      <tr>
        <td>${idx+1}</td>
        <td>${it.description || ""}${it.hsn_code ? `<div class="small">HSN: ${it.hsn_code}</div>` : ""}</td>
        <td class="right">${it.quantity}</td>
        <td class="right">₹${Number(it.unit_price).toFixed(2)}</td>
        <td class="right">${it.discount_percent ? (it.discount_percent + "%") : "-"}</td>
        <td class="right">₹${Number(it.discount_amount || 0).toFixed(2)}</td>
        <td class="right">₹${Number(it.total).toFixed(2)}</td>
      </tr>
    `).join("");
    const table = `
      <table>
        <thead>
          <tr>
            <th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Disc%</th><th>Disc₹</th><th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    const summary = `
      <div style="margin-top:12px; width:100%">
        <table class="no-border">
          <tr><td class="no-border"></td><td class="no-border right">Subtotal: ₹${subtotal.toFixed(2)}</td></tr>
          <tr><td class="no-border"></td><td class="no-border right">Total Discount: - ₹${totalDiscount.toFixed(2)}</td></tr>
          <tr><td class="no-border"></td><td class="no-border right">Taxable: ₹${taxableAmount.toFixed(2)}</td></tr>
          ${form.taxType === "CGST_SGST" ? `<tr><td class="no-border"></td><td class="no-border right">CGST: ₹${cgst.toFixed(2)}</td></tr><tr><td class="no-border"></td><td class="no-border right">SGST: ₹${sgst.toFixed(2)}</td></tr>` : ""}
          ${form.taxType === "IGST" ? `<tr><td class="no-border"></td><td class="no-border right">IGST: ₹${igst.toFixed(2)}</td></tr>` : ""}
          <tr><td class="no-border"></td><td class="no-border right"><strong>Grand Total: ₹${grandTotal.toFixed(2)}</strong></td></tr>
        </table>
      </div>
    `;
    const amountWords = `<div style="margin-top:8px" class="small"><strong>Amount in words:</strong> ${numberToWords(grandTotal)}</div>`;
    win.document.write(`<html><head><title>Invoice</title>${style}</head><body>${header}${customerHtml}${table}${summary}${amountWords}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-semibold">Create Invoice</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">Session: {invoiceSessionId}</div>
          <Button variant="outline" onClick={handlePrint}>Print / PDF</Button>
        </div>
      </div>

      {/* Customer & Reference */}
      <Card className="shadow-sm border">
        <CardHeader><CardTitle className="text-base md:text-lg">Customer & Reference</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                className="border p-2 rounded w-full text-sm"
                placeholder="Search customer by name or phone..."
                value={customerQuery}
                onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerList(true); }}
                onFocus={() => setShowCustomerList(true)}
                onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
              />
              {showCustomerList && customerResults.length > 0 && (
                <div className="absolute z-50 bg-white border rounded mt-1 w-full max-h-48 overflow-auto shadow">
                  {customerResults.map(c => (
                    <div key={c.id} className="px-2 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectCustomer(c)}>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button variant="outline" onClick={() => setShowCustomerModal(true)}>+ Add Customer</Button>
          </div>

          <input className="border p-2 rounded w-full text-sm" placeholder="Customer Name" value={form.customer_name} onChange={(e) => { const name = e.target.value; setForm(prev => ({ ...prev, customer_name: name })); try { onCustomerNameChange(name); } catch (_) {} }} />
          <div className="flex gap-2">
            <input className="border p-2 rounded w-full text-sm" placeholder="Customer Phone" value={form.customer_phone} onChange={(e) => setForm(prev => ({ ...prev, customer_phone: e.target.value }))} />
            <input className="border p-2 rounded w-64 text-sm" placeholder="Customer State (for GST)" value={form.customer_state} onChange={(e) => setForm(prev => ({ ...prev, customer_state: e.target.value }))} />
          </div>
          <input className="border p-2 rounded w-full text-sm" placeholder="Reference By (salesperson / referred by)" value={form.reference_by} onChange={(e) => setForm(prev => ({ ...prev, reference_by: e.target.value }))} />
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="shadow-sm border">
        <CardHeader><CardTitle className="text-base md:text-lg">Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end gap-2 mb-2">
            <Button size="sm" onClick={addProductLine}>+ Add Product Line</Button>
            <Button size="sm" variant="outline" onClick={addManualLine}>+ Add Manual Item</Button>
          </div>

          <div className="border rounded overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-2">Type</th>
                  <th className="p-2">Product / Description</th>
                  <th className="p-2">Variant</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Unit (₹)</th>
                  <th className="p-2 text-right">HSN</th>
                  <th className="p-2 text-right">Disc %</th>
                  <th className="p-2 text-right">Disc ₹</th>
                  <th className="p-2 text-right">Total (₹)</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const product = it.product_id ? products.find(p => p.id === it.product_id) : undefined;
                  const productVariants = variants.filter(v => v.product_id === it.product_id);
                  const productStock = getTotalProductStock(it.product_id);
                  const variantStock = getVariantStock(it.variant_id);

                  return (
                    <tr key={idx} className="border-b align-top">
                      <td className="p-2">{it.type === "product" ? "Product" : "Manual"}</td>

                      <td className="p-2">
                        {it.type === "product" ? (
                          <>
                            <select className="border rounded p-1 w-full mb-1" value={it.product_id ?? ""} onChange={(e) => handleProductSelect(idx, e.target.value)}>
                              <option value="">Select product</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} — Stock: {getTotalProductStock(p.id)}</option>)}
                            </select>

                            <input className="border rounded p-1 w-full" placeholder="Item description" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                          </>
                        ) : (
                          <input className="border rounded p-1 w-full" placeholder="Manual item description" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                        )}
                        {it.product_id && (
                          <div className="mt-1 text-[10px] text-gray-500">Total product stock: <span className={productStock > 0 ? "text-green-600" : "text-red-600"}>{productStock}</span></div>
                        )}
                      </td>

                      <td className="p-2">
                        {it.type === "product" && (
                          <>
                            <select className="border rounded p-1 w-full" value={it.variant_id ?? ""} disabled={!it.product_id} onChange={(e) => handleVariantSelect(idx, e.target.value)}>
                              <option value="">Select Variant</option>
                              {productVariants.map(v => {
                                const stock = Number(v.stock_quantity ?? 0);
                                return <option key={v.id} value={v.id} disabled={stock <= 0}>{v.color ?? ""} {v.size ?? ""} — {stock > 0 ? stock : "OUT"}</option>;
                              })}
                            </select>

                            {it.variant_id && <div className="mt-1 text-[10px] text-gray-500">Selected variant stock: <span className={variantStock > 0 ? "text-green-600" : "text-red-600"}>{variantStock}</span></div>}
                          </>
                        )}
                      </td>

                      <td className="p-2"><input type="number" min={1} className="border rounded p-1 w-full text-right" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} /></td>

                      <td className="p-2"><input type="number" className="border rounded p-1 w-full text-right" value={it.unit_price} onChange={(e) => updateItem(idx, "unit_price", e.target.value)} /></td>

                      <td className="p-2"><input className="border rounded p-1 w-full text-right" placeholder="HSN" value={it.hsn_code || ""} onChange={(e) => updateItem(idx, "hsn_code", e.target.value)} /></td>

                      <td className="p-2"><input type="number" min={0} max={100} step="0.01" className="border rounded p-1 w-full text-right" value={it.discount_percent || 0} onChange={(e) => updateItem(idx, "discount_percent", e.target.value)} /></td>

                      <td className="p-2"><input type="number" min={0} step="0.01" className="border rounded p-1 w-full text-right" value={it.discount_amount || 0} onChange={(e) => updateItem(idx, "discount_amount", e.target.value)} /></td>

                      <td className="p-2 text-right font-semibold">₹{Number(it.total || 0).toFixed(2)}</td>

                      <td className="p-2 text-center"><button className="text-red-500 text-xs" onClick={() => removeItem(idx)}>✕</button></td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan={10}>No items yet. Add a product line or a manual item.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Tax */}
      <Card className="shadow-sm border">
        <CardHeader><CardTitle className="text-base md:text-lg">Payment & Tax</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <select className="border rounded p-2 w-full md:w-48" value={form.payment_status} onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial Paid</option>
              <option value="paid">Paid</option>
            </select>

            {form.payment_status === "partial" && (<input type="number" className="border rounded p-2 w-full md:w-48" placeholder="Paid amount" value={form.paid_amount} onChange={(e) => handlePaidAmountChange(e.target.value)} />)}
          </div>

          {/* Payment method */}
          <div className="flex gap-3 items-center">
            <label className="text-sm">Payment Method:</label>
            <select className="border rounded p-2" value={form.payment_method} onChange={(e) => setForm(prev => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
            <div className="text-sm text-gray-600 ml-auto">
              Subtotal: ₹{subtotal.toFixed(2)}
            </div>
          </div>

          {/* Tax selection */}
          <div className="flex gap-4 items-center">
            <label className="text-sm">Tax Type:</label>
            <select className="border rounded p-2" value={form.taxType} onChange={(e) => setForm(prev => ({ ...prev, taxType: e.target.value }))}>
              <option value="CGST_SGST">CGST + SGST</option>
              <option value="IGST">IGST</option>
              <option value="NONE">No Tax</option>
            </select>

            <label className="text-sm">Tax %</label>
            <input type="number" className="border rounded p-2 w-20" value={form.taxPercent} onChange={(e) => setForm(prev => ({ ...prev, taxPercent: Number(e.target.value || 0) }))} />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-2 border rounded">
              <div className="text-xs text-gray-500">Subtotal</div>
              <div className="font-semibold">₹{subtotal.toFixed(2)}</div>
            </div>

            <div className="p-2 border rounded">
              <div className="text-xs text-gray-500">Total Discount</div>
              <div className="font-semibold">- ₹{totalDiscount.toFixed(2)}</div>
            </div>

            <div className="p-2 border rounded">
              <div className="text-xs text-gray-500">Taxable Amount</div>
              <div className="font-semibold">₹{taxableAmount.toFixed(2)}</div>
            </div>

            <div className="p-2 border rounded">
              <div className="text-xs text-gray-500">Taxes</div>
              <div className="font-semibold">
                {form.taxType === "CGST_SGST" && (<>
                  CGST: ₹{cgst.toFixed(2)} <br /> SGST: ₹{sgst.toFixed(2)}
                </>)}
                {form.taxType === "IGST" && <>IGST: ₹{igst.toFixed(2)}</>}
                {form.taxType === "NONE" && <>₹0.00</>}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500">Amount in words</div>
              <div className="font-medium">{numberToWords(grandTotal)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Grand Total</div>
              <div className="text-2xl font-bold">₹{grandTotal.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2 gap-2">
        <Button onClick={() => { setItems([]); setForm(prev => ({ ...prev, customer_id: "", customer_name: "", customer_phone: "", reference_by: "", total_amount: 0, payment_status: "unpaid", paid_amount: 0, payment_method: "cash" })); }} variant="outline">Clear</Button>
        <Button onClick={handleSaveInvoice} disabled={saving}>{saving ? "Saving..." : "Save Invoice"}</Button>
      </div>

      {/* New customer modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg border bg-white">
            <CardHeader><CardTitle>Add New Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input className="border rounded p-2 w-full text-sm" placeholder="Customer Name" value={newCustomer.name} onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))} />
              <input className="border rounded p-2 w-full text-sm" placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} />
              <input className="border rounded p-2 w-full text-sm" placeholder="State" value={newCustomer.state} onChange={(e) => setNewCustomer(prev => ({ ...prev, state: e.target.value }))} />
              <input className="border rounded p-2 w-full text-sm" placeholder="Address" value={newCustomer.address} onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(false)}>Cancel</Button>
                <Button size="sm" onClick={saveNewCustomer}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* success popup */}
      {successMessage && (
        <div style={{ position: "fixed", right: 20, top: 20, zIndex: 9999 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#0f172a", color: "white", padding: "12px 16px", borderRadius: 10, boxShadow: "0 10px 30px rgba(2,6,23,0.4)" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div>{successMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- utility outside component (keeps bundle small) ---------- */
function getTotalProductStock(productId?: string | null, variantsList?: Variant[]) {
  if (!productId || !variantsList) return 0;
  return variantsList.filter(v => v.product_id === productId).reduce((s, v) => s + Number(v.stock_quantity ?? 0), 0);
}

export default Invoicing;
