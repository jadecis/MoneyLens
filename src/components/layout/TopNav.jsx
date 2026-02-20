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
          <span aria-hidden="true">{isDark ? '?' : '?'}</span>
        </button>
      </div>
    </header>
  );
}


