// hooks/useCart.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const fetchCart = async () => {
  const res = await fetch('/api/cart');
  return res.json();
};

const postAddToCart = async (payload: { productId: string; quantity: number; color?: string }) => {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export function useCart() {
  const queryClient = useQueryClient();

  // Get cart using the new object syntax
  const { data, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
  });

  // Add to cart using the new object syntax for mutations
  const addToCartMutation = useMutation({
    mutationFn: postAddToCart,
    onSuccess: () => {
      // Refetch the cart data after mutation succeeds
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return {
    cart: data?.items || [],
    isLoading,
    error,
    addToCart: addToCartMutation.mutate, // call mutate({ productId, quantity, color }) to add
  };
}
