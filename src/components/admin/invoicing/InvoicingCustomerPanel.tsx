// src/components/admin/invoicing/InvoicingCustomerPanel.tsx
// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const InvoicingCustomerPanel = ({
  form,
  setForm,
  customers = [],
  onSelectCustomer,
  onCustomerNameChange
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showList, setShowList] = useState(false);

  /* ---------------- STAFF LIST (REFERENCE DROPDOWN) ---------------- */
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      // role should match stored value in DB (lowercase 'staff')
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("role", "staff")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("loadStaff error", error);
        setStaffList([]);
        return;
      }
      setStaffList(data ?? []);
    } catch (e) {
      console.error("loadStaff exception", e);
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  /* ---------------- NEW CUSTOMER MODAL ---------------- */
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    state: "",
    address: ""
  });

  /* ---------------- SEARCH FILTER ---------------- */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const r = (customers || []).filter(
      c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
    setResults(r.slice(0, 10));
  }, [query, customers]);

  /* ---------------- SELECT CUSTOMER ---------------- */
  const handleSelect = (c) => {
    // Build full address from customer table (fallback to address or empty)
    const fullAddress = c.address ?? c.customer_address ?? "";

    // Update parent form
    setForm(prev => ({
      ...prev,
      customer_id: c.id,
      customer_name: c.name || "",
      customer_phone: c.phone || "",
      customer_state: c.state || "",
      customer_address: fullAddress
    }));

    try { onSelectCustomer?.(c); } catch (_) {}
    try { onCustomerNameChange?.(c.name); } catch (_) {}

    // clear local search UI
    setQuery("");
    setResults([]);
    setShowList(false);
  };

  /* ---------------- SAVE NEW CUSTOMER ---------------- */
  const saveCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Name required.");

    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select();

    if (error) {
      console.error("saveCustomer error", error);
      return alert("Failed to save customer");
    }

    const created = data[0];
    handleSelect(created);

    setShowModal(false);
    setNewCustomer({ name: "", phone: "", state: "", address: "" });
  };

  /* ---------------- RESET FORM INPUTS ---------------- */
  const resetInputs = () => {
    setForm(prev => ({
      ...prev,
      customer_id: "",
      customer_name: "",
      customer_phone: "",
      customer_state: "",
      customer_address: "",
      reference_by: "",
      reference_name: ""
    }));
    setQuery("");
    setResults([]);
    setShowList(false);
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle>Customer & Reference</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        {/* Search Customer */}
        <div className="relative">
          <input
            className="border p-3 rounded w-full"
            placeholder="Search customer..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowList(true); }}
            onFocus={() => setShowList(true)}
            onBlur={() => setTimeout(() => setShowList(false), 180)}
          />

          {showList && results.length > 0 && (
            <div className="absolute bg-white border rounded shadow w-full max-h-48 overflow-auto mt-1 z-30">
              {results.map(c => (
                <div
                  key={c.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseDown={(e) => {
                    // prevent blur hiding the list before selection
                    e.preventDefault();
                    handleSelect(c);
                  }}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.phone}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowModal(true)}>
            + Add Customer
          </Button>

          <Button variant="ghost" onClick={resetInputs}>
            Reset
          </Button>
        </div>

        {/* Customer Name */}
        <input
          className="border p-3 rounded w-full"
          placeholder="Customer Name"
          value={form.customer_name}
          onChange={e => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
        />

        {/* Phone + State */}
        <div className="flex gap-2">
          <input
            className="border p-3 rounded w-full"
            placeholder="Phone"
            value={form.customer_phone}
            onChange={e => setForm(prev => ({ ...prev, customer_phone: e.target.value }))}
          />
          <input
            className="border p-3 rounded w-48"
            placeholder="State"
            value={form.customer_state}
            onChange={e => setForm(prev => ({ ...prev, customer_state: e.target.value }))}
          />
        </div>

        {/* Customer Address */}
        <textarea
          className="border p-3 rounded w-full"
          placeholder="Customer Address"
          rows={2}
          value={form.customer_address ?? ""}
          onChange={e =>
            setForm(prev => ({ ...prev, customer_address: e.target.value }))
          }
        />

        {/* Reference Dropdown (Profiles.role = 'staff') */}
        <div>
          <label className="text-xs text-gray-600 block mb-1">Reference</label>
          <select
            className="border p-3 rounded w-full"
            value={form.reference_by || ""}
            onChange={e => {
              const staffId = e.target.value;
              const staff = staffList.find(s => s.id === staffId);
              setForm(prev => ({
                ...prev,
                reference_by: staffId,
                reference_name: staff ? staff.full_name : ""
              }));
            }}
            disabled={staffLoading}
          >
            <option value="">Select Reference</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>
                {s.full_name} {s.phone ? `• ${s.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Add Customer Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <Card className="w-full max-w-md bg-white border shadow-lg">
              <CardHeader>
                <CardTitle>Add Customer</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <input
                  className="border p-3 rounded w-full"
                  placeholder="Name"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                />

                <input
                  className="border p-3 rounded w-full"
                  placeholder="Phone"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                />

                <input
                  className="border p-3 rounded w-full"
                  placeholder="State"
                  value={newCustomer.state}
                  onChange={e => setNewCustomer(prev => ({ ...prev, state: e.target.value }))}
                />

                <textarea
                  className="border p-3 rounded w-full"
                  placeholder="Address"
                  rows={2}
                  value={newCustomer.address}
                  onChange={e => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button onClick={saveCustomer}>Save</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default InvoicingCustomerPanel;
