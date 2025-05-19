// /app/catalog/components/FilterChip.tsx
import React from 'react';
import styles from '../catalog.module.css';
import { FilterChipProps } from '../types';
import Xclose from '@/app/ui/icons/x-close/x-close';

export const FilterChip: React.FC<FilterChipProps> = ({ label, value, onClick }) => (
  <div className={styles.filterChip} onClick={onClick}>
    <Xclose />
    {label}: {value}
  </div>
);

