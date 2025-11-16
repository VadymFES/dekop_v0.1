// /app/catalog/components/FilterModal.tsx
'use client';

import React, { useEffect, useRef, useState, ChangeEvent } from 'react';
import styles from './FilterModal.module.css';
import { FiltersSidebarProps } from '../types';
import { CATEGORY_SLUG_MAP } from '../types';
import { PriceRangeFilter } from './PriceRangeFilter';
import FiltersSkeleton from './ui/FiltersSkeleton/FiltersSkeleton';

interface FilterModalProps extends FiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  loading,
  isCategoryLoading,
  slug,
  filters,
  priceRange,
  finalFilterGroups,
  handleCategoryChange,
  handleFilterChange,
  handlePriceChange
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Local state for temporary filter changes (only applied when "Apply" is clicked)
  const [tempFilters, setTempFilters] = useState(filters);
  const [tempPriceMin, setTempPriceMin] = useState(filters.priceMin);
  const [tempPriceMax, setTempPriceMax] = useState(filters.priceMax);

  // Sync temp filters with actual filters when modal opens or filters change externally
  useEffect(() => {
    if (isOpen) {
      setTempFilters(filters);
      setTempPriceMin(filters.priceMin);
      setTempPriceMax(filters.priceMax);
    }
  }, [isOpen, filters]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus trapping
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab as any);
    return () => modal.removeEventListener('keydown', handleTab as any);
  }, [isOpen]);

  // Handle backdrop click - close without applying
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle local filter changes (not applied to URL yet)
  const handleLocalFilterChange = (e: ChangeEvent<HTMLInputElement>, groupName: string): void => {
    const { value, checked, type } = e.target;
    const key = groupName.toLowerCase() as keyof typeof tempFilters;

    if (type === "checkbox" && Array.isArray(tempFilters[key])) {
      const currentValues = [...(tempFilters[key] as string[])];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);

      setTempFilters(prev => ({ ...prev, [key]: newValues }));
    } else if (type === "radio") {
      setTempFilters(prev => ({ ...prev, [key]: checked ? value : null }));
    }
  };

  // Handle local price changes (not applied to URL yet)
  const handleLocalPriceChange = (thumb: "min" | "max", value: number): void => {
    if (thumb === "min") {
      setTempPriceMin(value);
    } else {
      setTempPriceMax(value);
    }
  };

  // Apply all temporary filters to the actual URL
  const handleApplyClick = () => {
    // Apply all filter changes
    Object.keys(tempFilters).forEach(key => {
      const filterKey = key as keyof typeof tempFilters;
      if (filterKey !== 'priceMin' && filterKey !== 'priceMax' && tempFilters[filterKey] !== filters[filterKey]) {
        handleFilterChange({
          target: {
            value: Array.isArray(tempFilters[filterKey]) ? tempFilters[filterKey] : tempFilters[filterKey],
            checked: true,
            type: Array.isArray(tempFilters[filterKey]) ? 'checkbox' : 'radio'
          }
        } as any, key.charAt(0).toUpperCase() + key.slice(1));
      }
    });

    // Apply price changes
    if (tempPriceMin !== filters.priceMin || tempPriceMax !== filters.priceMax) {
      handlePriceChange('min', tempPriceMin);
      handlePriceChange('max', tempPriceMax);
    }

    onApply();
    onClose();
  };

  // Reset temporary filters
  const handleResetClick = () => {
    setTempFilters({
      status: [],
      type: [],
      material: [],
      complectation: [],
      facadeMaterial: [],
      tabletopShape: [],
      size: null,
      backrest: null,
      hardness: null,
      specifics: null,
      priceMin: priceRange.min,
      priceMax: priceRange.max
    });
    setTempPriceMin(priceRange.min);
    setTempPriceMax(priceRange.max);
    onReset();
  };

  // Render filter components based on filter groups (using temp state)
  const renderFilters = () => {
    return finalFilterGroups.map(group => {
      if (group.type === "range" && group.range) {
        // Use temporary price values
        const tempPriceRange = { min: priceRange.min, max: priceRange.max };
        const tempFilterValues = { ...tempFilters, priceMin: tempPriceMin, priceMax: tempPriceMax };

        return (
          <PriceRangeFilter
            key={group.name}
            title="Ціна (грн)"
            priceRange={tempPriceRange}
            filterValues={tempFilterValues}
            onPriceChange={handleLocalPriceChange}
          />
        );
      } else if ((group.type === "checkbox" || group.type === "radio") && group.options) {
        const groupTitles: Record<string, string> = {
          'Status': 'Популярні фільтри',
          'Type': 'Тип',
          'Material': 'Матеріал',
          'Complectation': 'Комплектація',
          'Size': 'Розмір'
        };

        return (
          <div key={group.name} className={styles.filterSection}>
            <h3 className={styles.filterTitle}>{groupTitles[group.name] || group.name}</h3>
            <ul className={styles.filterList}>
              {group.options.map(opt => (
                <li key={opt.id} className={styles.filterItem}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type={group.type}
                      value={opt.value}
                      checked={
                        group.type === "checkbox"
                          ? (tempFilters[group.name.toLowerCase() as keyof typeof tempFilters] as string[])?.includes(opt.value)
                          : tempFilters[group.name.toLowerCase() as keyof typeof tempFilters] === opt.value
                      }
                      onChange={e => handleLocalFilterChange(e, group.name)}
                      className={styles.checkbox}
                    />
                    {opt.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      }
      return null;
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="filter-modal-title">
        <div className={styles.header}>
          <h2 id="filter-modal-title" className={styles.title}>Фільтри</h2>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрити фільтри"
            type="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {isCategoryLoading ? (
            <FiltersSkeleton />
          ) : (
            <>
              <div className={styles.categoryContainer}>
                <label htmlFor="categorySelectModal" className={styles.categorySelectLabel}>
                  Оберіть категорію:
                </label>
                <select
                  id="categorySelectModal"
                  value={slug}
                  onChange={handleCategoryChange}
                  className={styles.categorySelect}
                >
                  <option value="">Всі категорії</option>
                  {Object.keys(CATEGORY_SLUG_MAP).map(catKey => (
                    <option key={catKey} value={catKey}>
                      {CATEGORY_SLUG_MAP[catKey]?.uaName || catKey}
                    </option>
                  ))}
                </select>
              </div>
              {renderFilters()}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.resetButton}
            onClick={handleResetClick}
            type="button"
          >
            Скинути фільтри
          </button>
          <button
            className={styles.applyButton}
            onClick={handleApplyClick}
            type="button"
          >
            Застосувати
          </button>
        </div>
      </div>
    </div>
  );
};
