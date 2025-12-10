// src/components/admin/UsersManagement.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuthContext";

/**
 * UsersManagement
 * - Manage roles (user | staff | admin)
 * - Manage staff permissions (stored in staff_permissions table)
 *
 * Permission keys used: inventory, billing, invoice_archive, customers
 */

const VALID_ROLES = ["user", "staff", "admin"];
const PERMISSION_KEYS = [
  { key: "inventory", label: "Inventory" },
  { key: "billing", label: "Sales & Billing" },
  { key: "invoice_archive", label: "Invoice Archive" },
  { key: "customers", label: "Customers" },
];

export default function UsersManagement() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [localRoles, setLocalRoles] = useState({}); // id -> role
  const [permissionsMap, setPermissionsMap] = useState({}); // staff_id -> { key: boolean }
  const [savingPermissionsFor, setSavingPermissionsFor] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // Fetch profiles and staff permissions
  const fetchAll = async () => {
    setLoading(true);
    try {
      // 1) fetch profiles
      const { data: profilesData, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, address_line_1, address_line_2, city, state, postal_code, created_at")
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;

      // 2) fetch permissions (all)
      const { data: permsData, error: permErr } = await supabase
        .from("staff_permissions")
        .select("id, staff_id, permission_key, allowed");

      if (permErr) throw permErr;

      // Build permissions map
      const map = {};
      (permsData || []).forEach((r) => {
        if (!map[r.staff_id]) map[r.staff_id] = {};
        map[r.staff_id][r.permission_key] = !!r.allowed;
      });

      setProfiles(profilesData || []);
      setPermissionsMap(map);

      // seed localRoles
      const mapRoles = {};
      (profilesData || []).forEach((p) => (mapRoles[p.id] = p.role));
      setLocalRoles(mapRoles);
    } catch (err) {
      console.error("fetchAll", err);
      toast({ title: "Error", description: "Failed to fetch users/permissions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (id, newRole) => {
    setLocalRoles((prev) => ({ ...prev, [id]: newRole }));
  };

  const saveRole = async (id) => {
    if (!isAdmin) {
      toast({ title: "Not allowed", description: "Only admins can change roles", variant: "destructive" });
      return;
    }

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

      // If role changed from staff -> non-staff, remove permissions for that user
      const old = profiles.find((p) => p.id === id);
      const oldRole = old?.role;
      if (oldRole === "staff" && role !== "staff") {
        await supabase.from("staff_permissions").delete().eq("staff_id", id);
        // update local map
        setPermissionsMap((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }

      // update local state
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
    } catch (err) {
      console.error("saveRole", err);
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const toggleLocalPermission = (staffId, key, checked) => {
    setPermissionsMap((prev) => {
      const copy = { ...prev };
      copy[staffId] = { ...(copy[staffId] || {}) };
      copy[staffId][key] = checked;
      return copy;
    });
  };

  // Save single permission (upsert) or delete when false
  const savePermissions = async (staffId) => {
    if (!isAdmin) {
      toast({ title: "Not allowed", description: "Only admins can change permissions", variant: "destructive" });
      return;
    }

    setSavingPermissionsFor(staffId);
    try {
      const perms = permissionsMap[staffId] || {};

      // Build rows for upsert/delete
      const rowsToUpsert = [];
      const keys = Object.keys(perms);
      for (const key of keys) {
        const allowed = !!perms[key];
        // For true -> upsert, for false -> delete row
        if (allowed) {
          rowsToUpsert.push({ staff_id: staffId, permission_key: key, allowed: true });
        }
      }

      // Upsert allowed ones (will insert/update)
      if (rowsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from("staff_permissions")
          .upsert(rowsToUpsert, { onConflict: ["staff_id", "permission_key"] });
        if (upsertErr) throw upsertErr;
      }

      // Delete disabled ones (explicitly remove rows where allowed = false)
      // Find keys that are false (or missing) - delete existing rows for those keys
      const disabledKeys = PERMISSION_KEYS.map(k => k.key).filter(k => !perms[k]);
      if (disabledKeys.length > 0) {
        const { error: delErr } = await supabase
          .from("staff_permissions")
          .delete()
          .in("permission_key", disabledKeys)
          .eq("staff_id", staffId);
        if (delErr) throw delErr;
      }

      // Refresh local permissions from DB (simpler)
      const { data: refreshed, error: fetchErr } = await supabase
        .from("staff_permissions")
        .select("staff_id, permission_key, allowed")
        .eq("staff_id", staffId);

      if (fetchErr) throw fetchErr;

      setPermissionsMap((prev) => {
        const copy = { ...prev };
        copy[staffId] = {};
        (refreshed || []).forEach(r => (copy[staffId][r.permission_key] = !!r.allowed));
        return copy;
      });

      toast({ title: "Saved", description: "Permissions updated" });
    } catch (err) {
      console.error("savePermissions", err);
      toast({ title: "Error", description: "Failed to update permissions", variant: "destructive" });
    } finally {
      setSavingPermissionsFor(null);
    }
  };

  const formatAddress = (p) => {
    const parts = [
      p.address_line_1,
      p.address_line_2,
      p.city,
      p.state,
      p.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Users & Staff Permissions</h2>
        <div>
          <Button variant="outline" onClick={fetchAll}>Refresh</Button>
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
                  <th className="pb-2">Permissions (staff only)</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(p => {
                  const perms = permissionsMap[p.id] || {};
                  const roleLocal = localRoles[p.id] ?? p.role;
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="py-3">{p.full_name ?? "—"}</td>
                      <td className="py-3">{p.email ?? "—"}</td>
                      <td className="py-3">{p.phone ?? "—"}</td>
                      <td className="py-3">{formatAddress(p) || "—"}</td>

                      <td className="py-3 w-36">
                        <select
                          value={roleLocal}
                          onChange={(e) => handleRoleChange(p.id, e.target.value)}
                          className="border rounded p-1 w-full"
                          disabled={!isAdmin}
                        >
                          {VALID_ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 align-top">
                        {roleLocal === "staff" ? (
                          <div className="flex flex-col gap-2">
                            {PERMISSION_KEYS.map(k => (
                              <label key={k.key} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!perms[k.key]}
                                  onChange={(e) => toggleLocalPermission(p.id, k.key, e.target.checked)}
                                  disabled={!isAdmin}
                                />
                                <span className="select-none">{k.label}</span>
                              </label>
                            ))}

                            <div className="pt-2">
                              <Button size="sm" onClick={() => savePermissions(p.id)} disabled={!isAdmin || savingPermissionsFor === p.id}>
                                {savingPermissionsFor === p.id ? "Saving…" : "Save Permissions"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">N/A</div>
                        )}
                      </td>

                      <td className="py-3">{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</td>

                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveRole(p.id)} disabled={!isAdmin || savingId === p.id}>
                            {savingId === p.id ? "Saving..." : "Save Role"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {profiles.length === 0 && <div className="text-sm text-gray-500 mt-3">No users found.</div>}
        </>
      )}
    </div>
  );
}
