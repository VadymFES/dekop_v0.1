import React from 'react';
import styles from '../catalog.module.css'; // Import the CSS module

interface MobileFilterSortControlsProps {
  onShowFilters: () => void;
  onShowSort: () => void;
}

const MobileFilterSortControls: React.FC<MobileFilterSortControlsProps> = ({ onShowFilters, onShowSort }) => {
  return (
    <div className={styles.mobileControlsContainer}>
      <button onClick={onShowFilters} className={styles.mobileFilterButton}>
        <span>{/* Placeholder for Funnel Icon */}</span> Фільтри
      </button>
      <button onClick={onShowSort} className={styles.mobileSortButton}>
        <span>{/* Placeholder for Sort Icon */}</span>
      </button>
    </div>
  );
};

export default MobileFilterSortControls;
