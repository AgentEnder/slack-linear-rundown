/**
 * Login Page
 * Displays Sign in with Slack button
 */

import { SignInButton } from '@slack-linear-rundown/auth-client';
import './Login.css';

export function Login() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Slack-Linear Rundown</h1>
          <p>Sign in to view your Linear issues</p>
        </div>

        <div className="login-content">
          <SignInButton />
        </div>

        <div className="login-footer">
          <p>
            By signing in, you agree to sync your Linear issues to view them in
            this application.
          </p>
        </div>
      </div>
    </div>
  );
}
