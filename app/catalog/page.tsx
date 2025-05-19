// /app/catalog/page.tsx
import React, { Suspense } from 'react';
import styles from './catalog.module.css';
import CatalogContent from './CatalogContent.tsx';

export default function CatalogPage(): React.ReactElement {
  return (
    <Suspense >
      <CatalogContent />
    </Suspense>
  );
}