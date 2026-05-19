"use client";

import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { Cart, CartItem, ProductWithImages } from '@/app/lib/definitions';


const fetchCart = async (): Promise<Cart> => {
  const res = await fetch('/api/cart', {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch cart');
  return res.json();
};

const fetchProductDetails = async (slug: string): Promise<ProductWithImages | null> => {
    const res = await fetch(`/api/products/${slug}`, {
        next: { revalidate: 3600 },
        cache: 'force-cache'
    });
    if (!res.ok) return null;
    return res.json();
};

const postAddToCart = async (payload: { productId: string; quantity: number; color?: string }) => {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to add item to cart');
  return res.json();
};

const updateCartAPI = async (id: string, quantity: number) => {
  const res = await fetch(`/api/cart/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) throw new Error('Failed to update cart item');
  return res.json();
};

const removeFromCartAPI = async (id: string) => {
  const res = await fetch(`/api/cart/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove item from cart');
  return res.json();
};

const clearCartAPI = async () => {
  const res = await fetch('/api/cart', {
    method: 'DELETE',
  });

  const responseText = await res.text();

  if (!res.ok) {
    console.error('[CartContext] Failed to clear cart:', {
      status: res.status,
      statusText: res.statusText,
      body: responseText
    });
    throw new Error(`Failed to clear cart: ${res.status} ${res.statusText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch (e) {
    console.error('[CartContext] Failed to parse response as JSON:', responseText);
    return { success: true };
  }
};

interface CartContextType {
  cart: CartItem[];
  isLoading: boolean;
  error: Error | null;
  addToCart: (payload: { productId: string; quantity: number; color?: string }) => void;
  updateCart: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [isAdminSubdomain, setIsAdminSubdomain] = useState(false);
  const [hasCheckedSubdomain, setHasCheckedSubdomain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isAdmin = hostname.startsWith('admin.') || hostname === 'admin.dekop.com.ua';
      setIsAdminSubdomain(isAdmin);
      setHasCheckedSubdomain(true);
    }
  }, []);

  const isAdminRoute = isAdminSubdomain;
  const isComingSoonRoute = pathname === '/coming-soon' || pathname?.startsWith('/coming-soon/');
  const shouldEnableCartQueries = hasCheckedSubdomain && !isAdminRoute && !isComingSoonRoute;

  const { data: cartData, isLoading, error } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: fetchCart,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    enabled: shouldEnableCartQueries,
  });

  const productQueryConfigs = useMemo(
    () =>
      (cartData?.items || []).map((item: CartItem) => ({
        queryKey: ['product', item.slug],
        queryFn: () => fetchProductDetails(item.slug!),
        enabled: !!item.slug && !!cartData && shouldEnableCartQueries,
        staleTime: 60 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      })),
    [cartData?.items, shouldEnableCartQueries]
  );

  const productQueries = useQueries({ queries: productQueryConfigs });

  const cartWithProducts = useMemo(
    () =>
      (cartData?.items || []).map((item: CartItem, index: number) => ({
        ...item,
        productDetails: productQueries[index]?.data ?? undefined,
      })),
    [cartData?.items, productQueries]
  );

  const addToCartMutation = useMutation({
    mutationFn: postAddToCart,
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']) as Cart | undefined;
      const optimisticItem: CartItem = {
        id: `temp-${Date.now()}`,
        product_id: parseInt(newItem.productId),
        quantity: newItem.quantity,
        color: newItem.color || "",
        name: "Adding to cart...",
        price: 0,
        image_url: ""
      };
      if (previousCart) {
        queryClient.setQueryData(['cart'], {
          ...previousCart,
          items: [...previousCart.items, optimisticItem]
        });
      }
      return { previousCart, newItem };
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      console.error('Add to cart failed:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

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

  const clearCartMutation = useMutation({
    mutationFn: clearCartAPI,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']) as Cart | undefined;
      queryClient.setQueryData(['cart'], { items: [] });
      return { previousCart };
    },
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      console.error('Clear cart failed:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const effectiveIsLoading = !hasCheckedSubdomain || isLoading;

  const value: CartContextType = {
    cart: cartWithProducts,
    isLoading: effectiveIsLoading,
    error,
    addToCart: addToCartMutation.mutate,
    updateCart: (id: string, quantity: number) => updateCartMutation.mutate({ id, quantity }),
    removeFromCart: (id: string) => removeFromCartMutation.mutate(id),
    clearCart: () => clearCartMutation.mutate(),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const defaultCartContext: CartContextType = {
  cart: [],
  isLoading: true,
  error: null,
  addToCart: () => {},
  updateCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    if (typeof window !== 'undefined') {
      throw new Error('useCart must be used within a CartProvider');
    }
    return defaultCartContext;
  }
  return context;
}