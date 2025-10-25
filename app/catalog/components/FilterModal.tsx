import React, { ChangeEvent } from 'react';
import styles from './filterModal.module.css';
import { PriceRangeFilter } from './PriceRangeFilter';
import { DOMErrorBoundary } from './DOMErrorBoundary';
import { CATEGORY_SLUG_MAP } from '../types';
import { FilterGroup, FiltersState, PriceRange } from '@/app/lib/definitions';

// Props for the FilterModal, similar to FiltersSidebar but with modal controls
export interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  isCategoryLoading: boolean;
  slug: string | null;
  filters: FiltersState;
  priceRange: PriceRange;
  finalFilterGroups: FilterGroup[];
  handleCategoryChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleFilterChange: (e: ChangeEvent<HTMLInputElement>, groupName: string) => void;
  handlePriceChange: (thumb: "min" | "max", value: number) => void;
  clearAllFilters: () => void; // Added for the "Clear Filters" button
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  loading,
  isCategoryLoading,
  slug,
  filters,
  priceRange,
  finalFilterGroups,
  handleCategoryChange,
  handleFilterChange,
  handlePriceChange,
  clearAllFilters,
}) => {
  if (!isOpen) {
    return null;
  }

  const renderFilters = (group: FilterGroup) => {
    const key = group.name.toLowerCase();

    if (group.type === 'range' && group.range) {
      return (
        <DOMErrorBoundary
          key={group.name}
          componentName="PriceRangeFilter (Modal)"
          fallback={
            <div style={{ 
              padding: '10px', 
              textAlign: 'center', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              margin: '5px 0',
              backgroundColor: '#f8f9fa',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              <p>Фільтр ціни недоступний</p>
            </div>
          }
        >
          <PriceRangeFilter
            title={group.name} // Use group name as title
            priceRange={group.range} // Pass the group's range object
            filterValues={filters}  // Pass the main filters state
            onPriceChange={handlePriceChange} // Pass the handler
          />
        </DOMErrorBoundary>
      );
    }

    if (group.type === 'checkbox' || group.type === 'radio' || group.type === 'color') {
      return group.options?.map(option => (
        <div key={option.id} className={styles.filterOption}>
          <input
            type={group.type === 'color' ? 'radio' : group.type} // Treat color as radio for now
            id={option.id}
            name={group.name}
            value={option.value}
            checked={
              Array.isArray(filters[key as keyof FiltersState])
                ? (filters[key as keyof FiltersState] as string[])?.includes(option.value)
                : filters[key as keyof FiltersState] === option.value
            }
            onChange={e => handleFilterChange(e, group.name)}
            disabled={loading}
            className={styles.input}
          />
          {group.type === 'color' ? (
            <label htmlFor={option.id} className={styles.colorLabel} title={option.name}>
              <span style={{ backgroundColor: option.value }} className={styles.colorSwatch}></span>
            </label>
          ) : (
            <label htmlFor={option.id} className={styles.label}>
              {option.name}
            </label>
          )}
        </div>
      ));
    }
    return null;
  };

  return (
    <div className={`${styles.modalOverlay} ${isOpen ? styles.open : ''}`}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Фільтри</h2>
          <button onClick={onClose} className={styles.closeButton}>
          </button>
        </div>

        <div className={styles.modalBody}>
            <>
              <div className={styles.filterGroup}>
                <label htmlFor="category-select-modal" className={styles.groupTitle}>Категорія:</label>
                <select
                  id="category-select-modal"
                  value={slug || ""}
                  onChange={handleCategoryChange}
                  disabled={isCategoryLoading || loading}
                  className={styles.select}
                >
                  <option value="">Всі категорії</option>
                  {Object.entries(CATEGORY_SLUG_MAP).map(([key, { uaName }]) => (
                    <option key={key} value={key}>
                      {uaName}
                    </option>
                  ))}
                </select>
              </div>

              {finalFilterGroups.map(group => (
                <div key={group.name} className={styles.filterGroup}>
                  <h4 className={styles.groupTitle}>{group.name}</h4>
                  {renderFilters(group)}
                </div>
              ))}
            </>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.applyButton} onClick={onClose} disabled={loading}>
            Застосувати
          </button>
          <button className={styles.clearButton} onClick={clearAllFilters} disabled={loading}>
            Очистити все
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
