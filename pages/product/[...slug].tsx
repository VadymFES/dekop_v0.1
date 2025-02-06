// pages/product/[...slug].tsx

import { GetServerSideProps } from 'next';
import { ProductWithImages, ProductSpecs, ProductColor } from '@/app/lib/definitions';
import ProductLayout from '../layout';
import Link from 'next/link';
import { HomeIcon } from '@/app/ui/icons/breadcrumbs/homeIcon';
import styles from './product.module.css';
import ProductImages from './images/images';
import Specifications from './specs/specifications';
import ProductActions from './actions/actions';

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
        <div className={styles.parent}>
          <div className={styles.leftColumn}>

            {/* Image Section */}
            <ProductImages product={product} />

            {/* Product Specifications */}
            {product.specs ? (
              <Specifications product={product} />
            ) : (
              <div>No specifications available.</div>
            )}

            {/* Product Description */}
            <div className={styles.descriptionSection}>
              <div className={styles.descriptionTitle}>Опис</div>
              <p className={styles.descriptionTxt}>{product.description}</p>
            </div>
          </div>

          <div className={styles.rightColumn}>

            {/* Product Actions */}
            <ProductActions product={product} />



            </div>
        </div>
      </section>
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

  // Parallel fetch for specs and colors
  const [specsRes, colorsRes] = await Promise.all([
    fetch(`${baseUrl}/api/products/product-specs/${product.id}`),
    fetch(`${baseUrl}/api/products/product-colors/${product.id}`)
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
