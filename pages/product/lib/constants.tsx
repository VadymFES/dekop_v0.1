const CATEGORY_SLUG_MAP: Record<string, { dbValue: string; uaName: string }> = {
    sofas:      { dbValue: "Диван", uaName: "Дивани" },
    sofaBeds:   { dbValue: "Диван-Ліжко", uaName: "Дивани-ліжка" },
    cornerSofas:{ dbValue: "Кутовий Диван", uaName: "Кутові дивани" }, 
    chairs:     { dbValue: "Стілець", uaName: "Стільці" },
    tables:     { dbValue: "Стіл", uaName: "Столи" },
    wardrobes:  { dbValue: "Шафа", uaName: "Шафи" },
    beds:       { dbValue: "Ліжко", uaName: "Ліжка" },
    mattresses: { dbValue: "Матрац", uaName: "Матраци" },
    accessories:{ dbValue: "Аксесуар", uaName: "Аксесуари" }
  };

  export default CATEGORY_SLUG_MAP;