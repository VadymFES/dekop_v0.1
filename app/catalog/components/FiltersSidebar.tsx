// /app/catalog/components/FiltersSidebar.tsx
import React from 'react';
import styles from '../catalog.module.css';
import { FiltersSidebarProps } from '../types';
import { CATEGORY_SLUG_MAP } from '../types';
import { PriceRangeFilter } from './PriceRangeFilter';
import { DOMErrorBoundary } from './DOMErrorBoundary';
import FiltersSkeleton from '../components/ui/FiltersSkeleton/FiltersSkeleton';

// Extended props interface for mobile support
interface ExtendedFiltersSidebarProps extends FiltersSidebarProps {
  isMobile?: boolean;
  isMobileFiltersOpen?: boolean;
  onCloseMobileFilters?: () => void;
}

export const FiltersSidebar: React.FC<ExtendedFiltersSidebarProps> = ({
  loading,
  isCategoryLoading,
  slug,
  filters,
  priceRange,
  finalFilterGroups,
  handleCategoryChange,
  handleFilterChange,
  handlePriceChange,
  isMobile = false,
  isMobileFiltersOpen = false,
  onCloseMobileFilters
}) => {
  
  // Don't render on mobile unless modal is open
  if (isMobile && !isMobileFiltersOpen) {
    return null;
  }

  // Render filter components based on filter groups
  const renderFilters = () => {
    return finalFilterGroups.map(group => {
      if (group.type === "range" && group.range) {
        return (
          <DOMErrorBoundary
            key={group.name}
            componentName="PriceRangeFilter"
            fallback={
              <div style={{ 
                padding: '15px', 
                textAlign: 'center', 
                border: '1px solid #ddd', 
                borderRadius: '6px',
                margin: '10px 0',
                backgroundColor: '#f8f9fa',
                color: '#6c757d'
              }}>
                <p>Фільтр ціни тимчасово недоступний</p>
                <small>Спробуйте оновити сторінку</small>
              </div>
            }
          >
            <PriceRangeFilter
              title="Ціна (грн)"
              priceRange={priceRange}
              filterValues={filters}
              onPriceChange={handlePriceChange}
            />
          </DOMErrorBoundary>
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

  // Determine CSS classes - apply modal class when on mobile and modal is open
  const sidebarClasses = [
    styles.sidebar,
    loading ? styles.loading : '',
    isMobile && isMobileFiltersOpen ? styles.modal : ''
  ].filter(Boolean).join(' ');

  const mainContent = (
    <>
      <div className={styles.categoryContainer}>
        <label htmlFor="categorySelect" className={styles.categorySelectLabel}>
          Оберіть категорію:
        </label>
        <select
          id="categorySelect"
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
  );

  return (
    <aside className={sidebarClasses}>
      {/* Mobile Modal Header - only shown when in modal mode */}
      {isMobile && isMobileFiltersOpen && (
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Фільтри</div>
          <button 
            className={styles.closeButton}
            onClick={onCloseMobileFilters}
            aria-label="Закрити фільтри"
            type="button"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Content area - wrapped in modalContent div when in modal mode */}
      <div className={isMobile && isMobileFiltersOpen ? styles.modalContent : ''}>
        {isCategoryLoading ? ( 
          <FiltersSkeleton />
        ) : (
          mainContent
        )}
      </div>
    </aside>
  );
};