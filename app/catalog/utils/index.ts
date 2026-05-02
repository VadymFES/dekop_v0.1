// /app/catalog/utils/index.ts
import { ProductSpecs, SofaSpecs, CornerSofaSpecs, SofaBedSpecs, FilterGroup } from "@/app/lib/definitions";

/**
 * Check if product specs are for a sofa product
 */
export const isSofaSpecs = (specs: ProductSpecs | null): specs is SofaSpecs | CornerSofaSpecs | SofaBedSpecs => (
  specs !== null && ['sofas', 'corner_sofas', 'sofa_beds'].includes(specs.category)
);

/**
 * Get additional features from product specs
 */
export const getAdditionalFeatures = (specs: ProductSpecs | null): string | undefined => 
  specs !== null && isSofaSpecs(specs) ? specs.additional_features : undefined;

/**
 * Extract material value from different product specs
 */
export const getMaterialValue = (specs: ProductSpecs | null): string | null => {
  if (!specs) return null;
  if (isSofaSpecs(specs) && specs.material?.type) return specs.material.type;
  if ('material' in specs && typeof specs.material === 'string') return specs.material;
  if (specs.category === 'mattresses' && 'type' in specs) return specs.type;
  return null;
};

/**
 * Merge price filters from multiple filter groups
 */
export const mergePriceFilters = (priceGroups: FilterGroup[]): FilterGroup | null => {
  if (priceGroups.length === 0) return null;
  const merged: FilterGroup = { ...priceGroups[0] };
  merged.range = merged.range ? { ...merged.range } : undefined;
  
  for (let i = 1; i < priceGroups.length; i++) {
    const g = priceGroups[i];
    if (!g.range || !merged.range) continue;
    merged.range.min = Math.min(merged.range.min, g.range.min);
    merged.range.max = Math.max(merged.range.max, g.range.max);
    merged.range.step = Math.min(merged.range.step, g.range.step);
  }
  return merged;
};