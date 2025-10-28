/**
 * Main App Component
 * Sets up routing and layout for the user app
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@slack-linear-rundown/auth-client';
import { Navigation } from './components/Navigation';
import { CompletedIssues } from './pages/CompletedIssues';
import { StartedIssues } from './pages/StartedIssues';
import { UpdatedIssues } from './pages/UpdatedIssues';
import { OpenIssues } from './pages/OpenIssues';
import { Login } from './pages/Login';
import './app.css';

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

  return (
    <div className="app">
      <Navigation />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/completed" replace />} />
          <Route path="/completed" element={<CompletedIssues />} />
          <Route path="/started" element={<StartedIssues />} />
          <Route path="/updated" element={<UpdatedIssues />} />
          <Route path="/open" element={<OpenIssues />} />
          <Route path="*" element={<Navigate to="/completed" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter basename="/user">
      <AuthProvider apiBaseUrl="">
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
