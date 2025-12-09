import React from 'react';
import { Product } from '@/types/product';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Save } from 'lucide-react';
import ImageUpload from './ImageUpload';

const sizes = ['S', 'M', 'L', 'XL'];
const colors = ['Red', 'Green', 'Blue', 'Black', 'White'];

const categories = [
  { value: 'eyeglasses', label: 'Eyeglasses' },
  { value: 'sunglasses', label: 'Sunglasses' },
  { value: 'kids', label: 'Kids' },
  { value: 'lens_care', label: 'Lens Care' },
  { value: 'contact_lens', label: 'Contact Lens' },
  { value: 'other', label: 'Other' },
];

export interface VariantInput {
  id?: string;
  color?: string | null;
  size?: string | null;
  stock_quantity?: number | null;
  image_url?: string | null;
  price?: number | null | undefined;
}

export interface ProductFormProps {
  product: Partial<Product>;
  images: string[];
  variants: VariantInput[];
  onProductChange: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  onImagesChange: React.Dispatch<React.SetStateAction<string[]>>;
  onVariantsChange: React.Dispatch<React.SetStateAction<VariantInput[]>>;
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
  onSave,
  onCancel,
  isEditing,
  saving = false,
}) => {

  const addVariant = () => {
    const newVariant: VariantInput = {
      id: Date.now().toString(),
      size: sizes[0],
      color: colors[0],
      stock_quantity: 0,
      price: null,
      image_url: null,
    };
    onVariantsChange([...variants, newVariant]);
  };

  const updateVariant = (id: string, updatedFields: Partial<VariantInput>) => {
    onVariantsChange(
      variants.map((variant) =>
        variant.id === id ? { ...variant, ...updatedFields } : variant
      )
    );
  };

  const removeVariant = (id: string) => {
    onVariantsChange(variants.filter((variant) => variant.id !== id));
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
      onClick={onCancel} // ⭐ CLOSE WHEN CLICK OUTSIDE
    >
      <div
        className="relative p-4 w-full max-w-2xl h-full md:h-auto"
        onClick={(e) => e.stopPropagation()} // ❗ PREVENT CLOSE WHEN CLICK INSIDE
      >
        <Card className="relative max-h-screen overflow-y-auto">

          {/* CLOSE BUTTON */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="absolute top-2 right-2 z-10"
          >
            <X className="h-4 w-4" />
          </Button>

          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Product' : 'Create Product'}</CardTitle>
            <CardDescription>
              {isEditing
                ? 'Update product details'
                : 'Add a new product to your inventory'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4">

              {/* IMAGE UPLOAD */}
              <ImageUpload
                images={images}
                onImagesChange={onImagesChange}
                maxImages={5}
                maxSizePerImageMB={2}
              />

              {/* NAME */}
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={product.name}
                  onChange={(e) =>
                    onProductChange({ ...product, name: e.target.value })
                  }
                  placeholder="Enter product name"
                />
              </div>

              {/* HSN CODE */}
              <div>
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input
                  id="hsn_code"
                  value={product.hsn_code || ""}
                  onChange={(e) =>
                    onProductChange({
                      ...product,
                      hsn_code: e.target.value,
                    })
                  }
                  placeholder="Enter HSN Code"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={product.description || ''}
                  onChange={(e) =>
                    onProductChange({ ...product, description: e.target.value })
                  }
                  placeholder="Enter product description"
                />
              </div>

              {/* PRICE */}
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={product.price}
                  onChange={(e) =>
                    onProductChange({
                      ...product,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Enter price"
                />
              </div>

              {/* OFFER PRICE */}
              <div>
                <Label htmlFor="offer_price">Offer Price</Label>
                <Input
                  id="offer_price"
                  type="number"
                  min={0}
                  value={product.offer_price ?? ''}
                  onChange={(e) =>
                    onProductChange({
                      ...product,
                      offer_price: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="Enter offer price (optional)"
                />
              </div>

              {/* CATEGORY */}
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={product.category || ''}
                  onValueChange={(value) =>
                    onProductChange({ ...product, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* VARIANTS */}
              <div className="space-y-4">
                <Label>Variants</Label>

                {variants.length === 0 && (
                  <p className="text-sm text-gray-500">No variants added yet.</p>
                )}

                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="grid grid-cols-4 gap-2 items-center border p-2 rounded-md"
                  >
                    {/* SIZE */}
                    <Select
                      value={variant.size || ''}
                      onValueChange={(value) =>
                        updateVariant(variant.id!, { size: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* COLOR */}
                    <Select
                      value={variant.color || ''}
                      onValueChange={(value) =>
                        updateVariant(variant.id!, { color: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Color" />
                      </SelectTrigger>
                      <SelectContent>
                        {colors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* STOCK */}
                    <div>
                      <Label className="text-xs">Stock Quantity</Label>
                      <Input
                        type="number"
                        placeholder="Stock"
                        value={variant.stock_quantity ?? ''}
                        onChange={(e) =>
                          updateVariant(variant.id!, {
                            stock_quantity: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    {/* REMOVE */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVariant(variant.id!)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                <Button variant="outline" onClick={addVariant}>
                  + Add Variant
                </Button>
              </div>

              {/* SAVE BUTTON */}
              <Button onClick={onSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProductForm;
