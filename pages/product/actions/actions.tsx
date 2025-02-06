import { useState, useEffect, useRef } from 'react';
import { ProductWithImages } from '@/app/lib/definitions';
import styles from './actions.module.css';
import { DropdownArrow } from '@/app/ui/icons/dropdown/dropdownArrow';
import { AddToCartIcon } from '@/app/ui/icons/cart/addToCartIcon';
import { AlertIcon } from '@/app/ui/icons/alert/alertIcon';

interface ProductActionsProps {
  product: ProductWithImages;
}

export const ProductActions = ({ product }: ProductActionsProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0] || { color: 'No Color', image_url: '' }
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

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, parseInt(e.target.value, 10));
    setQuantity(value);
  };

  const handleColorSelect = (colorOption: typeof selectedColor) => {
    setSelectedColor(colorOption);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const { name, stock, rating, price, specs, colors } = product;

  return (
    <>
      <div className={styles.stickyWrapper}>
        <div className={styles.topSection}>
          <h1 className={styles.productName}>{name}</h1>
          <div className={styles.availabilityWrapper}>
            <span className={stock > 0 ? styles.inStock : styles.outOfStock}>
              {stock > 0 ? 'Є в наявності' : 'Немає в наявності'}
            </span>
          </div>
          <div className={styles.ratingWrapper}>
            <span className={styles.productRating}>{rating}</span>
            <span className={styles.productPrice}>{price} грн</span>
          </div>
        </div>
      </div>

      {/* Static Product Details */}
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

        {/* Custom Color Selection */}
        {colors.length > 0 && (
          <div className={styles.specsItem}>
            <span className={styles.specsTitle}>Колір:</span>
            <div className={styles.customDropdown} ref={dropdownRef}>
              <div className={styles.selectedOption} onClick={toggleDropdown}>
                {selectedColor?.image_url ? (
                  <img
                    src={selectedColor.image_url}
                    alt={selectedColor.color}
                    className={styles.colorImage}
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
                      onClick={() => handleColorSelect(colorOption)}
                    >
                      {colorOption.image_url ? (
                        <img
                          src={colorOption.image_url}
                          alt={colorOption.color}
                          className={styles.optionImage}
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

      {/* Bottom Section */}
      <div className={styles.stickyWrapperbtm}>
        <div className={styles.bottomSection}>
          <div className={styles.quantityControl}>
            <button
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              className={styles.quantityButton}
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={handleQuantityChange}
              className={styles.quantityInput}
            />
            <button
              onClick={() => setQuantity((prev) => prev + 1)}
              className={styles.quantityButton}
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
    </>
  );
};
