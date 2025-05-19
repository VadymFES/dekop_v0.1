// /app/catalog/components/FiltersSidebar.tsx
import React from 'react';
import styles from '../catalog.module.css';
import { FiltersSidebarProps } from '../types';
import { CATEGORY_SLUG_MAP } from '../types';
import { PriceRangeFilter } from './PriceRangeFilter';
import FiltersSkeleton from '../components/ui/FiltersSkeleton/FiltersSkeleton';

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
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

  return (
    <aside className={`${styles.sidebar} ${loading ? styles.loading : ""}`}>
      {isCategoryLoading ? ( 
        <FiltersSkeleton />
      ) : (
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
      )}
    </aside>
  );
};

