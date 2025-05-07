// /app/catalog/page.tsx
import React, { Suspense } from 'react';
import styles from './catalog.module.css';
import CatalogContent from './CatalogContent';

export default function CatalogPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading catalog...</div>}>
      <CatalogContent />
    </Suspense>
  );
}