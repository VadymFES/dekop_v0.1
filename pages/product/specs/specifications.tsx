import React from 'react';
import styles from './Specifications.module.css';
import { ProductWithImages } from '@/app/lib/definitions';

type SpecificationsProps = {
  product: ProductWithImages;
};

export default function Specifications({ product }: SpecificationsProps) {
  const { specs } = product || {};

  if (!specs) return <div>Специфікації не доступні</div>;

  return (
    <section className={styles.specificationsSection}>
      <div className={styles.specsGrid}>
        {/* Left column */}
        <div className={styles.specsColumn}>
          {specs.construction && <h3>Конструкція: {specs.construction}</h3>}
          <br />

          {specs.dimensions && (
            <>
              <h4 className={styles.specsTitle}>Розміри:</h4>
              {specs.dimensions.length != null && (
                <p>Довжина: {specs.dimensions.length} мм</p>
              )}
              {specs.dimensions.depth != null && (
                <p>Глибина: {specs.dimensions.depth} мм</p>
              )}
              {specs.dimensions.height != null && (
                <p>Висота: {specs.dimensions.height} мм</p>
              )}
              {specs.dimensions.sleeping_area &&
                ((specs.dimensions.sleeping_area.width != null) ||
                  (specs.dimensions.sleeping_area.length != null)) && (
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
            </>
          )}

          <br />

          {specs.material && (
            <>
              <h4 className={styles.specsTitle}>Матеріал:</h4>
              {specs.material.type && <p>Тип тканини: {specs.material.type}</p>}
              {specs.material.composition && (
                <p>Склад: {specs.material.composition}</p>
              )}
              {specs.material.composition && (
                <p>Наповнення: {specs.material.composition}</p>
              )}
              {specs.material.backrest_filling && (
                <p>Наповнення подушок: {specs.material.backrest_filling}</p>
              )}
              {specs.material.covers && <p>Чохли: {specs.material.covers}</p>}
            </>
          )}

          <br />

          <h4 className={styles.specsTitle}>Колір:</h4>
          {/* <div className={styles.colorsGrid}>
            {colors
              .filter((colorItem) => colorItem.product_id === product.id) // Фільтруємо кольори за product_id
              .map((colorItem, index) => (
                <div key={index} className={styles.colorItem}>
                  <div className={styles.colorSample}>
                    {colorItem.image_url ? (
                      <img
                        src={colorItem.image_url}
                        alt={`Колір: ${colorItem.color}`}
                        className={styles.colorImage}
                      />
                    ) : (
                      <div
                        style={{ backgroundColor: colorItem.color }}
                        className={styles.colorSwatch}
                      ></div>
                    )}
                  </div>
                  <p>{colorItem.color}</p>
                </div>
              ))}
          </div> */}

          <p className={styles.disclaimer}>
            Відображення кольору на фотографії залежить від налаштувань вашого
            екрану і може відрізнятися від реального кольору товару.
          </p>
        </div>

        {/* Right column */}
        <div className={styles.specsColumn}>
          {specs.inner_material && 
          <h4 className={styles.specsTitle}>Корпус дивана:</h4>}
          {specs.inner_material?.structure && (
            <p>Матеріал: {specs.inner_material.structure}</p>
          )}
          {specs.inner_material?.cushion_filling && (
            <p>Мяке наповнення: {specs.inner_material.cushion_filling}</p>
          )}

          <br />
          
          <h4 className={styles.specsTitle}>Додатково:</h4>
          <p>Особливості: {specs.additional_features ? 
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
