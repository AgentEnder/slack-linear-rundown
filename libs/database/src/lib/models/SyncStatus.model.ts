import {
  Table,
  Column,
  Model,
  DataType,
  Index,
} from 'sequelize-typescript';

export type SyncType = 'linear_issues' | 'github_data' | 'slack_users';
export type SyncStatusValue = 'success' | 'failed' | 'in_progress';

@Table({
  tableName: 'SyncStatus',
  timestamps: true,
  underscored: true,
})
export class SyncStatus extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Index('idx_sync_status_type')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
  })
  declare sync_type: SyncType;

  @Index('idx_sync_status_status')
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    comment: 'success, failed, in_progress',
  })
  declare status: SyncStatusValue;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare last_started_at?: Date;

  @Index('idx_sync_status_last_completed')
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare last_completed_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare last_success_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare last_failed_at?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare last_error_message?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare total_runs: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare success_count: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare failure_count: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'JSON object with sync-specific data',
  })
  declare metadata?: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare updated_at: Date;

  // Helper method to parse metadata
  getMetadata<T = Record<string, any>>(): T | null {
    if (!this.metadata) return null;
    try {
      return JSON.parse(this.metadata) as T;
    } catch {
      return null;
    }
  }

  // Helper method to set metadata
  setMetadata(data: Record<string, any>): void {
    this.metadata = JSON.stringify(data);
  }
}
