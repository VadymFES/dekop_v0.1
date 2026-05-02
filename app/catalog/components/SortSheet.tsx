import React, { ChangeEvent } from 'react';
import styles from './sortSheet.module.css'; // We'll create this later

export interface SortSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sortOption: string;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled: boolean;
}

const SortSheet: React.FC<SortSheetProps> = ({
  isOpen,
  onClose,
  sortOption,
  onSortChange,
  disabled,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`${styles.sheetOverlay} ${isOpen ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.sheetContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>Сортування</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times; {/* Unicode for X */}
          </button>
        </div>
        <div className={styles.sheetBody}>
          <select
            value={sortOption}
            onChange={onSortChange}
            disabled={disabled}
            className={styles.sortSelect}
          >
            <option value="rating_desc">Популярністю</option>
            <option value="price_asc">Ціною: від низької до високої</option>
            <option value="price_desc">Ціною: від високої до низької</option>
            <option value="reviews_desc">Відгуками</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SortSheet;
