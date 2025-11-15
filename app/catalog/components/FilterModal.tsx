// /app/catalog/components/FilterModal.tsx
'use client';

import React, { useEffect, useRef } from 'react';
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

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleApplyClick = () => {
    onApply();
    onClose();
  };

  // Render filter components based on filter groups
  const renderFilters = () => {
    return finalFilterGroups.map(group => {
      if (group.type === "range" && group.range) {
        return (
          <PriceRangeFilter
            key={group.name}
            title="Ціна (грн)"
            priceRange={priceRange}
            filterValues={filters}
            onPriceChange={handlePriceChange}
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
                          ? (filters[group.name.toLowerCase() as keyof typeof filters] as string[])?.includes(opt.value)
                          : filters[group.name.toLowerCase() as keyof typeof filters] === opt.value
                      }
                      onChange={e => handleFilterChange(e, group.name)}
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
            onClick={onReset}
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
