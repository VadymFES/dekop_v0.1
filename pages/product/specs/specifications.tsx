// components/Specifications.tsx

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
          <h3>Конструкція: {construction}</h3>
          <br />
          <h4>Розміри:</h4>
          <p>Довжина: {dimensions.length} мм</p>
          <p>Глибина: {dimensions.depth} мм</p>
          <p>Висота: {dimensions.height} мм</p>
          <p>
            Спальне місце: {dimensions.sleeping_area.width} ×{' '}
            {dimensions.sleeping_area.length} мм
          </p>

          <br />

          <h4>Матеріал:</h4>
          <p>Тип: {material.type}</p>
          <p>Склад: {material.composition}</p>
          <p>Матеріал: {material.structure}</p>
          <p>Наповнення: {material.filling}</p>
          <p>Чохли: {material.covers}</p>

          <br />
          <h4>Колір: {color}</h4>
          <div className={styles.colorSample}>
            {/* Optionally, render a color swatch using inline styles */}
          </div>
          <p className={styles.disclaimer}>
            Відображення кольору на фотографії залежить від налаштувань вашого
            екрану і може відрізнятися від реального кольору товару.
          </p>
        </div>

        {/* Right column (you can customize what you want to show here) */}
        <div className={styles.specsColumn}>
          <h3>Корпус дивана</h3>
          <p>Матеріал: {material.structure}</p>
          <p>Наповнення: {material.filling}</p>
          <p>Чохли: {material.covers}</p>
        </div>
      </div>
    </section>
  );
}
