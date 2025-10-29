import styles from './StatsPanel.module.css';

export interface StatItem {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'error' | 'warning';
}

export interface StatsPanelProps {
  stats: StatItem[];
  className?: string;
}

export function StatsPanel({ stats, className = '' }: StatsPanelProps) {
  return (
    <div className={`${styles.stats} ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className={styles.stat}>
          <span className={styles.statLabel}>{stat.label}:</span>
          <span
            className={`${styles.statValue} ${
              stat.variant ? styles[stat.variant] : ''
            }`}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default StatsPanel;
