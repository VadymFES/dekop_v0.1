"use client";

import { useState, useEffect, useRef } from 'react';
import { ProductWithImages, Review } from '@/app/lib/definitions';
import styles from './actions.module.css';
import { DropdownArrow } from '@/app/ui/icons/dropdown/dropdownArrow';
import { AddToCartIcon } from '@/app/ui/icons/cart/addToCartIcon';
import { AlertIcon } from '@/app/ui/icons/alert/alertIcon';
import Image from 'next/image';
import { DeliveryIcon } from '@/app/ui/icons/delivery/deliveryIcon';
import { NovapostIcon } from '@/app/ui/icons/delivery/novapostIcon';
import { PostponementIcon } from '@/app/ui/icons/delivery/postponementIcon';
import Link from 'next/link';
import ProductReviews from '../../reviews/reviews';
import { useCart } from '@/app/context/CartContext';
import { trackAddToCart } from '@/app/lib/gtm-analytics';

interface ProductActionsProps {
  product?: ProductWithImages;
  reviews: Review[];
}

const ProductActions = ({ product, reviews }: ProductActionsProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    product?.colors?.[0] || { color: 'No Color', image_url: '' }
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isLoading, addToCart } = useCart();

  const handleAddToCart = () => {
    if (!product) return;

    // Track add to cart event
    trackAddToCart(product, quantity, selectedColor.color);

    // Add to cart
    addToCart({ productId: product.id.toString(), quantity, color: selectedColor.color });
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!product) {
    return <div>Product not found</div>;
  } 
  
  if (isLoading) return <div>Loading...</div>;

  const { name, stock, rating, price, specs, colors } = product;
  
  // Check if we have specs and dimensions to display
  const showDimensions = specs && specs.dimensions;

  // Функції для отримання розмірів, враховуючи різну структуру для різних категорій
  const getWidthValue = () => {
    if (!specs?.dimensions) return null;
    
    // Для матраців та інших товарів з width
    if ('width' in specs.dimensions && specs.dimensions.width !== undefined && specs.dimensions.width > 0) {
      return specs.dimensions.width;
    }
    return null;
  };
  
  const getDepthValue = () => {
    if (!specs?.dimensions) return null;
    
    // Для всіх товарів з depth
    if ('depth' in specs.dimensions && specs.dimensions.depth !== undefined && specs.dimensions.depth > 0) {
      return specs.dimensions.depth;
    }
    return null;
  };
  
  // Функція для отримання висоти, враховуючи різні назви поля у різних категоріях
  const getHeight = () => {
    if (!specs?.dimensions) return null;
    
    // Якщо є height, повертаємо її
    if ('height' in specs.dimensions && specs.dimensions.height !== undefined && specs.dimensions.height > 0) {
      return specs.dimensions.height;
    }
    // Якщо категорія матрац, використовуємо thickness як висоту
    else if (specs.category === 'mattresses' && 'thickness' in specs && specs.thickness > 0) {
      return specs.thickness;
    }
    return null;
  };

  return (
    <div className={styles.parent}>
      <div className={styles.stickyWrapper}>
        <div className={styles.topSection}>
          <h1 className={styles.productName}>{name}</h1>
          <div className={styles.availabilityPriceWrapper}>
            <span className={stock > 0 ? styles.inStock : styles.outOfStock}>
              {stock > 0 ? 'Є в наявності' : 'Немає в наявності'}
            </span>
            <span className={styles.productRating}>{rating}</span>
            <span className={styles.productPrice}>{price} грн</span>
          </div>
        </div>
      </div>

      <div className={styles.staticContainer}>
        {showDimensions && (
          <div className={styles.dimensionsContainer}>
            {specs?.dimensions?.length !== undefined && specs.dimensions.length > 0 && (
              <div className={styles.specsItem}>
                <span className={styles.specsTitle}>Довжина:</span>
                <span>{specs.dimensions.length}мм</span>
              </div>
            )}
            
            {getWidthValue() !== null && (
              <div className={styles.specsItem}>
                <span className={styles.specsTitle}>Ширина:</span>
                <span>{getWidthValue()}мм</span>
              </div>
            )}
            
            {getDepthValue() !== null && (
              <div className={styles.specsItem}>
                <span className={styles.specsTitle}>Глибина:</span>
                <span>{getDepthValue()}мм</span>
              </div>
            )}
            
            {getHeight() !== null && (
              <div className={styles.specsItem}>
                <span className={styles.specsTitle}>Висота:</span>
                <span>{getHeight()}мм</span>
              </div>
            )}
          </div>
        )}

        <div className={styles.specsItemDropdown}>
          <span className={styles.specsTitle}>Колір:</span>
          <div className={styles.customDropdown} ref={dropdownRef}>
            <div
              className={styles.selectedOption}
              onClick={() => {
                if (!colors?.length) return;
                setIsDropdownOpen((prev) => !prev);
              }}
              style={{ cursor: !colors?.length ? 'not-allowed' : 'pointer' }}
            >
              {selectedColor?.image_url ? (
                <Image
                  src={selectedColor.image_url}
                  alt={selectedColor.color}
                  className={styles.colorImage}
                  width={30}
                  height={30}
                />
              ) : (
                <span style={{ fontSize: '11px' }}>No images</span>
              )}
              <span>{selectedColor.color}</span>
              <DropdownArrow />
            </div>

            {isDropdownOpen && (
              <div className={styles.dropdownOptions}>
                {colors.map((colorOption, index) => (
                  <div
                    key={index}
                    className={styles.optionItem}
                    onClick={() => {
                      setSelectedColor(colorOption);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {colorOption.image_url ? (
                      <Image
                        src={colorOption.image_url}
                        alt={colorOption.color}
                        className={styles.optionImage}
                        width={30}
                        height={30}
                      />
                    ) : (
                      <span style={{ fontSize: '11px' }}>No images</span>
                    )}
                    <span>{colorOption.color}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.disclaimerSection}>
          <p className={styles.warning}>
            <span className={styles.icon}>
              <AlertIcon />
            </span>
            Відображення кольору на фотографії залежить від налаштувань вашого екрану і може відрізнятися від
            реального кольору товару
          </p>
          <p className={styles.returnPolicy}>
            <span className={styles.icon}>
              <AlertIcon />
            </span>
            Гарантія та повернення
          </p>
        </div>
      </div>

      <div className={styles.stickyWrapperbtm}>
        <div className={styles.bottomSection}>
          <div className={styles.quantityControl}>
            <button
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              className={styles.quantityButton}
              disabled={stock < 1}
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
              className={styles.quantityInput}
              disabled={stock < 1}
            />
            <button
              onClick={() => setQuantity((prev) => prev + 1)}
              className={styles.quantityButton}
              disabled={stock < 1}
            >
              +
            </button>
          </div>

          <button
            className={styles.addToCartButton}
            onClick={handleAddToCart}
            disabled={stock < 1}
          >
            ДОДАТИ В КОШИК <AddToCartIcon />
          </button>
        </div>
      </div>

      <div className={styles.deliveryPaymentContainer}>
        <div className={styles.deliveryOption}>
          <DeliveryIcon />
          <div className={styles.deliveryDetails}>
            <h4 className={styles.deliveryTitle}>Доставка від магазину</h4>
            <p className={styles.deliveryDescription}>
              Ми забезпечуємо доставку нашим власним кур&apos;єром по всій Україні. Точні витрати на доставку будуть
              розраховані менеджером.
            </p>
          </div>
        </div>

        <div className={styles.deliveryOption}>
          <NovapostIcon />
          <div className={styles.deliveryDetails}>
            <h4 className={styles.deliveryTitle}>Нова Пошта з нами</h4>
            <p className={styles.deliveryDescription}>
              Надсилаємо замовлення Новою Поштою на відділення або кур&apos;єром. Вартість доставки за тарифами пошти.
            </p>
          </div>
        </div>

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

      <div className={styles.reviewsSection}>
        <ProductReviews reviews={reviews} />
      </div>
    </div>
  );
};

export default ProductActions;