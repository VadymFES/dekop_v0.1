import React from 'react';
import styles from './Specifications.module.css';
import {
  ProductWithImages,
  ProductSpecs,
  SofaSpecs,
  CornerSofaSpecs,
  BedSpecs,
  TableSpecs,
  ChairSpecs,
  MattressSpecs,
  WardrobeSpecs,
  AccessorySpecs,
  SofaBedSpecs
} from '@/app/lib/definitions';

type SpecificationsProps = {
  product?: ProductWithImages;
};

export default function Specifications({ product }: SpecificationsProps) {
  // Early return if product is undefined
  if (!product) {
    return <div>Продукт не знайдено</div>;
  }

  // Normalize category for rendering - map Ukrainian categories to English
  const normalizeCategory = (cat: string): string => {
    // Convert to lowercase for consistent matching
    const catLower = cat.toLowerCase();
    
    const categoryMap: { [key: string]: string } = {
      'диван': 'sofas',
      'кутовий диван': 'corner_sofas',
      'кутовийдиван': 'corner_sofas',
      'ліжко': 'beds',
      'стіл': 'tables',
      'стілець': 'chairs',
      'матрац': 'mattresses',
      'шафа': 'wardrobes',
      'аксесуар': 'accessories',
    };
    
    // Debug output
    console.log(`Category normalization: "${cat}" -> "${categoryMap[catLower] || catLower}"`);
    
    return categoryMap[catLower] || catLower;
  };

  const specs = product.specs;
  const category = product.category;

  if (!specs) return <div>Специфікації не доступні</div>;

  // Get the normalized category
  const normalizedCategory = normalizeCategory(category);
  
  // Check if this is a sofa-like product (sofas or corner sofas)
  const isSofaType = normalizedCategory === 'sofas' || normalizedCategory === 'corner_sofas' || normalizedCategory === 'sofa_beds';

  // Type guard functions to check product specifications type
  const isSofaSpecs = (specs: ProductSpecs): specs is SofaSpecs => 
    specs.category === 'sofas';
  
  const isCornerSofaSpecs = (specs: ProductSpecs): specs is CornerSofaSpecs => 
    specs.category === 'corner_sofas';
    
  const isSofaBedSpecs = (specs: ProductSpecs): specs is SofaBedSpecs => 
    specs.category === 'sofa_beds';
    
  const isBedSpecs = (specs: ProductSpecs): specs is BedSpecs => 
    specs.category === 'beds';
    
  const isTableSpecs = (specs: ProductSpecs): specs is TableSpecs => 
    specs.category === 'tables';
    
  const isChairSpecs = (specs: ProductSpecs): specs is ChairSpecs => 
    specs.category === 'chairs';
    
  const isMattressSpecs = (specs: ProductSpecs): specs is MattressSpecs => 
    specs.category === 'mattresses';
    
  const isWardrobeSpecs = (specs: ProductSpecs): specs is WardrobeSpecs => 
    specs.category === 'wardrobes';
    
  const isAccessorySpecs = (specs: ProductSpecs): specs is AccessorySpecs => 
    specs.category === 'accessories';

  return (
    <section className={styles.specificationsSection}>
      <div className={styles.specsGrid}>
        {/* Left column */}
        <div className={styles.specsColumn}>
          {/* Debug output */}
          {/* <div style={{background: '#f0f0f0', padding: '10px', marginBottom: '20px'}}>
            <p>Category: {category}</p>
            <p>Normalized: {normalizedCategory}</p>
            <p>isSofaType: {String(isSofaType)}</p>
          </div> */}
          
          {(isSofaSpecs(specs) || isCornerSofaSpecs(specs) || isSofaBedSpecs(specs)) && specs.construction && (
            <>
              <h3>Конструкція: {specs.construction}</h3>
              <br />
            </>
          )}

          {specs.dimensions && (
            <>
              <h4 className={styles.specsTitle}>Розміри:</h4>
              {specs.dimensions.length != null && (
                <p>Довжина: {specs.dimensions.length} мм</p>
              )}
              {'depth' in specs.dimensions && specs.dimensions.depth != null && (
                <p>Глибина: {specs.dimensions.depth} мм</p>
              )}
              {'height' in specs.dimensions && specs.dimensions.height != null && (
                <p>Висота: {specs.dimensions.height} мм</p>
              )}
              {/* Check for sleeping area in sofas or corner sofas */}
              {isSofaType && specs.dimensions && 
                'sleeping_area' in specs.dimensions && 
                specs.dimensions.sleeping_area && (
                  <p>
                    Спальне місце:
                    {specs.dimensions.sleeping_area.width != null &&
                      ` ${specs.dimensions.sleeping_area.width}`}
                    {(specs.dimensions.sleeping_area.width != null &&
                      specs.dimensions.sleeping_area.length != null)
                      ? ' × '
                      : ''}
                    {specs.dimensions.sleeping_area.length != null &&
                      `${specs.dimensions.sleeping_area.length}`}
                    мм
                  </p>
              )}
              <br />
            </>
          )}

          {/* Render material section based on what's available */}
          {'material' in specs && specs.material && (
            <>
              <h4 className={styles.specsTitle}>Деталі:</h4>
              {/* Render for string material */}
              {typeof specs.material === 'string' && (
                <p>Матеріал: {specs.material}</p>
              )}
              
              {/* Render for object material */}
              {'material' in specs && typeof specs.material === 'object' && specs.material && isSofaType && (
                <>
                  {(isSofaSpecs(specs) || isCornerSofaSpecs(specs) || isSofaBedSpecs(specs)) && (
                    <>
                      {specs.material.type && <p>Тип тканини: {specs.material.type}</p>}
                      {specs.material.composition && (
                        <p>Склад: {specs.material.composition}</p>
                      )}
                      {specs.material.backrest_filling && (
                        <p>Наповнення подушок: {specs.material.backrest_filling}</p>
                      )}
                      {specs.material.covers && (
                        <p>Чохли: {specs.material.covers}</p>
                      )}
                    </>
                  )}
                </>
              )}
              <br />
            </>
          )}

          {/* Category-specific fields */}
          {isBedSpecs(specs) && (
            <>
              {specs.headboard_type && (
                <p>Тип узголів&apos;я: {specs.headboard_type}</p>
              )}
              {specs.storage_options && (
                <p>Варіанти зберігання: {specs.storage_options}</p>
              )}
            </>
          )}

          {isTableSpecs(specs) && (
            <>
              {specs.shape && (
                <p>Форма: {specs.shape}</p>
              )}
              {specs.extendable !== undefined && (
                <p>Розкладний: {specs.extendable ? 'Так' : 'Ні'}</p>
              )}
            </>
          )}

          {isChairSpecs(specs) && (
            <>
              {specs.upholstery && (
                <p>Оббивка: {specs.upholstery}</p>
              )}
              {specs.seat_height && (
                <p>Висота сидіння: {specs.seat_height} см</p>
              )}
              {specs.weight_capacity && (
                <p>Максимальна вага: {specs.weight_capacity} кг</p>
              )}
            </>
          )}

          {isMattressSpecs(specs) && (
            <>
              {specs.type && (
                <p>Тип: {specs.type}</p>
              )}
              {specs.firmness && (
                <p>Жорсткість: {specs.firmness}</p>
              )}
              {specs.thickness && (
                <p>Товщина: {specs.thickness} см</p>
              )}
            </>
          )}

          {isWardrobeSpecs(specs) && (
            <>
              {specs.door_count && (
                <p>Кількість дверей: {specs.door_count}</p>
              )}
              {specs.door_type && (
                <p>Тип дверей: {specs.door_type}</p>
              )}
            </>
          )}

          {isAccessorySpecs(specs) && (
            <>
              {specs.mounting_type && (
                <p>Тип кріплення: {specs.mounting_type}</p>
              )}
              {specs.shelf_count && (
                <p>Кількість полиць: {specs.shelf_count}</p>
              )}
            </>
          )}

          <h4 className={styles.specsTitle}>Колір:</h4>
          <p className={styles.disclaimer}>
            Відображення кольору на фотографії залежить від налаштувань вашого
            екрану і може відрізнятися від реального кольору товару.
          </p>
        </div>

        {/* Right column */}
        <div className={styles.specsColumn}>
          {/* Sofa-type inner material (for both sofas and corner sofas) */}
          {isSofaType && 
           ((isSofaSpecs(specs) && specs.inner_material) || 
            (isCornerSofaSpecs(specs) && specs.inner_material) ||
            (isSofaBedSpecs(specs) && specs.inner_material)) && (
            <>
              <h4 className={styles.specsTitle}>Корпус дивана:</h4>
              {((isSofaSpecs(specs) || isCornerSofaSpecs(specs) || isSofaBedSpecs(specs)) && 
                specs.inner_material?.structure) && (
                <p>Матеріал: {specs.inner_material.structure}</p>
              )}
              {((isSofaSpecs(specs) || isCornerSofaSpecs(specs) || isSofaBedSpecs(specs)) && 
                specs.inner_material?.cushion_filling) && (
                <p>Мяке наповнення: {specs.inner_material.cushion_filling}</p>
              )}
              <br />
            </>
          )}

          {/* Wardrobe-specific internal layout */}
          {isWardrobeSpecs(specs) && specs.internal_layout && (
            <>
              <h4 className={styles.specsTitle}>Внутрішнє планування:</h4>
              <p>{specs.internal_layout}</p>
              <br />
            </>
          )}
          
          {/* Additional features section for all product types */}
          <h4 className={styles.specsTitle}>Додатково:</h4>
          <p>Особливості: {
            ((isSofaSpecs(specs) || isCornerSofaSpecs(specs) || isSofaBedSpecs(specs)) && 
             specs.additional_features) ? 
              specs.additional_features : 
              'немає'
          }</p>
          <br />
          <p>Виробництво: Україна</p>
          <p>Гарантія: 12 місяців</p>
        </div>
      </div>
    </section>
  );
}