import { Outlet, NavLink } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';
import './Layout.css';

export default function Layout() {
    const { theme, toggleTheme } = useThemeStore();

    return (
        <div className="app-layout">
            <header className="header">
                <div className="header-top">
                    <div className="logo">
                        <span className="logo-icon">🐦</span>
                        <span className="logo-text">X Tweet Automation</span>
                    </div>
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>
                <nav className="nav">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon">✨</span>
                        <span>Compose</span>
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon">⚙️</span>
                        <span>Settings</span>
                    </NavLink>
                </nav>
            </header>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
