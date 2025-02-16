// app/lib/definitions.ts

export interface Product {
  id: number;               // Unique identifier for the product
  name: string;             // Name of the product
  slug: string;             // URL-friendly slug of the product
  description: string;      // Detailed description of the product
  category: string;         // Category (e.g., sofa, table, chair)
  price: number;            // Price of the product
  stock: number;            // Quantity available in stock
  rating: number;           // Average rating of the product
  is_on_sale: boolean;      // Indicates if the product is on sale
  is_new: boolean;          // Indicates if the product is a new arrival
  is_bestseller: boolean;   // Indicates if the product is a bestseller
  created_at: string;       // Timestamp when the product was created
  updated_at: string;       // Timestamp when the product was last updated
}

export interface ProductImage {
  id: number;               // Unique identifier for the image
  product_id: number;       // Identifier linking the image to the product
  image_url: string;        // URL of the image
  alt: string;              // Alt text for the image
  created_at: string;       // Timestamp when the image was created
  updated_at: string;       // Timestamp when the image was last updated
}

export interface ProductSpecs {
  id: number;               // Unique identifier for the product specs row
  product_id: number;       // Identifier linking to the product
  construction: string;     // Construction type (e.g., Єврокнижка)
  dimensions: {
    length: number;         // Length in millimeters
    depth: number;          // Depth in millimeters
    height: number;         // Height in millimeters
    sleeping_area: {
      width: number;        // Width in millimeters
      length: number;       // Length in millimeters
    };
  };
    material: {
      type: string;           // Material type (e.g., мікровелюр)
      composition: string;    // Material composition (e.g., поліестер 100%)
      backrest_filling: string;        // Material filling (e.g., холлофайбер)
      covers: string;         // Material covers (e.g., знімні)
    };
    inner_material: {
      structure: string;     // Inner material structure (e.g., пружинний блок)
      cushion_filling: string;        // Cushions filling (e.g., пінополіуретан)
      // Note: the single "color" column has been removed from product_specs,
      // since colors now come from the separate table.
    };
    additional_features: string;  // Additional information about the product
  };

// New interface for a color, representing a row in product_spec_colors.
export interface ProductColor {
  color: string;
  product_id: number;
  image_url: string;
}

// Extend the product interface to include images, specs, and an optional array of colors.
export interface ProductWithImages extends Product {
  images: ProductImage[];
  specs: ProductSpecs;
  // Colors are now stored in a separate table and returned as an array.
  colors: ProductColor[];
}

export interface Review {
  id: number;               // Unique identifier for the review
  product_id: number;       // Identifier linking the review to the product
  user_name: string;        // Name of the reviewer
  rating: number;           // Rating given by the reviewer (1-5)
  comment: string;          // Review comment
  created_at: string;       // Timestamp when the review was created
}

export interface CartItem {
  id: string; // Unique cart item ID
  product_id: number;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  color?: string;
  image_url?: string;
  productDetails?: ProductWithImages;
}

export interface Cart {
  id: string; // Cart ID (from the cookie)
  items: CartItem[];
  total_items: number;
  total_price: number;
}