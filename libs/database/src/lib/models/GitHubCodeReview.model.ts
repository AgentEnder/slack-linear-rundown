import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { GitHubPullRequest } from './GitHubPullRequest.model';
import { UserGitHubSnapshot } from './UserGitHubSnapshot.model';

@Table({
  tableName: 'GitHubCodeReview',
  timestamps: true,
  underscored: true,
})
export class GitHubCodeReview extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // GitHub identifiers
  @Index('idx_gh_review_github_id')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  declare github_id: string;

  @Index('idx_gh_review_pr_id')
  @ForeignKey(() => GitHubPullRequest)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare pr_id: number;

  // Reviewer
  @Index('idx_gh_review_reviewer_login')
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare reviewer_github_login: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare reviewer_github_id?: string;

  // Review details
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED',
  })
  declare state: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare body?: string;

  // Timestamps
  @Index('idx_gh_review_submitted_at')
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare submitted_at: Date;

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
  @BelongsTo(() => GitHubPullRequest, {
    foreignKey: 'pr_id',
    as: 'pull_request',
  })
  pull_request?: GitHubPullRequest;

  @HasMany(() => UserGitHubSnapshot, {
    foreignKey: 'github_review_id',
    as: 'snapshots',
  })
  snapshots?: UserGitHubSnapshot[];
}
