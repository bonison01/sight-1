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
  customers,
  onSelectCustomer
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showList, setShowList] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    state: "",
    address: ""
  });

  /* ---------- SEARCH FILTER ---------- */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const r = customers.filter(
      c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
    );
    setResults(r.slice(0, 10));
  }, [query, customers]);

  /* ---------- SELECT ---------- */
  const handleSelect = (c) => {
    onSelectCustomer(c);
    setQuery("");
    setResults([]);
    setShowList(false);
  };

  /* ---------- SAVE NEW CUSTOMER ---------- */
  const saveCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Name required.");

    const { data, error } = await supabase
      .from("customers")
      .insert([newCustomer])
      .select();

    if (error) return alert("Failed to save customer.");

    const created = data[0];
    onSelectCustomer(created);

    setShowModal(false);
    setNewCustomer({ name: "", phone: "", state: "", address: "" });
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader><CardTitle>Customer & Reference</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {/* Search Field */}
        <div className="relative">
          <input
            className="border p-3 rounded w-full"
            placeholder="Search customer..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowList(true); }}
            onFocus={() => setShowList(true)}
            onBlur={() => setTimeout(() => setShowList(false), 200)}
          />

          {showList && results.length > 0 && (
            <div className="absolute bg-white border rounded shadow w-full max-h-48 overflow-auto mt-1 z-20">
              {results.map(c => (
                <div
                  key={c.id}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelect(c)}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.phone}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" onClick={() => setShowModal(true)}>
          + Add Customer
        </Button>

        {/* Bound fields */}
        <input
          className="border p-3 rounded w-full"
          placeholder="Customer Name"
          value={form.customer_name}
          onChange={e => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
        />

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

        <input
          className="border p-3 rounded w-full"
          placeholder="Reference By"
          value={form.reference_by}
          onChange={e => setForm(prev => ({ ...prev, reference_by: e.target.value }))}
        />

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <Card className="w-full max-w-md bg-white border shadow-lg">
              <CardHeader><CardTitle>Add Customer</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <input className="border p-3 rounded w-full"
                  placeholder="Name"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                />
                <input className="border p-3 rounded w-full"
                  placeholder="Phone"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                />
                <input className="border p-3 rounded w-full"
                  placeholder="State"
                  value={newCustomer.state}
                  onChange={e => setNewCustomer(prev => ({ ...prev, state: e.target.value }))}
                />
                <input className="border p-3 rounded w-full"
                  placeholder="Address"
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
