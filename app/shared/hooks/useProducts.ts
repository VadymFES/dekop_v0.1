import useSWR from 'swr';
import { ProductWithImages } from '@/app/lib/definitions';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseProductsOptions {
  // Future: can add filters, sorting, pagination options here
  limit?: number;
  category?: string;
}

interface UseProductsReturn {
  products: ProductWithImages[] | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

/**
 * Shared hook for fetching products using SWR
 * @param options Optional configuration for fetching products
 * @returns Products data, loading state, error, and mutate function
 */
export function useProducts(options?: UseProductsOptions): UseProductsReturn {
  const { data, error, mutate } = useSWR<ProductWithImages[]>(
    '/api/products',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    products: data,
    isLoading: !error && !data,
    error,
    mutate,
  };
}
