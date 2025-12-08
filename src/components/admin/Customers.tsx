// src/components/admin/Customers.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    cust_id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  // ----------------------------------------
  // LOAD CUSTOMERS
  // ----------------------------------------
  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
      return;
    }

    setCustomers(data || []);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // ----------------------------------------
  // AUTO-GENERATE NEXT CUSTOMER ID
  // ----------------------------------------
  const generateNextCustomerId = () => {
    if (!customers.length) return "CUST001";

    const ids = customers
      .map((c) => c.cust_id)
      .filter(Boolean)
      .map((id) => Number(id.replace("CUST", "")))
      .filter((n) => !isNaN(n));

    if (ids.length === 0) return "CUST001";

    const max = Math.max(...ids);
    const next = (max + 1).toString().padStart(3, "0");

    return `CUST${next}`;
  };

  useEffect(() => {
    if (showForm) {
      const next = generateNextCustomerId();
      setForm((f) => ({ ...f, cust_id: next }));
    }
  }, [showForm]);

  // ----------------------------------------
  // SAVE NEW CUSTOMER
  // ----------------------------------------
  const handleSave = async () => {
    if (!form.name.trim()) return alert("Customer name is required");
    if (!form.cust_id.trim()) return alert("Customer ID is required");

    const { error } = await supabase.from("customers").insert([form]);

    if (error) {
      console.error("Error creating customer:", error);
      alert("Customer ID must be unique");
      return;
    }

    setForm({
      cust_id: "",
      name: "",
      phone: "",
      email: "",
      address: "",
    });
    setShowForm(false);
    loadCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between gap-4 items-center">
        <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
        <Button onClick={() => setShowForm(true)}>+ Add Customer</Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border rounded-lg p-4 space-y-2">
          
          {/* Customer ID */}
          <input
            className="border p-2 w-full text-sm"
            placeholder="Customer ID (CUST001)"
            value={form.cust_id}
            onChange={(e) => setForm({ ...form, cust_id: e.target.value.toUpperCase() })}
          />

          <input
            className="border p-2 w-full text-sm"
            placeholder="Customer Name*"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <input
            className="border p-2 w-full text-sm"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            className="border p-2 w-full text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <textarea
            className="border p-2 w-full text-sm"
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <div className="flex gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Customer Table */}
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 text-left">Customer ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Address</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2 font-semibold">{c.cust_id || "-"}</td>
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.phone || "-"}</td>
                <td className="p-2">{c.email || "-"}</td>
                <td className="p-2">{c.address || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;
