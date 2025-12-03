'use client';

/**
 * Клієнтський компонент профілю адміністратора
 * Обробляє редагування імені, зміну пароля та управління сесіями
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '20px',
  paddingBottom: '10px',
  borderBottom: '1px solid #eee',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ccc',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '5px',
  fontSize: '14px',
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

const buttonStyle: React.CSSProperties = {
  padding: '10px 25px',
  backgroundColor: '#4caf50',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#ccc',
  cursor: 'not-allowed',
};

const dangerButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#f44336',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
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

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/admin-secret-2024/api/profile/sessions');
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
      const response = await fetch('/admin-secret-2024/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch('/admin-secret-2024/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/admin-secret-2024/api/profile/sessions/${sessionId}`, {
        method: 'DELETE',
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

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Невідомо';
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Ім&apos;я</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={inputStyle}
                placeholder="Введіть ім'я"
              />
            </div>
            <div>
              <label style={labelStyle}>Прізвище</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={inputStyle}
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
            }}>
              {nameMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={nameLoading}
            style={nameLoading ? buttonDisabledStyle : buttonStyle}
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
            <label style={labelStyle}>Поточний пароль</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Новий пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
                required
                minLength={8}
              />
            </div>
            <div>
              <label style={labelStyle}>Підтвердіть пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {passwordError && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#ffebee',
              color: '#c62828',
            }}>
              {passwordError}
            </div>
          )}

          {passwordMessage && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
            }}>
              {passwordMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordLoading}
            style={passwordLoading ? buttonDisabledStyle : buttonStyle}
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
                          style={{
                            ...dangerButtonStyle,
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
