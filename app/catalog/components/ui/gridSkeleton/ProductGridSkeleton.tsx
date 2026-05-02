import styles from "./productGridSkeleton.module.css";

const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.skeleton}>
          <div className={styles.image}></div>
          <div className={styles.content}>
            <div className={styles.info}>
              <div className={styles.title}></div>
              <div className={styles.subtitle}></div>
            </div>
            <div className={styles.meta}>
              <div className={styles.rating}></div>
              <div className={styles.price}></div>
            </div>
          </div>
          <div className={styles.button}></div>
        </div>
      ))}
    </>
  );
};

export default ProductGridSkeleton;