'use client';

import { useState, useEffect } from 'react';

interface ChangelogEntry {
  id: number;
  product_id: number;
  admin_email: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

interface ProductChangelogProps {
  productId: number;
}

// Field name translations
const FIELD_LABELS: Record<string, string> = {
  name: 'Назва',
  slug: 'Slug',
  description: 'Опис',
  category: 'Категорія',
  price: 'Ціна',
  sale_price: 'Акційна ціна',
  stock: 'Кількість',
  is_on_sale: 'Акція',
  is_new: 'Новинка',
  is_bestseller: 'Хіт продажу',
};

// Action translations
const ACTION_LABELS: Record<string, string> = {
  created: 'Створено',
  updated: 'Оновлено',
  deleted: 'Видалено',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Так' : 'Ні';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    // Truncate long strings
    return value.length > 50 ? value.substring(0, 50) + '...' : value;
  }
  return JSON.stringify(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProductChangelog({ productId }: ProductChangelogProps) {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchChangelog() {
      try {
        const response = await fetch(`/admin-path-57fyg/api/products/${productId}/changelog`);
        if (!response.ok) {
          throw new Error('Failed to fetch changelog');
        }
        const data = await response.json();
        setChangelog(data.changelog || []);
      } catch (err) {
        console.error('Error fetching changelog:', err);
        setError('Не вдалося завантажити історію змін');
      } finally {
        setLoading(false);
      }
    }

    fetchChangelog();
  }, [productId]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <h3 style={titleStyle}>Історія змін</h3>
        <p style={{ color: '#666' }}>Завантаження...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <h3 style={titleStyle}>Історія змін</h3>
        <p style={{ color: '#f44336' }}>{error}</p>
      </div>
    );
  }

  if (changelog.length === 0) {
    return (
      <div style={containerStyle}>
        <h3 style={titleStyle}>Історія змін</h3>
        <p style={{ color: '#666' }}>Історія змін поки порожня</p>
      </div>
    );
  }

  const displayedChanges = isExpanded ? changelog : changelog.slice(0, 5);

  return (
    <div style={containerStyle}>
      <h3 style={titleStyle}>Історія змін</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayedChanges.map((entry) => (
          <div key={entry.id} style={entryStyle}>
            <div style={entryHeaderStyle}>
              <span style={actionBadgeStyle(entry.action)}>
                {ACTION_LABELS[entry.action] || entry.action}
              </span>
              <span style={dateStyle}>{formatDate(entry.created_at)}</span>
              <span style={adminStyle}>{entry.admin_email}</span>
            </div>

            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div style={changesContainerStyle}>
                {Object.entries(entry.changes).map(([field, { old: oldVal, new: newVal }]) => (
                  <div key={field} style={changeRowStyle}>
                    <span style={fieldLabelStyle}>
                      {FIELD_LABELS[field] || field}:
                    </span>
                    <span style={oldValueStyle}>{formatValue(oldVal)}</span>
                    <span style={arrowStyle}>→</span>
                    <span style={newValueStyle}>{formatValue(newVal)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {changelog.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={toggleButtonStyle}
        >
          {isExpanded ? 'Показати менше' : `Показати ще (${changelog.length - 5})`}
        </button>
      )}
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  backgroundColor: '#f5f5f5',
  padding: '20px',
  borderRadius: '8px',
  marginTop: '30px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '15px',
  color: '#333',
};

const entryStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #e0e0e0',
};

const entryHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
  marginBottom: '8px',
};

const actionBadgeStyle = (action: string): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
  backgroundColor: action === 'created' ? '#e8f5e9' : action === 'updated' ? '#e3f2fd' : '#ffebee',
  color: action === 'created' ? '#2e7d32' : action === 'updated' ? '#1565c0' : '#c62828',
});

const dateStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#666',
};

const adminStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#888',
  fontStyle: 'italic',
};

const changesContainerStyle: React.CSSProperties = {
  marginTop: '8px',
  paddingTop: '8px',
  borderTop: '1px solid #eee',
};

const changeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  marginBottom: '4px',
  flexWrap: 'wrap',
};

const fieldLabelStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#555',
  minWidth: '100px',
};

const oldValueStyle: React.CSSProperties = {
  color: '#c62828',
  textDecoration: 'line-through',
};

const arrowStyle: React.CSSProperties = {
  color: '#666',
};

const newValueStyle: React.CSSProperties = {
  color: '#2e7d32',
  fontWeight: '500',
};

const toggleButtonStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '8px 16px',
  backgroundColor: 'transparent',
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  color: '#666',
};
