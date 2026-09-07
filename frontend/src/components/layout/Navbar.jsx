// frontend/src/components/layout/Navbar.jsx
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/upload', label: 'Upload & Scan', icon: '📤' },
  { path: '/live', label: 'Live Analysis', icon: '📡' },
  { path: '/threats', label: 'Threat Library', icon: '📚' },
  { path: '/history', label: 'History', icon: '📋' },
];

export default function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center space-x-2 text-xl font-bold text-primary-600 dark:text-primary-400">
              <span>🛡️</span>
              <span>Malware Sandbox</span>
            </NavLink>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Educational Sandbox Platform
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}