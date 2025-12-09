// src/components/ProductManagementComponents/CSVUpload.tsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload } from "lucide-react";
import { Product } from "@/types/product";

interface CSVUploadProps {
  onProductsUploaded: (products: Product[]) => void;
}

const TEMPLATE = `name,description,price,offer_price,category,hsn_code,image_urls,stock_quantity,is_active,featured,features,ingredients,offers,variant_size,variant_color,variant_price,variant_stock,variant_image
Classic Black Frame,"Stylish black frame",1200,999,eyeglasses,9001,"https://example.com/img1.jpg|https://example.com/img2.jpg",50,true,false,"High quality|Lightweight","Material info","Offer text",M,Black,999,20,https://example.com/var_img1.jpg
Classic Black Frame,"Stylish black frame",1200,999,eyeglasses,9001,"https://example.com/img1.jpg|https://example.com/img2.jpg",50,true,false,"High quality|Lightweight","Material info","Offer text",L,Black,999,10,https://example.com/var_img2.jpg
Kids Blue Frame,"Kids frame",800,700,kids,9002,"https://example.com/kid1.jpg",20,true,false,"Kids safe","Plastic","Offer text",S,Blue,700,40,https://example.com/kid_var1.jpg
`;

const parseCSV = (csvText: string) => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur.trim());

    const obj: Record<string, string> = {};
    for (let k = 0; k < headers.length; k++) {
      obj[headers[k]] = values[k] ?? "";
    }
    rows.push(obj);
  }

  return rows;
};

const CSVUpload: React.FC<CSVUploadProps> = ({ onProductsUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products_with_variants_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== "text/csv" && !f.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a .csv file", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No file", description: "Please select a CSV file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);

      // group by name + hsn_code
      type Group = {
        product: {
          name: string;
          description?: string | null;
          price?: number;
          offer_price?: number | null;
          category?: string | null;
          hsn_code?: string | null;
          image_urls?: string[] | null;
          stock_quantity?: number;
          is_active?: boolean;
          featured?: boolean;
          features?: string[] | null;
          ingredients?: string | null;
          offers?: string | null;
        };
        variants: {
          size?: string | null;
          color?: string | null;
          price?: number | null;
          stock_quantity?: number | null;
          image_url?: string | null;
        }[];
      };

      const groups: Record<string, Group> = {};

      for (const r of rows) {
        const name = (r["name"] || "").trim();
        const hsn = (r["hsn_code"] || "").trim();
        const key = `${name}||${hsn}`;

        const prod = {
          name: name || "Unnamed Product",
          description: (r["description"] || "").trim() || null,
          price: Number(r["price"] || 0) || 0,
          offer_price: r["offer_price"] ? Number(r["offer_price"]) : null,
          category: (r["category"] || "").trim() || null,
          hsn_code: hsn || null,
          image_urls: (r["image_urls"] || "").trim() ? (r["image_urls"] || "").split("|").map((s) => s.trim()).filter(Boolean) : null,
          stock_quantity: r["stock_quantity"] ? parseInt(r["stock_quantity"]) || 0 : 0,
          is_active: (r["is_active"] || "true").toLowerCase() === "true",
          featured: (r["featured"] || "false").toLowerCase() === "true",
          features: (r["features"] || "").trim() ? (r["features"] || "").split("|").map((s) => s.trim()).filter(Boolean) : null,
          ingredients: (r["ingredients"] || "").trim() || null,
          offers: (r["offers"] || "").trim() || null,
        };

        const variantPresent = (r["variant_size"] || r["variant_color"] || r["variant_price"] || r["variant_stock"] || r["variant_image"]);
        const variant = variantPresent
          ? {
              size: (r["variant_size"] || "").trim() || null,
              color: (r["variant_color"] || "").trim() || null,
              price: r["variant_price"] ? Number(r["variant_price"]) : null,
              stock_quantity: r["variant_stock"] ? parseInt(r["variant_stock"]) || 0 : 0,
              image_url: (r["variant_image"] || "").trim() || null,
            }
          : null;

        if (!groups[key]) groups[key] = { product: prod, variants: [] };
        if (variant) groups[key].variants.push(variant);
      }

      const createdProducts: Product[] = [];

      for (const key of Object.keys(groups)) {
        const group = groups[key];
        const now = new Date().toISOString();

        const productInsert: any = {
          name: group.product.name,
          description: group.product.description,
          price: group.product.price ?? 0,
          offer_price: group.product.offer_price ?? null,
          category: group.product.category ?? null,
          hsn_code: group.product.hsn_code ?? null,
          features: group.product.features ?? null,
          ingredients: group.product.ingredients ?? null,
          offers: group.product.offers ?? null,
          stock_quantity: group.product.stock_quantity ?? 0,
          is_active: group.product.is_active ?? true,
          featured: group.product.featured ?? false,
          image_url: group.product.image_urls?.[0] ?? null,
          image_urls: group.product.image_urls && group.product.image_urls.length > 1 ? group.product.image_urls.slice(1) : null,
          created_at: now,
          updated_at: now,
        };

        const { data: prodData, error: prodErr } = await supabase.from("products").insert([productInsert]).select();
        if (prodErr) {
          console.error("product insert error", prodErr);
          throw prodErr;
        }
        const created = prodData?.[0];
        if (!created) continue;

        if (group.variants.length > 0) {
          const variantRows = group.variants.map((v) => ({
            product_id: created.id,
            color: v.color ?? null,
            size: v.size ?? null,
            price: v.price ?? null,
            stock_quantity: v.stock_quantity ?? 0,
            image_url: v.image_url ?? null,
            created_at: now,
          }));
          const { error: varErr } = await supabase.from("product_variants").insert(variantRows);
          if (varErr) {
            console.error("variant insert error", varErr);
            throw varErr;
          }
        }

        createdProducts.push(created);
      }

      onProductsUploaded(createdProducts);
    } catch (err: any) {
      console.error("CSV upload error", err);
      toast({ title: "Upload failed", description: err.message || "Failed to upload CSV", variant: "destructive" });
    } finally {
      setUploading(false);
      setFile(null);
      const fileInput = document.getElementById("csv-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-4 w-4" /> Bulk Upload — Products + Variants
        </CardTitle>
        <CardDescription>CSV supports product-level fields and variant rows. See template.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
        </div>

        <div>
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input id="csv-file" type="file" accept=".csv" onChange={handleFile} />
        </div>

        <div>
          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload CSV"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVUpload;
