'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfTokenFromCookie } from '../../components/CsrfProvider';
import { useAdminPath } from '../../components/AdminPathProvider';

interface DeleteButtonProps {
  productId: number;
  productName: string;
}

export default function DeleteButton({ productId, productName }: DeleteButtonProps) {
  const router = useRouter();
  const adminPath = useAdminPath();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Видалити "${productName}"?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const csrfToken = getCsrfTokenFromCookie();
      const headers: Record<string, string> = {};
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const response = await fetch(`${adminPath}/api/products/${productId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Помилка видалення товару');
        setIsDeleting(false);
        return;
      }

      router.refresh();
    } catch {
      alert('Виникла помилка при видаленні товару');
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      style={{
        color: isDeleting ? '#999' : '#f44336',
        background: 'none',
        border: 'none',
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        textDecoration: 'underline',
      }}
    >
      {isDeleting ? 'Видалення...' : 'Видалити'}
    </button>
  );
}
