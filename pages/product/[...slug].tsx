// pages/product/[...slug].tsx

import { GetServerSideProps } from 'next';
import { ProductWithImages, Review } from '@/app/lib/definitions';
import Link from 'next/link';
import { HomeIcon } from '@/app/ui/icons/breadcrumbs/homeIcon';
import styles from './product.module.css';
import ProductImages from './images/images';
import Specifications from './specs/specifications';
import ProductActions from './actions/actions';
import ProductReviews from './reviews/reviews';
import PagesLayout from '../layout';
import SimilarProducts from './similarProducts/similarproducts';

interface ProductPageProps {
  product: ProductWithImages;
  reviews: Review[];
  similarProducts: ProductWithImages[];
}

const ProductPage: React.FC<ProductPageProps> = ({ product, reviews, similarProducts }) => {
  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <PagesLayout>
      <div className={styles.topContainer}>
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
                  <div>No specifications available.</div>
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
              {/* Delivery/Payments Section */}
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
            <button className={styles.bodyContentButton}>Переглянути всі
              <svg width="35" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 15L15 11M15 11L11 7M15 11H7M21 11C21 16.5228 16.5228 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1C16.5228 1 21 5.47715 21 11Z" stroke="#160101" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <SimilarProducts products={similarProducts} />
        </section>
      </div>
    </PagesLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params!;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';

  try {
    // Fetch main product data
    const productRes = await fetch(`${baseUrl}/api/products/${slug}`);
    if (!productRes.ok) throw new Error('Product not found');
    const product = await productRes.json();

    // Fetch specs and colors
    const [specsRes, colorsRes, similarProductsRes] = await Promise.all([
      fetch(`${baseUrl}/api/products/product-specs/${product.id}`),
      fetch(`${baseUrl}/api/products/product-colors/${product.id}`),
      fetch(`${baseUrl}/api/products/similarRecommendations/${slug}`) 
    ]);

    const specs = specsRes.ok ? await specsRes.json() : null;
    const colors = colorsRes.ok ? await colorsRes.json() : [];
    const similarProducts = similarProductsRes.ok ? await similarProductsRes.json() : [];

    // Combine all data
    const fullProduct: ProductWithImages = {
      ...product,
      specs,
      colors,
    };

    return {
      props: {
        product: fullProduct,
        similarProducts,
      },
    };
  } catch (error) {
    console.error('Error loading product data:', error);
    return { notFound: true };
  }
};

export default ProductPage;