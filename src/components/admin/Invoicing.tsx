// src/components/admin/invoicing/InvoicingParent.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import InvoicingCustomerPanel from "./invoicing/InvoicingCustomerPanel";
import InvoicingItems from "./invoicing/InvoicingItems";
import InvoicingPaymentPanel from "./invoicing/InvoicingPaymentPanel";

/* -------------------------------------------------------
   Utility
------------------------------------------------------- */
const numberToWords = (num) => {
  if (isNaN(num)) return "";
  return `${Math.round(num)} Rupees`;
};

const getDraftKey = (sessionId) =>
  `invoice_draft_${sessionId ?? "default"}`;

/* =======================================================
   MAIN COMPONENT
========================================================= */
const InvoicingParent = ({ invoiceSessionId, onCustomerNameChange }) => {
  /* ---------- Toast + Overlay ---------- */
  const [toast, setToast] = useState(null);
  const [savingOverlay, setSavingOverlay] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2600);
  };

  /* ---------- Base Data ---------- */
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  /* ---------- Form ---------- */
  const initialFormState = {
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_state: "",
    customer_address: "",
    reference_by: "",
    reference_name: "",
    total_amount: 0,
    payment_status: "unpaid",
    paid_amount: 0,
    taxType: "CGST_SGST",
    taxPercent: 0,
    payment_method: "cash",
  };

  const [form, setForm] = useState(initialFormState);

  /* ---------- Items ---------- */
  const [items, setItems] = useState([]);

  /* ---------- UI states ---------- */
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    state: "",
  });

  const [productSearch, setProductSearch] = useState({});
  const [filteredProducts, setFilteredProducts] = useState({});
  const [openProductDropdown, setOpenProductDropdown] = useState(null);

  const [saving, setSaving] = useState(false);

  /* ---------- Section Toggles (new) ---------- */
  const [showCustomerSection, setShowCustomerSection] = useState(true);
  const [showItemsSection, setShowItemsSection] = useState(true);
  const [showBillingSection, setShowBillingSection] = useState(true);

  /* ============================================================
     LOAD INITIAL DB DATA
  ============================================================ */
  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    try {
      const { data: cs } = await supabase.from("customers").select("*");
      const { data: pr } = await supabase.from("products").select("*");
      const { data: pv } = await supabase.from("product_variants").select("*");

      setCustomers(cs ?? []);
      setProducts(pr ?? []);
      setVariants(pv ?? []);
    } catch {
      showToast("error", "Failed to load data");
    }
  };

  /* ============================================================
     LOAD SAVED DRAFT
  ============================================================ */
  useEffect(() => {
    try {
      const key = getDraftKey(invoiceSessionId);
      const saved = localStorage.getItem(key);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed.form) setForm((p) => ({ ...p, ...parsed.form }));
        if (parsed.items) setItems(parsed.items);
      }
    } catch {}
  }, [invoiceSessionId]);

  /* AUTO-SAVE DRAFT */
  useEffect(() => {
    try {
      localStorage.setItem(
        getDraftKey(invoiceSessionId),
        JSON.stringify({ form, items })
      );
    } catch {}
  }, [form, items]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(getDraftKey(invoiceSessionId));
    } catch {}
  };

  /* -----------------------------------------------------------
     STOCK HELPERS
  ----------------------------------------------------------- */
  const getTotalProductStock = (productId) => {
    return variants
      .filter((v) => v.product_id === productId)
      .reduce((s, v) => s + Number(v.stock_quantity ?? 0), 0);
  };

  const getVariantStock = (variantId) => {
    const v = variants.find((x) => x.id === variantId);
    return Number(v?.stock_quantity ?? 0);
  };

  /* -----------------------------------------------------------
     RECALCULATE TOTAL
  ----------------------------------------------------------- */
  const recalcTotals = (list) => {
    const total = list.reduce((s, it) => s + Number(it.total || 0), 0);
    setForm((p) => ({ ...p, total_amount: total }));
  };

  /* -----------------------------------------------------------
     ADD PRODUCT / MANUAL LINE
  ----------------------------------------------------------- */
  const addProductLine = () => {
    const line = {
      type: "product",
      product_id: null,
      variant_id: null,
      item_code: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      discount_percent: 0,
      total: 0,
    };

    const list = [...items, line];
    setItems(list);
    recalcTotals(list);
  };

  const addManualLine = () => {
    const line = {
      type: "manual",
      product_id: null,
      variant_id: null,
      item_code: "",
      description: "",
      hsn_code: "",
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      discount_percent: 0,
      total: 0,
    };

    const list = [...items, line];
    setItems(list);
    recalcTotals(list);
  };

  const removeItem = (index) => {
    const list = items.filter((_, i) => i !== index);
    setItems(list);
    recalcTotals(list);
  };

  /* -----------------------------------------------------------
     ITEM FIELD UPDATE
  ----------------------------------------------------------- */
  const updateItem = (index, field, value) => {
    const list = [...items];
    const cur = { ...list[index] };

    const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

    if (field === "quantity") {
      cur.quantity = Math.max(0, Math.floor(toNum(value)));
    } else if (field === "unit_price") {
      cur.unit_price = toNum(value);
    } else if (field === "discount_percent") {
      cur.discount_percent = toNum(value);
      cur.discount_amount = Number(
        ((cur.unit_price || 0) * (cur.discount_percent / 100)).toFixed(2)
      );
    } else if (field === "discount_amount") {
      cur.discount_amount = toNum(value);
      cur.discount_percent =
        cur.unit_price > 0
          ? Number(
              ((cur.discount_amount / cur.unit_price) * 100).toFixed(2)
            )
          : 0;
    } else {
      cur[field] = value;
    }

    const unit = cur.unit_price || 0;
    const qty = cur.quantity || 0;
    const disc = cur.discount_amount || 0;

    cur.total = Number(((unit - disc) * qty).toFixed(2));

    list[index] = cur;
    setItems(list);
    recalcTotals(list);
  };

  /* -----------------------------------------------------------
     PRODUCT SEARCH
  ----------------------------------------------------------- */
  const handleProductSearch = (index, query) => {
    setProductSearch((p) => ({ ...p, [index]: query }));
    const q = (query || "").toLowerCase().trim();

    if (!q) {
      setFilteredProducts((p) => ({ ...p, [index]: products }));
      return;
    }

    setFilteredProducts((p) => ({
      ...p,
      [index]: products.filter((pr) =>
        pr.name.toLowerCase().includes(q)
      ),
    }));
  };

  /* -----------------------------------------------------------
     OLD WORKING PRODUCT SELECT (RESTORED)
  ----------------------------------------------------------- */
  const handleProductSelect = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const list = [...items];
    const cur = { ...list[index] };

    cur.type = "product";
    cur.product_id = productId;
    cur.item_code = product.item_code ?? null;
    cur.description = product.name ?? "";
    cur.unit_price = Number(product.price ?? 0);
    cur.hsn_code = product.hsn_code ?? "";
    cur.variant_id = null;

    if (cur.discount_percent > 0) {
      cur.discount_amount = Number(
        (cur.unit_price * (cur.discount_percent / 100)).toFixed(2)
      );
    }

    cur.total = Number(
      ((cur.unit_price - (cur.discount_amount || 0)) * (cur.quantity || 1)).toFixed(2)
    );

    list[index] = cur;
    setItems(list);
    recalcTotals(list);

    setFilteredProducts((p) => ({ ...p, [index]: products }));
    setProductSearch((p) => ({ ...p, [index]: "" }));
    setOpenProductDropdown(null);
  };

  /* -----------------------------------------------------------
     OLD WORKING VARIANT SELECT (RESTORED)
  ----------------------------------------------------------- */
  const handleVariantSelect = (index, variantId) => {
    const variant = variants.find((v) => v.id === variantId);
    const list = [...items];
    const cur = { ...list[index] };

    cur.variant_id = variantId;

    if (variant) {
      const base = (cur.description || "").split("(")[0];
      cur.description = `${base} (${variant.color ?? ""} ${variant.size ?? ""})`;
    }

    const unit = cur.unit_price || 0;
    const qty = cur.quantity || 0;
    const disc = cur.discount_amount || 0;

    cur.total = Number(((unit - disc) * qty).toFixed(2));

    list[index] = cur;
    setItems(list);
    recalcTotals(list);
  };

  /* -----------------------------------------------------------
     SUBTOTAL
  ----------------------------------------------------------- */
  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, it) =>
          s + Number(it.unit_price || 0) * Number(it.quantity || 0),
        0
      ),
    [items]
  );

  /* -----------------------------------------------------------
     SAVE NEW CUSTOMER
  ----------------------------------------------------------- */
  const saveNewCustomerModal = async () => {
    if (!newCustomer.name.trim())
      return showToast("error", "Customer name required");

    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select();

    if (error) return showToast("error", "Failed to save customer");

    const created = data[0];

    setCustomers((p) => [...p, created]);

    setForm((p) => ({
      ...p,
      customer_id: created.id,
      customer_name: created.name,
      customer_phone: created.phone,
      customer_state: created.state,
      customer_address: created.address,
    }));

    try {
      onCustomerNameChange(created.name);
    } catch {}

    setShowCustomerModal(false);
    setNewCustomer({ name: "", phone: "", address: "", state: "" });
  };

  /* -----------------------------------------------------------
     RESET FORM COMPLETELY
  ----------------------------------------------------------- */
  const resetFormCompletely = () => {
    setItems([]);
    setForm(initialFormState);
    clearDraft();

    try {
      onCustomerNameChange("New Invoice");
    } catch {}

    showToast("success", "Invoice reset");
  };

  /* -----------------------------------------------------------
     STOCK VALIDATION
  ----------------------------------------------------------- */
  const checkStockBeforeSave = () => {
    for (const it of items) {
      if (it.type !== "product" || !it.product_id) continue;

      if (it.variant_id) {
        const avail = getVariantStock(it.variant_id);
        if (avail < it.quantity) {
          showToast(
            "error",
            `Not enough stock for ${it.description}. Available: ${avail}, requested: ${it.quantity}`
          );
          return false;
        }
      } else {
        const avail = getTotalProductStock(it.product_id);
        if (avail < it.quantity) {
          const p = products.find((x) => x.id === it.product_id);
          showToast(
            "error",
            `Not enough stock for ${p?.name}. Available: ${avail}, requested: ${it.quantity}`
          );
          return false;
        }
      }
    }
    return true;
  };

  /* -----------------------------------------------------------
     SAVE INVOICE + INVENTORY DEDUCTION (OLD PERFECT LOGIC)
  ----------------------------------------------------------- */
  const saveInvoice = async () => {
    if (!form.customer_name.trim())
      return showToast("error", "Please select a customer");

    if (!items.length)
      return showToast("error", "Add at least one item");

    if (!checkStockBeforeSave()) return;

    setSaving(true);
    setSavingOverlay(true);

    try {
      // compute summary
      const subtotalLocal = items.reduce(
        (s, it) => s + it.unit_price * it.quantity,
        0
      );

      const totalDiscountLocal = items.reduce((s, it) => {
        const unit = it.unit_price;
        const disc =
          it.discount_amount > 0
            ? it.discount_amount
            : it.discount_percent > 0
            ? unit * (it.discount_percent / 100)
            : 0;
        return s + disc * it.quantity;
      }, 0);

      const taxable = subtotalLocal - totalDiscountLocal;

      let cgst = 0,
        sgst = 0,
        igst = 0;

      if (form.taxType === "CGST_SGST") {
        cgst = taxable * (form.taxPercent / 200);
        sgst = taxable * (form.taxPercent / 200);
      } else if (form.taxType === "IGST") {
        igst = taxable * (form.taxPercent / 100);
      }

      const grandTotal = taxable + cgst + sgst + igst;

      const invoiceNumber = "INV-" + Date.now();

      const invoiceRow = {
        invoice_number: invoiceNumber,
        customer_id: form.customer_id,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_state: form.customer_state,
        customer_address: form.customer_address,
        reference_by: form.reference_by,
        reference_name: form.reference_name,

        subtotal: subtotalLocal,
        total_discount: totalDiscountLocal,
        taxable_amount: taxable,
        cgst,
        sgst,
        igst,
        tax_percent: form.taxPercent,
        tax_type: form.taxType,
        grand_total: grandTotal,
        total_amount: grandTotal,

        status: form.payment_status,
        paid_amount:
          form.payment_status === "paid"
            ? grandTotal
            : form.payment_status === "partial"
            ? form.paid_amount
            : 0,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      /* INSERT INVOICE */
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert([invoiceRow])
        .select()
        .single();

      if (invErr) throw invErr;

      const invoiceId = inv.id;

      /* INSERT ITEMS */
      const itemRows = items.map((it) => ({
        invoice_id: invoiceId,
        item_code: it.item_code,
        product_id: it.product_id,
        variant_id: it.variant_id,
        description: it.description,
        hsn_code: it.hsn_code,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount_percent: it.discount_percent,
        discount_amount: it.discount_amount,
        total: it.total,
      }));

      await supabase.from("invoice_items").insert(itemRows);

      /* -----------------------------------------------------------
         INVENTORY DEDUCTION (OLD WORKING LOGIC — RESTORED)
      ----------------------------------------------------------- */
      for (const it of items) {
        if (it.type !== "product" || !it.product_id) continue;

        const qty = Math.floor(it.quantity);

        if (it.variant_id) {
          const { error: err } = await supabase.rpc(
            "deduct_variant_stock",
            {
              p_variant_id: it.variant_id,
              p_quantity: qty,
            }
          );
          if (err) throw err;
        } else {
          const { error: err } = await supabase.rpc(
            "deduct_product_stock",
            {
              p_product_id: it.product_id,
              p_quantity: qty,
            }
          );
          if (err) throw err;
        }
      }

      /* AFTER SAVE: update tab label */
      try {
        onCustomerNameChange(form.customer_name);
      } catch {}

      showToast("success", "Invoice saved");
      resetFormCompletely();
      loadBaseData();
    } catch (e) {
      showToast("error", e?.message || "Failed");
    }

    setSaving(false);
    setSavingOverlay(false);
  };

  /* -----------------------------------------------------------
     RENDER UI
  ----------------------------------------------------------- */
  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-semibold">Create Invoice</h2>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              try {
                localStorage.setItem(
                  getDraftKey(invoiceSessionId),
                  JSON.stringify({ form, items })
                );
                showToast("success", "Draft saved");
              } catch {
                showToast("error", "Failed to save draft");
              }
            }}
          >
            Save Draft
          </Button>

          <Button onClick={saveInvoice} disabled={saving}>
            {saving ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </div>

      {/* CUSTOMER PANEL (collapsible) */}
      <div className="border rounded-lg">
        <div
          className="flex justify-between items-center bg-gray-100 px-4 py-2 cursor-pointer"
          onClick={() => setShowCustomerSection(!showCustomerSection)}
        >
          <h3 className="font-semibold text-lg">Customer Details</h3>
          <span className="text-sm select-none">{showCustomerSection ? "▲" : "▼"}</span>
        </div>

        {showCustomerSection && (
          <div className="p-4">
            <InvoicingCustomerPanel
              form={form}
              setForm={setForm}
              customers={customers}
              onSelectCustomer={(c) => {
                setForm((prev) => ({
                  ...prev,
                  customer_id: c.id,
                  customer_name: c.name,
                  customer_phone: c.phone,
                  customer_state: c.state,
                  customer_address: c.address,
                }));
                try {
                  onCustomerNameChange(c.name);
                } catch {}
              }}
            />
          </div>
        )}
      </div>

      {/* ITEMS PANEL (collapsible) */}
      <div className="border rounded-lg">
        <div
          className="flex justify-between items-center bg-gray-100 px-4 py-2 cursor-pointer"
          onClick={() => setShowItemsSection(!showItemsSection)}
        >
          <h3 className="font-semibold text-lg">Invoice Items</h3>
          <span className="text-sm select-none">{showItemsSection ? "▲" : "▼"}</span>
        </div>

        {showItemsSection && (
          <div className="p-4">
            <InvoicingItems
              items={items}
              products={products}
              variants={variants}
              productSearch={productSearch}
              filteredProducts={filteredProducts}
              openProductDropdown={openProductDropdown}
              setProductSearch={setProductSearch}
              setFilteredProducts={setFilteredProducts}
              setOpenProductDropdown={setOpenProductDropdown}
              addProductLine={addProductLine}
              addManualLine={addManualLine}
              updateItem={updateItem}
              removeItem={removeItem}
              handleProductSelect={handleProductSelect}
              handleVariantSelect={handleVariantSelect}
              handleProductSearch={handleProductSearch}
              getTotalProductStock={getTotalProductStock}
              getVariantStock={getVariantStock}
            />
          </div>
        )}
      </div>

      {/* BILLING / PAYMENT PANEL (collapsible) */}
      <div className="border rounded-lg">
        <div
          className="flex justify-between items-center bg-gray-100 px-4 py-2 cursor-pointer"
          onClick={() => setShowBillingSection(!showBillingSection)}
        >
          <h3 className="font-semibold text-lg">Billing & Payment</h3>
          <span className="text-sm select-none">{showBillingSection ? "▲" : "▼"}</span>
        </div>

        {showBillingSection && (
          <div className="p-4">
            <InvoicingPaymentPanel
              form={form}
              setForm={setForm}
              subtotal={subtotal}
              totalDiscount={items.reduce((s, it) => {
                const unit = it.unit_price;
                const disc =
                  it.discount_amount > 0
                    ? it.discount_amount
                    : it.discount_percent > 0
                    ? unit * (it.discount_percent / 100)
                    : 0;
                return s + disc * it.quantity;
              }, 0)}
              taxableAmount={subtotal}
              cgst={0}
              sgst={0}
              igst={0}
              grandTotal={subtotal}
              remainingAmount={Math.max(
                0,
                subtotal -
                  (form.payment_status === "paid"
                    ? subtotal
                    : form.paid_amount)
              )}
              numberToWords={numberToWords}
            />
          </div>
        )}
      </div>

      {/* FOOTER BUTTONS */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={resetFormCompletely}>
          Reset
        </Button>

        <Button onClick={saveInvoice} disabled={saving}>
          {saving ? "Saving..." : "Save Invoice"}
        </Button>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-3 animate-slide-in ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          {toast.message}
        </div>
      )}

      {/* SAVING OVERLAY */}
      {savingOverlay && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-700">Saving Invoice…</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicingParent;
