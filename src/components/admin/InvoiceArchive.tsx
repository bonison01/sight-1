// src/components/admin/InvoiceArchivePage.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Components
import FilterPanel from "./invoiceview/FilterPanel";
import InvoiceTable from "./invoiceview/InvoiceTable";
import PaymentModal from "./invoiceview/PaymentModal";
import StatusReasonModal from "./invoiceview/StatusReasonModal";
import ViewInvoiceModal from "./invoiceview/ViewInvoiceModal";
import DailyIncomePanel from "./invoiceview/DailyIncomePanel";
import SuccessPopup from "./invoiceview/SuccessPopup";

// PDF generator
import { generateInvoicePdf } from "./invoiceview/pdf/InvoicePdfGenerator";

export default function InvoiceArchivePage() {
  // DATA
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [company, setCompany] = useState<any>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  // UI + FILTERS
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalRows, setTotalRows] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  // MODALS
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [useDiscount, setUseDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");

  // Status change modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [statusChangeTarget, setStatusChangeTarget] =
    useState<"paid" | "partial" | "unpaid" | null>(null);

  // Invoice view modal
  const [viewItems, setViewItems] = useState([]);
  const [viewBranding, setViewBranding] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Daily Income Panel
  const [dailyIncomeRows, setDailyIncomeRows] = useState([]);
  const [incomeStart, setIncomeStart] = useState("");
  const [incomeEnd, setIncomeEnd] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 2000);
  };

  const roundRupees = (x: number) => Math.floor(Number(x) || 0);

  // RESET PAGE when filters change (important for search)
  useEffect(() => {
    setPage(1);
  }, [
    searchText,
    statusFilter,
    customerFilter,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    rowsPerPage,
  ]);

  // LOAD CUSTOMERS
  const loadCustomers = useCallback(async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("cust_id, name, phone, address");

    if (!error) setCustomers(data || []);
  }, []);

  // LOAD COMPANY
  const loadCompany = useCallback(async () => {
    const { data } = await supabase.from("company_profile").select("*").limit(1);
    setCompany(data?.[0] || {});
  }, []);

  // LOAD DAILY INCOME
  const loadDailyIncome = useCallback(async () => {
    let q = supabase
      .from("invoice_daily_income")
      .select("*")
      .order("payment_date", { ascending: false });

    if (incomeStart) q = q.gte("payment_date", incomeStart);
    if (incomeEnd) q = q.lte("payment_date", incomeEnd);

    const { data } = await q;
    setDailyIncomeRows(data || []);
  }, [incomeStart, incomeEnd]);

  // ⭐⭐⭐ LOAD INVOICES (MAIN QUERY) ⭐⭐⭐
  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage - 1;

      const qText = (searchText || "").trim();

      // MATCH CUSTOMERS (for searching by name/phone)
      let matchingCustIds: string[] = [];
      if (qText) {
        const { data } = await supabase
          .from("customers")
          .select("cust_id")
          .or(
            `cust_id.ilike.%${qText}%,name.ilike.%${qText}%,phone.ilike.%${qText}%,address.ilike.%${qText}%`
          );

        matchingCustIds = (data || []).map((x) => x.cust_id);
      }

      // BUILD OR conditions — SAFE VERSION
      const orConditions: string[] = [];

      if (qText) {
        orConditions.push(`invoice_number.ilike.%${qText}%`);
        orConditions.push(`customer_name.ilike.%${qText}%`);
        orConditions.push(`reference_by.ilike.%${qText}%`);
        // DO NOT search customer_id with ILIKE (UUID!)
      }

      if (matchingCustIds.length > 0) {
        const cleanIds = matchingCustIds
          .filter(Boolean)
          .map((id) => id.replace(/[^a-zA-Z0-9_-]/g, ""));
        if (cleanIds.length > 0)
          orConditions.push(`customer_id.in.(${cleanIds.join(",")})`);
      }

      // BASE
      let q = supabase
        .from("invoices")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Filters
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (customerFilter !== "all") q = q.eq("customer_id", customerFilter);
      if (minAmount !== "") q = q.gte("grand_total", Number(minAmount));
      if (maxAmount !== "") q = q.lte("grand_total", Number(maxAmount));
      if (startDate) q = q.gte("created_at", startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        q = q.lte("created_at", d.toISOString());
      }

      // APPLY OR conditions
      if (orConditions.length > 0) {
        q = q.or(orConditions.join(","));
      }

      // Range
      q = q.range(start, end);

      const { data, count, error } = await q;
      if (error) throw error;

      setInvoices(data || []);
      setTotalRows(count || 0);
    } catch (error) {
      console.error("loadData error", error);
      setInvoices([]);
      setTotalRows(0);
    }

    setLoading(false);
  }, [
    page,
    rowsPerPage,
    searchText,
    statusFilter,
    customerFilter,
    minAmount,
    maxAmount,
    startDate,
    endDate,
  ]);

  // INITIAL LOAD
  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setCurrentUser(u.data?.user || null);

      await loadCustomers();
      await loadCompany();
      await loadData();
      await loadDailyIncome();
    })();
  }, []);

  // RELOAD WHEN FILTERS CHANGE
  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------
  //      STATUS CHANGE LOGIC
  // -----------------------------
  const handleStatusChange = async (inv, newStatus) => {
    const total = Number(inv.grand_total || 0);
    const paid = Number(inv.paid_amount || 0);
    const remaining = total - paid;

    // DOWNGRADE = require reason
    if (
      (inv.status === "paid" && newStatus !== "paid") ||
      (inv.status === "partial" && newStatus === "unpaid")
    ) {
      setSelectedInvoice(inv);
      setStatusChangeTarget(newStatus);
      setReasonText("");
      setShowReasonModal(true);
      return;
    }

    // Full paid auto
    if ((newStatus === "paid" || newStatus === "partial") && remaining <= 0) {
      await supabase
        .from("invoices")
        .update({ status: "paid", paid_amount: total })
        .eq("id", inv.id);

      showSuccess("Status updated");
      loadData();
      return;
    }

    // Otherwise open payment modal
    setSelectedInvoice(inv);
    setNewPaymentAmount(newStatus === "paid" ? remaining : 0);
    setPaymentMethod("cash");
    setUseDiscount(false);
    setDiscountAmount(0);
    setDiscountReason("");
    setStatusChangeTarget(newStatus);
    setShowPaymentModal(true);
  };

  const confirmReasonForStatusChange = async () => {
    if (!selectedInvoice || !statusChangeTarget) return;
    if (!reasonText.trim()) return alert("Reason required");

    await supabase
      .from("invoices")
      .update({ status: statusChangeTarget })
      .eq("id", selectedInvoice.id);

    setShowReasonModal(false);
    setSelectedInvoice(null);
    setStatusChangeTarget(null);
    setReasonText("");
    showSuccess("Status updated");
    loadData();
  };

  // -----------------------------
  //         PAYMENT LOGIC
  // -----------------------------
  const confirmPayment = async () => {
    if (!selectedInvoice) return;

    const pay = roundRupees(newPaymentAmount);
    const disc = roundRupees(discountAmount);

    if (pay <= 0 && disc <= 0) return alert("Enter payment or discount");
    if (disc > 0 && !discountReason.trim())
      return alert("Discount reason required");

    // Record payment
    if (pay > 0) {
      await supabase.from("invoice_payments").insert([
        {
          invoice_id: selectedInvoice.id,
          amount: pay,
          payment_method: paymentMethod,
          recorded_by: currentUser?.id || "system",
        },
      ]);

      // Daily income
      await supabase.from("invoice_daily_income").insert([
        {
          invoice_id: selectedInvoice.id,
          amount: pay,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString().slice(0, 10),
        },
      ]);
    }

    // Discount
    if (disc > 0) {
      const { data: invRow } = await supabase
        .from("invoices")
        .select("grand_total, total_discount")
        .eq("id", selectedInvoice.id)
        .single();

      const newTotalDiscount =
        Number(invRow?.total_discount || 0) + Number(disc);
      const newGrand = Number(invRow?.grand_total || 0) - Number(disc);

      await supabase
        .from("invoices")
        .update({ total_discount: newTotalDiscount, grand_total: newGrand })
        .eq("id", selectedInvoice.id);
    }

    // Recompute payment totals
    const { data: payments } = await supabase
      .from("invoice_payments")
      .select("amount")
      .eq("invoice_id", selectedInvoice.id);

    const totalPaid =
      payments?.reduce((s, x) => s + Number(x.amount || 0), 0) || 0;

    const { data: fresh } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", selectedInvoice.id)
      .single();

    const remaining = Number(fresh.grand_total) - totalPaid;
    const newStatus = remaining <= 0 ? "paid" : totalPaid > 0 ? "partial" : "unpaid";

    await supabase
      .from("invoices")
      .update({ paid_amount: totalPaid, status: newStatus })
      .eq("id", selectedInvoice.id);

    setShowPaymentModal(false);
    setSelectedInvoice(null);

    showSuccess("Payment saved");
    loadData();
    loadDailyIncome();
  };

  // -----------------------------
  // VIEW INVOICE
  // -----------------------------
  const openViewInvoice = async (inv) => {
    setSelectedInvoice(inv);

    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id);

    setViewItems(items || []);

    const { data: branding } = await supabase
      .from("invoice_branding")
      .select("*")
      .eq("user_id", inv.user_id)
      .single();

    setViewBranding(branding || null);
    setShowViewModal(true);
  };

  // -----------------------------
  // DOWNLOAD PDF
  // -----------------------------
  const downloadInvoicePdf = async (inv) => {
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", inv.id);

    const { data: branding } = await supabase
      .from("invoice_branding")
      .select("*")
      .eq("user_id", inv.user_id)
      .single();

    const doc = await generateInvoicePdf({
      invoice: inv,
      items: items || [],
      branding: branding || null,
      company,
    });

    if (doc?.save) doc.save(`${inv.invoice_number}.pdf`);
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-xl font-semibold border-b pb-3">Invoice Archive</h2>

      <FilterPanel
        invoices={invoices}
        customers={customers}
        searchText={searchText}
        statusFilter={statusFilter}
        customerFilter={customerFilter}
        minAmount={minAmount}
        maxAmount={maxAmount}
        startDate={startDate}
        endDate={endDate}
        filteredInvoices={invoices}
        setSearchText={setSearchText}
        setStatusFilter={setStatusFilter}
        setCustomerFilter={setCustomerFilter}
        setMinAmount={setMinAmount}
        setMaxAmount={setMaxAmount}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        reload={loadData}
      />

      <InvoiceTable
        loading={loading}
        invoices={invoices}
        page={page}
        pageSize={rowsPerPage}
        totalCount={totalRows}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setRowsPerPage(s);
          setPage(1);
        }}
        onDownloadPdf={downloadInvoicePdf}
        onOpenPayment={(inv) => {
          setSelectedInvoice(inv);
          setNewPaymentAmount(0);
          setPaymentMethod("cash");
          setUseDiscount(false);
          setDiscountAmount(0);
          setDiscountReason("");
          setShowPaymentModal(true);
        }}
        onViewInvoice={openViewInvoice}
        onChangeStatus={handleStatusChange}
      />

      <DailyIncomePanel
        dailyIncomeRows={dailyIncomeRows}
        incomeStart={incomeStart}
        incomeEnd={incomeEnd}
        setIncomeStart={setIncomeStart}
        setIncomeEnd={setIncomeEnd}
        reload={loadDailyIncome}
      />

      {/* Modals */}
      <PaymentModal
        visible={showPaymentModal}
        invoice={selectedInvoice}
        newPaymentAmount={newPaymentAmount}
        paymentMethod={paymentMethod}
        useDiscount={useDiscount}
        discountAmount={discountAmount}
        discountReason={discountReason}
        setNewPaymentAmount={setNewPaymentAmount}
        setPaymentMethod={setPaymentMethod}
        setUseDiscount={setUseDiscount}
        setDiscountAmount={setDiscountAmount}
        setDiscountReason={setDiscountReason}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={confirmPayment}
      />

      <StatusReasonModal
        visible={showReasonModal}
        invoice={selectedInvoice}
        reasonText={reasonText}
        setReasonText={setReasonText}
        onCancel={() => setShowReasonModal(false)}
        onConfirm={confirmReasonForStatusChange}
      />

      <ViewInvoiceModal
        visible={showViewModal}
        invoice={selectedInvoice}
        items={viewItems}
        branding={viewBranding}
        company={company}
        onClose={() => setShowViewModal(false)}
      />

      <SuccessPopup message={successMessage} />
    </div>
  );
}
