// pages/product/[slug].tsx

import { GetServerSideProps } from 'next';
import { ProductWithImages } from '@/app/lib/definitions';
import ProductLayout from '../layout';
import Link from 'next/link';
import { HomeIcon } from '@/app/ui/icons/breadcrumbs/homeIcon';
import styles from './product.module.css';
import ProductImages from './images/images';
import Specifications from './specs/specifications';

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
              <Link href="/category">Category</Link> {/* Replace with actual category if available */}
            </li>
            <li className={styles.separator}>|</li>
            <li className={styles.breadcrumb_item}>
              <Link href="/subcategory">Subcategory</Link> {/* Replace with actual subcategory if available */}
            </li>
            <li className={styles.separator}>|</li>
            <li className={styles.breadcrumb_item}>{product.name}</li>
          </ol>
        </nav>

        <section className={styles.productContainer}>
      {/* Grid Layout for Product Details */}
      <section className={styles.parent}>
        {/* Image Section */}
        <ProductImages product={product} />

        {/* Product Description */}
        <div className={styles.descriptionSection}>
          <p>{product.description}</p>
        </div>

        {/* Product Specifications */}
          <Specifications />

        {/* Product Info (Name, Rating, Add to Favorite, Color, Cart) */}
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







// Using getServerSideProps to fetch the data based on the slug
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params!;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${slug}`);

  // Log response status and body for debugging
  console.log('Response Status:', res.status);
  const body = await res.text(); // Log the raw response body
  console.log('Response Body:', body);

  // Check if the response is OK
  if (!res.ok) {
    return {
      notFound: true, // Handle 404 or other error statuses gracefully
    };
  }

  // Parse the response only if it's valid JSON
  let product;
  try {
    product = JSON.parse(body);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return {
      notFound: true, // In case of invalid JSON
    };
  }

  return {
    props: {
      product: product || null,
    },
  };
};


export default ProductPage;
