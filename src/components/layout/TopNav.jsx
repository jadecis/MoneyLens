import { NavLink } from 'react-router-dom';
import { useState } from 'react';

export default function TopNav({
  isAuthenticated,
  isDark,
  guestLinks,
  authLinks,
  onLogin,
  onTrial,
  onCabinet,
  onHome,
  onToggleTheme,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const themeIcon = isDark ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );

  const goHome = () => {
    onHome();
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`top-nav ${menuOpen ? 'menu-open' : ''}`}>
      <div className="nav-left">
        <button className="logo" type="button" onClick={goHome}>
          <span className="logo-mark">ML</span>
          <span className="logo-text">MoneyLens</span>
        </button>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Переключить меню">
          <span>{menuOpen ? 'x' : '='}</span>
        </button>
      </div>

      {!isAuthenticated ? (
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {guestLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
        </nav>
      ) : (
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} onClick={closeMenu}>
          {authLinks.map((link) => (
            <NavLink key={link.label} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className={`nav-actions ${menuOpen ? 'open' : ''}`}>
        {!isAuthenticated ? (
          <>
            <button
              className="ghost"
              onClick={() => {
                onLogin();
                closeMenu();
              }}
            >
              Войти
            </button>
            <button
              className="primary"
              onClick={() => {
                onTrial();
                closeMenu();
              }}
            >
              Регистрация
            </button>
          </>
        ) : (
          <button
            className="primary"
            onClick={() => {
              onCabinet();
              closeMenu();
            }}
          >
            Личный кабинет
          </button>
        )}
        <button
          className="ghost theme-toggle"
          title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          onClick={onToggleTheme}
        >
          <span aria-hidden="true">{themeIcon}</span>
        </button>
      </div>
    </header>
  );
}


