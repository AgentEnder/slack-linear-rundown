/**
 * GitHub Sync Service
 *
 * Syncs GitHub data (PRs, issues, reviews) to the database.
 * Creates snapshots at report generation time, mirroring the Linear pattern.
 */

import {
  Repository,
  GitHubPullRequest,
  GitHubIssue,
  GitHubCodeReview,
  UserGitHubSnapshot,
} from '@slack-linear-rundown/database';
import type {
  GitHubPullRequest as GitHubPRType,
  GitHubIssue as GitHubIssueType,
  GitHubReview,
  GitHubRepository,
} from '@slack-linear-rundown/github';
import { logger } from '../utils/logger';

export interface GitHubSyncOptions {
  userId: number;
  reportPeriodStart: string; // YYYY-MM-DD format
  reportPeriodEnd: string; // YYYY-MM-DD format
  snapshotDate?: Date;
}

export interface CategorizedGitHubData {
  completedPRs: GitHubPRType[];
  activePRs: GitHubPRType[];
  completedIssues: GitHubIssueType[];
  activeIssues: GitHubIssueType[];
  reviews: GitHubReview[];
  repositories: GitHubRepository[];
}

/**
 * Upserts a GitHub repository into the database
 */
export async function upsertRepository(
  githubRepo: GitHubRepository
): Promise<Repository> {
  const now = new Date();

  const [repo] = await Repository.upsert(
    {
      github_id: String(githubRepo.id),
      owner: githubRepo.owner.login,
      name: githubRepo.name,
      full_name: githubRepo.full_name,
      url: githubRepo.html_url,
      is_private: githubRepo.private,
      is_fork: githubRepo.fork,
      is_archived: githubRepo.archived,
      default_branch: githubRepo.default_branch,
      is_active: true,
      first_synced_at: now,
      last_synced_at: now,
    },
    {
      conflictFields: ['github_id'],
    }
  );

  return repo;
}

/**
 * Upserts a GitHub pull request into the database
 */
export async function upsertPullRequest(
  githubPR: GitHubPRType
): Promise<GitHubPullRequest> {
  const now = new Date();

  // Ensure repository exists
  if (!githubPR.repository) {
    throw new Error(`Pull request ${githubPR.number} missing repository information`);
  }

  const [repository] = await Repository.findOrCreate({
    where: { github_id: String(githubPR.repository.id) },
    defaults: {
      github_id: String(githubPR.repository.id),
      owner: githubPR.repository.owner.login,
      name: githubPR.repository.name,
      full_name: githubPR.repository.full_name,
      url: `https://github.com/${githubPR.repository.full_name}`,
      is_private: false,
      is_fork: false,
      is_archived: false,
      is_active: true,
      first_synced_at: now,
      last_synced_at: now,
    },
  });

  const [pr] = await GitHubPullRequest.upsert(
    {
      github_id: String(githubPR.id),
      repository_id: repository.id,
      number: githubPR.number,
      title: githubPR.title,
      body: githubPR.body || null,
      state: githubPR.state,
      is_draft: githubPR.draft,
      is_merged: githubPR.merged || false,
      author_github_login: githubPR.user.login,
      author_github_id: String(githubPR.user.id),
      head_ref: githubPR.head.ref,
      base_ref: githubPR.base.ref,
      additions: githubPR.additions || 0,
      deletions: githubPR.deletions || 0,
      changed_files: githubPR.changed_files || 0,
      review_state: null, // Will be populated if we have review data
      created_at: new Date(githubPR.created_at),
      updated_at: new Date(githubPR.updated_at),
      merged_at: githubPR.merged_at ? new Date(githubPR.merged_at) : null,
      closed_at: githubPR.closed_at ? new Date(githubPR.closed_at) : null,
      first_synced_at: now,
      last_synced_at: now,
    },
    {
      conflictFields: ['github_id'],
    }
  );

  return pr;
}

/**
 * Upserts a GitHub issue into the database
 */
export async function upsertIssue(
  githubIssue: GitHubIssueType
): Promise<GitHubIssue> {
  const now = new Date();

  // Ensure repository exists
  if (!githubIssue.repository) {
    throw new Error(`Issue ${githubIssue.number} missing repository information`);
  }

  const [repository] = await Repository.findOrCreate({
    where: { github_id: String(githubIssue.repository.id) },
    defaults: {
      github_id: String(githubIssue.repository.id),
      owner: githubIssue.repository.owner.login,
      name: githubIssue.repository.name,
      full_name: githubIssue.repository.full_name,
      url: `https://github.com/${githubIssue.repository.full_name}`,
      is_private: false,
      is_fork: false,
      is_archived: false,
      is_active: true,
      first_synced_at: now,
      last_synced_at: now,
    },
  });

  const [issue] = await GitHubIssue.upsert(
    {
      github_id: String(githubIssue.id),
      repository_id: repository.id,
      number: githubIssue.number,
      title: githubIssue.title,
      body: githubIssue.body || null,
      state: githubIssue.state,
      state_reason: githubIssue.state_reason || null,
      author_github_login: githubIssue.user.login,
      author_github_id: String(githubIssue.user.id),
      assignee_github_login: githubIssue.assignee?.login || null,
      assignee_github_id: githubIssue.assignee ? String(githubIssue.assignee.id) : null,
      labels: JSON.stringify(githubIssue.labels.map((l) => l.name)),
      created_at: new Date(githubIssue.created_at),
      updated_at: new Date(githubIssue.updated_at),
      closed_at: githubIssue.closed_at ? new Date(githubIssue.closed_at) : null,
      first_synced_at: now,
      last_synced_at: now,
    },
    {
      conflictFields: ['github_id'],
    }
  );

  return issue;
}

/**
 * Upserts a GitHub code review into the database
 */
export async function upsertReview(
  githubReview: GitHubReview,
  prId: number
): Promise<GitHubCodeReview> {
  const now = new Date();

  const [review] = await GitHubCodeReview.upsert(
    {
      github_id: String(githubReview.id),
      pr_id: prId,
      reviewer_github_login: githubReview.user.login,
      reviewer_github_id: String(githubReview.user.id),
      state: githubReview.state,
      body: githubReview.body || null,
      submitted_at: new Date(githubReview.submitted_at),
      first_synced_at: now,
      last_synced_at: now,
    },
    {
      conflictFields: ['github_id'],
    }
  );

  return review;
}

/**
 * Creates a user GitHub snapshot for tracking
 */
export async function createGitHubSnapshot(params: {
  userId: number;
  githubPrId?: number;
  githubIssueId?: number;
  githubReviewId?: number;
  category: string;
  snapshotDate: Date;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  stateSnapshot?: string;
  isMergedSnapshot?: boolean;
  additionsSnapshot?: number;
  deletionsSnapshot?: number;
}): Promise<UserGitHubSnapshot> {
  return await UserGitHubSnapshot.create({
    user_id: params.userId,
    github_pr_id: params.githubPrId || null,
    github_issue_id: params.githubIssueId || null,
    github_review_id: params.githubReviewId || null,
    snapshot_date: params.snapshotDate,
    report_period_start: params.reportPeriodStart,
    report_period_end: params.reportPeriodEnd,
    category: params.category,
    state_snapshot: params.stateSnapshot || null,
    is_merged_snapshot: params.isMergedSnapshot || null,
    additions_snapshot: params.additionsSnapshot || null,
    deletions_snapshot: params.deletionsSnapshot || null,
  });
}

/**
 * Syncs all categorized GitHub data for a user
 * This is called during report generation, mirroring the Linear pattern
 */
export async function syncGitHubDataToDatabase(
  categorizedData: CategorizedGitHubData,
  options: GitHubSyncOptions
): Promise<void> {
  const { userId, reportPeriodStart, reportPeriodEnd, snapshotDate = new Date() } = options;

  logger.info('Syncing GitHub data to database', {
    userId,
    completedPRs: categorizedData.completedPRs.length,
    activePRs: categorizedData.activePRs.length,
    completedIssues: categorizedData.completedIssues.length,
    activeIssues: categorizedData.activeIssues.length,
    reviews: categorizedData.reviews.length,
    repositories: categorizedData.repositories.length,
  });

  try {
    // Sync repositories first
    for (const repo of categorizedData.repositories) {
      await upsertRepository(repo);
    }

    // Sync completed PRs
    for (const pr of categorizedData.completedPRs) {
      const dbPR = await upsertPullRequest(pr);
      await createGitHubSnapshot({
        userId,
        githubPrId: dbPR.id,
        category: 'completed_pr',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateSnapshot: pr.state,
        isMergedSnapshot: pr.merged,
        additionsSnapshot: pr.additions,
        deletionsSnapshot: pr.deletions,
      });
    }

    // Sync active PRs
    for (const pr of categorizedData.activePRs) {
      const dbPR = await upsertPullRequest(pr);
      await createGitHubSnapshot({
        userId,
        githubPrId: dbPR.id,
        category: 'active_pr',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateSnapshot: pr.state,
        isMergedSnapshot: pr.merged,
        additionsSnapshot: pr.additions,
        deletionsSnapshot: pr.deletions,
      });
    }

    // Sync completed issues
    for (const issue of categorizedData.completedIssues) {
      const dbIssue = await upsertIssue(issue);
      await createGitHubSnapshot({
        userId,
        githubIssueId: dbIssue.id,
        category: 'completed_issue',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateSnapshot: issue.state,
      });
    }

    // Sync active issues
    for (const issue of categorizedData.activeIssues) {
      const dbIssue = await upsertIssue(issue);
      await createGitHubSnapshot({
        userId,
        githubIssueId: dbIssue.id,
        category: 'active_issue',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateSnapshot: issue.state,
      });
    }

    // Sync reviews
    for (const review of categorizedData.reviews) {
      // Find the PR this review belongs to
      const prUrl = review.pull_request_url;
      const [owner, repo, , pullNumber] = prUrl.split('/').slice(-4);

      const dbPR = await GitHubPullRequest.findOne({
        where: { number: parseInt(pullNumber) },
        include: [
          {
            model: Repository,
            as: 'repository',
            where: {
              owner,
              name: repo,
            },
            required: true,
          },
        ],
      });

      if (dbPR) {
        const dbReview = await upsertReview(review, dbPR.id);
        await createGitHubSnapshot({
          userId,
          githubReviewId: dbReview.id,
          category: 'review_given',
          snapshotDate,
          reportPeriodStart,
          reportPeriodEnd,
        });
      } else {
        logger.warn('Could not find PR for review', { reviewId: review.id, prUrl });
      }
    }

    logger.info('Successfully synced GitHub data to database', { userId });
  } catch (error) {
    logger.error('Failed to sync GitHub data to database', { userId, error });
    throw error;
  }
}

/**
 * Gets GitHub PRs for a user by category from the latest snapshot
 */
export async function getUserPullRequestsByCategory(
  userId: number,
  category: 'completed_pr' | 'active_pr',
  filters?: {
    repositoryId?: number;
    search?: string;
  }
): Promise<GitHubPullRequest[]> {
  const whereClause: any = {
    '$snapshots.user_id$': userId,
    '$snapshots.category$': category,
  };

  // Get the latest snapshot date for this user
  const latestSnapshot = await UserGitHubSnapshot.findOne({
    where: { user_id: userId },
    order: [['snapshot_date', 'DESC']],
  });

  if (!latestSnapshot) {
    return [];
  }

  whereClause['$snapshots.snapshot_date$'] = latestSnapshot.snapshot_date;

  // Apply filters
  if (filters?.repositoryId) {
    whereClause.repository_id = filters.repositoryId;
  }

  if (filters?.search) {
    const { Op } = await import('sequelize');
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${filters.search}%` } },
      { body: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const prs = await GitHubPullRequest.findAll({
    where: whereClause,
    include: [
      {
        model: UserGitHubSnapshot,
        as: 'snapshots',
        where: {
          user_id: userId,
          category,
          snapshot_date: latestSnapshot.snapshot_date,
        },
        required: true,
      },
      {
        model: Repository,
        as: 'repository',
      },
    ],
    order: [['updated_at', 'DESC']],
  });

  return prs;
}

/**
 * Gets GitHub issues for a user by category from the latest snapshot
 */
export async function getUserIssuesByCategory(
  userId: number,
  category: 'completed_issue' | 'active_issue',
  filters?: {
    repositoryId?: number;
    search?: string;
  }
): Promise<GitHubIssue[]> {
  const whereClause: any = {
    '$snapshots.user_id$': userId,
    '$snapshots.category$': category,
  };

  // Get the latest snapshot date for this user
  const latestSnapshot = await UserGitHubSnapshot.findOne({
    where: { user_id: userId },
    order: [['snapshot_date', 'DESC']],
  });

  if (!latestSnapshot) {
    return [];
  }

  whereClause['$snapshots.snapshot_date$'] = latestSnapshot.snapshot_date;

  // Apply filters
  if (filters?.repositoryId) {
    whereClause.repository_id = filters.repositoryId;
  }

  if (filters?.search) {
    const { Op } = await import('sequelize');
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${filters.search}%` } },
      { body: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const issues = await GitHubIssue.findAll({
    where: whereClause,
    include: [
      {
        model: UserGitHubSnapshot,
        as: 'snapshots',
        where: {
          user_id: userId,
          category,
          snapshot_date: latestSnapshot.snapshot_date,
        },
        required: true,
      },
      {
        model: Repository,
        as: 'repository',
      },
    ],
    order: [['updated_at', 'DESC']],
  });

  return issues;
}

/**
 * Gets reviews given by a user from the latest snapshot
 */
export async function getUserReviews(
  userId: number,
  filters?: {
    repositoryId?: number;
  }
): Promise<GitHubCodeReview[]> {
  const whereClause: any = {
    '$snapshots.user_id$': userId,
    '$snapshots.category$': 'review_given',
  };

  // Get the latest snapshot date for this user
  const latestSnapshot = await UserGitHubSnapshot.findOne({
    where: { user_id: userId },
    order: [['snapshot_date', 'DESC']],
  });

  if (!latestSnapshot) {
    return [];
  }

  whereClause['$snapshots.snapshot_date$'] = latestSnapshot.snapshot_date;

  // Apply filters via PR relationship
  if (filters?.repositoryId) {
    whereClause['$pull_request.repository_id$'] = filters.repositoryId;
  }

  const reviews = await GitHubCodeReview.findAll({
    where: whereClause,
    include: [
      {
        model: UserGitHubSnapshot,
        as: 'snapshots',
        where: {
          user_id: userId,
          category: 'review_given',
          snapshot_date: latestSnapshot.snapshot_date,
        },
        required: true,
      },
      {
        model: GitHubPullRequest,
        as: 'pull_request',
        include: [
          {
            model: Repository,
            as: 'repository',
          },
        ],
      },
    ],
    order: [['submitted_at', 'DESC']],
  });

  return reviews;
}

/**
 * Gets the latest snapshot date for a user's GitHub data
 */
export async function getLatestGitHubSnapshotDate(userId: number): Promise<Date | null> {
  const latestSnapshot = await UserGitHubSnapshot.findOne({
    where: { user_id: userId },
    order: [['snapshot_date', 'DESC']],
  });

  return latestSnapshot?.snapshot_date || null;
}
