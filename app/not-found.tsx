import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1rem',
      textAlign: 'center',
      padding: '2rem',
      fontFamily: 'Inter, Arial, sans-serif',
      color: 'var(--foreground)',
    }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 700, lineHeight: 1, color: 'var(--btn-color)' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
        Сторінку не знайдено
      </h2>
      <p style={{ color: '#6b7280', maxWidth: '400px' }}>
        Сторінка, яку ви шукаєте, не існує або була переміщена.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '1rem',
          padding: '0.75rem 2rem',
          background: 'var(--btn-color)',
          color: '#fff',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '1rem',
        }}
      >
        На головну
      </Link>
    </div>
  );
}
