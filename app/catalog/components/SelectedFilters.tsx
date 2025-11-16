// /app/catalog/components/SelectedFilters.tsx
import React, { ReactNode } from 'react';
import styles from '../catalog.module.css';
import { FURNITURE_FILTERS } from "@/app/lib/definitions";
import { FilterChip } from './FilterChip';
import { SelectedFiltersProps } from '../types';

export const SelectedFilters: React.FC<SelectedFiltersProps> = ({
  filters,
  priceRange,
  slug,
  clearFilter,
  clearAllFilters,
}) => {

  const filterChips: ReactNode[] = [];
  
  // Status filters
  filters.status?.forEach(status => {
    const statusNames: Record<string, string> = {
      'new': 'Новинки',
      'on_sale': 'Акційні',
      'bestseller': 'Популярні'
    };
    filterChips.push(
      <FilterChip 
        key={`status-${status}`}
        label="Популярні фільтри"
        value={statusNames[status] || status}
        onClick={() => clearFilter("Status", status)}
      />
    );
  });

  // Price filter
  if (filters.priceMin > priceRange.min || filters.priceMax < priceRange.max) {
    filterChips.push(
      <FilterChip
        key="price"
        label="Ціна"
        value={`${Math.floor(filters.priceMin)} - ${Math.floor(filters.priceMax)} грн`}
        onClick={() => {
          // Reset price filter to full range
          clearFilter("Price", "range");
        }}
      />
    );
  }

  // Type filters
  filters.type?.forEach(type => {
    const typeFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "type");
    const typeName = typeFilter?.options?.find(o => o.value === type)?.name || type;
    
    filterChips.push(
      <FilterChip
        key={`type-${type}`}
        label="Тип"
        value={typeName}
        onClick={() => clearFilter("Type", type)}
      />
    );
  });

  // Material filters
  filters.material?.forEach(material => {
    const materialFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "material");
    const materialName = materialFilter?.options?.find(o => o.value === material)?.name || material;
    
    filterChips.push(
      <FilterChip
        key={`material-${material}`}
        label="Матеріал"
        value={materialName}
        onClick={() => clearFilter("Material", material)}
      />
    );
  });

  // Complectation filters
  filters.complectation?.forEach(feature => {
    const complectationFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "complectation");
    const featureName = complectationFilter?.options?.find(o => o.value === feature)?.name || feature;
    
    filterChips.push(
      <FilterChip
        key={`complectation-${feature}`}
        label="Комплектація"
        value={featureName}
        onClick={() => clearFilter("Complectation", feature)}
      />
    );
  });

  // Size filter
  if (filters.size) {
    const sizeFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "size");
    const sizeName = sizeFilter?.options?.find(o => o.value === filters.size)?.name || filters.size;
    
    filterChips.push(
      <FilterChip
        key="size"
        label="Розмір"
        value={sizeName}
        onClick={() => filters.size && clearFilter("Size", filters.size)}
      />
    );
  }

  return filterChips.length > 0 ? (
    <div className={styles.selectedFilters}>
      {filterChips}
      <button onClick={clearAllFilters} className={styles.clearAllFilters}>
        Очистити всі фільтри
      </button>
    </div>
  ) : null;
};

