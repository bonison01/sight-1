// src/components/admin/invoicing/InvoicingParent.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import InvoicingCustomerPanel from "./invoicing/InvoicingCustomerPanel";
import InvoicingItems from "./invoicing/InvoicingItems";
import InvoicingPaymentPanel from "./invoicing/InvoicingPaymentPanel";

/* ---------- Types ---------- */
type PaymentStatus = "unpaid" | "partial" | "paid";

/* ---------- Number to Words (your version simplified) ---------- */
const numberToWords = (num: number) => {
  if (isNaN(num)) return "";
  return `${num} Rupees`;
};

/* ============================================================
   MAIN PARENT COMPONENT
============================================================ */
const InvoicingParent = ({ invoiceSessionId, onCustomerNameChange }) => {
  /* ---------- DATA ---------- */
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  /* ---------- FORM STATE ---------- */
  const [form, setForm] = useState({
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

  /* ---------- ITEMS ---------- */
  const [items, setItems] = useState([]);

  /* ---------- UI STATES ---------- */
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerList, setShowCustomerList] = useState(false);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    state: ""
  });

  const [productSearch, setProductSearch] = useState({});
  const [filteredProducts, setFilteredProducts] = useState({});
  const [openProductDropdown, setOpenProductDropdown] = useState(null);

  /* ---------- Load Data ---------- */
  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    const { data: cs } = await supabase.from("customers").select("*");
    const { data: pr } = await supabase.from("products").select("*");
    const { data: pv } = await supabase.from("product_variants").select("*");

    setCustomers(cs ?? []);
    setProducts(pr ?? []);
    setVariants(pv ?? []);
  };

  /* ---------- Stock Helpers ---------- */
  const getTotalProductStock = (productId: string) => {
    if (!productId) return 0;
    return variants
      .filter(v => v.product_id === productId)
      .reduce((sum, v) => sum + Number(v.stock_quantity ?? 0), 0);
  };

  const getVariantStock = (variantId: string) => {
    if (!variantId) return 0;
    const v = variants.find(x => x.id === variantId);
    return Number(v?.stock_quantity ?? 0);
  };

  /* ---------- ITEMS LOGIC ---------- */
  const recalcTotals = (list) => {
    const total = list.reduce((s, it) => s + Number(it.total || 0), 0);
    setForm(prev => ({ ...prev, total_amount: total }));
  };

  const addProductLine = () => {
    const line = {
      type: "product",
      product_id: null,
      variant_id: null,
      description: "",
      hsn_code: "",
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      total: 0
    };
    const list = [...items, line];
    setItems(list);
    recalcTotals(list);
  };

  const addManualLine = () => {
    const line = {
      type: "manual",
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_amount: 0,
      total: 0
    };
    const list = [...items, line];
    setItems(list);
    recalcTotals(list);
  };

  const removeItem = (index: number) => {
    const list = items.filter((_, i) => i !== index);
    setItems(list);
    recalcTotals(list);
  };

  const updateItem = (index, field, value) => {
    const list = [...items];
    const cur = { ...list[index] };

    const toNum = (v) => isNaN(Number(v)) ? 0 : Number(v);

    if (field === "quantity") cur.quantity = toNum(value);
    else if (field === "unit_price") cur.unit_price = toNum(value);
    else if (field === "discount_amount") cur.discount_amount = toNum(value);
    else cur[field] = value;

    cur.total = Math.max(0, (cur.unit_price - (cur.discount_amount ?? 0)) * cur.quantity);

    list[index] = cur;
    setItems(list);
    recalcTotals(list);
  };

  /* ---------- PRODUCT SEARCH ---------- */
  const handleProductSearch = (index, query) => {
    setProductSearch(prev => ({ ...prev, [index]: query }));
    const q = query.toLowerCase();

    const filtered = products.filter(p => p.name.toLowerCase().includes(q));
    setFilteredProducts(prev => ({
      ...prev,
      [index]: filtered
    }));
  };

  const handleProductSelect = (index, productId) => {
    const product = products.find(p => p.id === productId);
    const list = [...items];
    const cur = { ...list[index] };

    cur.product_id = productId;
    cur.description = product.name;
    cur.unit_price = Number(product.price ?? 0);
    cur.total = cur.unit_price * cur.quantity;
    cur.variant_id = null;

    list[index] = cur;
    setItems(list);
    recalcTotals(list);

    setProductSearch(prev => ({ ...prev, [index]: "" }));
    setFilteredProducts(prev => ({ ...prev, [index]: products }));
    setOpenProductDropdown(null);
  };

  const handleVariantSelect = (index, variantId) => {
    const variant = variants.find(v => v.id === variantId);
    const list = [...items];
    const cur = { ...list[index] };

    cur.variant_id = variantId;

    if (variant) {
      cur.description = `${cur.description.split(" (")[0]} (${variant.color} ${variant.size})`;
    }

    cur.total = cur.unit_price * cur.quantity;
    list[index] = cur;
    setItems(list);
    recalcTotals(list);
  };

  /* ---------- Subtotal ---------- */
  const subtotal = useMemo(() =>
    items.reduce((s, it) => s + it.unit_price * it.quantity, 0),
    [items]
  );

  /* ---------- SAVE NEW CUSTOMER ---------- */
  const saveNewCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Customer name required");

    const { data, error } = await supabase
      .from("customers")
      .insert([{
        name: newCustomer.name,
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        state: newCustomer.state || null
      }])
      .select();

    if (error) {
      alert("Failed to save customer");
      return;
    }

    const created = data[0];

    setCustomers(prev => [...prev, created]);

    // Auto-fill form
    setForm(prev => ({
      ...prev,
      customer_id: created.id,
      customer_name: created.name,
      customer_phone: created.phone,
      customer_state: created.state
    }));

    setShowCustomerModal(false);
    setNewCustomer({ name: "", phone: "", address: "", state: "" });

    try { onCustomerNameChange(created.name); } catch (_) {}
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-semibold">Create Invoice</h2>
        <div className="text-gray-500 text-sm">Session: {invoiceSessionId}</div>
      </div>

      {/* CUSTOMER PANEL */}
      <InvoicingCustomerPanel
        form={form}
        setForm={setForm}

        customers={customers}
        customerQuery={customerQuery}
        setCustomerQuery={setCustomerQuery}
        customerResults={customerResults}
        setCustomerResults={setCustomerResults}

        showCustomerList={showCustomerList}
        setShowCustomerList={setShowCustomerList}

        showCustomerModal={showCustomerModal}
        setShowCustomerModal={setShowCustomerModal}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        saveNewCustomer={saveNewCustomer}

        onCustomerNameChange={onCustomerNameChange}
      />

      {/* ITEMS PANEL */}
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

        handleProductSearch={handleProductSearch}
        handleProductSelect={handleProductSelect}
        handleVariantSelect={handleVariantSelect}

        getTotalProductStock={getTotalProductStock}
        getVariantStock={getVariantStock}
      />

      {/* PAYMENT PANEL */}
      <InvoicingPaymentPanel
        form={form}
        setForm={setForm}
        subtotal={subtotal}
        totalDiscount={0}
        taxableAmount={subtotal}

        cgst={0}
        sgst={0}
        igst={0}
        grandTotal={subtotal}
        remainingAmount={subtotal - form.paid_amount}
        numberToWords={numberToWords}
      />
    </div>
  );
};

export default InvoicingParent;
