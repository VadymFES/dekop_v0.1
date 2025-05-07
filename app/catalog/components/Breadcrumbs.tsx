// /app/catalog/components/Breadcrumbs.tsx
import React from 'react';
import Link from 'next/link';
import styles from '../catalog.module.css';
import { BreadcrumbsProps } from '../types';

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ title }) => (
  <div className={styles.breadcrumbs}>
    <Link href="/">На головну</Link>
    <span className={styles.breadcrumbSeparator}> / </span>
    <span className={styles.breadcrumbActive}>{title}</span>
  </div>
);

