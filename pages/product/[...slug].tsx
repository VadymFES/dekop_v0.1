// pages/product/[slug].tsx

import { GetServerSideProps } from 'next';
import { ProductWithImages } from '@/app/lib/definitions';
import Image from 'next/image';

interface ProductPageProps {
  product: ProductWithImages;
}

const ProductPage: React.FC<ProductPageProps> = ({ product }) => {
  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <div>
        {product.images.map((image) => (
          <Image
            key={image.id}
            src={image.image_url}
            alt={image.alt || product.name}
            width={500}
            height={500}
          />
        ))}
      </div>
    </div>
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
