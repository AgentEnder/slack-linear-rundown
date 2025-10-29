import styles from './Table.module.css';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`${styles.tableWrapper} ${className}`}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}

export default Table;
