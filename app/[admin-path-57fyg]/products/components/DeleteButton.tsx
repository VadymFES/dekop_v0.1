'use client';

/**
 * Кнопка видалення товару
 */

interface DeleteButtonProps {
  productId: number;
  productName: string;
}

export default function DeleteButton({ productId, productName }: DeleteButtonProps) {
  const handleSubmit = (e: React.FormEvent) => {
    if (!confirm(`Видалити "${productName}"?`)) {
      e.preventDefault();
    }
  };

  return (
    <form
      action={`/admin-path-57fyg/api/products/${productId}`}
      method="POST"
      style={{ display: 'inline' }}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        style={{
          color: '#f44336',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Видалити
      </button>
    </form>
  );
}
