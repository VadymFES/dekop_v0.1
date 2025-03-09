// pages/product/specs/specifications.tsx

import React from 'react';
import styles from './Specifications.module.css';
import {
  ProductWithImages
} from '@/app/lib/definitions';

type SpecificationsProps = {
  product: ProductWithImages;
};

export default function Specifications({ product }: SpecificationsProps) {
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

  const { specs, category } = product;

  if (!specs) return <div>Специфікації не доступні</div>;

  // Get the normalized category
  const normalizedCategory = normalizeCategory(category);
  
  // Check if this is a sofa-like product (sofas or corner sofas)
  const isSofaType = normalizedCategory === 'sofas' || normalizedCategory === 'corner_sofas';

  // Ensure we have the right specs type based on category
  let typedSpecs: any = specs;
  
  // Ensure the specs object has the right shape for sofa-like items
  if (isSofaType) {
    // Make sure we have basic properties initialized
    if (!typedSpecs.dimensions) typedSpecs.dimensions = {};
    if (!typedSpecs.material) typedSpecs.material = {};
    if (!typedSpecs.inner_material) typedSpecs.inner_material = {};
  }

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
          
          {'construction' in typedSpecs && typedSpecs.construction && (
            <>
              <h3>Конструкція: {typedSpecs.construction}</h3>
              <br />
            </>
          )}

          {typedSpecs.dimensions && (
            <>
              <h4 className={styles.specsTitle}>Розміри:</h4>
              {typedSpecs.dimensions.length != null && (
                <p>Довжина: {typedSpecs.dimensions.length} мм</p>
              )}
              {typedSpecs.dimensions.depth != null && (
                <p>Глибина: {typedSpecs.dimensions.depth} мм</p>
              )}
              {typedSpecs.dimensions.height != null && (
                <p>Висота: {typedSpecs.dimensions.height} мм</p>
              )}
              {/* Check for sleeping area in sofas or corner sofas */}
              {isSofaType && typedSpecs.dimensions && 
                'sleeping_area' in typedSpecs.dimensions && 
                typedSpecs.dimensions.sleeping_area && (
                  <p>
                    Спальне місце:
                    {typedSpecs.dimensions.sleeping_area.width != null &&
                      ` ${typedSpecs.dimensions.sleeping_area.width}`}
                    {(typedSpecs.dimensions.sleeping_area.width != null &&
                      typedSpecs.dimensions.sleeping_area.length != null)
                      ? ' × '
                      : ''}
                    {typedSpecs.dimensions.sleeping_area.length != null &&
                      `${typedSpecs.dimensions.sleeping_area.length}`}
                    мм
                  </p>
              )}
              <br />
            </>
          )}

          {/* Render material section based on what's available */}
          {typedSpecs.material && (
            <>
              <h4 className={styles.specsTitle}>Деталі:</h4>
              {/* Render for string material */}
              {typeof typedSpecs.material === 'string' && (
                <p>Матеріал: {typedSpecs.material}</p>
              )}
              
              {/* Render for object material */}
              {typeof typedSpecs.material === 'object' && typedSpecs.material && (
                <>
                  {typedSpecs.material.type && <p>Тип тканини: {typedSpecs.material.type}</p>}
                  {typedSpecs.material.composition && (
                    <p>Склад: {typedSpecs.material.composition}</p>
                  )}
                  {isSofaType && 'backrest_filling' in typedSpecs.material && typedSpecs.material.backrest_filling && (
                    <p>Наповнення подушок: {typedSpecs.material.backrest_filling}</p>
                  )}
                  {isSofaType && 'covers' in typedSpecs.material && typedSpecs.material.covers && (
                    <p>Чохли: {typedSpecs.material.covers}</p>
                  )}
                </>
              )}
              <br />
            </>
          )}

          {/* Category-specific fields */}
          {normalizedCategory === 'beds' && (
            <>
              {typedSpecs.headboard_type && (
                <p>Тип узголів'я: {typedSpecs.headboard_type}</p>
              )}
              {typedSpecs.storage_options && (
                <p>Варіанти зберігання: {typedSpecs.storage_options}</p>
              )}
            </>
          )}

          {normalizedCategory === 'tables' && (
            <>
              {typedSpecs.shape && (
                <p>Форма: {typedSpecs.shape}</p>
              )}
              {typedSpecs.extendable !== undefined && (
                <p>Розкладний: {typedSpecs.extendable ? 'Так' : 'Ні'}</p>
              )}
            </>
          )}

          {normalizedCategory === 'chairs' && (
            <>
              {typedSpecs.upholstery && (
                <p>Оббивка: {typedSpecs.upholstery}</p>
              )}
              {typedSpecs.seat_height && (
                <p>Висота сидіння: {typedSpecs.seat_height} см</p>
              )}
              {typedSpecs.weight_capacity && (
                <p>Максимальна вага: {typedSpecs.weight_capacity} кг</p>
              )}
            </>
          )}

          {normalizedCategory === 'mattresses' && (
            <>
              {typedSpecs.type && (
                <p>Тип: {typedSpecs.type}</p>
              )}
              {typedSpecs.firmness && (
                <p>Жорсткість: {typedSpecs.firmness}</p>
              )}
              {typedSpecs.thickness && (
                <p>Товщина: {typedSpecs.thickness} см</p>
              )}
            </>
          )}

          {normalizedCategory === 'wardrobes' && (
            <>
              {typedSpecs.door_count && (
                <p>Кількість дверей: {typedSpecs.door_count}</p>
              )}
              {typedSpecs.door_type && (
                <p>Тип дверей: {typedSpecs.door_type}</p>
              )}
            </>
          )}

          {normalizedCategory === 'accessories' && (
            <>
              {typedSpecs.mounting_type && (
                <p>Тип кріплення: {typedSpecs.mounting_type}</p>
              )}
              {typedSpecs.shelf_count && (
                <p>Кількість полиць: {typedSpecs.shelf_count}</p>
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
          {isSofaType && typedSpecs.inner_material && (
            <>
              <h4 className={styles.specsTitle}>Корпус дивана:</h4>
              {typedSpecs.inner_material.structure && (
                <p>Матеріал: {typedSpecs.inner_material.structure}</p>
              )}
              {typedSpecs.inner_material.cushion_filling && (
                <p>Мяке наповнення: {typedSpecs.inner_material.cushion_filling}</p>
              )}
              <br />
            </>
          )}

          {/* Wardrobe-specific internal layout */}
          {normalizedCategory === 'wardrobes' && typedSpecs.internal_layout && (
            <>
              <h4 className={styles.specsTitle}>Внутрішнє планування:</h4>
              <p>{typedSpecs.internal_layout}</p>
              <br />
            </>
          )}
          
          {/* Additional features section for all product types */}
          <h4 className={styles.specsTitle}>Додатково:</h4>
          <p>Особливості: {'additional_features' in typedSpecs && typedSpecs.additional_features ? 
              typedSpecs.additional_features : 
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