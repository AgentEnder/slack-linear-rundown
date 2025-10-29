/**
 * Migration: Add GitHub integration
 * Created: 2025-10-28
 *
 * Creates tables for storing GitHub data:
 * - Repository: GitHub repositories user contributes to
 * - GitHubPullRequest: Pull request data and stats
 * - GitHubIssue: GitHub issue data
 * - GitHubCodeReview: Reviews given by users
 * - UserGitHubSnapshot: Historical snapshots for reports
 * - IssueGitHubLink: Correlation between Linear issues and GitHub work
 *
 * Extends User table with GitHub credentials
 */

import { MigrationContext } from '../lib/migrator.js';

export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Add GitHub fields to User table
  await queryInterface.addColumn('User', 'github_username', {
    type: DataTypes.STRING(100),
    allowNull: true,
  });
  await queryInterface.addColumn('User', 'github_user_id', {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  // Add indexes for GitHub user lookup
  await queryInterface.addIndex('User', ['github_username'], {
    name: 'idx_user_github_username',
  });
  await queryInterface.addIndex('User', ['github_user_id'], {
    name: 'idx_user_github_user_id',
  });

  // Create Repository table
  await queryInterface.createTable('Repository', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // GitHub identifiers
    github_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    owner: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING(512),
      allowNull: false,
      comment: 'owner/name format',
    },
    url: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },

    // Repository metadata
    is_private: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_fork: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    default_branch: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Activity tracking
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Has recent activity (last 90 days)',
    },

    // Sync tracking
    first_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for Repository
  await queryInterface.addIndex('Repository', ['github_id'], {
    name: 'idx_repository_github_id',
  });
  await queryInterface.addIndex('Repository', ['full_name'], {
    name: 'idx_repository_full_name',
  });
  await queryInterface.addIndex('Repository', ['is_active'], {
    name: 'idx_repository_is_active',
  });

  // Create GitHubPullRequest table
  await queryInterface.createTable('GitHubPullRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // GitHub identifiers
    github_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    repository_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Repository',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // PR content
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // State
    state: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'open, closed',
    },
    is_draft: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_merged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // Author
    author_github_login: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    author_github_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Branch information
    head_ref: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Source branch name',
    },
    base_ref: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Target branch name',
    },

    // Code stats
    additions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    deletions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    changed_files: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },

    // Review state
    review_state: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'pending, approved, changes_requested, dismissed',
    },

    // Timestamps from GitHub
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    merged_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Sync tracking
    first_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for GitHubPullRequest
  await queryInterface.addIndex('GitHubPullRequest', ['github_id'], {
    name: 'idx_gh_pr_github_id',
  });
  await queryInterface.addIndex('GitHubPullRequest', ['repository_id'], {
    name: 'idx_gh_pr_repository_id',
  });
  await queryInterface.addIndex('GitHubPullRequest', ['author_github_login'], {
    name: 'idx_gh_pr_author_login',
  });
  await queryInterface.addIndex('GitHubPullRequest', ['state'], {
    name: 'idx_gh_pr_state',
  });
  await queryInterface.addIndex('GitHubPullRequest', ['is_merged'], {
    name: 'idx_gh_pr_is_merged',
  });
  await queryInterface.addIndex('GitHubPullRequest', ['merged_at'], {
    name: 'idx_gh_pr_merged_at',
  });
  await queryInterface.addIndex('GitHubPullRequest', ['created_at'], {
    name: 'idx_gh_pr_created_at',
  });
  await queryInterface.addIndex('GitHubPullRequest', ['updated_at'], {
    name: 'idx_gh_pr_updated_at',
  });

  // Create GitHubIssue table
  await queryInterface.createTable('GitHubIssue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // GitHub identifiers
    github_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    repository_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Repository',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Issue content
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // State
    state: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'open, closed',
    },
    state_reason: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'completed, not_planned, reopened',
    },

    // Author
    author_github_login: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    author_github_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Assignee
    assignee_github_login: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    assignee_github_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Labels (stored as JSON array)
    labels: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of label names',
    },

    // Timestamps from GitHub
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Sync tracking
    first_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for GitHubIssue
  await queryInterface.addIndex('GitHubIssue', ['github_id'], {
    name: 'idx_gh_issue_github_id',
  });
  await queryInterface.addIndex('GitHubIssue', ['repository_id'], {
    name: 'idx_gh_issue_repository_id',
  });
  await queryInterface.addIndex('GitHubIssue', ['author_github_login'], {
    name: 'idx_gh_issue_author_login',
  });
  await queryInterface.addIndex('GitHubIssue', ['assignee_github_login'], {
    name: 'idx_gh_issue_assignee_login',
  });
  await queryInterface.addIndex('GitHubIssue', ['state'], {
    name: 'idx_gh_issue_state',
  });
  await queryInterface.addIndex('GitHubIssue', ['created_at'], {
    name: 'idx_gh_issue_created_at',
  });
  await queryInterface.addIndex('GitHubIssue', ['updated_at'], {
    name: 'idx_gh_issue_updated_at',
  });
  await queryInterface.addIndex('GitHubIssue', ['closed_at'], {
    name: 'idx_gh_issue_closed_at',
  });

  // Create GitHubCodeReview table
  await queryInterface.createTable('GitHubCodeReview', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // GitHub identifiers
    github_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    pr_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'GitHubPullRequest',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // Reviewer
    reviewer_github_login: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    reviewer_github_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Review details
    state: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Timestamps
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // Sync tracking
    first_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for GitHubCodeReview
  await queryInterface.addIndex('GitHubCodeReview', ['github_id'], {
    name: 'idx_gh_review_github_id',
  });
  await queryInterface.addIndex('GitHubCodeReview', ['pr_id'], {
    name: 'idx_gh_review_pr_id',
  });
  await queryInterface.addIndex('GitHubCodeReview', ['reviewer_github_login'], {
    name: 'idx_gh_review_reviewer_login',
  });
  await queryInterface.addIndex('GitHubCodeReview', ['submitted_at'], {
    name: 'idx_gh_review_submitted_at',
  });

  // Create UserGitHubSnapshot table (analogous to UserIssueSnapshot)
  await queryInterface.createTable('UserGitHubSnapshot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // User reference
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // Snapshot metadata
    snapshot_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    report_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    report_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Reference to either PR, Issue, or Review (nullable FKs)
    github_pr_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'GitHubPullRequest',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    github_issue_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'GitHubIssue',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    github_review_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'GitHubCodeReview',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // Categorization in report
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'completed_pr, active_pr, completed_issue, active_issue, review_given',
    },

    // Snapshot values for PRs (historical accuracy)
    state_snapshot: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_merged_snapshot: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    additions_snapshot: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deletions_snapshot: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for UserGitHubSnapshot
  await queryInterface.addIndex('UserGitHubSnapshot', ['user_id'], {
    name: 'idx_user_gh_snapshot_user_id',
  });
  await queryInterface.addIndex('UserGitHubSnapshot', ['snapshot_date'], {
    name: 'idx_user_gh_snapshot_date',
  });
  await queryInterface.addIndex('UserGitHubSnapshot', ['github_pr_id'], {
    name: 'idx_user_gh_snapshot_pr_id',
  });
  await queryInterface.addIndex('UserGitHubSnapshot', ['github_issue_id'], {
    name: 'idx_user_gh_snapshot_issue_id',
  });
  await queryInterface.addIndex('UserGitHubSnapshot', ['github_review_id'], {
    name: 'idx_user_gh_snapshot_review_id',
  });
  await queryInterface.addIndex('UserGitHubSnapshot', ['category'], {
    name: 'idx_user_gh_snapshot_category',
  });

  // Create IssueGitHubLink table (correlates Linear issues with GitHub work)
  await queryInterface.createTable('IssueGitHubLink', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Linear issue reference
    issue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Issue',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // GitHub work reference (either PR or Issue)
    github_pr_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'GitHubPullRequest',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    github_issue_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'GitHubIssue',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // How the link was detected
    link_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'linear_attachment, pr_title, pr_body, branch_name, manual',
    },
    confidence: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'high, medium, low',
    },

    // Detection metadata
    detected_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    detection_pattern: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'The pattern that matched (e.g., "ENG-123")',
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for IssueGitHubLink
  await queryInterface.addIndex('IssueGitHubLink', ['issue_id'], {
    name: 'idx_issue_gh_link_issue_id',
  });
  await queryInterface.addIndex('IssueGitHubLink', ['github_pr_id'], {
    name: 'idx_issue_gh_link_pr_id',
  });
  await queryInterface.addIndex('IssueGitHubLink', ['github_issue_id'], {
    name: 'idx_issue_gh_link_issue_id',
  });
  await queryInterface.addIndex('IssueGitHubLink', ['link_type'], {
    name: 'idx_issue_gh_link_type',
  });

  // Add unique constraint to prevent duplicate links
  await queryInterface.addIndex('IssueGitHubLink', ['issue_id', 'github_pr_id'], {
    name: 'idx_issue_gh_link_unique_pr',
    unique: true,
    where: {
      github_pr_id: { [DataTypes.Op.ne]: null },
    },
  });
  await queryInterface.addIndex('IssueGitHubLink', ['issue_id', 'github_issue_id'], {
    name: 'idx_issue_gh_link_unique_issue',
    unique: true,
    where: {
      github_issue_id: { [DataTypes.Op.ne]: null },
    },
  });
}

export async function down({ queryInterface }: MigrationContext): Promise<void> {
  // Drop tables in reverse order (to handle foreign keys)
  await queryInterface.dropTable('IssueGitHubLink');
  await queryInterface.dropTable('UserGitHubSnapshot');
  await queryInterface.dropTable('GitHubCodeReview');
  await queryInterface.dropTable('GitHubIssue');
  await queryInterface.dropTable('GitHubPullRequest');
  await queryInterface.dropTable('Repository');

  // Remove GitHub columns from User table
  await queryInterface.removeColumn('User', 'github_username');
  await queryInterface.removeColumn('User', 'github_user_id');
}
