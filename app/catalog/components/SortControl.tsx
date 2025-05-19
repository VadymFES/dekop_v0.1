// /app/catalog/components/SortControl.tsx
import React from 'react';
import styles from '../catalog.module.css';
import { SortControlProps } from '../types';

export const SortControl: React.FC<SortControlProps> = ({ sortOption, onChange, disabled }) => (
  <div className={styles.sortAndCount}>
    <label htmlFor="sortSelect" className={styles.sortLabel}>
      Сортувати за:
    </label>
    <select
      id="sortSelect"
      value={sortOption}
      onChange={onChange}
      className={styles.sortSelect}
      disabled={disabled}
    >
      <option value="rating_desc">Популярністю</option>
      <option value="price_asc">Ціною: від низької до високої</option>
      <option value="price_desc">Ціною: від високої до низької</option>
      <option value="reviews_desc">Відгуками</option>
    </select>
  </div>
);

