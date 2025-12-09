import React from "react";
import { Product } from "@/types/product";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Save } from "lucide-react";
import ImageUpload from "./ImageUpload";

const sizes = ["S", "M", "L", "XL"];
const colors = ["Red", "Green", "Blue", "Black", "White"];

const categories = [
  { value: "eyeglasses", label: "Eyeglasses" },
  { value: "sunglasses", label: "Sunglasses" },
  { value: "kids", label: "Kids" },
  { value: "lens_care", label: "Lens Care" },
  { value: "contact_lens", label: "Contact Lens" },
  { value: "other", label: "Other" },
];

export interface VariantInput {
  id?: string;
  color?: string | null;
  size?: string | null;
  stock_quantity?: number | null;
  price?: number | null;
  image_url?: string | null;
}

export interface ProductFormProps {
  product: Partial<Product>;
  images: string[];
  variants: VariantInput[];
  onProductChange: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  onImagesChange: React.Dispatch<React.SetStateAction<string[]>>;
  onVariantsChange: React.Dispatch<React.SetStateAction<VariantInput[]>>;
  onDeleteVariant: (id: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
  saving?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  images,
  variants,
  onProductChange,
  onImagesChange,
  onVariantsChange,
  onDeleteVariant,
  onSave,
  onCancel,
  isEditing,
  saving = false,
}) => {
  const addVariant = () => {
    onVariantsChange([
      ...variants,
      {
        id: Date.now().toString(),
        size: sizes[0],
        color: colors[0],
        stock_quantity: 0,
        price: null,
        image_url: null,
      },
    ]);
  };

  const updateVariant = (id: string, updates: Partial<VariantInput>) => {
    onVariantsChange(variants.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="relative w-full max-w-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <Card className="relative max-h-screen overflow-y-auto">
          <Button variant="ghost" size="sm" onClick={onCancel} className="absolute top-2 right-2 z-10">
            <X className="h-4 w-4" />
          </Button>

          <CardHeader>
            <CardTitle>{isEditing ? "Edit Product" : "Create Product"}</CardTitle>
            <CardDescription>{isEditing ? "Update product details" : "Add a new product"}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <ImageUpload images={images} onImagesChange={onImagesChange} maxImages={5} maxSizePerImageMB={2} />

            <div>
              <Label>Product Name</Label>
              <Input value={product.name || ""} onChange={(e) => onProductChange({ ...product, name: e.target.value })} />
            </div>

            <div>
              <Label>HSN Code</Label>
              <Input value={(product as any).hsn_code || ""} onChange={(e) => onProductChange({ ...product, hsn_code: e.target.value })} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={product.description || ""} onChange={(e) => onProductChange({ ...product, description: e.target.value })} />
            </div>

            <div>
              <Label>Price</Label>
              <Input type="number" value={product.price} onChange={(e) => onProductChange({ ...product, price: parseFloat(e.target.value) || 0 })} />
            </div>

            <div>
              <Label>Offer Price</Label>
              <Input type="number" value={product.offer_price ?? ""} onChange={(e) => onProductChange({ ...product, offer_price: e.target.value ? parseFloat(e.target.value) : null })} />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={product.category || ""} onValueChange={(v) => onProductChange({ ...product, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <Label>Variants</Label>

              {variants.length === 0 && <p className="text-sm text-gray-500">No variants added yet.</p>}

              {variants.map((variant) => (
                <div key={variant.id} className="grid grid-cols-4 gap-2 items-center border p-2 rounded-md">
                  <Select value={variant.size || ""} onValueChange={(val) => updateVariant(variant.id!, { size: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={variant.color || ""} onValueChange={(val) => updateVariant(variant.id!, { color: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      {colors.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div>
                    <Label className="text-xs">Stock</Label>
                    <Input type="number" value={variant.stock_quantity ?? ""} onChange={(e) => updateVariant(variant.id!, { stock_quantity: parseInt(e.target.value) || 0 })} />
                  </div>

                  <Button variant="destructive" size="sm" onClick={() => onDeleteVariant(variant.id!)}>
                    Remove
                  </Button>
                </div>
              ))}

              <Button variant="outline" onClick={addVariant}>
                + Add Variant
              </Button>
            </div>

            <Button disabled={saving} onClick={onSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Update Product" : "Create Product"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductForm;
