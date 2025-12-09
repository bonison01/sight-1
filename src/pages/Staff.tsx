// src/pages/Staff.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function StaffPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, address_line_1, address_line_2, city, state, postal_code, created_at")
        .eq("role", "staff")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaff(data ?? []);
    } catch (err) {
      console.error("fetchStaff", err);
      toast({ title: "Error", description: "Failed to fetch staff", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const demoteToUser = async (id) => {
    if (!confirm("Demote this staff to 'user'?")) return;
    setSavingId(id);
    try {
      const { error } = await supabase.from("profiles").update({ role: "user" }).eq("id", id);
      if (error) throw error;
      toast({ title: "Updated", description: "Staff demoted to user" });
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("demoteToUser", err);
      toast({ title: "Error", description: "Failed to demote", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const formatAddress = (p) => {
    const parts = [
      p.address_line_1,
      p.address_line_2,
      p.city,
      p.state,
      p.postal_code
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Staff</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin")}>Back to Admin</Button>
            <Button onClick={fetchStaff}>Refresh</Button>
          </div>
        </div>

        {loading ? (
          <div>Loading staff…</div>
        ) : (
          <>
            <div className="grid gap-3">
              {staff.map(s => (
                <div key={s.id} className="p-4 bg-white rounded shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-medium">{s.full_name ?? "—"}</div>
                    <div className="text-xs text-gray-600">{s.email ?? "—"} • {s.phone ?? "—"}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatAddress(s) || "No Address"}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={() => demoteToUser(s.id)} disabled={savingId === s.id}>
                      {savingId === s.id ? "Processing..." : "Demote"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {staff.length === 0 && <div className="text-sm text-gray-500 mt-4">No staff users.</div>}
          </>
        )}
      </div>
    </div>
  );
}
