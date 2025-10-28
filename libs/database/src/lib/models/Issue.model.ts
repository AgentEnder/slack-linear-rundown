import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  HasMany,
} from 'sequelize-typescript';
import { UserIssueSnapshot } from './UserIssueSnapshot.model';

@Table({
  tableName: 'Issue',
  timestamps: false, // We manage timestamps manually
  underscored: true,
})
export class Issue extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // Linear identifiers
  @Index('idx_issue_linear_id')
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  declare linear_id: string;

  @Index('idx_issue_identifier')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
  })
  declare identifier: string;

  // Issue data
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description?: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: '0-4 (None, Urgent, High, Medium, Low)',
  })
  declare priority?: number;

  @Column({
    type: DataType.REAL,
    allowNull: true,
  })
  declare estimate?: number;

  // Status
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare state_id?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare state_name?: string;

  @Index('idx_issue_state_type')
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'started, unstarted, completed, canceled',
  })
  declare state_type?: string;

  // Timestamps from Linear
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare created_at: Date;

  @Index('idx_issue_updated_at')
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare updated_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare started_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare completed_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare canceled_at?: Date;

  // Project/Team
  @Index('idx_issue_project_id')
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare project_id?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare project_name?: string;

  @Index('idx_issue_team_id')
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare team_id?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare team_name?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  declare team_key?: string;

  // Tracking
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare first_synced_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare last_synced_at: Date;

  // Associations
  @HasMany(() => UserIssueSnapshot, {
    foreignKey: 'issue_id',
    as: 'snapshots',
  })
  snapshots?: UserIssueSnapshot[];
}
