import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, AlertCircle } from 'lucide-react';
import { Product } from '@/types/product';

interface CSVUploadProps {
  onProductsUploaded: (products: Product[]) => void;
}

const CSVUpload = ({ onProductsUploaded }: CSVUploadProps) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csvContent = `name,description,price,offer_price,category,stock_quantity,is_active,featured,features,ingredients,offers,image_urls,variant_size,variant_color,variant_price,variant_stock,variant_image
Classic Black Frame,Stylish black frame,1200,999,eyeglasses,50,true,false,"High quality","Material info","Offer text","url1|url2",M,Black,999,20,url3
Classic Black Frame,Stylish black frame,1200,999,eyeglasses,50,true,false,"High quality","Material info","Offer text","url1|url2",L,Black,999,10,url4
Kids Blue Frame,Kids frame,800,700,kids,20,true,false,"Kids safe","Plastic","Offer text","url5|url6",S,Blue,700,40,url7
`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products_with_variants_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // --- CSV PARSER ---
  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      let current = "";
      let inQuotes = false;
      const values = [];

      for (let char of raw) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/"/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/"/g, ""));

      const obj: any = {};
      headers.forEach((h, idx) => (obj[h] = values[idx] ?? ""));
      rows.push(obj);
    }
    return rows;
  };

  // --- MAIN UPLOAD HANDLER ---
  const handleUpload = async () => {
    if (!csvFile) {
      return toast({
        title: "No File Selected",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
    }

    setUploading(true);

    try {
      const csvText = await csvFile.text();
      const rows = parseCSV(csvText);

      /** GROUP BY PRODUCT NAME */
      const grouped: any = {};

      rows.forEach(row => {
        const key = row.name.trim();

        if (!grouped[key]) {
          grouped[key] = {
            product: {
              name: row.name,
              description: row.description || null,
              price: parseFloat(row.price) || 0,
              offer_price: row.offer_price ? parseFloat(row.offer_price) : null,
              category: row.category || null,
              stock_quantity: parseInt(row.stock_quantity) || 0,
              is_active: row.is_active === "true" || row.is_active === "1",
              featured: row.featured === "true" || row.featured === "1",
              features: row.features ? row.features.split("|") : null,
              ingredients: row.ingredients || null,
              offers: row.offers || null,
              image_urls: row.image_urls
                ? row.image_urls.split("|").map(i => i.trim())
                : [],
              image_url: null,
            },
            variants: [],
          };
        }

        if (row.variant_size || row.variant_color) {
          grouped[key].variants.push({
            size: row.variant_size || null,
            color: row.variant_color || null,
            price: row.variant_price ? parseFloat(row.variant_price) : null,
            stock_quantity: row.variant_stock
              ? parseInt(row.variant_stock)
              : 0,
            image_url: row.variant_image || null,
          });
        }
      });

      const uploadedProducts: Product[] = [];

      // INSERT PRODUCTS + VARIANTS
      for (const key in grouped) {
        const { product, variants } = grouped[key];

        // Primary image
        product.image_url = product.image_urls[0] || null;
        if (product.image_urls.length <= 1) product.image_urls = null;
        else product.image_urls = product.image_urls.slice(1);

        // Insert product
        const { data: created, error } = await supabase
          .from("products")
          .insert(product)
          .select();

        if (error) throw error;

        const createdProduct = created[0];
        uploadedProducts.push(createdProduct);

        // Insert variants
        if (variants.length > 0) {
          const variantRows = variants.map(v => ({
            product_id: createdProduct.id,
            ...v,
          }));

          await supabase.from("product_variants").insert(variantRows);
        }
      }

      toast({
        title: "Success",
        description: `Uploaded ${uploadedProducts.length} products with variants.`,
      });

      onProductsUploaded(uploadedProducts);
      setCsvFile(null);
      const input = document.getElementById("csv-file") as HTMLInputElement;
      if (input) input.value = "";

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Upload Failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    }

    setUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Bulk Upload (Products + Variants)</span>
        </CardTitle>
        <CardDescription>Upload products with multiple variants</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">New CSV Format:</p>
            <p>
              Includes <strong>image_urls</strong>, <strong>variant_size</strong>,
              <strong> variant_color</strong>, <strong>variant_price</strong>,
              <strong> variant_stock</strong>, <strong>variant_image</strong>
            </p>
            <p>Use | for multiple image URLs</p>
          </div>
        </div>

        <Button onClick={downloadTemplate} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Updated Template
        </Button>

        <div className="space-y-2">
          <Label>Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
          />
        </div>

        <Button onClick={handleUpload} disabled={!csvFile || uploading} className="w-full">
          {uploading ? "Uploading..." : "Upload Products"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CSVUpload;
