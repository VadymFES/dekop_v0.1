// /app/catalog/store/initialState.ts
import { CatalogState } from "../types";

export const initialState: CatalogState = {
  products: [],
  loading: true,
  error: null,
  priceRange: { min: 0, max: 0 },
  filters: {
    type: [],
    material: [],
    complectation: [],
    facadeMaterial: [],
    specifics: null,
    tabletopShape: [],
    size: null,
    backrest: null,
    hardness: null,
    priceMin: 0,
    priceMax: 0,
    status: [],
  },
  sortOption: "rating_desc",
};