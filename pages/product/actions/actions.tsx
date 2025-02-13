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
import ProductReviews from '../reviews/reviews';

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

  // Now that all hooks have been called, you can safely conditionally render:
  if (!product) {
    return <div>Product not found</div>;
  }

  // Now that product is guaranteed, destructure its properties:
  const { name, stock, rating, price, specs, colors } = product;

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
        <div className={styles.dimensionsContainer}>
          <div className={styles.specsItem}>
            <span className={styles.specsTitle}>Довжина:</span>
            <span>{specs?.dimensions.length}мм</span>
          </div>
          <div className={styles.specsItem}>
            <span className={styles.specsTitle}>Ширина:</span>
            <span>{specs?.dimensions.depth}мм</span>
          </div>
          <div className={styles.specsItem}>
            <span className={styles.specsTitle}>Висота:</span>
            <span>{specs?.dimensions.height}мм</span>
          </div>
        </div>

        {colors.length > 0 && (
          <div className={styles.specsItemDropdown}>
            <span className={styles.specsTitle}>Колір:</span>
            <div className={styles.customDropdown} ref={dropdownRef}>
              <div
                className={styles.selectedOption}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
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
        )}

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
            onClick={() => console.log('Added to cart')}
            disabled={stock < 1}
          >
            ДОДАТИ В КОШИК <AddToCartIcon />
          </button>
        </div>
      </div>

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
  );
};

export default ProductActions;
