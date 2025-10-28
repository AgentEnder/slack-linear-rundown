/**
 * Main App Component
 * Sets up routing and authentication for the admin app
 */

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@slack-linear-rundown/auth-client';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Dashboard />;
}

export function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider apiBaseUrl="">
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
