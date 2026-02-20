import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const profile = auth.user?.profile || {};
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      email: profile.email || '',
      password: '',
    });
  }, [auth.user]);

  const validateFields = (fields) => {
    const nextErrors = {};
    if (!fields.name.trim()) nextErrors.name = 'Укажите ФИО.';
    if (!fields.phone.trim()) nextErrors.phone = 'Укажите номер телефона.';
    if (fields.phone.trim() && fields.phone.replace(/\D/g, '').length < 8) nextErrors.phone = 'Телефон должен содержать минимум 8 цифр.';
    if (fields.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email)) nextErrors.email = 'Укажите корректный email.';
    if (fields.password && fields.password.length < 6) nextErrors.password = 'Пароль должен быть не короче 6 символов.';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setError('');

    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      password: form.password,
    };

    if (!validateFields(payload)) return;

    try {
      setStatus('Сохраняем...');
      await auth.updateProfile(payload);
      setStatus('Изменения сохранены');
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      setError(err.message || 'Не удалось сохранить профиль');
    } finally {
      setTimeout(() => setStatus(''), 2000);
    }
  };

  const logout = () => {
    auth.logout();
    navigate('/');
  };

  return (
    <main className="content">
      <section className="dashboard">
        <div className="section-head">
          <p className="pill">Личный кабинет</p>
          <h2>Данные пользователя</h2>
          <p className="muted">Обновляйте ФИО, телефон, email и пароль.</p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="label">Логин</p>
              <p className="strong">{auth.user?.login}</p>
            </div>
            <button className="ghost" type="button" onClick={logout}>Выйти</button>
          </div>

          <form className="form column" onSubmit={submitProfile}>
            <label className={`field ${fieldErrors.name ? 'error' : ''}`}>
              <span>ФИО</span>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} type="text" />
              {fieldErrors.name && <small className="error-text">{fieldErrors.name}</small>}
            </label>
            <label className={`field ${fieldErrors.phone ? 'error' : ''}`}>
              <span>Телефон</span>
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} type="tel" />
              {fieldErrors.phone && <small className="error-text">{fieldErrors.phone}</small>}
            </label>
            <label className={`field ${fieldErrors.email ? 'error' : ''}`}>
              <span>Email</span>
              <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" />
              {fieldErrors.email && <small className="error-text">{fieldErrors.email}</small>}
            </label>
            <label className={`field ${fieldErrors.password ? 'error' : ''}`}>
              <span>Пароль</span>
              <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} type="password" placeholder="Новый пароль (мин. 6 символов)" />
              {fieldErrors.password && <small className="error-text">{fieldErrors.password}</small>}
            </label>
            <div className="form-actions">
              <button className="primary" type="submit">Сохранить</button>
            </div>
            {status && <p className="muted small">{status}</p>}
            {error && <p className="muted small" style={{ color: '#dc2626' }}>{error}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}
