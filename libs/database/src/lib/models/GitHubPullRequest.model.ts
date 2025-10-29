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
import { Repository } from './Repository.model';
import { GitHubCodeReview } from './GitHubCodeReview.model';
import { UserGitHubSnapshot } from './UserGitHubSnapshot.model';
import { IssueGitHubLink } from './IssueGitHubLink.model';

@Table({
  tableName: 'GitHubPullRequest',
  timestamps: false,
  underscored: true,
})
export class GitHubPullRequest extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // GitHub identifiers
  @Index('idx_gh_pr_github_id')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  declare github_id: string;

  @Index('idx_gh_pr_repository_id')
  @ForeignKey(() => Repository)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare repository_id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare number: number;

  // PR content
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare body?: string;

  // State
  @Index('idx_gh_pr_state')
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    comment: 'open, closed',
  })
  declare state: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_draft: boolean;

  @Index('idx_gh_pr_is_merged')
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  declare is_merged: boolean;

  // Author
  @Index('idx_gh_pr_author_login')
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare author_github_login: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare author_github_id?: string;

  // Branch information
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Source branch name',
  })
  declare head_ref?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    comment: 'Target branch name',
  })
  declare base_ref?: string;

  // Code stats
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  declare additions?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  declare deletions?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0,
  })
  declare changed_files?: number;

  // Review state
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'pending, approved, changes_requested, dismissed',
  })
  declare review_state?: string;

  // Timestamps from GitHub
  @Index('idx_gh_pr_created_at')
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare created_at: Date;

  @Index('idx_gh_pr_updated_at')
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare updated_at: Date;

  @Index('idx_gh_pr_merged_at')
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare merged_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare closed_at?: Date;

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

  // Associations
  @BelongsTo(() => Repository, {
    foreignKey: 'repository_id',
    as: 'repository',
  })
  repository?: Repository;

  @HasMany(() => GitHubCodeReview, {
    foreignKey: 'pr_id',
    as: 'reviews',
  })
  reviews?: GitHubCodeReview[];

  @HasMany(() => UserGitHubSnapshot, {
    foreignKey: 'github_pr_id',
    as: 'snapshots',
  })
  snapshots?: UserGitHubSnapshot[];

  @HasMany(() => IssueGitHubLink, {
    foreignKey: 'github_pr_id',
    as: 'linked_issues',
  })
  linked_issues?: IssueGitHubLink[];
}
