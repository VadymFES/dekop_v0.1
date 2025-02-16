"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./cart.module.css";
import Image from "next/image";
import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/app/hooks/useCart";
import { CartItem } from "@/app/lib/definitions";
import { HomeIcon } from "@/app/ui/icons/breadcrumbs/homeIcon";

export default function Cart() {
  const { cart, isLoading, error, updateCart, removeFromCart } = useCart();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const initializedRef = useRef(false);

  // Initialize selection when cart becomes non-empty.
  useEffect(() => {
    if (!initializedRef.current && cart.length > 0) {
      setSelectedIds(cart.map((item) => item.id));
      initializedRef.current = true;
    }
  }, [cart]);

  // If cart is empty, reset selection.
  useEffect(() => {
    if (cart.length === 0) {
      setSelectedIds([]);
    }
  }, [cart]);

  // Calculate totals
  const totalItems: number = cart.reduce(
    (sum: number, item: CartItem) => sum + item.quantity,
    0
  );

  const selectedCartItems = cart.filter((item: CartItem) =>
    selectedIds.includes(item.id)
  );
  const selectedTotalItems: number = selectedCartItems.reduce(
    (sum: number, item: CartItem) => sum + item.quantity,
    0
  );
  const selectedTotalPrice: number = selectedCartItems.reduce((sum, item) => {
    const itemPrice = Number(item.productDetails?.price ?? 0);
    const itemQuantity = Number(item.quantity) || 0;
    return sum + itemPrice * itemQuantity;
  }, 0);

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, itemId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading cart</div>;

  return (
    <>
      <Head>
        <title>Кошик | Dekop Furniture Enterprise - меблі для вашого дому</title>
      </Head>

      {/* Breadcrumb at the top */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumbContainer}>
        <ol className={styles.breadcrumb}>
          <li className={styles.breadcrumb_item}>
            <Link href="/">
              <HomeIcon />
            </Link>
          </li>
          <li className={styles.separator}>|</li>
          <li className={styles.breadcrumb_item}>
            <Link href="/cart">Кошик</Link>
          </li>
        </ol>
      </nav>

      <div className={styles.cartContainer}>
        {/* LEFT: Product List */}
        <div className={styles.cartLeft}>
          <h1 className={styles.cartTitle}>Кошик ({totalItems} товарів)</h1>

          {/* Select all checkbox */}
          <div className={styles.selectAll}>
            <input
              type="checkbox"
              id="selectAll"
              checked={selectedIds.length === cart.length && cart.length > 0}
              onChange={(e) =>
                setSelectedIds(e.target.checked ? cart.map((item) => item.id) : [])
              }
            />
            <label htmlFor="selectAll">Обрати всі</label>
          </div>

          {cart.length === 0 ? (
            <p className={styles.emptyCart}>Ваш кошик порожній</p>
          ) : (
            <ul className={styles.productList}>
              {cart.map((item: CartItem) => (
                <li
                  key={item.id}
                  className={`${styles.productItem} ${
                    !selectedIds.includes(item.id) ? styles.unselected : ""
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={(e) =>
                      handleCheckboxChange(item.id, e.target.checked)
                    }
                  />

                  {/* Product Image */}
                  <Image
                    src={
                      item.image_url ||
                      item.productDetails?.images[0]?.image_url ||
                      "/default-image.png"
                    }
                    alt={item.productDetails?.name || "Товар"}
                    width={150}
                    height={100}
                    className={styles.productImage}
                  />

                  {/* Product Details */}
                  <div className={styles.productDetails}>
                    <span className={styles.inStock}>Є в наявності</span>
                    <h2>
                      <Link
                        href={
                          item.productDetails?.slug
                            ? `/product/${item.productDetails.slug}`
                            : "#"
                        }
                        className={styles.productLink}
                      >
                        {item.productDetails?.name || "Без назви"}
                      </Link>
                    </h2>
                    <p className={styles.productMeta}>Арт. №{item.id}</p>

                    {item.productDetails?.specs ? (
                      <>
                        <p>
                          <strong>Довжина:</strong>{" "}
                          {item.productDetails.specs.dimensions.length} мм
                        </p>
                        <p>
                          <strong>Ширина:</strong>{" "}
                          {item.productDetails.specs.dimensions.depth} мм
                        </p>
                        <p>
                          <strong>Висота:</strong>{" "}
                          {item.productDetails.specs.dimensions.height} мм
                        </p>
                      </>
                    ) : (
                      <p>Характеристики недоступні</p>
                    )}

                    {item.color && (
                      <p>
                        <strong>Колір:</strong> {item.color}
                      </p>
                    )}
                  </div>

                  {/* Quantity + Price Section */}
                  <div className={styles.priceQuantitySection}>
                    {/* Quantity Controls */}
                    <div className={styles.quantityControl}>
                      <button
                        onClick={() =>
                          updateCart(Number(item.id), item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                      >
                        –
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateCart(Number(item.id), item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    {/* Unit Price */}
                    <p className={styles.unitPrice}>
                      <strong>Ціна за одиницю:</strong>{" "}
                      {item.productDetails?.price ?? item.price ?? 0} грн
                    </p>
                  </div>

                  {/* Actions */}
                  <div className={styles.actions}>
                    <button className={styles.favoriteButton}>⭐</button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => removeFromCart(Number(item.id))}
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RIGHT: Summary Panel */}
        <div className={styles.cartRight}>
          <h2 className={styles.summaryTitle}>Кошик</h2>
          <p>
            <strong>Кількість обраних товарів:</strong> {selectedTotalItems}
          </p>
          <p className={styles.totalPrice}>
            <strong>Загальна вартість:</strong>{" "}
            {selectedTotalPrice.toLocaleString()} грн
          </p>
          <p className={styles.deliveryInfo}>
            Вартість, доставка узгоджується
            <br />
            під час оформлення замовлення
          </p>
          <Link href="/" className={styles.continueShopping}>
            Продовжити покупки
          </Link>
          <button className={styles.checkoutButton}>Оформити замовлення</button>
        </div>
      </div>
    </>
  );
}
