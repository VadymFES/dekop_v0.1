'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ProductWithImages } from '@/app/lib/definitions';
import { CategorySuggestion, FilterSuggestion } from '@/app/lib/search-keywords';
import styles from './search.module.css';

interface SearchBarProps {
  className?: string;
}

interface SearchResponse {
  results: ProductWithImages[];
  count: number;
  query: string;
  suggestions: {
    categories: CategorySuggestion[];
    filters: FilterSuggestion[];
  };
}

export default function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductWithImages[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[]>([]);
  const [filterSuggestions, setFilterSuggestions] = useState<FilterSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const pathname = usePathname();
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
    console.log('[SearchBar] performSearch called with:', searchQuery);

    if (searchQuery.trim().length < 3) {
      console.log('[SearchBar] Query too short, skipping search');
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      console.log('[SearchBar] Aborting previous request');
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    console.log('[SearchBar] Starting search request');

    try {
      // Track search initiated event
      trackEvent('search_initiated', {
        search_term: searchQuery,
        search_length: searchQuery.length
      });

      const url = `/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=8`;
      console.log('[SearchBar] Fetching:', url);

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });

      console.log('[SearchBar] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SearchBar] Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      console.log('[SearchBar] Response data:', {
        resultsCount: data.results?.length || 0,
        categoriesCount: data.suggestions?.categories?.length || 0,
        filtersCount: data.suggestions?.filters?.length || 0,
        query: data.query
      });
      setResults(data.results);
      setCategorySuggestions(data.suggestions?.categories || []);
      setFilterSuggestions(data.suggestions?.filters || []);

      // Show dropdown if there are results or suggestions
      const hasSuggestions = (data.results.length > 0) ||
                            (data.suggestions?.categories.length > 0) ||
                            (data.suggestions?.filters.length > 0);
      setIsOpen(hasSuggestions);

      // Track no results event
      if (data.results.length === 0 && !hasSuggestions) {
        trackEvent('search_no_results', {
          search_term: searchQuery
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[SearchBar] Request aborted');
      } else {
        console.error('[SearchBar] Search error:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        setResults([]);
        setCategorySuggestions([]);
        setFilterSuggestions([]);
      }
    } finally {
      setIsLoading(false);
      console.log('[SearchBar] Search request completed');
    }
  }, [trackEvent]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('[SearchBar] Input changed:', value);
    setQuery(value);
    setSelectedIndex(-1);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      console.log('[SearchBar] Debounce timer fired, performing search');
      performSearch(value);
    }, 600);
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

      // Clear search after navigation (pathname change will also clear it)
      setQuery('');
      setResults([]);
      setCategorySuggestions([]);
      setFilterSuggestions([]);
      setSelectedIndex(-1);
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

    // Clear all search state (pathname change will also clear it)
    setQuery('');
    setResults([]);
    setCategorySuggestions([]);
    setFilterSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle category suggestion click
  const handleCategorySuggestionClick = (category: CategorySuggestion) => {
    // Track category suggestion clicked event
    trackEvent('category_suggestion_clicked', {
      search_term: query,
      category_slug: category.slug,
      category_name: category.name
    });

    // Clear all search state (pathname change will also clear it)
    setQuery('');
    setResults([]);
    setCategorySuggestions([]);
    setFilterSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    router.push(`/catalog?category=${category.slug}`);
  };

  // Handle filter suggestion click
  const handleFilterSuggestionClick = (filter: FilterSuggestion) => {
    // Track filter suggestion clicked event
    trackEvent('filter_suggestion_clicked', {
      search_term: query,
      filter_type: filter.type,
      filter_value: filter.value,
      filter_label: filter.label
    });

    // Clear all search state (pathname change will also clear it)
    setQuery('');
    setResults([]);
    setCategorySuggestions([]);
    setFilterSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);

    // Build URL with the filter applied
    const params = new URLSearchParams();
    params.append(filter.type, filter.value);
    router.push(`/catalog?${params.toString()}`);
  };

  // Handle input focus - reopen dropdown if there are existing results
  const handleFocus = () => {
    console.log('[SearchBar] Input focused');

    // Reopen dropdown if there are existing results or suggestions and query is valid
    if (query.trim().length >= 3) {
      const hasSuggestions = (results.length > 0) ||
                            (categorySuggestions.length > 0) ||
                            (filterSuggestions.length > 0);

      if (hasSuggestions) {
        console.log('[SearchBar] Reopening dropdown with existing results');
        setIsOpen(true);
      }
    }
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

  // Clear search bar when navigating to a different page
  useEffect(() => {
    console.log('[SearchBar] Pathname changed, clearing search');
    setQuery('');
    setResults([]);
    setCategorySuggestions([]);
    setFilterSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [pathname]);

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
          onFocus={handleFocus}
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

      {isOpen && (categorySuggestions.length > 0 || filterSuggestions.length > 0 || results.length > 0) && (
        <div
          id="search-results"
          className={styles.dropdown}
          role="listbox"
        >
          {/* Category Suggestions */}
          {categorySuggestions.length > 0 && (
            <div className={styles.suggestionsSection}>
              <div className={styles.suggestionsHeader}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 3C2 2.44772 2.44772 2 3 2H6C6.55228 2 7 2.44772 7 3V6C7 6.55228 6.55228 7 6 7H3C2.44772 7 2 6.55228 2 6V3Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 3C9 2.44772 9.44772 2 10 2H13C13.5523 2 14 2.44772 14 3V6C14 6.55228 13.5523 7 13 7H10C9.44772 7 9 6.55228 9 6V3Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 10C2 9.44772 2.44772 9 3 9H6C6.55228 9 7 9.44772 7 10V13C7 13.5523 6.55228 14 6 14H3C2.44772 14 2 13.5523 2 13V10Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 10C9 9.44772 9.44772 9 10 9H13C13.5523 9 14 9.44772 14 10V13C14 13.5523 13.5523 14 13 14H10C9.44772 14 9 13.5523 9 13V10Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>Категорії</span>
              </div>
              <ul className={styles.suggestionsList}>
                {categorySuggestions.map((category, index) => (
                  <li key={`cat-${index}`} className={styles.suggestionItem}>
                    <button
                      onClick={() => handleCategorySuggestionClick(category)}
                      className={styles.suggestionButton}
                    >
                      <span className={styles.suggestionLabel}>{category.name}</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Filter Suggestions */}
          {filterSuggestions.length > 0 && (
            <div className={styles.suggestionsSection}>
              <div className={styles.suggestionsHeader}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 2L6 7V12L10 14V7L14 2H2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Фільтри</span>
              </div>
              <ul className={styles.suggestionsList}>
                {filterSuggestions.map((filter, index) => (
                  <li key={`filter-${index}`} className={styles.suggestionItem}>
                    <button
                      onClick={() => handleFilterSuggestionClick(filter)}
                      className={styles.suggestionButton}
                    >
                      <span className={styles.suggestionLabel}>{filter.label}</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Product Results */}
          {results.length > 0 && (
            <>
              {(categorySuggestions.length > 0 || filterSuggestions.length > 0) && (
                <div className={styles.suggestionsHeader} style={{ marginTop: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 14L10 10M11.3333 6.66667C11.3333 9.244 9.244 11.3333 6.66667 11.3333C4.08934 11.3333 2 9.244 2 6.66667C2 4.08934 4.08934 2 6.66667 2C9.244 2 11.3333 4.08934 11.3333 6.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Товари</span>
                </div>
              )}
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
            </>
          )}

          {query.trim() && results.length > 0 && (
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

      {isOpen && query.trim().length >= 3 && results.length === 0 && categorySuggestions.length === 0 && filterSuggestions.length === 0 && !isLoading && (
        <div className={styles.dropdown}>
          <div className={styles.noResults}>
            Нічого не знайдено за запитом "{query}"
          </div>
        </div>
      )}
    </div>
  );
}
