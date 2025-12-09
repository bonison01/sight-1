// src/pages/ProductManagement.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, LogOut, Home, Upload } from "lucide-react";

import OrderManagement from "@/components/OrderManagement";
import BannerManagement from "@/components/BannerManagement";
import ProductList from "@/components/ProductManagementComponents/ProductList";
import ProductForm from "@/components/ProductManagementComponents/ProductForm";
import CSVUpload from "@/components/ProductManagementComponents/CSVUpload";

import InventoryManagement from "@/components/admin/InventoryManagement";
import InvoicingTabs from "@/components/admin/InvoicingTabs";
import InvoiceArchive from "@/components/admin/InvoiceArchive";
import Customers from "@/components/admin/Customers";

// New user/staff components
import UsersManagement from "@/components/admin/UsersManagement";
import StaffPage from "@/pages/Staff";

import { Product } from "@/types/product";

interface VariantInput {
  id?: string;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  image_url?: string | null;
}

export default function ProductManagement() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // persist selected tab
  const [activeTab, setActiveTab] = useState<string>(localStorage.getItem("admin-active-tab") || "orders");
  useEffect(() => {
    localStorage.setItem("admin-active-tab", activeTab);
  }, [activeTab]);

  // products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // edit/create state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [editingVariants, setEditingVariants] = useState<VariantInput[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [newProductVariants, setNewProductVariants] = useState<VariantInput[]>([]);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
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
    if (!loading && (!user || !isAdmin)) navigate("/auth?admin=true");
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchProducts();
  }, [isAdmin]);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("fetchProducts error", err);
      toast({ title: "Error", description: "Failed to fetch products", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      toast({ title: "Error", description: "Failed to sign out", variant: "destructive" });
    }
  };

  // --- Edit product
  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setDeletedVariantIds([]);

    const imgs: string[] = [];
    if (product.image_url) imgs.push(product.image_url);
    if (product.image_urls) imgs.push(...product.image_urls);
    setEditingImages(imgs);

    const { data: variants, error } = await supabase.from("product_variants").select("*").eq("product_id", product.id);
    if (error) {
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

  // --- Delete product
  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Success", description: "Product deleted." });
    } catch (err) {
      console.error("delete product", err);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  }

  // --- Delete variant (UI) -> mark for DB deletion on save
  const handleDeleteVariant = (id: string) => {
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(String(id));
    if (isUUID) setDeletedVariantIds((prev) => [...prev, id]);
    setEditingVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // --- Create product
  async function handleCreate() {
    try {
      const now = new Date().toISOString();
      // send only allowed fields
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

      setProducts((prev) => [created, ...prev]);
      setIsCreating(false);
      setNewProductImages([]);
      setNewProductVariants([]);
      toast({ title: "Success", description: "Product created." });
    } catch (err) {
      console.error("create product", err);
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    }
  }

  // --- Update product
  async function handleUpdate() {
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
          const { error: vInsErr } = await supabase.from("product_variants").insert([
            {
              product_id: editingProduct.id,
              color: variant.color ?? null,
              size: variant.size ?? null,
              price: variant.price ?? null,
              stock_quantity: variant.stock_quantity ?? 0,
              image_url: variant.image_url ?? null,
              created_at: now,
            },
          ]);
          if (vInsErr) throw vInsErr;
        }
      }

      await fetchProducts();
      handleCancelEdit();
      toast({ title: "Success", description: "Product updated." });
    } catch (err) {
      console.error("update product", err);
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    }
  }

  // CSV callback
  const handleCSVProductsUploaded = (createdProducts: Product[]) => {
    setProducts((prev) => [...createdProducts, ...prev]);
    setShowCSVUpload(false);
    toast({ title: "Success", description: `Uploaded ${createdProducts.length} products` });
  };

  // render
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Package className="w-6 h-6 animate-spin" />
        <p className="ml-3">Loading Admin Panel…</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage products, orders, inventory, invoices & customers</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-2" /> Home
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* main */}
      <main className="w-full py-6 px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            {/* <TabsTrigger value="products">Products</TabsTrigger> */}
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="sales">Sales & Billing</TabsTrigger>
            <TabsTrigger value="invoice-list">Invoice Archive</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="banner">Banner</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Products</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCSVUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" /> Bulk Upload
                </Button>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Button>
              </div>
            </div>

            <ProductList products={products} onEdit={handleEdit} onDelete={handleDelete} loading={loadingProducts} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="sales">
            <InvoicingTabs />
          </TabsContent>

          <TabsContent value="invoice-list">
            <InvoiceArchive />
          </TabsContent>

          <TabsContent value="customers">
            <Customers />
          </TabsContent>

          {/* Users management */}
          <TabsContent value="users">
            <div className="py-4">
              <UsersManagement />
            </div>
          </TabsContent>

          {/* Staff view */}
          <TabsContent value="staff">
            <div className="py-4">
              <StaffPage />
            </div>
          </TabsContent>

          <TabsContent value="banner">
            <BannerManagement />
          </TabsContent>
        </Tabs>

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
      </main>
    </div>
  );
}
