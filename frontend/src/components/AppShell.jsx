import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import ProductBrand from './ProductBrand';

const AppShell = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProjectSection, setActiveProjectSection] = useState('project-members');
  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const onProjectDetailsPage = /^\/projects\/[^/]+$/.test(location.pathname);

  const projectSections = [
    ['project-members', 'Members'],
    ['project-tasks', 'Tasks'],
    ['project-documents', 'Documents'],
    ['project-qa', 'Project Q&A'],
  ];

  const scrollToProjectSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveProjectSection(sectionId);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  const navClassName = ({ isActive }) =>
    `app-shell__nav-link${isActive ? ' app-shell__nav-link--active' : ''}`;

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="app-shell__mobile-header">
        <NavLink className="app-shell__mobile-brand" to="/dashboard">
          <ProductBrand />
        </NavLink>
        <button
          className="app-shell__menu-button"
          type="button"
          aria-controls="primary-sidebar"
          aria-expanded={mobileMenuOpen}
          aria-label="Open navigation menu"
          onClick={() => setMobileMenuOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </header>

      {mobileMenuOpen && (
        <button className="app-shell__backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside
        className={`app-shell__sidebar${mobileMenuOpen ? ' app-shell__sidebar--open' : ''}`}
        id="primary-sidebar"
      >
        <div className="app-shell__sidebar-header">
        <NavLink className="app-shell__brand" to="/dashboard" aria-label="Orbit PM dashboard">
          <ProductBrand />
        </NavLink>
        <button
          className="app-shell__collapse-button"
          type="button"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          onClick={() => setSidebarCollapsed((current) => !current)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={sidebarCollapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} /></svg>
        </button>
        <button className="app-shell__drawer-close" type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        </div>

        <nav className="app-shell__nav" aria-label="Primary navigation">
          <NavLink className={navClassName} to="/dashboard" end title={sidebarCollapsed ? 'Dashboard' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <svg className="app-shell__nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" />
            </svg>
            <span className="app-shell__nav-label">Dashboard</span>
          </NavLink>
          <NavLink className={navClassName} to="/projects" title={sidebarCollapsed ? 'Projects' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <svg className="app-shell__nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
            </svg>
            <span className="app-shell__nav-label">Projects</span>
          </NavLink>
          {onProjectDetailsPage && (
            <div className="app-shell__subnav" aria-label="Project sections">
              {projectSections.map(([sectionId, label]) => (
                <button
                  className={`app-shell__subnav-link${activeProjectSection === sectionId ? ' app-shell__subnav-link--active' : ''}`}
                  type="button"
                  key={sectionId}
                  onClick={() => scrollToProjectSection(sectionId)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </nav>

        <div className="app-shell__account">
          <div className="app-shell__user">
            <span className="app-shell__avatar" aria-hidden="true">
              {userInitial}
            </span>
            <span className="app-shell__user-copy">
              <strong>{user?.name || 'Signed in'}</strong>
              <small>{user?.email || 'Account'}</small>
            </span>
          </div>

          <Button className="app-shell__logout" variant="secondary" onClick={logout} title={sidebarCollapsed ? 'Log out' : undefined} aria-label="Log out">
            <svg className="app-shell__logout-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" /></svg>
            <span className="app-shell__logout-label">Log out</span>
          </Button>
        </div>
      </aside>

      <main className="app-shell__main" id="main-content" tabIndex="-1">
        <div className="app-shell__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppShell;
