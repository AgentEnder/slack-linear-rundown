/**
 * Issue Sync Service
 *
 * Syncs Linear issues to the database for the user-facing app.
 * Creates snapshots of issues at report generation time.
 */

import { Issue, UserIssueSnapshot } from '@slack-linear-rundown/database';
import { LinearIssue } from '@slack-linear-rundown/linear';
import { logger } from '../utils/logger';

export interface SyncOptions {
  userId: number;
  reportPeriodStart: string; // YYYY-MM-DD format
  reportPeriodEnd: string;   // YYYY-MM-DD format
  snapshotDate?: Date;
}

export interface CategorizedIssues {
  recentlyCompleted: LinearIssue[];
  recentlyStarted: LinearIssue[];
  recentlyUpdated: LinearIssue[];
  otherOpenIssues: LinearIssue[];
}

/**
 * Upserts a Linear issue into the database
 * Updates last_synced_at for existing issues
 */
export async function upsertIssue(linearIssue: LinearIssue): Promise<Issue> {
  const now = new Date();

  const [issue] = await Issue.upsert({
    linear_id: linearIssue.id,
    identifier: linearIssue.identifier,
    title: linearIssue.title,
    description: linearIssue.description || null,
    priority: linearIssue.priority || null,
    estimate: linearIssue.estimate || null,
    state_id: linearIssue.state?.id || null,
    state_name: linearIssue.state?.name || null,
    state_type: linearIssue.state?.type || null,
    created_at: linearIssue.createdAt,
    updated_at: linearIssue.updatedAt,
    started_at: linearIssue.startedAt || null,
    completed_at: linearIssue.completedAt || null,
    canceled_at: linearIssue.canceledAt || null,
    project_id: linearIssue.project?.id || null,
    project_name: linearIssue.project?.name || null,
    team_id: linearIssue.team?.id || null,
    team_name: linearIssue.team?.name || null,
    team_key: linearIssue.team?.key || null,
    first_synced_at: now,
    last_synced_at: now,
  }, {
    conflictFields: ['linear_id'],
  });

  return issue;
}

/**
 * Creates a user issue snapshot for tracking
 */
export async function createSnapshot(params: {
  userId: number;
  issueId: number;
  category: string;
  snapshotDate: Date;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  stateTypeSnapshot?: string;
  prioritySnapshot?: number;
}): Promise<UserIssueSnapshot> {
  return await UserIssueSnapshot.create({
    user_id: params.userId,
    issue_id: params.issueId,
    snapshot_date: params.snapshotDate,
    report_period_start: params.reportPeriodStart,
    report_period_end: params.reportPeriodEnd,
    category: params.category,
    state_type_snapshot: params.stateTypeSnapshot,
    priority_snapshot: params.prioritySnapshot,
  });
}

/**
 * Syncs all categorized issues for a user
 * This is called during report generation
 */
export async function syncIssuesToDatabase(
  categorizedIssues: CategorizedIssues,
  options: SyncOptions
): Promise<void> {
  const { userId, reportPeriodStart, reportPeriodEnd, snapshotDate = new Date() } = options;

  logger.info('Syncing issues to database', {
    userId,
    completedCount: categorizedIssues.recentlyCompleted.length,
    startedCount: categorizedIssues.recentlyStarted.length,
    updatedCount: categorizedIssues.recentlyUpdated.length,
    openCount: categorizedIssues.otherOpenIssues.length,
  });

  try {
    // Sync completed issues
    for (const linearIssue of categorizedIssues.recentlyCompleted) {
      const issue = await upsertIssue(linearIssue);
      await createSnapshot({
        userId,
        issueId: issue.id,
        category: 'completed',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateTypeSnapshot: linearIssue.state?.type,
        prioritySnapshot: linearIssue.priority,
      });
    }

    // Sync started issues
    for (const linearIssue of categorizedIssues.recentlyStarted) {
      const issue = await upsertIssue(linearIssue);
      await createSnapshot({
        userId,
        issueId: issue.id,
        category: 'started',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateTypeSnapshot: linearIssue.state?.type,
        prioritySnapshot: linearIssue.priority,
      });
    }

    // Sync updated issues
    for (const linearIssue of categorizedIssues.recentlyUpdated) {
      const issue = await upsertIssue(linearIssue);
      await createSnapshot({
        userId,
        issueId: issue.id,
        category: 'updated',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateTypeSnapshot: linearIssue.state?.type,
        prioritySnapshot: linearIssue.priority,
      });
    }

    // Sync other open issues
    for (const linearIssue of categorizedIssues.otherOpenIssues) {
      const issue = await upsertIssue(linearIssue);
      await createSnapshot({
        userId,
        issueId: issue.id,
        category: 'open',
        snapshotDate,
        reportPeriodStart,
        reportPeriodEnd,
        stateTypeSnapshot: linearIssue.state?.type,
        prioritySnapshot: linearIssue.priority,
      });
    }

    logger.info('Successfully synced issues to database', { userId });
  } catch (error) {
    logger.error('Failed to sync issues to database', { userId, error });
    throw error;
  }
}

/**
 * Gets issues for a user by category from the latest snapshot
 */
export async function getUserIssuesByCategory(
  userId: number,
  category: string,
  filters?: {
    projectId?: string;
    teamId?: string;
    priority?: number;
    stateType?: string;
    search?: string;
  }
): Promise<Issue[]> {
  const whereClause: any = {
    '$snapshots.user_id$': userId,
    '$snapshots.category$': category,
  };

  // Get the latest snapshot date for this user
  const latestSnapshot = await UserIssueSnapshot.findOne({
    where: { user_id: userId },
    order: [['snapshot_date', 'DESC']],
  });

  if (!latestSnapshot) {
    return [];
  }

  whereClause['$snapshots.snapshot_date$'] = latestSnapshot.snapshot_date;

  // Apply filters
  if (filters?.projectId) {
    whereClause.project_id = filters.projectId;
  }

  if (filters?.teamId) {
    whereClause.team_id = filters.teamId;
  }

  if (filters?.priority !== undefined) {
    whereClause.priority = filters.priority;
  }

  if (filters?.stateType) {
    whereClause.state_type = filters.stateType;
  }

  // For search, we'll need to use Op.or with LIKE
  if (filters?.search) {
    const { Op } = await import('sequelize');
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${filters.search}%` } },
      { description: { [Op.like]: `%${filters.search}%` } },
      { identifier: { [Op.like]: `%${filters.search}%` } },
    ];
  }

  const issues = await Issue.findAll({
    where: whereClause,
    include: [
      {
        model: UserIssueSnapshot,
        as: 'snapshots',
        where: {
          user_id: userId,
          category,
          snapshot_date: latestSnapshot.snapshot_date,
        },
        required: true,
      },
    ],
    order: [['updated_at', 'DESC']],
  });

  return issues;
}

/**
 * Gets filter options (unique projects and teams) for a user
 */
export async function getUserFilterOptions(userId: number): Promise<{
  projects: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; key: string }>;
}> {
  // Get the latest snapshot date for this user
  const latestSnapshot = await UserIssueSnapshot.findOne({
    where: { user_id: userId },
    order: [['snapshot_date', 'DESC']],
  });

  if (!latestSnapshot) {
    return { projects: [], teams: [] };
  }

  const issues = await Issue.findAll({
    attributes: ['project_id', 'project_name', 'team_id', 'team_name', 'team_key'],
    include: [
      {
        model: UserIssueSnapshot,
        as: 'snapshots',
        where: {
          user_id: userId,
          snapshot_date: latestSnapshot.snapshot_date,
        },
        required: true,
      },
    ],
    group: ['project_id', 'project_name', 'team_id', 'team_name', 'team_key'],
  });

  const projects: Array<{ id: string; name: string }> = Array.from(
    new Map(
      issues
        .filter((i: Issue) => i.project_id && i.project_name)
        .map((i: Issue) => [i.project_id, { id: i.project_id!, name: i.project_name! }])
    ).values()
  );

  const teams: Array<{ id: string; name: string; key: string }> = Array.from(
    new Map(
      issues
        .filter((i: Issue) => i.team_id && i.team_name && i.team_key)
        .map((i: Issue) => [
          i.team_id,
          { id: i.team_id!, name: i.team_name!, key: i.team_key! },
        ])
    ).values()
  );

  return { projects, teams };
}
