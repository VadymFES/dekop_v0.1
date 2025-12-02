'use client';

/**
 * Product Form Component
 * Used for both adding and editing products
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id?: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  is_on_sale: boolean;
  is_new: boolean;
  is_bestseller: boolean;
}

interface ProductFormProps {
  product?: Product;
}

const categories = [
  'sofas',
  'corner_sofas',
  'sofa_beds',
  'beds',
  'tables',
  'chairs',
  'mattresses',
  'wardrobes',
  'accessories',
];

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product?.id;

  const [formData, setFormData] = useState<Product>({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    category: product?.category || 'sofas',
    price: product?.price || 0,
    stock: product?.stock || 0,
    is_on_sale: product?.is_on_sale || false,
    is_new: product?.is_new || false,
    is_bestseller: product?.is_bestseller || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrors({});

    try {
      const url = isEdit
        ? `/admin-secret-2024/api/products/${product!.id}`
        : '/admin-secret-2024/api/products';

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setMessage(data.error || 'Failed to save product');
        }
        setLoading(false);
        return;
      }

      // Success - redirect to products list
      router.push('/admin-secret-2024/products');
      router.refresh();
    } catch (err) {
      setMessage('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 'bold' as const,
    marginBottom: '5px',
    fontSize: '14px',
  };

  const fieldStyle = {
    marginBottom: '20px',
  };

  const errorStyle = {
    color: '#f44336',
    fontSize: '12px',
    marginTop: '5px',
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #ccc',
      padding: '30px',
      maxWidth: '800px',
    }}>
      {message && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '15px',
          marginBottom: '20px',
          border: '1px solid #ef9a9a',
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div style={fieldStyle}>
          <label htmlFor="name" style={labelStyle}>Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={inputStyle}
          />
          {errors.name && <div style={errorStyle}>{errors.name}</div>}
        </div>

        {/* Slug */}
        <div style={fieldStyle}>
          <label htmlFor="slug" style={labelStyle}>
            Slug *
            <button
              type="button"
              onClick={generateSlug}
              style={{
                marginLeft: '10px',
                padding: '3px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Generate from name
            </button>
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            required
            pattern="[a-z0-9-]+"
            style={inputStyle}
          />
          {errors.slug && <div style={errorStyle}>{errors.slug}</div>}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Only lowercase letters, numbers, and hyphens
          </div>
        </div>

        {/* Category */}
        <div style={fieldStyle}>
          <label htmlFor="category" style={labelStyle}>Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <div style={errorStyle}>{errors.category}</div>}
        </div>

        {/* Price and Stock */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={fieldStyle}>
            <label htmlFor="price" style={labelStyle}>Price (UAH) *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="1"
              step="1"
              style={inputStyle}
            />
            {errors.price && <div style={errorStyle}>{errors.price}</div>}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="stock" style={labelStyle}>Stock *</label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              required
              min="0"
              step="1"
              style={inputStyle}
            />
            {errors.stock && <div style={errorStyle}>{errors.stock}</div>}
          </div>
        </div>

        {/* Description */}
        <div style={fieldStyle}>
          <label htmlFor="description" style={labelStyle}>Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            style={inputStyle}
          />
          {errors.description && <div style={errorStyle}>{errors.description}</div>}
        </div>

        {/* Flags */}
        <div style={{ ...fieldStyle, display: 'flex', gap: '30px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="is_on_sale"
              checked={formData.is_on_sale}
              onChange={handleChange}
            />
            On Sale
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="is_new"
              checked={formData.is_new}
              onChange={handleChange}
            />
            New
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="is_bestseller"
              checked={formData.is_bestseller}
              onChange={handleChange}
            />
            Bestseller
          </label>
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 30px',
              backgroundColor: loading ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
            }}
          >
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '12px 30px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ccc',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
