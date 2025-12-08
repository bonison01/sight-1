export interface Variant {
  id: string;
  size: string;
  color: string;
  stock_quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  offer_price: number | null;
  image_url: string | null;
  image_urls: string[] | null;
  category: string | null;
  features: string[] | null;
  ingredients: string | null;
  offers: string | null;
  stock_quantity: number | null;  // You might want to deprecate or ignore this if variants are used
  is_active: boolean | null;
  featured: boolean | null;
  created_at: string;
  updated_at: string;
  hsn_code?: string | null;
  variants?: Variant[];  // NEW
}
export interface VariantType {
  id: string;
  product_id: string;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  stock_quantity?: number | null;
  image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
