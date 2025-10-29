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
import { UserGitHubSnapshot } from './UserGitHubSnapshot.model';
import { IssueGitHubLink } from './IssueGitHubLink.model';

@Table({
  tableName: 'GitHubIssue',
  timestamps: false,
  underscored: true,
})
export class GitHubIssue extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  // GitHub identifiers
  @Index('idx_gh_issue_github_id')
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  declare github_id: string;

  @Index('idx_gh_issue_repository_id')
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

  // Issue content
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
  @Index('idx_gh_issue_state')
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    comment: 'open, closed',
  })
  declare state: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    comment: 'completed, not_planned, reopened',
  })
  declare state_reason?: string;

  // Author
  @Index('idx_gh_issue_author_login')
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

  // Assignee
  @Index('idx_gh_issue_assignee_login')
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare assignee_github_login?: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare assignee_github_id?: string;

  // Labels (stored as JSON array)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'JSON array of label names',
  })
  declare labels?: string;

  // Timestamps from GitHub
  @Index('idx_gh_issue_created_at')
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare created_at: Date;

  @Index('idx_gh_issue_updated_at')
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  declare updated_at: Date;

  @Index('idx_gh_issue_closed_at')
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

  @HasMany(() => UserGitHubSnapshot, {
    foreignKey: 'github_issue_id',
    as: 'snapshots',
  })
  snapshots?: UserGitHubSnapshot[];

  @HasMany(() => IssueGitHubLink, {
    foreignKey: 'github_issue_id',
    as: 'linked_linear_issues',
  })
  linked_linear_issues?: IssueGitHubLink[];
}
