import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { Cart, CartItem, ProductWithImages } from '@/app/lib/definitions';

// Fetch cart items (ensure your API returns an object matching the Cart interface)
const fetchCart = async (): Promise<Cart> => {
  const res = await fetch('/api/cart');
  if (!res.ok) throw new Error('Failed to fetch cart');
  return res.json();
};

// Fetch full product details by slug instead of product ID.
const fetchProductDetails = async (slug: string): Promise<ProductWithImages | null> => {
  const res = await fetch(`/api/products/${slug}`);
  if (!res.ok) return null;
  return res.json();
};

// Add item to cart
const postAddToCart = async (payload: { productId: string; quantity: number; color?: string }) => {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

// Update cart item quantity
const updateCartAPI = async (id: number, quantity: number) => {
  const res = await fetch(`/api/cart/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  return res.json();
};

// Remove item from cart
const removeFromCartAPI = async (id: number) => {
  const res = await fetch(`/api/cart/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export function useCart() {
  const queryClient = useQueryClient();

  // Fetch cart data; ensure it matches your Cart interface
  const { data: cartData, isLoading, error } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: fetchCart,
  });

  // For each cart item, fetch the full product details using its slug.
  const productQueries = useQueries({
    queries: (cartData?.items || []).map((item: CartItem) => ({
      queryKey: ['product', item.slug],
      queryFn: () => fetchProductDetails(item.slug!),
      enabled: !!item.slug,
    })),
  });

  // Merge product details into each cart item.
  const cartWithProducts: CartItem[] = (cartData?.items || []).map((item: CartItem, index: number) => ({
    ...item,
    productDetails: productQueries[index]?.data ?? undefined, 
  }));

  // Mutation: Add to cart
  const addToCartMutation = useMutation({
    mutationFn: postAddToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Mutation: Update cart item quantity
  const updateCartMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => updateCartAPI(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Mutation: Remove item from cart
  const removeFromCartMutation = useMutation({
    mutationFn: (id: number) => removeFromCartAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return {
    cart: cartWithProducts, // Each CartItem now includes productDetails (if available)
    isLoading,
    error,
    addToCart: addToCartMutation.mutate,
    updateCart: (id: number, quantity: number) => updateCartMutation.mutate({ id, quantity }),
    removeFromCart: (id: number) => removeFromCartMutation.mutate(id),
  };
}
