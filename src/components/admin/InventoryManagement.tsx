// src/components/admin/InventoryManagement.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import ProductList from "@/components/ProductManagementComponents/ProductList";
import ProductForm from "@/components/ProductManagementComponents/ProductForm";
import CSVUpload from "@/components/ProductManagementComponents/CSVUpload";
import { useToast } from "@/hooks/use-toast";

/**
 * InventoryManagement (updated with Product Grid View + Full Product Management)
 *
 * - Combines sales from both `order_items` (online) and `invoice_items` (offline)
 * - Uses variant stock for inventory
 * - Daily revenue chart
 * - Product-level inventory, sold units, revenue
 * - NEW: Product Grid View with image, stock, sold, revenue
 * - NEW: Add / Edit / Delete / CSV Upload product management (reuses ProductForm and CSVUpload)
 *
 * Image priority: image_url -> image_urls[0] -> placeholder
 */

const formatDate = (d: Date) => d.toISOString().substring(0, 10);

const InventoryManagement: React.FC = () => {
  const { toast } = useToast();

  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(formatDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(formatDate(today));

  // inventory data
  const [products, setProducts] = useState<any[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // product management states
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [editingVariants, setEditingVariants] = useState<any[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [newProductVariants, setNewProductVariants] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState<Partial<any>>({
    id: undefined,
    name: "",
    description: "",
    price: 0,
    offer_price: null,
    image_url: null,
    image_urls: null,
    category: null,
    hsn_code: null,
    features: null,
    ingredients: null,
    offers: null,
    stock_quantity: 0,
    is_active: true,
    featured: false,
    created_at: null,
    updated_at: null,
  });

  useEffect(() => {
    // load inventory and products on mount and date change
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // main loader: loads products, variants, sales (both sources)
  const loadData = async () => {
    setLoading(true);
    setLoadingProducts(true);
    try {
      const [
        { data: productRows = [] } = {},
        { data: variantRows = [] } = {},
        { data: onlineSales = [] } = {},
        { data: offlineSales = [] } = {},
      ] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("product_variants").select("*"),
        supabase
          .from("order_items")
          .select("product_id, quantity, created_at")
          .gte("created_at", `${startDate} 00:00:00`)
          .lte("created_at", `${endDate} 23:59:59`),
        supabase
          .from("invoice_items")
          .select("product_id, quantity, created_at")
          .gte("created_at", `${startDate} 00:00:00`)
          .lte("created_at", `${endDate} 23:59:59`),
      ]);

      // Map variants to products
      const vMap: Record<string, any[]> = {};
      (variantRows || []).forEach((v: any) => {
        if (!v?.product_id) return;
        if (!vMap[v.product_id]) vMap[v.product_id] = [];
        vMap[v.product_id].push(v);
      });
      setVariantsByProduct(vMap);

      // Variant stock totals per product
      const variantStockSum: Record<string, number> = {};
      (variantRows || []).forEach((v: any) => {
        if (!v?.product_id) return;
        const stock = Number(v.stock_quantity ?? 0);
        variantStockSum[v.product_id] = (variantStockSum[v.product_id] ?? 0) + stock;
      });

      // Index products
      const productsById: Record<string, any> = {};
      (productRows || []).forEach((p: any) => {
        productsById[p.id] = p;
      });

      // Combine online + offline sales
      const salesRows = [...(onlineSales ?? []), ...(offlineSales ?? [])];

      const soldByProduct: Record<string, number> = {};
      const daily: Record<string, { date: string; revenue: number; units: number }> = {};

      (salesRows || []).forEach((s: any) => {
        const pid = s.product_id;
        const qty = Number(s.quantity ?? 0);
        if (!pid || !qty) return;

        // sold per product
        soldByProduct[pid] = (soldByProduct[pid] ?? 0) + qty;

        // daily aggregation
        const day = (s.created_at || "").substring(0, 10) || new Date().toISOString().substring(0, 10);
        if (!daily[day]) daily[day] = { date: day, revenue: 0, units: 0 };
        daily[day].units += qty;

        // revenue uses product offer_price / price
        const prod = productsById[pid];
        const unitPrice = Number(prod?.offer_price ?? prod?.price ?? 0);
        daily[day].revenue += qty * unitPrice;
      });

      const dailyList = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
      setDailyData(dailyList);

      // Build final product list with stats
      const productsWithStats = (productRows || []).map((p: any) => {
        const variantTotal = variantStockSum[p.id] ?? 0;
        const soldQty = soldByProduct[p.id] ?? 0;
        const unitPrice = Number(p.offer_price ?? p.price ?? 0);
        const revenue = soldQty * unitPrice;

        return {
          ...p,
          variant_total: variantTotal,
          sold_units: soldQty,
          revenue,
          unit_price_used: unitPrice,
          available_stock: variantTotal - soldQty,
        };
      });

      setProducts(productsWithStats);
      setLoading(false);
      setLoadingProducts(false);
    } catch (err) {
      console.error("Failed to load inventory data", err);
      toast({ title: "Error", description: "Failed to load inventory data", variant: "destructive" });
      setLoading(false);
      setLoadingProducts(false);
    }
  };

  // computed totals
  const totalRevenue = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.revenue) || 0), 0),
    [products]
  );
  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.sold_units) || 0), 0),
    [products]
  );

  const handleToggleExpand = (productId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleDownloadCsv = () => {
    const headers = [
      "Product Name",
      "Unit Price Used",
      "Total Sold Units",
      "Total Revenue",
      "Available Stock",
      "Date From",
      "Date To",
    ];

    const rows = products.map((p) => [
      `"${(p.name || "").replace(/"/g, '""')}"`,
      p.unit_price_used ?? 0,
      p.sold_units ?? 0,
      p.revenue ?? 0,
      p.available_stock ?? 0,
      startDate,
      endDate,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sales_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // -----------------------
  // Product Management Logic
  // -----------------------

  // Edit product: load variants, images
  const handleEdit = async (product: any) => {
    setEditingProduct(product);
    setDeletedVariantIds([]);

    const imgs: string[] = [];
    if (product.image_url) imgs.push(product.image_url);
    if (product.image_urls) imgs.push(...(product.image_urls || []));
    setEditingImages(imgs);

    const { data: variants, error } = await supabase.from("product_variants").select("*").eq("product_id", product.id);
    if (error) {
      console.error("Failed to fetch variants", error);
      toast({ title: "Error", description: "Failed to fetch product variants", variant: "destructive" });
      return;
    }
    setEditingVariants((variants || []).map((v: any) => ({ ...v, id: String(v.id) })));
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditingImages([]);
    setEditingVariants([]);
    setDeletedVariantIds([]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      // remove variants as well (if DB has FK cascade not required, but safe)
      await supabase.from("product_variants").delete().eq("product_id", id);
      toast({ title: "Success", description: "Product deleted." });
      // refresh data
      await loadData();
    } catch (err) {
      console.error("delete product", err);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  const handleDeleteVariant = (id: string) => {
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(String(id));
    if (isUUID) setDeletedVariantIds((prev) => [...prev, id]);
    setEditingVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // Create product
  const handleCreate = async () => {
    try {
      const now = new Date().toISOString();

      const productData: any = {
        name: newProduct.name ?? "",
        description: newProduct.description ?? "",
        price: newProduct.price ?? 0,
        offer_price: newProduct.offer_price ?? null,
        category: newProduct.category ?? null,
        hsn_code: newProduct.hsn_code ?? null,
        features: newProduct.features ?? null,
        ingredients: newProduct.ingredients ?? null,
        offers: newProduct.offers ?? null,
        stock_quantity: newProduct.stock_quantity ?? 0,
        is_active: newProduct.is_active ?? true,
        featured: newProduct.featured ?? false,
        image_url: newProductImages[0] || null,
        image_urls: newProductImages.length > 1 ? newProductImages.slice(1) : null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from("products").insert([productData]).select();
      if (error) throw error;
      const created = data?.[0];

      if (created && newProductVariants.length > 0) {
        const rows = newProductVariants.map((v) => ({
          product_id: created.id,
          color: v.color ?? null,
          size: v.size ?? null,
          price: v.price ?? null,
          stock_quantity: v.stock_quantity ?? 0,
          image_url: v.image_url ?? null,
          created_at: now,
        }));
        const { error: varErr } = await supabase.from("product_variants").insert(rows);
        if (varErr) throw varErr;
      }

      toast({ title: "Success", description: "Product created." });
      setIsCreating(false);
      setNewProductImages([]);
      setNewProductVariants([]);
      setNewProduct({
        id: undefined,
        name: "",
        description: "",
        price: 0,
        offer_price: null,
        image_url: null,
        image_urls: null,
        category: null,
        hsn_code: null,
        features: null,
        ingredients: null,
        offers: null,
        stock_quantity: 0,
        is_active: true,
        featured: false,
        created_at: null,
        updated_at: null,
      });

      // refresh inventory + product lists
      await loadData();
    } catch (err) {
      console.error("create product", err);
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    }
  };

  // Update product
  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      const now = new Date().toISOString();
      const updateData: any = {
        name: editingProduct.name ?? "",
        description: editingProduct.description ?? "",
        price: editingProduct.price ?? 0,
        offer_price: editingProduct.offer_price ?? null,
        category: editingProduct.category ?? null,
        hsn_code: (editingProduct as any).hsn_code ?? null,
        features: editingProduct.features ?? null,
        ingredients: editingProduct.ingredients ?? null,
        offers: editingProduct.offers ?? null,
        stock_quantity: editingProduct.stock_quantity ?? 0,
        is_active: editingProduct.is_active ?? true,
        featured: editingProduct.featured ?? false,
        image_url: editingImages[0] || null,
        image_urls: editingImages.length > 1 ? editingImages.slice(1) : null,
        updated_at: now,
      };

      const { error: updErr } = await supabase.from("products").update(updateData).eq("id", editingProduct.id);
      if (updErr) throw updErr;

      // delete variants removed by user
      if (deletedVariantIds.length > 0) {
        const { error: delErr } = await supabase.from("product_variants").delete().in("id", deletedVariantIds);
        if (delErr) throw delErr;
        setDeletedVariantIds([]);
      }

      // update existing variants or insert new ones
      for (const variant of editingVariants) {
        const isUUID = /^[0-9a-fA-F-]{36}$/.test(String(variant.id ?? ""));
        if (isUUID) {
          const { error: vUpdErr } = await supabase
            .from("product_variants")
            .update({
              color: variant.color ?? null,
              size: variant.size ?? null,
              price: variant.price ?? null,
              stock_quantity: variant.stock_quantity ?? 0,
              image_url: variant.image_url ?? null,
              updated_at: now,
            })
            .eq("id", variant.id);
          if (vUpdErr) throw vUpdErr;
        } else {
          const { error: vInsErr } = await supabase.from("product_variants").insert([{
            product_id: editingProduct.id,
            color: variant.color ?? null,
            size: variant.size ?? null,
            price: variant.price ?? null,
            stock_quantity: variant.stock_quantity ?? 0,
            image_url: variant.image_url ?? null,
            created_at: now,
          }]);
          if (vInsErr) throw vInsErr;
        }
      }

      toast({ title: "Success", description: "Product updated." });
      handleCancelEdit();
      await loadData();
    } catch (err) {
      console.error("update product", err);
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    }
  };

  // CSV callback (when CSVUpload component returns created products)
  const handleCSVProductsUploaded = (createdProducts: any[]) => {
    toast({ title: "Success", description: `Uploaded ${createdProducts.length} products` });
    setShowCSVUpload(false);
    // refresh
    void loadData();
  };

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory & Sales</h2>
          <p className="text-sm text-gray-600">
            Combined sales from online orders (order_items) and offline invoices (invoice_items).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCSVUpload(true)} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>

          <Button onClick={() => setIsCreating(true)} size="sm">
            + Add Product
          </Button>

          <Button onClick={handleDownloadCsv} variant="ghost" size="sm">
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date filters & summary */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="ml-auto flex gap-6 text-sm">
            <div>
              <div className="text-xs text-gray-500">Total Units Sold</div>
              <div className="text-lg font-semibold">{totalUnits}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Total Revenue</div>
              <div className="text-lg font-semibold">₹{totalRevenue.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
{/* Inventory table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory by Product & Variants</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-t">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Variant Stock Sum</th>
                    <th className="p-2 text-left">Sold (range)</th>
                    <th className="p-2 text-left">Available</th>
                    <th className="p-2 text-left">Price (₹)</th>
                    <th className="p-2 text-left">Revenue (₹)</th>
                    <th className="p-2 text-left">Variants</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((p) => (
                    <React.Fragment key={p.id}>
                      <tr className="border-b">
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2">{p.variant_total}</td>
                        <td className="p-2 text-red-600">{p.sold_units}</td>
                        <td className="p-2 text-green-700">{p.available_stock}</td>
                        <td className="p-2 font-semibold">₹{p.unit_price_used}</td>
                        <td className="p-2">₹{Number(p.revenue || 0).toFixed(2)}</td>

                        <td className="p-2">
                          {variantsByProduct[p.id]?.length ? (
                            <button
                              className="text-blue-600 underline text-xs"
                              onClick={() => handleToggleExpand(p.id)}
                            >
                              {expanded[p.id] ? "Hide" : "View"} (
                              {variantsByProduct[p.id].length})
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>

                      {expanded[p.id] && variantsByProduct[p.id] && (
                        <tr className="bg-gray-50 border-b">
                          <td colSpan={7} className="p-0">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100 border-b">
                                <tr>
                                  <th className="p-2 text-left">Color</th>
                                  <th className="p-2 text-left">Size</th>
                                  <th className="p-2 text-left">Stock</th>
                                  <th className="p-2 text-left">Price</th>
                                </tr>
                              </thead>

                              <tbody>
                                {variantsByProduct[p.id].map((v) => (
                                  <tr key={v.id} className="border-b">
                                    <td className="p-2">{v.color}</td>
                                    <td className="p-2">{v.size}</td>
                                    <td className="p-2">{Number(v.stock_quantity ?? 0)}</td>
                                    <td className="p-2 text-gray-500 italic">(uses product price)</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Grid View */}
      <Card>
        <CardHeader>
          <CardTitle>Products Overview</CardTitle>
          <p className="text-sm text-gray-500">Quick summary of stock, sales and revenue.</p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-gray-500 text-sm">Loading products…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => {
                const img =
                  p.image_url ||
                  (p.image_urls?.length ? p.image_urls[0] : null) ||
                  "/placeholder.png";

                // low stock highlight (optional)
                const lowStock = typeof p.available_stock === "number" && p.available_stock <= 5;

                return (
                  <div
                    key={p.id}
                    className={`border rounded-lg bg-white shadow-sm hover:shadow-md transition p-3 flex flex-col ${
                      lowStock ? "border-red-300" : ""
                    }`}
                  >
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-36 object-cover rounded-md border"
                    />

                    <div className="mt-3 flex-1">
                      <h3 className="font-semibold text-sm">{p.name}</h3>

                      <div className="text-xs text-gray-500 mt-1">
                        {p.category || "Uncategorized"}
                      </div>

                      <div className="mt-2 space-y-1 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">Stock: </span>
                          <span className="font-medium">{p.variant_total}</span>
                        </div>

                        <div>
                          <span className="text-gray-500 text-xs">Sold: </span>
                          <span className="font-medium text-red-600">{p.sold_units}</span>
                        </div>

                        <div>
                          <span className="text-gray-500 text-xs">Available: </span>
                          <span className="font-medium text-green-700">
                            {p.available_stock}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500 text-xs">Revenue: </span>
                          <span className="font-medium">
                            ₹{Number(p.revenue || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {products.length === 0 && (
                <div className="text-sm text-gray-500 col-span-full text-center py-8">
                  No products found.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      
      {/* CSV Upload modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="relative p-6 bg-white rounded shadow-xl max-w-2xl w-full">
            <Button variant="ghost" size="sm" onClick={() => setShowCSVUpload(false)} className="absolute top-2 right-2">
              ×
            </Button>
            <CSVUpload onProductsUploaded={handleCSVProductsUploaded} />
          </div>
        </div>
      )}

      {/* ProductForm modals */}

      {editingProduct && (
        <ProductForm
          product={editingProduct}
          images={editingImages}
          variants={editingVariants}
          onProductChange={setEditingProduct}
          onImagesChange={setEditingImages}
          onVariantsChange={setEditingVariants}
          onDeleteVariant={handleDeleteVariant}
          onSave={handleUpdate}
          onCancel={handleCancelEdit}
          isEditing={true}
        />
      )}

      {isCreating && (
        <ProductForm
          product={newProduct}
          images={newProductImages}
          variants={newProductVariants}
          onProductChange={setNewProduct}
          onImagesChange={setNewProductImages}
          onVariantsChange={setNewProductVariants}
          onDeleteVariant={() => {}}
          onSave={handleCreate}
          onCancel={() => {
            setIsCreating(false);
            setNewProductImages([]);
            setNewProductVariants([]);
          }}
          isEditing={false}
        />
      )}
    </div>
  );
};

export default InventoryManagement;
