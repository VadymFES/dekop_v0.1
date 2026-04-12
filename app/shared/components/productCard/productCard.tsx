"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithImages } from "@/app/lib/definitions";
import { useCart } from "@/app/context/CartContext";
import { useFavorites } from "@/app/context/FavoritesContext";
import { trackAddToCart } from "@/app/lib/gtm-analytics";
import { getCategoryDisplayName } from "@/app/lib/category-utils";

interface ProductCardProps {
  product: ProductWithImages;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isLoading, addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (product.stock < 1) return;
    const color = product.colors?.[0]?.color || "";
    trackAddToCart(product, 1, color);
    addToCart({
      productId: product.id.toString(),
      quantity: 1,
      color: color,
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(product.id);
  };

  const firstImage = product.images.length > 0 ? product.images[0] : null;
  const isFavorited = isFavorite(product.id);
  const isOutOfStock = product.stock < 1;

  // Collect badges, max 2
  const badges: { label: string; bg: string; text: string }[] = [];
  if (product.is_bestseller)
    badges.push({ label: "Лідер продажів", bg: "bg-[#F3DDF8]", text: "text-[#160101]" });
  if (product.is_new)
    badges.push({ label: "Новинка", bg: "bg-[#DAF2C2]", text: "text-[#160101]" });
  if (product.is_on_sale)
    badges.push({ label: "Знижка", bg: "bg-[#F45145]", text: "text-white" });

  return (
    <div
      className={`flex flex-col w-full max-w-[300px] mx-auto rounded-lg overflow-hidden bg-white shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-shadow duration-300 hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)]${
        isOutOfStock ? " opacity-60" : ""
      }`}
    >
      {/* Clickable area: image + product info */}
      <Link
        href={`/product/${encodeURIComponent(product.slug)}`}
        prefetch={false}
        className="block no-underline text-inherit"
      >
        {/* 1. Product image — 4:3 aspect ratio */}
        <div className="relative w-full aspect-[4/3] bg-[#f0f0f0]">
          {firstImage ? (
            <Image
              src={firstImage.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 300px"
              className={`object-cover${isOutOfStock ? " grayscale" : ""}`}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+"
            />
          ) : (
            <div
              className="w-full h-full bg-[#F5F5F5] bg-[url('/images/placeholder-product.svg')] bg-[length:55%] bg-no-repeat bg-center"
              aria-label="Зображення відсутнє"
            />
          )}

          {/* Favorite heart button */}
          <button
            className="absolute top-2 right-2 z-10 flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white border-none cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#ff3939] focus-visible:outline-offset-2"
            onClick={handleToggleFavorite}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            title={isFavorited ? "Видалити з обраного" : "Додати до обраного"}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={isFavorited ? "#ff3939" : "none"}
              stroke={isFavorited ? "#ff3939" : "#160101"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-300"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* 2. Badges overlay — bottom-left, max 2 */}
          {badges.length > 0 && (
            <div className="absolute bottom-2 left-2 flex gap-1 max-w-[calc(100%-16px)]">
              {badges.slice(0, 2).map((badge) => (
                <span
                  key={badge.label}
                  className={`${badge.bg} ${badge.text} text-[12px] font-semibold px-2 py-1 rounded-md truncate max-w-[130px]`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Card body — text rows (inside link for click-through) */}
        <div className="px-3 pt-3 flex flex-col gap-1">
          {/* Row 1: Product name + Star rating */}
          <div className="flex justify-between items-start gap-2">
            <p className="font-bold text-[15px] leading-snug text-[#160101] m-0 line-clamp-2 min-w-0">
              {product.name}
            </p>
            <span className="text-[13px] text-[#8B7355] font-medium whitespace-nowrap shrink-0 flex items-center gap-0.5">
              <span className="text-[#F5A623]">&#9733;</span> {product.rating}
            </span>
          </div>

          {/* Row 2: Category label */}
          <p className="text-[12px] text-[#999] m-0 leading-normal">
            {getCategoryDisplayName(product.category)}
          </p>

          {/* Row 3: Prices */}
          <div className="flex justify-between items-center mt-0.5">
            {product.is_on_sale && product.sale_price ? (
              <>
                <p className="text-[13px] text-[#999] line-through m-0">
                  {product.price} грн
                </p>
                <p className="text-[18px] font-bold text-[#F45145] m-0">
                  {product.sale_price} грн
                </p>
              </>
            ) : (
              <p className="text-[18px] font-bold text-[#160101] m-0 ml-auto">
                {product.price} грн
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Row 4: "Додати в кошик" button (outside link) */}
      <div className="px-3 pb-3 pt-2">
        <button
          className="w-full h-11 min-h-[44px] bg-[#F45145] text-white font-semibold text-[15px] rounded-lg border-none cursor-pointer transition-colors duration-200 hover:bg-[#E2281B] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#ccc]"
          onClick={handleAddToCart}
          disabled={isOutOfStock || isLoading}
        >
          {isLoading
            ? "Завантаження..."
            : isOutOfStock
              ? "Немає в наявності"
              : "Додати в кошик"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
