import type { UserReport, CooldownStatus, Issue } from './types.js';

/**
 * Threshold for aggregating issues instead of showing full list.
 */
const AGGREGATION_THRESHOLD = 10;

/**
 * Represents an aggregated group of issues by priority.
 */
interface PriorityGroup {
  priority: number;
  count: number;
  label: string;
  emoji: string;
}

/**
 * Formats a weekly report message with cooldown status.
 * Uses plain text formatting for Phase 1 implementation.
 *
 * @param report - User report data
 * @param cooldownStatus - Current cooldown status
 * @returns Formatted message string
 */
export function formatWeeklyReport(
  report: UserReport,
  cooldownStatus: CooldownStatus
): string {
  const parts: string[] = [];

  // Add cooldown banner if applicable
  if (cooldownStatus.isInCooldown) {
    parts.push(
      formatCooldownBanner(
        cooldownStatus.weekNumber || 1,
        cooldownStatus.totalWeeks || 1,
        cooldownStatus.endDate || new Date()
      )
    );
    parts.push(''); // Empty line
  }

  // Greeting
  parts.push(`Hi ${report.userName}! Here's your weekly Linear update.`);
  parts.push(''); // Empty line

  // Report period
  const startDate = formatDate(report.reportPeriodStart);
  const endDate = formatDate(report.reportPeriodEnd);
  parts.push(`📅 Report Period: ${startDate} - ${endDate}`);
  parts.push(''); // Empty line

  // Completed issues
  if (report.issuesCompleted.length > 0) {
    const header = '✅ Completed This Week';
    parts.push(header);
    parts.push(
      formatIssueList(
        report.issuesCompleted,
        report.linearOrgUrlKey,
        report.linearUserId
      )
    );
    parts.push(''); // Empty line
  }

  // In progress issues
  if (report.issuesInProgress.length > 0) {
    const header = '🔄 Started This Week';
    parts.push(header);
    parts.push(
      formatIssueList(
        report.issuesInProgress,
        report.linearOrgUrlKey,
        report.linearUserId
      )
    );
    parts.push(''); // Empty line
  }

  // Updated issues
  if (report.issuesUpdated.length > 0) {
    const header = '📝 Updated This Week';
    parts.push(header);
    parts.push(
      formatIssueList(
        report.issuesUpdated,
        report.linearOrgUrlKey,
        report.linearUserId
      )
    );
    parts.push(''); // Empty line
  }

  // Other open issues - always use aggregated view
  if (report.otherOpenIssues.length > 0) {
    const header = '📋 Other Open Issues';
    parts.push(header);
    parts.push(
      formatIssueList(
        report.otherOpenIssues,
        report.linearOrgUrlKey,
        report.linearUserId,
        true
      )
    );
    parts.push(''); // Empty line
  }

  // Summary
  const totalIssues =
    report.issuesCompleted.length +
    report.issuesInProgress.length +
    report.issuesUpdated.length +
    report.otherOpenIssues.length;

  if (totalIssues === 0) {
    parts.push(
      'No issues to report this week. Great job staying on top of things! 🎉'
    );
  } else {
    parts.push(
      formatSummary(
        report.issuesCompleted.length,
        report.issuesInProgress.length,
        report.otherOpenIssues.length
      )
    );
  }

  return parts.join('\n');
}

/**
 * Formats a cooldown banner message.
 *
 * @param weekNum - Current week number in cooldown
 * @param totalWeeks - Total weeks of cooldown
 * @param endDate - End date of cooldown period
 * @returns Formatted banner string
 */
export function formatCooldownBanner(
  weekNum: number,
  totalWeeks: number,
  endDate: Date
): string {
  const lines: string[] = [];

  lines.push('🏖️ ════════════════════════════════════════ 🏖️');
  lines.push('                COOLDOWN MODE ACTIVE');
  lines.push(`            Week ${weekNum} of ${totalWeeks}`);
  lines.push(`        Ends: ${formatDate(endDate)}`);
  lines.push('');
  lines.push('  Focus: Maintenance work, tech debt & misc items');
  lines.push('  (Project board issues are filtered out)');
  lines.push('🏖️ ════════════════════════════════════════ 🏖️');

  return lines.join('\n');
}

/**
 * Formats a list of issues, either as full list or aggregated summary.
 *
 * @param issues - Array of issues
 * @param orgUrlKey - Optional Linear organization URL key for URL generation
 * @param userId - Optional Linear user ID for URL generation
 * @param forceAggregate - Force aggregation regardless of threshold
 * @returns Formatted issue list string
 */
function formatIssueList(
  issues: Issue[],
  orgUrlKey?: string,
  userId?: string,
  forceAggregate = false
): string {
  // Use aggregation if forced or if threshold exceeded
  if (forceAggregate || issues.length > AGGREGATION_THRESHOLD) {
    return formatAggregatedIssues(issues, orgUrlKey, userId);
  }

  // Otherwise show full list
  return formatFullIssueList(issues, orgUrlKey);
}

/**
 * Formats a full list of issues grouped by project.
 *
 * @param issues - Array of issues
 * @param orgUrlKey - Optional Linear organization URL key for creating issue links
 * @returns Formatted issue list string
 */
function formatFullIssueList(issues: Issue[], orgUrlKey?: string): string {
  // Group issues by project
  const grouped = groupIssuesByProject(issues);

  const lines: string[] = [];

  for (const [projectName, projectIssues] of Object.entries(grouped)) {
    // Project header
    if (projectName === '__no_project__') {
      lines.push('  No Project:');
    } else {
      lines.push(`  ${projectName}:`);
    }

    // Issues
    for (const issue of projectIssues) {
      const priority = formatPriority(issue.priority);
      const estimate = issue.estimate ? ` [${issue.estimate}pts]` : '';

      // Create issue link if we have orgUrlKey
      let issueIdentifier = issue.identifier;
      if (orgUrlKey) {
        const issueUrl = buildLinearIssueUrl(orgUrlKey, issue.identifier);
        issueIdentifier = `<${issueUrl}|${issue.identifier}>`;
      }

      lines.push(
        `    • ${issueIdentifier} - ${issue.title}${priority}${estimate}`
      );
    }

    lines.push(''); // Empty line between projects
  }

  // Remove trailing empty line
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

/**
 * Formats issues as an aggregated summary by priority.
 *
 * @param issues - Array of issues
 * @param orgUrlKey - Optional Linear organization URL key for URL generation
 * @param userId - Optional Linear user ID for URL generation
 * @returns Formatted aggregated summary string
 */
function formatAggregatedIssues(
  issues: Issue[],
  orgUrlKey?: string,
  userId?: string
): string {
  const priorityGroups = aggregateIssuesByPriority(issues);
  const lines: string[] = [];

  lines.push(`  📊 Priority Summary (${issues.length} total):`);

  for (const group of priorityGroups) {
    if (group.count === 0) continue;

    const issueWord = group.count === 1 ? 'issue' : 'issues';
    let line = `    ${group.emoji} ${group.label}: ${group.count} ${issueWord}`;

    // Add Linear search URL if we have the required data
    if (orgUrlKey && userId) {
      const url = buildLinearSearchUrl(orgUrlKey, userId, { priority: group.priority });
      line += ` → <${url}|View in Linear>`;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Groups issues by project name.
 */
function groupIssuesByProject(issues: Issue[]): Record<string, Issue[]> {
  const grouped: Record<string, Issue[]> = {};

  for (const issue of issues) {
    const projectName = issue.projectName || '__no_project__';
    if (!grouped[projectName]) {
      grouped[projectName] = [];
    }
    grouped[projectName].push(issue);
  }

  // Sort projects alphabetically, with no project last
  const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
    if (a === '__no_project__') return 1;
    if (b === '__no_project__') return -1;
    return a.localeCompare(b);
  });

  return Object.fromEntries(sortedEntries);
}

/**
 * Formats a priority value as an emoji indicator.
 * Linear priority scale: 0 = None, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
 */
function formatPriority(priority?: number): string {
  if (priority === undefined) return '';

  switch (priority) {
    case 1:
      return ' 🔴';
    case 2:
      return ' 🟠';
    case 3:
      return ' 🟡';
    case 4:
      return ' 🟢';
    default:
      return '';
  }
}

/**
 * Formats a summary line for the report.
 */
function formatSummary(
  completed: number,
  inProgress: number,
  otherOpen: number
): string {
  const parts: string[] = [];

  parts.push('📊 Summary:');
  parts.push(`  • ${completed} issue${completed !== 1 ? 's' : ''} completed`);
  parts.push(`  • ${inProgress} issue${inProgress !== 1 ? 's' : ''} started`);
  parts.push(`  • ${otherOpen} other open issue${otherOpen !== 1 ? 's' : ''}`);

  return parts.join('\n');
}

/**
 * Formats a date as YYYY-MM-DD using UTC to avoid timezone issues.
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Aggregates issues by priority and returns sorted groups.
 * Linear priority scale: 0 = None, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
 *
 * @param issues - Array of issues to aggregate
 * @returns Array of priority groups sorted by priority (urgent first)
 */
export function aggregateIssuesByPriority(issues: Issue[]): PriorityGroup[] {
  // Initialize counts for all priority levels
  const counts = new Map<number, number>([
    [1, 0], // Urgent
    [2, 0], // High
    [3, 0], // Medium
    [4, 0], // Low
    [0, 0], // None
  ]);

  // Count issues by priority
  for (const issue of issues) {
    const priority = issue.priority ?? 0;
    counts.set(priority, (counts.get(priority) || 0) + 1);
  }

  // Create priority groups in order
  const groups: PriorityGroup[] = [
    { priority: 1, count: counts.get(1) || 0, label: 'Urgent', emoji: '🔴' },
    { priority: 2, count: counts.get(2) || 0, label: 'High', emoji: '🟠' },
    { priority: 3, count: counts.get(3) || 0, label: 'Medium', emoji: '🟡' },
    { priority: 4, count: counts.get(4) || 0, label: 'Low', emoji: '🟢' },
    { priority: 0, count: counts.get(0) || 0, label: 'None', emoji: '⚪' },
  ];

  return groups;
}

/**
 * Builds a URL for an individual Linear issue.
 *
 * @param orgUrlKey - Linear organization URL key (workspace slug, e.g., "nxdev")
 * @param issueIdentifier - Issue identifier (e.g., "NXC-123")
 * @returns Linear issue URL
 */
export function buildLinearIssueUrl(
  orgUrlKey: string,
  issueIdentifier: string
): string {
  return `https://linear.app/${orgUrlKey}/issue/${issueIdentifier}`;
}

/**
 * Filter type for building Linear search URLs.
 */
export type LinearFilterType =
  | 'completed'
  | 'started'
  | 'updated'
  | 'open'
  | { priority: number };

/**
 * Builds a Linear search URL with contextual filters.
 *
 * @param orgUrlKey - Linear organization URL key (workspace slug, e.g., "nxdev")
 * @param userId - Linear user ID
 * @param filterType - Type of filter to apply
 * @returns Linear search URL with filters
 */
export function buildLinearSearchUrl(
  orgUrlKey: string,
  userId: string,
  filterType?: LinearFilterType
): string {
  const baseUrl = `https://linear.app/${orgUrlKey}/issues`;

  const filters: string[] = [];

  // Add assignee filter
  filters.push(`assignee:${userId}`);

  // Add context-specific filters
  if (filterType) {
    if (typeof filterType === 'object' && 'priority' in filterType) {
      filters.push(`priority:${filterType.priority}`);
    } else if (filterType === 'completed') {
      filters.push('is:completed');
    } else if (filterType === 'started') {
      filters.push('is:started');
    } else if (filterType === 'updated') {
      filters.push('updated:>-7d');
    } else if (filterType === 'open') {
      filters.push('is:open');
    }
  }

  // Construct URL with encoded filter parameter
  if (filters.length > 0) {
    const filterString = filters.join('+');
    return `${baseUrl}?filter=${encodeURIComponent(filterString)}`;
  }

  return baseUrl;
}
