import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/upload', label: 'Сканировать файл' },
  { path: '/threats', label: 'Библиотека угроз' },
  { path: '/history', label: 'История' },
];

export default function Navbar() {
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
      </div>
    </nav>
  );
}
