/**
 * Login Page
 * Displays Sign in with Slack button for admin access
 */

import { SignInButton } from '@slack-linear-rundown/auth-client';
import './Login.css';

export function Login() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Admin Portal</h1>
          <p>Sign in to manage your Slack-Linear Rundown</p>
        </div>

        <div className="login-content">
          <SignInButton />
        </div>

        <div className="login-footer">
          <p>
            Admin access required. Sign in with your authorized Slack account.
          </p>
        </div>
      </div>
    </div>
  );
}
