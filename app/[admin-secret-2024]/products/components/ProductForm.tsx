'use client';

/**
 * Повна форма товару з усіма полями для всіх категорій
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// =====================================================
// TYPES
// =====================================================

interface ProductImage {
  id?: number;
  image_url: string;
  alt: string;
  is_primary: boolean;
}

interface ProductColor {
  color: string;
  image_url: string;
}

interface Dimensions {
  length?: number;
  width?: number;
  depth?: number;
  height?: number;
  sleeping_area?: {
    width: number;
    length: number;
  };
}

interface Material {
  type: string;
  composition?: string;
  backrest_filling?: string;
  covers?: string;
}

interface InnerMaterial {
  structure: string;
  cushion_filling: string;
}

interface ProductSpecs {
  dimensions?: Dimensions;
  material?: string | Material;
  types?: string[];
  construction?: string;
  inner_material?: InnerMaterial;
  additional_features?: string;
  has_shelves?: boolean;
  leg_height?: string;
  has_lift_mechanism?: boolean;
  armrest_type?: string;
  seat_height?: number;
  headboard_type?: string;
  storage_options?: string;
  type?: string;
  firmness?: string;
  thickness?: number;
  core_type?: string;
  hardness?: string;
  shape?: string;
  extendable?: boolean;
  upholstery?: string;
  weight_capacity?: number;
  door_count?: number;
  door_type?: string;
  internal_layout?: string;
  mounting_type?: string;
  shelf_count?: number;
}

interface Product {
  id?: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  sale_price?: number;
  stock: number;
  is_on_sale: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_featured?: boolean;
  images: ProductImage[];
  colors: ProductColor[];
  specs: ProductSpecs;
}

interface ProductFormProps {
  product?: Product;
}

// =====================================================
// CONSTANTS
// =====================================================

const CATEGORIES = [
  { value: 'sofas', label: 'Дивани' },
  { value: 'corner_sofas', label: 'Кутові дивани' },
  { value: 'sofa_beds', label: 'Дивани-ліжка' },
  { value: 'beds', label: 'Ліжка' },
  { value: 'tables', label: 'Столи' },
  { value: 'chairs', label: 'Стільці' },
  { value: 'mattresses', label: 'Матраци' },
  { value: 'wardrobes', label: 'Шафи' },
  { value: 'accessories', label: 'Аксесуари' },
];

const MATERIAL_TYPES: Record<string, { value: string; label: string }[]> = {
  sofas: [
    { value: 'leather', label: 'Шкіра' },
    { value: 'fabric', label: 'Тканина' },
    { value: 'eco_leather', label: 'Еко-шкіра' },
    { value: 'velour', label: 'Велюр' },
  ],
  beds: [
    { value: 'wood', label: 'Дерево' },
    { value: 'mdf', label: 'МДФ' },
    { value: 'fabric', label: "М'яка оббивка" },
    { value: 'leather', label: 'Шкіра' },
  ],
  tables: [
    { value: 'wood', label: 'Дерево' },
    { value: 'mdf', label: 'МДФ' },
    { value: 'glass', label: 'Скло' },
    { value: 'ceramic', label: 'Склокераміка' },
    { value: 'aluminum', label: 'Алюміній' },
  ],
  chairs: [
    { value: 'wood', label: 'Дерево' },
    { value: 'plastic', label: 'Пластик' },
    { value: 'aluminum', label: 'Алюміній' },
  ],
  wardrobes: [
    { value: 'dsp', label: 'ДСП' },
    { value: 'mdf', label: 'МДФ' },
    { value: 'mirror', label: 'Дзеркало' },
    { value: 'photo', label: 'Фотодрук' },
    { value: 'combined', label: 'Комбіновані' },
  ],
  accessories: [
    { value: 'wood', label: 'Дерево' },
    { value: 'metal', label: 'Метал' },
    { value: 'plastic', label: 'Пластик' },
    { value: 'fabric', label: 'Тканина' },
  ],
  mattresses: [
    { value: 'spring', label: 'Пружинний' },
    { value: 'foam', label: 'Пінний' },
    { value: 'latex', label: 'Латексний' },
  ],
};

const PRODUCT_TYPES: Record<string, { value: string; label: string }[]> = {
  sofas: [
    { value: 'straight', label: 'Прямі' },
    { value: 'folding', label: 'Розкладні' },
    { value: 'modular', label: 'Модульні' },
    { value: 'kitchen', label: 'Кухонні' },
    { value: 'office', label: 'Офісні' },
  ],
  corner_sofas: [
    { value: 'folding', label: 'Розкладні' },
    { value: 'modular', label: 'Модульні' },
    { value: 'kitchen', label: 'Кухонні' },
    { value: 'office', label: 'Офісні' },
  ],
  sofa_beds: [
    { value: 'straight', label: 'Прямі' },
    { value: 'folding', label: 'Розкладні' },
    { value: 'modular', label: 'Модульні' },
  ],
  beds: [
    { value: 'single', label: 'Односпальні' },
    { value: 'double', label: 'Двоспальні' },
    { value: 'bunk', label: 'Двоярусні' },
    { value: 'transformer', label: 'Трансформери' },
  ],
  tables: [
    { value: 'coffee', label: 'Журнальні' },
    { value: 'dining', label: 'Обідні' },
    { value: 'computer', label: "Комп'ютерні" },
  ],
  chairs: [
    { value: 'kitchen', label: 'Кухонні' },
    { value: 'bar', label: 'Барні' },
    { value: 'computer', label: "Комп'ютерні" },
    { value: 'office', label: 'Офісні' },
    { value: 'children', label: 'Дитячі' },
    { value: 'loft', label: 'Лофт' },
    { value: 'stool', label: 'Табуретки' },
  ],
  mattresses: [
    { value: 'spring', label: 'Пружинні' },
    { value: 'foam', label: 'Пінні' },
    { value: 'latex', label: 'Латексні' },
    { value: 'orthopedic', label: 'Ортопедичні' },
  ],
  wardrobes: [
    { value: 'sliding_doors', label: 'Шафи-купе' },
    { value: 'walk_in', label: 'Гардеробні' },
    { value: 'one_door', label: 'Однодверні' },
    { value: 'two_doors', label: 'Дводверні' },
    { value: 'three_doors', label: 'Тридверні' },
    { value: 'four_doors', label: 'Чотиридверні' },
  ],
  accessories: [
    { value: 'mirror', label: 'Дзеркала' },
    { value: 'shelf', label: 'Полиці' },
    { value: 'lamp', label: 'Світильники' },
    { value: 'textile', label: 'Текстиль' },
    { value: 'pillow', label: 'Подушки' },
  ],
};

// =====================================================
// STYLES
// =====================================================

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ccc',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
  border: '1px solid #ddd',
  padding: '20px',
  marginBottom: '20px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '15px',
  paddingBottom: '10px',
  borderBottom: '1px solid #ddd',
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product?.id;

  const [formData, setFormData] = useState<Product>({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    category: product?.category || 'sofas',
    price: product?.price || 0,
    sale_price: product?.sale_price,
    stock: product?.stock || 0,
    is_on_sale: product?.is_on_sale || false,
    is_new: product?.is_new || false,
    is_bestseller: product?.is_bestseller || false,
    is_featured: product?.is_featured || false,
    images: product?.images || [],
    colors: product?.colors || [],
    specs: product?.specs || {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Helpers
  const isSofaCategory = ['sofas', 'corner_sofas', 'sofa_beds'].includes(formData.category);
  const hasSleepingArea = ['sofas', 'corner_sofas', 'sofa_beds', 'beds'].includes(formData.category);
  const hasWidth = ['corner_sofas', 'tables', 'chairs', 'mattresses', 'wardrobes', 'accessories'].includes(formData.category);

  const getMaterialOptions = () => {
    if (isSofaCategory) return MATERIAL_TYPES.sofas;
    return MATERIAL_TYPES[formData.category] || [];
  };

  const getTypeOptions = () => PRODUCT_TYPES[formData.category] || [];

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSpecChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, specs: { ...prev.specs, [field]: value } }));
  };

  const handleDimensionChange = (field: string, value: number | undefined) => {
    setFormData(prev => ({
      ...prev,
      specs: { ...prev.specs, dimensions: { ...prev.specs.dimensions, [field]: value } },
    }));
  };

  const handleSleepingAreaChange = (field: string, value: number | undefined) => {
    setFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        dimensions: {
          ...prev.specs.dimensions,
          sleeping_area: {
            width: prev.specs.dimensions?.sleeping_area?.width || 0,
            length: prev.specs.dimensions?.sleeping_area?.length || 0,
            [field]: value || 0,
          },
        },
      },
    }));
  };

  const handleMaterialChange = (field: string, value: string) => {
    if (isSofaCategory) {
      const currentMaterial = (typeof formData.specs.material === 'object' ? formData.specs.material : {}) as Material;
      setFormData(prev => ({
        ...prev,
        specs: { ...prev.specs, material: { ...currentMaterial, [field]: value } },
      }));
    } else {
      handleSpecChange('material', value);
    }
  };

  const handleInnerMaterialChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specs: {
        ...prev.specs,
        inner_material: {
          structure: prev.specs.inner_material?.structure || '',
          cushion_filling: prev.specs.inner_material?.cushion_filling || '',
          [field]: value,
        },
      },
    }));
  };

  const handleTypesChange = (type: string, checked: boolean) => {
    const currentTypes = formData.specs.types || [];
    const newTypes = checked ? [...currentTypes, type] : currentTypes.filter(t => t !== type);
    handleSpecChange('types', newTypes);
  };

  const generateSlug = () => {
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9а-яіїєґ\s-]+/gi, '').replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  // Images
  const addImage = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, { image_url: '', alt: '', is_primary: prev.images.length === 0 }],
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      if (prev.images[index]?.is_primary && newImages.length > 0) newImages[0].is_primary = true;
      return { ...prev, images: newImages };
    });
  };

  const updateImage = (index: number, field: keyof ProductImage, value: string | boolean | number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      if (field === 'is_primary' && value === true) {
        newImages.forEach((img, i) => { img.is_primary = i === index; });
      } else {
        newImages[index] = { ...newImages[index], [field]: value };
      }
      return { ...prev, images: newImages };
    });
  };

  // Colors
  const addColor = () => {
    setFormData(prev => ({ ...prev, colors: [...prev.colors, { color: '', image_url: '' }] }));
  };

  const removeColor = (index: number) => {
    setFormData(prev => ({ ...prev, colors: prev.colors.filter((_, i) => i !== index) }));
  };

  const updateColor = (index: number, field: keyof ProductColor, value: string) => {
    setFormData(prev => {
      const newColors = [...prev.colors];
      newColors[index] = { ...newColors[index], [field]: value };
      return { ...prev, colors: newColors };
    });
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrors({});

    try {
      const url = isEdit ? `/admin-secret-2024/api/products/${product!.id}` : '/admin-secret-2024/api/products';
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.errors) setErrors(data.errors);
        else setMessage(data.error || 'Помилка збереження товару');
        setLoading(false);
        return;
      }

      router.push('/admin-secret-2024/products');
      router.refresh();
    } catch {
      setMessage('Виникла помилка. Спробуйте ще раз.');
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div style={{ maxWidth: '1000px' }}>
      {message && (
        <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '15px', marginBottom: '20px', border: '1px solid #ef9a9a' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* BASIC INFO */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Основна інформація</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Назва *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required style={inputStyle} />
              {errors.name && <div style={{ color: '#f44336', fontSize: '12px' }}>{errors.name}</div>}
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                URL (slug) *
                <button type="button" onClick={generateSlug} style={{ marginLeft: '10px', padding: '3px 10px', fontSize: '12px', cursor: 'pointer' }}>Згенерувати</button>
              </label>
              <input type="text" name="slug" value={formData.slug} onChange={handleChange} required style={inputStyle} />
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Категорія *</label>
            <select name="category" value={formData.category} onChange={handleChange} required style={inputStyle}>
              {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Опис</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '15px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Ціна (грн) *</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Ціна зі знижкою</label>
              <input type="number" name="sale_price" value={formData.sale_price || ''} onChange={handleChange} min="0" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>Запас *</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} required min="0" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="is_on_sale" checked={formData.is_on_sale} onChange={handleChange} /> Акція
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="is_new" checked={formData.is_new} onChange={handleChange} /> Новинка
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="is_bestseller" checked={formData.is_bestseller} onChange={handleChange} /> Хіт продажів
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" name="is_featured" checked={formData.is_featured || false} onChange={handleChange} /> Рекомендований
            </label>
          </div>
        </div>

        {/* IMAGES */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            Зображення
            <button type="button" onClick={addImage} style={{ marginLeft: '15px', padding: '5px 15px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#4caf50', color: 'white', border: 'none' }}>+ Додати</button>
          </h2>
          {formData.images.length === 0 && <p style={{ color: '#999', fontStyle: 'italic' }}>Немає зображень</p>}
          {formData.images.map((image, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px auto', gap: '10px', alignItems: 'end', marginBottom: '10px', padding: '10px', backgroundColor: '#fff', border: '1px solid #eee' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>URL (ImageKit)</label>
                <input type="url" value={image.image_url} onChange={(e) => updateImage(index, 'image_url', e.target.value)} placeholder="https://ik.imagekit.io/..." style={{ ...inputStyle, fontSize: '12px', padding: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Alt текст</label>
                <input type="text" value={image.alt} onChange={(e) => updateImage(index, 'alt', e.target.value)} style={{ ...inputStyle, fontSize: '12px', padding: '8px' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="radio" checked={image.is_primary} onChange={() => updateImage(index, 'is_primary', true)} /> Головне
              </label>
              <button type="button" onClick={() => removeImage(index)} style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>×</button>
            </div>
          ))}
        </div>

        {/* COLORS */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            Кольори
            <button type="button" onClick={addColor} style={{ marginLeft: '15px', padding: '5px 15px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#4caf50', color: 'white', border: 'none' }}>+ Додати</button>
          </h2>
          {formData.colors.length === 0 && <p style={{ color: '#999', fontStyle: 'italic' }}>Немає кольорів</p>}
          {formData.colors.map((color, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end', marginBottom: '10px', padding: '10px', backgroundColor: '#fff', border: '1px solid #eee' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Назва кольору</label>
                <input type="text" value={color.color} onChange={(e) => updateColor(index, 'color', e.target.value)} placeholder="Сірий, Бежевий..." style={{ ...inputStyle, fontSize: '12px', padding: '8px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>URL зображення</label>
                <input type="url" value={color.image_url} onChange={(e) => updateColor(index, 'image_url', e.target.value)} placeholder="https://ik.imagekit.io/..." style={{ ...inputStyle, fontSize: '12px', padding: '8px' }} />
              </div>
              <button type="button" onClick={() => removeColor(index)} style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>×</button>
            </div>
          ))}
        </div>

        {/* DIMENSIONS */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Розміри (см)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Довжина</label>
              <input type="number" value={formData.specs.dimensions?.length || ''} onChange={(e) => handleDimensionChange('length', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
            </div>
            {hasWidth && (
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Ширина</label>
                <input type="number" value={formData.specs.dimensions?.width || ''} onChange={(e) => handleDimensionChange('width', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
              </div>
            )}
            {formData.category !== 'mattresses' && (
              <>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Глибина</label>
                  <input type="number" value={formData.specs.dimensions?.depth || ''} onChange={(e) => handleDimensionChange('depth', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Висота</label>
                  <input type="number" value={formData.specs.dimensions?.height || ''} onChange={(e) => handleDimensionChange('height', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
                </div>
              </>
            )}
          </div>
          {hasSleepingArea && (
            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Спальне місце</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '400px' }}>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Ширина</label>
                  <input type="number" value={formData.specs.dimensions?.sleeping_area?.width || ''} onChange={(e) => handleSleepingAreaChange('width', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Довжина</label>
                  <input type="number" value={formData.specs.dimensions?.sleeping_area?.length || ''} onChange={(e) => handleSleepingAreaChange('length', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TYPES */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Типи товару</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {getTypeOptions().map(type => (
              <label key={type.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.specs.types?.includes(type.value) || false} onChange={(e) => handleTypesChange(type.value, e.target.checked)} />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        {/* MATERIAL */}
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Матеріал</h2>
          {isSofaCategory ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Тип матеріалу</label>
                <select value={(formData.specs.material as Material)?.type || ''} onChange={(e) => handleMaterialChange('type', e.target.value)} style={inputStyle}>
                  <option value="">Оберіть...</option>
                  {getMaterialOptions().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Склад</label>
                <input type="text" value={(formData.specs.material as Material)?.composition || ''} onChange={(e) => handleMaterialChange('composition', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Наповнювач спинки</label>
                <input type="text" value={(formData.specs.material as Material)?.backrest_filling || ''} onChange={(e) => handleMaterialChange('backrest_filling', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Чохли</label>
                <input type="text" value={(formData.specs.material as Material)?.covers || ''} onChange={(e) => handleMaterialChange('covers', e.target.value)} style={inputStyle} />
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '300px' }}>
              <select value={(formData.specs.material as string) || ''} onChange={(e) => handleSpecChange('material', e.target.value)} style={inputStyle}>
                <option value="">Оберіть матеріал...</option>
                {getMaterialOptions().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* SOFA SPECS */}
        {isSofaCategory && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Характеристики дивану</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Конструкція</label>
                <input type="text" value={formData.specs.construction || ''} onChange={(e) => handleSpecChange('construction', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Тип підлокітника</label>
                <input type="text" value={formData.specs.armrest_type || ''} onChange={(e) => handleSpecChange('armrest_type', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Висота ніжок</label>
                <input type="text" value={formData.specs.leg_height || ''} onChange={(e) => handleSpecChange('leg_height', e.target.value)} placeholder="високі, низькі" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Висота сидіння (см)</label>
                <input type="number" value={formData.specs.seat_height || ''} onChange={(e) => handleSpecChange('seat_height', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Внутрішній матеріал</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Структура</label>
                  <input type="text" value={formData.specs.inner_material?.structure || ''} onChange={(e) => handleInnerMaterialChange('structure', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Наповнювач подушок</label>
                  <input type="text" value={formData.specs.inner_material?.cushion_filling || ''} onChange={(e) => handleInnerMaterialChange('cushion_filling', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Додаткові характеристики</label>
              <textarea value={formData.specs.additional_features || ''} onChange={(e) => handleSpecChange('additional_features', e.target.value)} rows={2} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '30px', marginTop: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.specs.has_shelves || false} onChange={(e) => handleSpecChange('has_shelves', e.target.checked)} /> Є полички
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.specs.has_lift_mechanism || false} onChange={(e) => handleSpecChange('has_lift_mechanism', e.target.checked)} /> Підйомний механізм
              </label>
            </div>
          </div>
        )}

        {/* BED SPECS */}
        {formData.category === 'beds' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Характеристики ліжка</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Конструкція</label>
                <input type="text" value={formData.specs.construction || ''} onChange={(e) => handleSpecChange('construction', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Тип узголів&apos;я</label>
                <input type="text" value={formData.specs.headboard_type || ''} onChange={(e) => handleSpecChange('headboard_type', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Варіанти зберігання</label>
                <input type="text" value={formData.specs.storage_options || ''} onChange={(e) => handleSpecChange('storage_options', e.target.value)} placeholder="ящики, підйомний механізм" style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* MATTRESS SPECS */}
        {formData.category === 'mattresses' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Характеристики матраца</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Тип</label>
                <select value={formData.specs.type || ''} onChange={(e) => handleSpecChange('type', e.target.value)} style={inputStyle}>
                  <option value="">Оберіть...</option>
                  <option value="spring">Пружинний</option>
                  <option value="foam">Пінний</option>
                  <option value="latex">Латексний</option>
                  <option value="orthopedic">Ортопедичний</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Жорсткість</label>
                <select value={formData.specs.firmness || formData.specs.hardness || ''} onChange={(e) => { handleSpecChange('firmness', e.target.value); handleSpecChange('hardness', e.target.value); }} style={inputStyle}>
                  <option value="">Оберіть...</option>
                  <option value="soft">М&apos;який</option>
                  <option value="medium">Середній</option>
                  <option value="firm">Жорсткий</option>
                  <option value="different">Різносторонній</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Товщина (см)</label>
                <input type="number" value={formData.specs.thickness || ''} onChange={(e) => handleSpecChange('thickness', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Тип основи</label>
                <input type="text" value={formData.specs.core_type || ''} onChange={(e) => handleSpecChange('core_type', e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* TABLE SPECS */}
        {formData.category === 'tables' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Характеристики столу</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Форма стільниці</label>
                <select value={formData.specs.shape || ''} onChange={(e) => handleSpecChange('shape', e.target.value)} style={inputStyle}>
                  <option value="">Оберіть...</option>
                  <option value="round">Круглий</option>
                  <option value="oval">Овальний</option>
                  <option value="square">Квадратний</option>
                  <option value="rectangular">Прямокутний</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.specs.extendable || false} onChange={(e) => handleSpecChange('extendable', e.target.checked)} /> Розкладний
                </label>
              </div>
            </div>
          </div>
        )}

        {/* CHAIR SPECS */}
        {formData.category === 'chairs' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Характеристики стільця</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Оббивка</label>
                <input type="text" value={formData.specs.upholstery || ''} onChange={(e) => handleSpecChange('upholstery', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Висота сидіння (см)</label>
                <input type="number" value={formData.specs.seat_height || ''} onChange={(e) => handleSpecChange('seat_height', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Макс. вага (кг)</label>
                <input type="number" value={formData.specs.weight_capacity || ''} onChange={(e) => handleSpecChange('weight_capacity', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* WARDROBE SPECS */}
        {formData.category === 'wardrobes' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Характеристики шафи</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Кількість дверей</label>
                <input type="number" value={formData.specs.door_count || ''} onChange={(e) => handleSpecChange('door_count', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Тип дверей</label>
                <select value={formData.specs.door_type || ''} onChange={(e) => handleSpecChange('door_type', e.target.value)} style={inputStyle}>
                  <option value="">Оберіть...</option>
                  <option value="sliding">Розсувні (купе)</option>
                  <option value="hinged">Розпашні</option>
                  <option value="folding">Складні</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Внутрішнє наповнення</label>
                <input type="text" value={formData.specs.internal_layout || ''} onChange={(e) => handleSpecChange('internal_layout', e.target.value)} placeholder="полиці, штанги, ящики..." style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* ACCESSORY SPECS */}
        {formData.category === 'accessories' && (
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Характеристики аксесуара</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Тип кріплення</label>
                <input type="text" value={formData.specs.mounting_type || ''} onChange={(e) => handleSpecChange('mounting_type', e.target.value)} placeholder="настінний, підлоговий..." style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '12px', display: 'block', marginBottom: '3px' }}>Кількість полиць</label>
                <input type="number" value={formData.specs.shelf_count || ''} onChange={(e) => handleSpecChange('shelf_count', e.target.value ? Number(e.target.value) : undefined)} min="0" style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button type="submit" disabled={loading} style={{ padding: '15px 40px', backgroundColor: loading ? '#ccc' : '#4caf50', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            {loading ? 'Збереження...' : isEdit ? 'Оновити товар' : 'Створити товар'}
          </button>
          <button type="button" onClick={() => router.back()} style={{ padding: '15px 40px', backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ccc', cursor: 'pointer', fontSize: '16px' }}>
            Скасувати
          </button>
        </div>
      </form>
    </div>
  );
}
