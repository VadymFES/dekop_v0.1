// pages/product/[slug].tsx

import { GetServerSideProps } from 'next';
import { ProductWithImages, ProductSpecs } from '@/app/lib/definitions';
import ProductLayout from '../layout';
import Link from 'next/link';
import { HomeIcon } from '@/app/ui/icons/breadcrumbs/homeIcon';
import styles from './product.module.css';
import ProductImages from './images/images';
import Specifications from './specs/specifications';

interface ProductPageProps {
  product: ProductWithImages & { specs?: ProductSpecs | null };
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
            <Link href="/category">Category</Link> {/* Replace with actual category */}
          </li>
          <li className={styles.separator}>|</li>
          <li className={styles.breadcrumb_item}>
            <Link href="/subcategory">Subcategory</Link> {/* Replace with actual subcategory */}
          </li>
          <li className={styles.separator}>|</li>
          <li className={styles.breadcrumb_item}>{product.name}</li>
        </ol>
      </nav>

      <section className={styles.productContainer}>
        <section className={styles.parent}>
          {/* Image Section */}
          <ProductImages product={product} />

          {/* Product Description */}
          <div className={styles.descriptionSection}>
            <p>{product.description}</p>
          </div>

          {/* Product Specifications */}
          {product.specs ? (
            <Specifications specs={product.specs} />
          ) : (
            <div>No specifications available.</div>
          )}

          {/* Product Info (Name, Rating, etc.) */}
          <div className={styles.productInfoSection}>
            <h1>{product.name}</h1>
            <div>Rating: {/* Add rating component here */}</div>
            <div>
              <button>Add to Favorite</button>
            </div>
            <div>
              <select>
                <option value="color1">Color 1</option>
                <option value="color2">Color 2</option>
              </select>
            </div>
            <div>
              <button>Add to Cart</button>
            </div>
            <div>
              <input type="number" min="1" defaultValue="1" />
            </div>
          </div>

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
  const productRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${slug}`);

  // Log response for debugging
  console.log('Product response status:', productRes.status);
  const productBody = await productRes.text();
  console.log('Product response body:', productBody);

  if (!productRes.ok) {
    return {
      notFound: true,
    };
  }

  // Parse product data
  let product;
  try {
    product = JSON.parse(productBody);
  } catch (error) {
    console.error('Failed to parse product JSON:', error);
    return {
      notFound: true,
    };
  }

  // Fetch specs data separately using the product id
  let specs: ProductSpecs | null = null;
  try {
    const specsRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/product-specs/${product.id}`
    );
    if (specsRes.ok) {
      specs = await specsRes.json();
    } else {
      console.warn(`No specs found for product id ${product.id}`);
    }
  } catch (error) {
    console.error('Error fetching specs:', error);
  }

  // Attach the specs to the product
  product = { ...product, specs };

  return {
    props: {
      product,
    },
  };
};

export default ProductPage;
