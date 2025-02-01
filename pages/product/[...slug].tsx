// pages/product/[...slug].tsx

import { GetServerSideProps } from 'next';
import { ProductWithImages, ProductSpecs, ProductColor } from '@/app/lib/definitions';
import ProductLayout from '../layout';
import Link from 'next/link';
import { HomeIcon } from '@/app/ui/icons/breadcrumbs/homeIcon';
import styles from './product.module.css';
import ProductImages from './images/images';
import Specifications from './specs/specifications';
import { ProductActions } from './actions/actions';

interface ProductPageProps {
  product: ProductWithImages;
}

const ProductPage: React.FC<ProductPageProps> = ({ product }) => {
  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <ProductLayout>
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
        <section className={styles.parent}>
          {/* Image Section */}
          <ProductImages product={product} />

          {/* Product Specifications */}
          {product.specs ? (
            <Specifications specs={product.specs} />
          ) : (
            <div>No specifications available.</div>
          )}

          {/* Product Description */}
          <div className={styles.descriptionSection}>
            <div className={styles.descriptionTitle}>Опис</div>
            <p className={styles.descriptionTxt}>{product.description}</p>
          </div>

          {/* Product Actions */}
          <ProductActions product={product} />

          {/* Delivery Information */}
          <div className={styles.deliveryInfoSection}>
            <h3>Delivery Info</h3>
            {/* Add delivery details here */}
          </div>

          {/* Reviews */}
          <div className={styles.reviewsSection}>
            <h3>Reviews</h3>
            {/* Add reviews component here */}
          </div>
        </section>
      </section>
    </ProductLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params!;
  
  // Fetch main product data
  const productRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${slug}`);
  
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

  // Parallel fetch for specs and colors
  const [specsRes, colorsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/product-specs/${product.id}`),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/product-colors/${product.id}`)
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
    colors
  };

  return {
    props: {
      product: fullProduct
    }
  };
};

export default ProductPage;
