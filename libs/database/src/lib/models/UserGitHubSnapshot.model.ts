import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from './User.model';
import { GitHubPullRequest } from './GitHubPullRequest.model';
import { GitHubIssue } from './GitHubIssue.model';
import { GitHubCodeReview } from './GitHubCodeReview.model';

@Table({
  tableName: 'UserGitHubSnapshot',
  timestamps: true,
  underscored: true,
})
export class UserGitHubSnapshot extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // User reference
  @Index('idx_user_gh_snapshot_user_id')
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare user_id: number;

  // Snapshot metadata
  @Index('idx_user_gh_snapshot_date')
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare snapshot_date: Date;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  declare report_period_start: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
  })
  declare report_period_end: string;

  // Reference to either PR, Issue, or Review (nullable FKs)
  @Index('idx_user_gh_snapshot_pr_id')
  @ForeignKey(() => GitHubPullRequest)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare github_pr_id?: number;

  @Index('idx_user_gh_snapshot_issue_id')
  @ForeignKey(() => GitHubIssue)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare github_issue_id?: number;

  @Index('idx_user_gh_snapshot_review_id')
  @ForeignKey(() => GitHubCodeReview)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare github_review_id?: number;

  // Categorization in report
  @Index('idx_user_gh_snapshot_category')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'completed_pr, active_pr, completed_issue, active_issue, review_given',
  })
  declare category: string;

  // Snapshot values for PRs (historical accuracy)
  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare state_snapshot?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  declare is_merged_snapshot?: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare additions_snapshot?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare deletions_snapshot?: number;

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
  @BelongsTo(() => User, {
    foreignKey: 'user_id',
    as: 'user',
  })
  user?: User;

  @BelongsTo(() => GitHubPullRequest, {
    foreignKey: 'github_pr_id',
    as: 'pull_request',
  })
  pull_request?: GitHubPullRequest;

  @BelongsTo(() => GitHubIssue, {
    foreignKey: 'github_issue_id',
    as: 'issue',
  })
  issue?: GitHubIssue;

  @BelongsTo(() => GitHubCodeReview, {
    foreignKey: 'github_review_id',
    as: 'review',
  })
  review?: GitHubCodeReview;
}
