'use client';

// app/product/[slug]/client-page.tsx
import { ProductWithImages, Review } from '@/app/lib/definitions';
import Link from 'next/link';
import { HomeIcon } from '@/app/ui/icons/breadcrumbs/homeIcon';
import styles from './product.module.css';
import ProductImages from '../components/images/images';
import Specifications from '../components/specs/specifications';
import ProductActions from '../components/actions/actions';
import ProductReviews from '../reviews/reviews';
import SimilarProducts from '../components/similarProducts/similarProducts';

// Define type for component props
interface ClientProductPageProps {
  product: ProductWithImages;
  reviews: Review[];
  similarProducts: ProductWithImages[];
  categorySlugMap: Record<string, { dbValue: string; uaName: string }>;
}

// Client Component that receives data from server component
export default function ClientProductPage({ 
  product, 
  reviews, 
  similarProducts,
  categorySlugMap 
}: ClientProductPageProps) {
  return (
    <div className={styles.topContainer}>
      <div className={styles.secondaryContainer}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumbContainer}>
        <ol className={styles.breadcrumb}>
          <li className={styles.breadcrumb_item}>
            <Link href="/">
              <HomeIcon />
            </Link>
          </li>
          <li className={styles.separator}>|</li>
          <li className={styles.breadcrumb_item}>
            <Link href="/catalog">Каталог</Link>
          </li>
          <li className={styles.separator}>|</li>
          <li className={styles.breadcrumb_item}>
            <Link href={`/category/${product.category}`}>
              {product.category}
            </Link>
          </li>
          <li className={styles.separator}>|</li>
          <li className={styles.breadcrumb_item}>{product.name}</li>
        </ol>
      </nav>

      <section className={styles.productContainer}>
        <div className={styles.parent}>
          <div className={styles.leftColumn}>
            <div className={styles.imageWrapper}>
              <div className={styles.productHeader}>
                <div className={styles.productDetails}>
                  <h1 className={styles.productName}>{product.name}</h1>
                </div>
                <div className={styles.productRatingWrapper}>
                  <span className={styles.productRating}>★★★★★</span>
                </div>
              </div>
              <ProductImages product={product} />
            </div>

            {/* Product Specifications */}
            <div className={styles.descriptionSection}>
              <div className={styles.specsContainerTitle}>Характеристики</div>
              {product.specs ? (
                <Specifications product={product} />
              ) : (
                <div>Специфікації не доступні</div>
              )}
            </div>

            {/* Product Description */}
            <div className={styles.descriptionSection}>
              <div className={styles.descriptionTitle}>Опис</div>
              <p className={styles.descriptionTxt}>{product.description}</p>
            </div>
          </div>

          <div className={styles.rightColumn}>
            {/* Product Actions */}
            <div className={styles.actionsSection}>
              <ProductActions product={product} reviews={reviews} />
            </div>
            {/* Reviews Section */}
            <div className={styles.reviewsSection}>
              <ProductReviews reviews={reviews} />
            </div>
          </div>
        </div>
      </section>

      {/* Similar Products */}
      <section className={styles.similarCarousel}>
        <div className={styles.bodyContentHeader}>
          <h2 className={styles.bodyContentTitle}>Схожі товари</h2>
          <Link 
            href={`/catalog?category=${Object.entries(categorySlugMap).find(
            ([, { dbValue }]) => dbValue === product.category
            )?.[0] || ''}`}
            className={styles.bodyContentButton}
          >
            Переглянути всі
            <svg width="35" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 15L15 11M15 11L11 7M15 11H7M21 11C21 16.5228 16.5228 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1C16.5228 1 21 5.47715 21 11Z" stroke="#160101" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <SimilarProducts products={similarProducts} />
      </section>
    </div>
  </div>
  );
}