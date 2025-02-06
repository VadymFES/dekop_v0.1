// pages/product/specs/specifications.tsx

import React from 'react';
import styles from './Specifications.module.css';
import { ProductSpecs } from '@/app/lib/definitions';

type SpecificationsProps = {
  specs: ProductSpecs;
};

export default function Specifications({ specs }: SpecificationsProps) {
  const { construction, dimensions, material, color } = specs;

  return (
    <section className={styles.specificationsSection}>
      <div className={styles.specsTitle}>Характеристики</div>
      <div className={styles.specsGrid}>
        {/* Left column */}
        <div className={styles.specsColumn}>
          {construction && <h3>Конструкція: {construction}</h3>}
          <br />

          {dimensions && (
            <>
              <h4>Розміри:</h4>
              {dimensions.length != null && (
                <p>Довжина: {dimensions.length} мм</p>
              )}
              {dimensions.depth != null && (
                <p>Глибина: {dimensions.depth} мм</p>
              )}
              {dimensions.height != null && (
                <p>Висота: {dimensions.height} мм</p>
              )}
              {dimensions.sleeping_area &&
                ((dimensions.sleeping_area.width != null) ||
                  (dimensions.sleeping_area.length != null)) && (
                  <p>
                    Спальне місце:
                    {dimensions.sleeping_area.width != null &&
                      ` ${dimensions.sleeping_area.width}`}
                    {(dimensions.sleeping_area.width != null) &&
                    (dimensions.sleeping_area.length != null)
                      ? ' × '
                      : ''}
                    {dimensions.sleeping_area.length != null &&
                      `${dimensions.sleeping_area.length}`} 
                    мм
                  </p>
              )}
            </>
          )}

          <br />

          {material && (
            <>
              <h4>Матеріал:</h4>
              {material.type && <p>Тип: {material.type}</p>}
              {material.composition && (
                <p>Склад: {material.composition}</p>
              )}
              {material.structure && (
                <p>Матеріал: {material.structure}</p>
              )}
              {material.filling && <p>Наповнення: {material.filling}</p>}
              {material.covers && <p>Чохли: {material.covers}</p>}
            </>
          )}

          <br />

          {color && <h4>Колір: {color}</h4>}
          {color && (
            <div className={styles.colorSample}>
              {/* Optionally, render a color swatch using inline styles */}
            </div>
          )}

          <p className={styles.disclaimer}>
            Відображення кольору на фотографії залежить від налаштувань вашого
            екрану і може відрізнятися від реального кольору товару.
          </p>
        </div>

        {/* Right column (customizable content) */}
        <div className={styles.specsColumn}>
          {material && material.structure && <h3>Корпус дивана</h3>}
          {material && material.structure && (
            <p>Матеріал: {material.structure}</p>
          )}
          {material && material.filling && (
            <p>Наповнення: {material.filling}</p>
          )}
          {material && material.covers && <p>Чохли: {material.covers}</p>}
        </div>
      </div>
    </section>
  );
}
