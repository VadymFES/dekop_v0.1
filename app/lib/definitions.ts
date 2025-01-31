// definition of the Product and ProductImage interfaces
export interface Product {
    id: number; // Unique identifier for the product
    name: string; // Name of the product
    slug: string; // URL-friendly slug of the product
    description: string; // Detailed description of the product
    category: string; // Category (e.g., sofa, table, chair)
    price: number; // Price of the product
    stock: number; // Quantity available in stock
    rating: number; // Average rating of the product
    is_on_sale: boolean; // Indicates if the product is on sale
    is_new: boolean; // Indicates if the product is a new arrival
    is_bestseller: boolean; // Indicates if the product is a bestseller
    created_at: string; // Timestamp when the product was created
    updated_at: string; // Timestamp when the product was last updated
  };

  export interface ProductImage{
    id: number; // Unique identifier for the image
    product_id: number; // Add the productId property
    image_url: string; // URL of the image
    alt: string; // Alt text for the image
    created_at: string; // Timestamp when the image was created
    updated_at: string; // Timestamp when the image was last updated
  };
  
  export interface ProductWithImages extends Product {
    images: ProductImage[];
  }