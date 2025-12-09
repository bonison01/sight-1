// src/components/admin/UsersManagement.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select"; // optional - if not available replace with <select>
import { useToast } from "@/hooks/use-toast";

/**
 * UsersManagement
 * Fetches profiles from `profiles` table and allows changing role.
 *
 * Expected roles: 'user' | 'staff' | 'admin'
 */
const VALID_ROLES = ["user", "staff", "admin"];

export default function UsersManagement() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [localRoles, setLocalRoles] = useState({}); // id -> role

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, address_line_1, address_line_2, city, state, postal_code, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data ?? []);
      // seed localRoles
      const map = {};
      (data || []).forEach(p => map[p.id] = p.role);
      setLocalRoles(map);
    } catch (err) {
      console.error("fetchProfiles", err);
      toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (id, newRole) => {
    setLocalRoles(prev => ({ ...prev, [id]: newRole }));
  };

  const saveRole = async (id) => {
    const role = localRoles[id];
    if (!VALID_ROLES.includes(role)) {
      toast({ title: "Invalid role", description: "Role must be user, staff, or admin", variant: "destructive" });
      return;
    }

    if (!confirm(`Change role to "${role}" for this user?`)) return;

    setSavingId(id);
    try {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
      toast({ title: "Saved", description: "User role updated" });

      // update local state
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p));
    } catch (err) {
      console.error("saveRole", err);
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
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
    <div className="p-4 bg-white rounded shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <div>
          <Button variant="outline" onClick={fetchProfiles}>Refresh</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Loading users…</div>
      ) : (
        <>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Address</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="py-3">{p.full_name ?? "—"}</td>
                    <td className="py-3">{p.email ?? "—"}</td>
                    <td className="py-3">{p.phone ?? "—"}</td>
                    <td className="py-3">{formatAddress(p) || "—"}</td>
                    <td className="py-3">
                      {/* If you don't have a Select component, swap this for <select> */}
                      <select
                        value={localRoles[p.id] ?? p.role}
                        onChange={(e) => handleRoleChange(p.id, e.target.value)}
                        className="border rounded p-1"
                      >
                        {VALID_ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveRole(p.id)} disabled={savingId === p.id}>
                          {savingId === p.id ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {profiles.length === 0 && <div className="text-sm text-gray-500 mt-3">No users found.</div>}
        </>
      )}
    </div>
  );
}
