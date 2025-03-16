"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { Cart, CartItem, ProductWithImages } from '@/app/lib/definitions';

// Fetch cart items - Removed 'no-store' to allow caching
const fetchCart = async (): Promise<Cart> => {
  const res = await fetch('/cart/api');
  if (!res.ok) throw new Error('Failed to fetch cart');
  return res.json();
};

// Fetch full product details by slug
const fetchProductDetails = async (slug: string): Promise<ProductWithImages | null> => {
    const res = await fetch(`/api/products/${slug}`, { 
        next: { revalidate: 3600 }, // Cache for 1 hour
        cache: 'force-cache' // Enforce caching
    });
    if (!res.ok) return null;
    return res.json();
};

// Add item to cart
const postAddToCart = async (payload: { productId: string; quantity: number; color?: string }) => {
  const res = await fetch('/cart/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to add item to cart');
  return res.json();
};

// Update cart item quantity
const updateCartAPI = async (id: string, quantity: number) => {
  const res = await fetch(`/cart/api/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Failed to update cart item');
  return res.json();
};

// Remove item from cart
const removeFromCartAPI = async (id: string) => {
  const res = await fetch(`/cart/api/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove item from cart');
  return res.json();
};

// Define the context type
interface CartContextType {
  cart: CartItem[];
  isLoading: boolean;
  error: Error | null;
  addToCart: (payload: { productId: string; quantity: number; color?: string }) => void;
  updateCart: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch cart data
  const { data: cartData, isLoading, error } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: fetchCart,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false, // Prevent refetch on focus
    refetchOnMount: false, // Prevent refetch on mount unless stale
    refetchOnReconnect: false, // Prevent refetch on reconnect
  });

  // Memoize the queries array for product details
  const productQueryConfigs = useMemo(
    () =>
      (cartData?.items || []).map((item: CartItem) => ({
        queryKey: ['product', item.slug],
        queryFn: () => fetchProductDetails(item.slug!),
        enabled: !!item.slug && !!cartData, // Only fetch if slug exists and cart is loaded
        staleTime: 60 * 60 * 1000, // Cache for 1 hour
        gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour (formerly cacheTime)
        refetchOnWindowFocus: false, // Prevent refetch on focus
        refetchOnMount: false, // Prevent refetch on mount unless stale
        refetchOnReconnect: false, // Prevent refetch on reconnect
      })),
    [cartData?.items] // Only re-compute when cart items change
  );

  // Fetch product details for each cart item
  const productQueries = useQueries({ queries: productQueryConfigs });

  // Merge product details into cart items
  const cartWithProducts = useMemo(
    () =>
      (cartData?.items || []).map((item: CartItem, index: number) => ({
        ...item,
        productDetails: productQueries[index]?.data ?? undefined,
      })),
    [cartData?.items, productQueries]
  );

  // Mutation: Add to cart with optimistic updates
  const addToCartMutation = useMutation({
    mutationFn: postAddToCart,
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      
      // Get current data
      const previousCart = queryClient.getQueryData(['cart']) as Cart | undefined;
      
      // Create an optimistic cart item (with a temporary ID)
      const optimisticItem: CartItem = {
        id: `temp-${Date.now()}`, // Temporary ID
        product_id: parseInt(newItem.productId),
        quantity: newItem.quantity,
        color: newItem.color || "",
        // Other fields will be populated when we refetch
        // Add minimum required fields that might be used in UI
        name: "Adding to cart...",
        price: 0,
        image_url: ""
      };
      
      // Optimistically update the cache
      if (previousCart) {
        queryClient.setQueryData(['cart'], {
          ...previousCart,
          items: [...previousCart.items, optimisticItem]
        });
      }
      
      return { previousCart };
    },
    onError: (error, _variables, context) => {
      // If there's an error, roll back to the previous state
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      console.error('Add to cart failed:', error);
    },
    onSettled: () => {
      // Always refetch after mutation to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Mutation: Update cart item quantity with optimistic updates
  const updateCartMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => updateCartAPI(id, quantity),
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      
      const previousCart = queryClient.getQueryData(['cart']) as Cart | undefined;
      
      if (previousCart) {
        const updatedItems = previousCart.items.map(item => 
          item.id === id ? { ...item, quantity } : item
        );
        
        queryClient.setQueryData(['cart'], {
          ...previousCart,
          items: updatedItems
        });
      }
      
      return { previousCart };
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      console.error('Update cart failed:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Mutation: Remove item from cart with optimistic updates
  const removeFromCartMutation = useMutation({
    mutationFn: (id: string) => removeFromCartAPI(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      
      const previousCart = queryClient.getQueryData(['cart']) as Cart | undefined;
      
      if (previousCart) {
        const updatedItems = previousCart.items.filter(item => item.id !== id);
        
        queryClient.setQueryData(['cart'], {
          ...previousCart,
          items: updatedItems
        });
      }
      
      return { previousCart };
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      console.error('Remove from cart failed:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const value: CartContextType = {
    cart: cartWithProducts,
    isLoading,
    error,
    addToCart: addToCartMutation.mutate,
    updateCart: (id: string, quantity: number) => updateCartMutation.mutate({ id, quantity }),
    removeFromCart: (id: string) => removeFromCartMutation.mutate(id),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}