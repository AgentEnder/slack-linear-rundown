/**
 * Dashboard Page
 * Main admin interface with tabs for different features
 */

import { useState } from 'react';
import { useAuth } from '@slack-linear-rundown/auth-client';
import ConfigurationTab from '../components/ConfigurationTab';
import UsersTab from '../components/UsersTab';
import MessagesTab from '../components/MessagesTab';
import JobsTab from '../components/JobsTab';
import styles from './Dashboard.module.css';

type Tab = 'config' | 'users' | 'messages' | 'jobs';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('config');
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
        <button
          className={`${styles.tab} ${
            activeTab === 'config' ? styles.active : ''
          }`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'users' ? styles.active : ''
          }`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'jobs' ? styles.active : ''
          }`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === 'messages' ? styles.active : ''
          }`}
          onClick={() => setActiveTab('messages')}
        >
          Message History
        </button>
      </nav>

      <main className={styles.content}>
        {activeTab === 'config' && <ConfigurationTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'jobs' && <JobsTab />}
        {activeTab === 'messages' && <MessagesTab />}
      </main>
    </div>
  );
}
