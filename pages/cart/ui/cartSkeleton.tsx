import styles from "./cartSkeletonStyles.module.scss";

export function CartLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.homeDecorContainer}>
        <div className={styles.sofa}>
          <div className={styles.sofaBottomPart}></div>
          <div className={styles.sofaArmrest}></div> 
          <div className={styles.sofaArmrest}></div> 
          <div className={styles.sofaLeg}></div>
          <div className={`${styles.sofaLeg} ${styles.sofaRightLeg}`}></div>
          <div className={styles.sofaGlare}></div>
        </div>
        <div className={styles.picture}></div>
        <div className={styles.lamp}></div>
        <div className={styles.lampLeg}></div>
        <div className={styles.pot}></div>
        <div className={styles.cactus}></div>
        <div className={`${styles.bricks} ${styles.bricks1}`}></div>
        <div className={`${styles.bricks} ${styles.bricks2}`}></div>
        
        {/* Loading circles */}
        <div className={styles.loadingCircles}>
          <div className={styles.loadingCircle}></div>
          <div className={styles.loadingCircle}></div>
          <div className={styles.loadingCircle}></div>
        </div>
      </div>
      <p className={styles.loadingText}>Завантаження...</p>
    </div>
  );
}