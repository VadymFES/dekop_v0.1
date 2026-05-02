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
  
  const statusNames: Record<string, string> = {
    'new': 'Новинки',
    'on_sale': 'Акційні',
    'bestseller': 'Популярні'
  };

  // Status filters — grouped into one chip
  if (filters.status.length > 0) {
    const labels = filters.status.map(s => statusNames[s] || s).join(', ');
    filterChips.push(
      <FilterChip
        key="status"
        label="Популярні фільтри"
        value={labels}
        onClick={() => clearFilter("Status", "")}
      />
    );
  }

  // Price filter
  if (filters.priceMin > priceRange.min || filters.priceMax < priceRange.max) {
    filterChips.push(
      <FilterChip
        key="price"
        label="Ціна"
        value={`${Math.floor(filters.priceMin)} - ${Math.floor(filters.priceMax)} грн`}
        onClick={() => clearFilter("Price", "range")}
      />
    );
  }

  // Type filters — grouped into one chip
  if (filters.type.length > 0) {
    const typeFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "type");
    const labels = filters.type
      .map(t => typeFilter?.options?.find(o => o.value === t)?.name || t)
      .join(', ');
    filterChips.push(
      <FilterChip
        key="type"
        label="Тип"
        value={labels}
        onClick={() => clearFilter("Type", "")}
      />
    );
  }

  // Material filters — grouped into one chip
  if (filters.material.length > 0) {
    const materialFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "material");
    const labels = filters.material
      .map(m => materialFilter?.options?.find(o => o.value === m)?.name || m)
      .join(', ');
    filterChips.push(
      <FilterChip
        key="material"
        label="Матеріал"
        value={labels}
        onClick={() => clearFilter("Material", "")}
      />
    );
  }

  // Complectation filters — grouped into one chip
  if (filters.complectation.length > 0) {
    const complectationFilter = FURNITURE_FILTERS[slug]?.find(g => g.name.toLowerCase() === "complectation");
    const labels = filters.complectation
      .map(f => complectationFilter?.options?.find(o => o.value === f)?.name || f)
      .join(', ');
    filterChips.push(
      <FilterChip
        key="complectation"
        label="Комплектація"
        value={labels}
        onClick={() => clearFilter("Complectation", "")}
      />
    );
  }

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

