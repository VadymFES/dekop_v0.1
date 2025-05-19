// /app/catalog/page.tsx
import React, { Suspense } from 'react';
import CatalogContent from './CatalogContent.tsx';

export default function CatalogPage(): React.ReactElement {
  return (
    <Suspense >
      <CatalogContent />
    </Suspense>
  );
}