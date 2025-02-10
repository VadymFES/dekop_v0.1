// pages/product/[...slug].tsx

import { GetServerSideProps } from 'next';
import { ProductWithImages, ProductSpecs, ProductColor, Review } from '@/app/lib/definitions';
import ProductLayout from '../layout';
import Link from 'next/link';
import { HomeIcon } from '@/app/ui/icons/breadcrumbs/homeIcon';
import styles from './product.module.css';
import ProductImages from './images/images';
import Specifications from './specs/specifications';
import ProductActions from './actions/actions';
import ProductReviews from './reviews/reviews';
import { DeliveryIcon } from '@/app/ui/icons/delivery/deliveryIcon';
import { NovapostIcon } from '@/app/ui/icons/delivery/novapostIcon';
import { PostponementIcon } from '@/app/ui/icons/delivery/postponementIcon';

interface ProductPageProps {
  product: ProductWithImages;
  reviews: Review[];
}

const ProductPage: React.FC<ProductPageProps> = ({ product, reviews }) => {
  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <ProductLayout>
      <div className={styles.container}>
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
                <ProductActions product={product} />
              </div>
              {/* Delivery/Payments Section */}
              <div className={styles.deliveryPaymentContainer}>

                {/* Delivery by Store */}
                <div className={styles.deliveryOption}>
                  <DeliveryIcon />
                  <div className={styles.deliveryDetails}>
                    <h4 className={styles.deliveryTitle}>Доставка від магазину</h4>
                    <p className={styles.deliveryDescription}>
                      Ми забезпечуємо доставку нашим власним курєром по всій Україні. Точні витрати на доставку будуть
                      розраховані менеджером.
                    </p>
                  </div>
                </div>

                {/* Nova Poshta Delivery */}
                <div className={styles.deliveryOption}>
                  <NovapostIcon />
                  <div className={styles.deliveryDetails}>
                    <h4 className={styles.deliveryTitle}>Нова Пошта з нами</h4>
                    <p className={styles.deliveryDescription}>
                      Надсилаємо замовлення Новою Поштою на відділення або курєром. Вартість доставки за тарифами пошти.
                    </p>
                  </div>
                </div>

                {/* Installment Payment */}
                <div className={styles.paymentOption}>
                  <PostponementIcon />
                  <div className={styles.paymentDetails}>
                    <h4 className={styles.paymentTitle}>Оплата частинами</h4>
                    <p className={styles.paymentDescription}>
                      З Приватбанком зручніше. Ми пропонуємо розстрочку під 0% комісії на 3, 6 або 9 місяців.
                    </p>
                  </div>
                </div>

                <Link href="/payment-info" className={styles.detailsLink}>
                  Детальніше про способи оплати і терміни доставки
                </Link>
              </div>

              {/* Product reviews */}
              <div className={styles.reviewsSection}>
                <ProductReviews reviews={reviews} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProductLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params!;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Fetch main product data
  const productRes = await fetch(`${baseUrl}/api/products/${slug}`);

  if (!productRes.ok) {
    return { notFound: true };
  }

  let product;
  try {
    product = await productRes.json();
  } catch (error) {
    console.error('Failed to parse product JSON:', error);
    return { notFound: true };
  }

  // Fetch reviews for the product
  const reviewsRes = await fetch(`${baseUrl}/api/products/reviews/${product.id}`);
  let reviews: Review[] = [];
  if (reviewsRes.ok) {
    try {
      reviews = await reviewsRes.json();
    } catch (error) {
      console.error('Failed to parse reviews JSON:', error);
    }
  }

  // Parallel fetch for specs and colors
  const [specsRes, colorsRes] = await Promise.all([
    fetch(`${baseUrl}/api/products/product-specs/${product.id}`),
    fetch(`${baseUrl}/api/products/product-colors/${product.id}`),
  ]);

  // Handle specs
  let specs: ProductSpecs | null = null;
  try {
    if (specsRes.ok) {
      specs = await specsRes.json();
    }
  } catch (error) {
    console.error('Error parsing specs:', error);
  }

  // Handle colors
  let colors: ProductColor[] = [];
  try {
    if (colorsRes.ok) {
      colors = await colorsRes.json();
    }
  } catch (error) {
    console.error('Error parsing colors:', error);
  }

  // Combine all data
  const fullProduct: ProductWithImages = {
    ...product,
    specs,
    colors,
  };

  return {
    props: {
      product: fullProduct,
      reviews,
    },
  };
};

export default ProductPage;