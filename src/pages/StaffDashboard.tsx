// src/pages/StaffDashboard.tsx
"use client";

import { useAuth } from "@/hooks/useAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Package, Receipt, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function StaffDashboard() {
  const { user, isStaff, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loadingPerms, setLoadingPerms] = useState(true);

  useEffect(() => {
    if (!loading && !(isStaff || isAdmin)) {
      navigate("/auth");
    }
  }, [loading, isStaff, isAdmin, navigate]);

  useEffect(() => {
    const load = async () => {
      if (isAdmin) {
        setPermissions({
          inventory: true,
          billing: true,
          invoice_archive: true,
          customers: true,
        });
        setLoadingPerms(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("staff_permissions")
          .select("permission_key, allowed")
          .eq("staff_id", user?.id);

        if (error) throw error;

        const map: Record<string, boolean> = {};
        (data || []).forEach((r: any) => (map[r.permission_key] = !!r.allowed));
        setPermissions(map);
      } catch (err) {
        console.error("load staff perms", err);
      } finally {
        setLoadingPerms(false);
      }
    };

    load();
  }, [user, isAdmin]);

  if (loading || loadingPerms) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  const can = (key: string) => isAdmin || !!permissions[key];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="max-w-3xl mx-auto shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Staff Dashboard</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-gray-600">Welcome! Open the module you have access to.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {can("inventory") && (
              <Button variant="outline" onClick={() => navigate("/admin?tab=inventory")}>
                <Package className="h-5 w-5 mr-2" /> Inventory
              </Button>
            )}

            {can("billing") && (
              <Button variant="outline" onClick={() => navigate("/admin?tab=sales")}>
                <Receipt className="h-5 w-5 mr-2" /> Sales & Billing
              </Button>
            )}

            {can("invoice_archive") && (
              <Button variant="outline" onClick={() => navigate("/admin?tab=invoice-list")}>
                <ClipboardList className="h-5 w-5 mr-2" /> Invoice Archive
              </Button>
            )}

            {can("customers") && (
              <Button variant="outline" onClick={() => navigate("/admin?tab=customers")}>
                <Users className="h-5 w-5 mr-2" /> Customers
              </Button>
            )}
          </div>

          <div className="pt-4 border-t mt-6">
            <Button variant="destructive" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
