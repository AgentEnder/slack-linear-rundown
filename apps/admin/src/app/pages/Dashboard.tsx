/**
 * Dashboard Page
 * Main admin interface with tabs for different features
 */

import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '@slack-linear-rundown/auth-client';
import Configuration from './configuration/Configuration';
import Users from './users/Users';
import Messages from './messages/Messages';
import Jobs from './jobs/Jobs';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Slack-Linear Rundown Admin</h1>
          <p>Manage configuration, users, and view message delivery history</p>
        </div>
        {user && (
          <div className={styles.userSection}>
            <span className={styles.userName}>{user.name || user.email}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        )}
      </header>

      <nav className={styles.tabs}>
        <NavLink
          to="/config"
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          Configuration
        </NavLink>
        <NavLink
          to="/users"
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          Users
        </NavLink>
        <NavLink
          to="/jobs"
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          Jobs
        </NavLink>
        <NavLink
          to="/messages"
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          Message History
        </NavLink>
      </nav>

      <main className={styles.content}>
        <Routes>
          <Route path="/" element={<Navigate to="/config" replace />} />
          <Route path="/config" element={<Configuration />} />
          <Route path="/users" element={<Users />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/messages" element={<Messages />} />
        </Routes>
      </main>
    </div>
  );
}
