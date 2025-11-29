'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ProductWithImages } from '@/app/lib/definitions';
import styles from './search.module.css';

interface SearchBarProps {
  className?: string;
}

interface SearchResponse {
  results: ProductWithImages[];
  count: number;
  query: string;
}

export default function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductWithImages[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track analytics events
  const trackEvent = useCallback((eventName: string, eventData?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: eventName,
        ...eventData
      });
    }
  }, []);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    try {
      // Track search initiated event
      trackEvent('search_initiated', {
        search_term: searchQuery,
        search_length: searchQuery.length
      });

      const response = await fetch(
        `/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=8`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setIsOpen(data.results.length > 0);

      // Track no results event
      if (data.results.length === 0) {
        trackEvent('search_no_results', {
          search_term: searchQuery
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [trackEvent]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (query.trim()) {
      // Track search submitted event
      trackEvent('search_submitted', {
        search_term: query.trim(),
        results_count: results.length
      });

      setIsOpen(false);
      router.push(`/catalog?search=${encodeURIComponent(query.trim())}`);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (product: ProductWithImages) => {
    // Track suggestion clicked event
    trackEvent('suggestion_clicked', {
      search_term: query,
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      position: results.findIndex(r => r.id === product.id) + 1
    });

    setQuery('');
    setIsOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          const product = results[selectedIndex];
          handleSuggestionClick(product);
          router.push(`/catalog/${product.category}/${product.slug}`);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Get primary image or first image
  const getPrimaryImage = (product: ProductWithImages) => {
    if (!product.images || product.images.length === 0) {
      return '/images/placeholder-product.svg';
    }
    const primaryImage = product.images.find(img => img.is_primary);
    return primaryImage?.image_url || product.images[0]?.image_url || '/images/placeholder-product.svg';
  };

  return (
    <div ref={wrapperRef} className={`${styles.searchContainer} ${className || ''}`}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Пошук товарів..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={styles.searchInput}
          aria-label="Пошук товарів"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen}
        />
        {isLoading && (
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </form>

      {isOpen && results.length > 0 && (
        <div
          id="search-results"
          className={styles.dropdown}
          role="listbox"
        >
          <ul className={styles.resultsList}>
            {results.map((product, index) => (
              <li
                key={product.id}
                className={`${styles.resultItem} ${
                  index === selectedIndex ? styles.selected : ''
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <Link
                  href={`/catalog/${product.category}/${product.slug}`}
                  onClick={() => handleSuggestionClick(product)}
                  className={styles.resultLink}
                >
                  <div className={styles.productImage}>
                    <Image
                      src={getPrimaryImage(product)}
                      alt={product.name}
                      width={50}
                      height={50}
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>{product.name}</span>
                    <div className={styles.productMeta}>
                      <span className={styles.productPrice}>{product.price} ₴</span>
                      {product.is_on_sale && (
                        <span className={styles.salebadge}>Акція</span>
                      )}
                      {product.is_new && (
                        <span className={styles.newBadge}>Новинка</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {query.trim() && (
            <Link
              href={`/catalog?search=${encodeURIComponent(query.trim())}`}
              className={styles.viewAllLink}
              onClick={() => {
                trackEvent('view_all_results_clicked', {
                  search_term: query,
                  results_count: results.length
                });
                setIsOpen(false);
              }}
            >
              Переглянути всі результати ({results.length}+)
            </Link>
          )}
        </div>
      )}

      {isOpen && query.trim().length >= 3 && results.length === 0 && !isLoading && (
        <div className={styles.dropdown}>
          <div className={styles.noResults}>
            Нічого не знайдено за запитом "{query}"
          </div>
        </div>
      )}
    </div>
  );
}
