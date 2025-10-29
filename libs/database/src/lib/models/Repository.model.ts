import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  HasMany,
} from 'sequelize-typescript';
import { GitHubPullRequest } from './GitHubPullRequest.model';
import { GitHubIssue } from './GitHubIssue.model';

@Table({
  tableName: 'Repository',
  timestamps: true,
  underscored: true,
})
export class Repository extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // GitHub identifiers
  @Index('idx_repository_github_id')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  declare github_id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare owner: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare name: string;

  @Index('idx_repository_full_name')
  @Column({
    type: DataType.STRING(512),
    allowNull: false,
    comment: 'owner/name format',
  })
  declare full_name: string;

  @Column({
    type: DataType.STRING(512),
    allowNull: false,
  })
  declare url: string;

  // Repository metadata
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_private: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_fork: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_archived: boolean;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare default_branch?: string;

  // Activity tracking
  @Index('idx_repository_is_active')
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Has recent activity (last 90 days)',
  })
  declare is_active: boolean;

  // Sync tracking
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

  // Associations
  @HasMany(() => GitHubPullRequest, {
    foreignKey: 'repository_id',
    as: 'pull_requests',
  })
  pull_requests?: GitHubPullRequest[];

  @HasMany(() => GitHubIssue, {
    foreignKey: 'repository_id',
    as: 'issues',
  })
  issues?: GitHubIssue[];
}
