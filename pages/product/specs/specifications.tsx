import React from 'react';
import styles from './Specifications.module.css';

export default function Specifications() {
  return (
    <section className={styles.specificationsSection}>
      <div className={styles.specsTitle}>Характеристики</div>

      <div className={styles.specsGrid}>
        {/* Left column */}
        <div className={styles.specsColumn}>
          <h3>Конструкція: Єврокнижка</h3>
          <br />
          <h4>Розміри:</h4>
          <p>Довжина: 2370 мм</p>
          <p>Глибина: 970 мм</p>
          <p>Висота: 950 мм</p>
          <p>Спальне місце: 1400 × 1900 мм</p>

          <br />

          <h4>Матеріал:</h4>
          <p>Тип: мікровелюр</p>
          <p>Склад: поліестер 100%</p>
          <p>Матеріал: вологостійка березова фанера, ламінована ДСП</p>
          <p>Наповнення: холлофайбер</p>
          <p>Чохли: знімні</p>

          <br />
          <h4>Колір: Alpina 6</h4>
          <div className={styles.colorSample}>
            {/* Example: a small color box or fabric texture image */}
          </div>
          <p className={styles.disclaimer}>
            Відображення кольору на фотографії залежить від налаштувань вашого екрану і може відрізнятися від реального кольору товару.
          </p>
        </div>

        {/* Right column */}
        <div className={styles.specsColumn}>
          <h3>Корпус дивана</h3>
          <p>Матеріал: вологостійка березова фанера, ламінована ДСП</p>
          <p>Наповнення: холлофайбер</p>
          <p>Чохли: знімні</p>
        </div>
      </div>
    </section>
  );
}
