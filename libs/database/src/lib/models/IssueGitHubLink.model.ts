import {
  Table,
  Column,
  Model,
  DataType,
  Index,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Issue } from './Issue.model';
import { GitHubPullRequest } from './GitHubPullRequest.model';
import { GitHubIssue } from './GitHubIssue.model';

@Table({
  tableName: 'IssueGitHubLink',
  timestamps: true,
  underscored: true,
})
export class IssueGitHubLink extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // Linear issue reference
  @Index('idx_issue_gh_link_issue_id')
  @ForeignKey(() => Issue)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare issue_id: number;

  // GitHub work reference (either PR or Issue)
  @Index('idx_issue_gh_link_pr_id')
  @ForeignKey(() => GitHubPullRequest)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare github_pr_id?: number;

  @Index('idx_issue_gh_link_github_issue_id')
  @ForeignKey(() => GitHubIssue)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare github_issue_id?: number;

  // How the link was detected
  @Index('idx_issue_gh_link_type')
  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    comment: 'linear_attachment, pr_title, pr_body, branch_name, manual',
  })
  declare link_type: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    defaultValue: 'medium',
    comment: 'high, medium, low',
  })
  declare confidence: string;

  // Detection metadata
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  declare detected_at: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'The pattern that matched (e.g., "ENG-123")',
  })
  declare detection_pattern?: string;

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
  @BelongsTo(() => Issue, {
    foreignKey: 'issue_id',
    as: 'linear_issue',
  })
  linear_issue?: Issue;

  @BelongsTo(() => GitHubPullRequest, {
    foreignKey: 'github_pr_id',
    as: 'github_pull_request',
  })
  github_pull_request?: GitHubPullRequest;

  @BelongsTo(() => GitHubIssue, {
    foreignKey: 'github_issue_id',
    as: 'github_issue',
  })
  github_issue?: GitHubIssue;
}
