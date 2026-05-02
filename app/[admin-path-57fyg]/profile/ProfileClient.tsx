'use client';

/**
 * Клієнтський компонент профілю адміністратора
 * Обробляє редагування імені, зміну пароля та управління сесіями
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfTokenFromCookie } from '../components/CsrfProvider';
import styles from '../styles/admin.module.css';

// Get admin path from environment variable (Task 7)
const ADMIN_PATH = `/${process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET || 'admin'}`;

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_login_at: string | null;
  last_login_ip: string | null;
  roles: string[];
}

interface Session {
  id: string;
  ip_address: string;
  device: string;
  created_at: string;
  last_activity_at: string;
  is_current: boolean;
}

interface ProfileClientProps {
  profile: Profile;
}

// Styles
const sectionStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  padding: '25px',
  marginBottom: '25px',
  borderRadius: '8px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '20px',
  paddingBottom: '10px',
  borderBottom: '1px solid #eee',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '15px',
  padding: '10px 0',
  borderBottom: '1px solid #f0f0f0',
};

const infoLabelStyle: React.CSSProperties = {
  width: '150px',
  fontWeight: 'bold',
  color: '#666',
  fontSize: '14px',
};

const infoValueStyle: React.CSSProperties = {
  flex: 1,
  fontSize: '14px',
};

export default function ProfileClient({ profile }: ProfileClientProps) {
  const router = useRouter();

  // Name editing state
  const [firstName, setFirstName] = useState(profile.first_name || '');
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMessage, setNameMessage] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [endingSession, setEndingSession] = useState<string | null>(null);

  // Hydration state - only render dates on client
  const [isClient, setIsClient] = useState(false);

  // Fetch sessions on mount and set client flag
  useEffect(() => {
    setIsClient(true);
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${ADMIN_PATH}/api/profile/sessions`);
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Update name
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true);
    setNameMessage('');

    try {
      const csrfToken = getCsrfTokenFromCookie();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const response = await fetch(`${ADMIN_PATH}/api/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });

      const data = await response.json();
      if (data.success) {
        setNameMessage('Профіль оновлено');
        router.refresh();
      } else {
        setNameMessage(data.error || 'Помилка оновлення');
      }
    } catch {
      setNameMessage('Помилка оновлення профілю');
    } finally {
      setNameLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Паролі не співпадають');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Пароль має бути не менше 8 символів');
      setPasswordLoading(false);
      return;
    }

    try {
      const csrfToken = getCsrfTokenFromCookie();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const response = await fetch(`${ADMIN_PATH}/api/profile/password`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPasswordMessage('Пароль змінено успішно');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Refresh sessions list
        fetchSessions();
      } else {
        setPasswordError(data.error || 'Помилка зміни пароля');
      }
    } catch {
      setPasswordError('Помилка зміни пароля');
    } finally {
      setPasswordLoading(false);
    }
  };

  // End session
  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Завершити цю сесію?')) return;

    setEndingSession(sessionId);

    try {
      const csrfToken = getCsrfTokenFromCookie();
      const headers: Record<string, string> = {};
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const response = await fetch(`${ADMIN_PATH}/api/profile/sessions/${sessionId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();
      if (data.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      } else {
        alert(data.error || 'Помилка завершення сесії');
      }
    } catch {
      alert('Помилка завершення сесії');
    } finally {
      setEndingSession(null);
    }
  };

  // Format date for display - only on client to avoid hydration mismatch
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Невідомо';
    if (!isClient) return '...'; // Placeholder during SSR
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format role for display
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Адміністратор',
      manager: 'Менеджер',
    };
    return roleMap[role] || role;
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Profile Info Section */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Інформація профілю</h2>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>Email:</span>
          <span style={infoValueStyle}>{profile.email}</span>
        </div>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>Роль:</span>
          <span style={infoValueStyle}>
            {profile.roles.map(formatRole).join(', ')}
          </span>
        </div>

        <div style={infoRowStyle}>
          <span style={infoLabelStyle}>Дата реєстрації:</span>
          <span style={infoValueStyle}>{formatDate(profile.created_at)}</span>
        </div>

        <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
          <span style={infoLabelStyle}>Останній вхід:</span>
          <span style={infoValueStyle}>
            {formatDate(profile.last_login_at)}
            {profile.last_login_ip && (
              <span style={{ color: '#999', marginLeft: '10px' }}>
                ({profile.last_login_ip})
              </span>
            )}
          </span>
        </div>
      </section>

      {/* Edit Name Section */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Редагувати ім&apos;я</h2>

        <form onSubmit={handleUpdateName}>
          <div className={styles.grid2} style={{ marginBottom: '20px' }}>
            <div>
              <label className={styles.label}>Ім&apos;я</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={styles.input}
                placeholder="Введіть ім'я"
              />
            </div>
            <div>
              <label className={styles.label}>Прізвище</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={styles.input}
                placeholder="Введіть прізвище"
              />
            </div>
          </div>

          {nameMessage && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: nameMessage.includes('оновлено') ? '#e8f5e9' : '#ffebee',
              color: nameMessage.includes('оновлено') ? '#2e7d32' : '#c62828',
              borderRadius: '4px',
            }}>
              {nameMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={nameLoading}
            className={styles.buttonPrimary}
          >
            {nameLoading ? 'Збереження...' : 'Зберегти'}
          </button>
        </form>
      </section>

      {/* Change Password Section */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Змінити пароль</h2>

        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '15px' }}>
            <label className={styles.label}>Поточний пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.grid2} style={{ marginBottom: '20px' }}>
            <div>
              <label className={styles.label}>Новий пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className={styles.label}>Підтвердіть пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>
          </div>

          {passwordError && (
            <div className={styles.error}>
              {passwordError}
            </div>
          )}

          {passwordMessage && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              borderRadius: '4px',
            }}>
              {passwordMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordLoading}
            className={styles.buttonPrimary}
          >
            {passwordLoading ? 'Зміна...' : 'Змінити пароль'}
          </button>
        </form>
      </section>

      {/* Active Sessions Section */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Активні сесії</h2>

        {sessionsLoading ? (
          <p style={{ color: '#666' }}>Завантаження...</p>
        ) : sessions.length === 0 ? (
          <p style={{ color: '#666' }}>Немає активних сесій</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Пристрій</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>IP-адреса</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Остання активність</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Дія</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} style={{ backgroundColor: session.is_current ? '#e3f2fd' : 'transparent' }}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                      {session.device}
                      {session.is_current && (
                        <span style={{
                          marginLeft: '10px',
                          padding: '2px 8px',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          fontSize: '11px',
                          borderRadius: '3px',
                        }}>
                          Поточна сесія
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>
                      {session.ip_address}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                      {formatDate(session.last_activity_at)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                      {session.is_current ? (
                        <span style={{ color: '#999', fontSize: '12px' }}>-</span>
                      ) : (
                        <button
                          onClick={() => handleEndSession(session.id)}
                          disabled={endingSession === session.id}
                          className={styles.buttonDanger}
                          style={{
                            opacity: endingSession === session.id ? 0.5 : 1,
                          }}
                        >
                          {endingSession === session.id ? '...' : 'Завершити'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
