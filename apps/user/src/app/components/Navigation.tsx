/**
 * Navigation Component
 * Main navigation bar for the user app
 */

import { NavLink } from 'react-router-dom';
import { useAuth } from '@slack-linear-rundown/auth-client';
import './Navigation.css';

export function Navigation() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/user/login';
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1 className="nav-title">Linear Rundown</h1>
        </div>

        <div className="nav-links">
          <NavLink
            to="/completed"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">✅</span>
            <span className="nav-text">Completed</span>
          </NavLink>

          <NavLink
            to="/started"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">🔄</span>
            <span className="nav-text">Started</span>
          </NavLink>

          <NavLink
            to="/updated"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">📝</span>
            <span className="nav-text">Updated</span>
          </NavLink>

          <NavLink
            to="/open"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Open</span>
          </NavLink>
        </div>

        {user && (
          <div className="nav-user">
            <span className="user-name">{user.name || user.email}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
