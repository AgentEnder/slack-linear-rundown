/**
 * Sign In with Slack Button
 * Reusable button component for initiating OAuth flow
 */

import React from 'react';
import { SlackLogoIcon } from '@slack-linear-rundown/icons';
import { useAuth } from './AuthContext';
import './SignInButton.css';

export interface SignInButtonProps {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SignInButton({
  redirectTo,
  className,
  children,
}: SignInButtonProps) {
  const { login } = useAuth();

  const handleClick = () => {
    login(redirectTo);
  };

  return (
    <button
      onClick={handleClick}
      className={`sign-in-button ${className || ''}`}
      type="button"
    >
      {children || (
        <>
          <SlackLogoIcon className="slack-logo" />
          <span>Sign in with Slack</span>
        </>
      )}
    </button>
  );
}
