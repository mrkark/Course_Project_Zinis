import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const navItems = [
  { path: '/', label: 'Главная' },
  { path: '/upload', label: 'Сканировать файл' },
  { path: '/threats', label: 'Библиотека угроз' },
  { path: '/history', label: 'История' },
];

export default function Navbar() {
  const { token, user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <nav className="site-nav">
      <div className="nav-inner">
        <NavLink to="/" className="brand">
          <span className="brand-mark">MS</span>
          <span>Песочница анализа вредоносных файлов</span>
        </NavLink>
        <div className="nav-links">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-account">
          {token ? (
            <button className="account-button" title={user?.email || 'Аккаунт'} onClick={async () => { await logout(); navigate('/login'); }}>
              <span className="account-icon">{(user?.email || 'U').slice(0, 1).toUpperCase()}</span>
              <span className="account-label">{user?.email || 'Аккаунт'}</span>
            </button>
          ) : (
            <button className="account-button" onClick={() => navigate('/login')}>
              <span className="account-icon">↪</span>
              <span className="account-label">Войти</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
