import styles from './Badge.module.css';

export interface BadgeProps {
  variant: 'success' | 'error' | 'warning' | 'disabled' | 'inactive' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
