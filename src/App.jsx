import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import TopNav from './components/layout/TopNav.jsx';
import SiteFooter from './components/layout/SiteFooter.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { OperationsProvider } from './contexts/OperationsContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OperationsPage from './pages/OperationsPage.jsx';
import GoalsPage from './pages/GoalsPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import CookiesPage from './pages/CookiesPage.jsx';

function ProtectedRoute() {
  const auth = useAuth();
  if (!auth.isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AppInner() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const guestLinks = useMemo(
    () => [
      { label: 'О сервисе', href: '#about' },
      { label: 'Возможности', href: '#features' },
      { label: 'Как это работает', href: '#steps' },
      { label: 'Безопасность', href: '#safety' },
    ],
    [],
  );

  const authLinks = useMemo(
    () => [
      { label: 'Главная', to: '/dashboard' },
      { label: 'Операции', to: '/operations' },
      { label: 'Цели', to: '/goals' },
      { label: 'Бюджеты', to: '/budgets' },
      { label: 'Счета', to: '/accounts' },
    ],
    [],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');
  const [toast, setToast] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDark, setIsDark] = useState(() => localStorage.getItem('ml-theme') === 'dark');
  const [form, setForm] = useState({ login: '', password: '', name: '', phone: '', email: '' });

  useEffect(() => {
    auth.bootstrap();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', isDark);
    localStorage.setItem('ml-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const openModal = (mode = 'login') => {
    setModalMode(mode);
    setModalOpen(true);
    setFieldErrors({});
    setForm({ login: '', password: '', name: '', phone: '', email: '' });
  };

  const closeModal = () => {
    setModalOpen(false);
    setFieldErrors({});
  };

  const isRegister = modalMode === 'signup';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFieldErrors({});

    const payload = {
      login: form.login.trim(),
      password: form.password,
      name: form.name,
      phone: form.phone,
      email: form.email,
    };

    const errors = {};
    const loginValid = /^[a-z0-9._-]+$/i.test(payload.login || '');
    if (!payload.login) errors.login = 'Укажите логин';
    if (!payload.password) errors.password = 'Укажите пароль';
    if (isRegister && !payload.name) errors.name = 'Укажите имя';
    if (!loginValid) errors.login = 'Только латиница, цифры, точки, дефис и нижнее подчеркивание';
    if (isRegister && payload.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) errors.email = 'Некорректный email';
    if (isRegister && payload.phone && payload.phone.replace(/\D/g, '').length < 8) errors.phone = 'Телефон должен содержать минимум 8 цифр';
    if (isRegister && payload.password.length < 6) errors.password = 'Пароль должен быть не короче 6 символов';

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setToast('Проверьте ошибки формы');
      return;
    }

    try {
      if (isRegister) {
        await auth.register(payload);
      } else {
        await auth.login(payload);
      }
      setToast('Добро пожаловать');
      closeModal();
      navigate('/dashboard');
    } catch (err) {
      setToast(err.message || 'Ошибка авторизации');
    }
  };

  const goHome = () => {
    const target = auth.isAuthenticated ? '/dashboard' : '/';
    if (location.pathname !== target) {
      navigate(target);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`page ${isDark ? 'dark' : ''}`}>
      <TopNav
        isAuthenticated={auth.isAuthenticated}
        isDark={isDark}
        guestLinks={guestLinks}
        authLinks={authLinks}
        onLogin={() => openModal('login')}
        onTrial={() => openModal('signup')}
        onCabinet={() => navigate('/profile')}
        onHome={goHome}
        onToggleTheme={() => setIsDark((v) => !v)}
      />

      <Routes>
        <Route path="/" element={<LandingPage onOpenModal={openModal} />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <SiteFooter onHome={goHome} />

      {modalOpen && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>{isRegister ? 'Регистрация' : 'Войти в MoneyLens'}</h3>
              <button className="icon-btn" aria-label="Закрыть" onClick={closeModal}>
                x
              </button>
            </header>
            <form className="form" onSubmit={handleSubmit}>
              <label className={`field ${fieldErrors.login ? 'error' : ''}`}>
                <span>Логин</span>
                <input value={form.login} onChange={(e) => setForm((p) => ({ ...p, login: e.target.value }))} type="text" />
                {fieldErrors.login && <small className="error-text">{fieldErrors.login}</small>}
              </label>
              <label className={`field ${fieldErrors.password ? 'error' : ''}`}>
                <span>Пароль</span>
                <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} type="password" />
                {fieldErrors.password && <small className="error-text">{fieldErrors.password}</small>}
              </label>

              {isRegister && (
                <>
                  <label className={`field ${fieldErrors.name ? 'error' : ''}`}>
                    <span>Имя</span>
                    <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} type="text" />
                    {fieldErrors.name && <small className="error-text">{fieldErrors.name}</small>}
                  </label>
                  <label className={`field ${fieldErrors.phone ? 'error' : ''}`}>
                    <span>Телефон (опционально)</span>
                    <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} type="tel" />
                    {fieldErrors.phone && <small className="error-text">{fieldErrors.phone}</small>}
                  </label>
                  <label className={`field ${fieldErrors.email ? 'error' : ''}`}>
                    <span>Email (опционально)</span>
                    <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" />
                    {fieldErrors.email && <small className="error-text">{fieldErrors.email}</small>}
                  </label>
                </>
              )}

              <button className="primary full" type="submit">
                {isRegister ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OperationsProvider>
        <AppInner />
      </OperationsProvider>
    </AuthProvider>
  );
}
