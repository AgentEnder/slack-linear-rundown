/**
 * Linear-GitHub Correlation Service
 *
 * Automatically detects and creates links between Linear issues and GitHub PRs/issues.
 * Uses multiple detection strategies with confidence scoring.
 */

import { IssueGitHubLink, Issue } from '@slack-linear-rundown/database';
import type {
  GitHubPullRequest as GitHubPRType,
  GitHubIssue as GitHubIssueType,
} from '@slack-linear-rundown/github';
import { logger } from '../utils/logger';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type LinkType = 'linear_attachment' | 'pr_title' | 'pr_body' | 'branch_name' | 'manual';

export interface CorrelationMatch {
  linearIssueId: number;
  linearIssueIdentifier: string;
  githubPRId?: number;
  githubIssueId?: number;
  linkType: LinkType;
  confidence: ConfidenceLevel;
  detectionPattern: string;
}

/**
 * Extract Linear issue identifiers from text
 * Supports patterns like: ENG-123, [ENG-123], ENG-123:, #ENG-123
 */
export function extractLinearIssueIds(text: string): string[] {
  if (!text) return [];

  const patterns = [
    // Standard format: ENG-123, PROJ-456
    /\b([A-Z]{2,10})-(\d{1,6})\b/g,
    // Bracketed: [ENG-123]
    /\[([A-Z]{2,10})-(\d{1,6})\]/g,
    // Hashtag: #ENG-123
    /#([A-Z]{2,10})-(\d{1,6})\b/g,
    // With colon: ENG-123:
    /\b([A-Z]{2,10})-(\d{1,6}):/g,
  ];

  const found = new Set<string>();

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      // match[1] and match[2] are the team key and number
      const issueId = `${match[1]}-${match[2]}`;
      found.add(issueId);
    }
  }

  return Array.from(found);
}

/**
 * Extract Linear issue IDs from Linear URLs
 * Supports: https://linear.app/workspace/issue/ENG-123/...
 */
export function extractLinearIssueIdsFromUrls(text: string): string[] {
  if (!text) return [];

  const urlPattern = /https?:\/\/linear\.app\/[^/]+\/issue\/([A-Z]{2,10}-\d{1,6})/g;
  const matches = text.matchAll(urlPattern);
  const found = new Set<string>();

  for (const match of matches) {
    found.add(match[1]);
  }

  return Array.from(found);
}

/**
 * Extract Linear issue ID from branch name
 * Supports patterns like: eng-123-feature, eng/123-description, feature/eng-123
 */
export function extractLinearIssueIdFromBranch(branchName: string): string | null {
  if (!branchName) return null;

  const patterns = [
    // eng-123-feature or eng/123-description
    /^([a-z]{2,10})[-/](\d{1,6})/i,
    // feature/eng-123 or fix/eng-123
    /\/([a-z]{2,10})-(\d{1,6})/i,
  ];

  for (const pattern of patterns) {
    const match = branchName.match(pattern);
    if (match) {
      return `${match[1].toUpperCase()}-${match[2]}`;
    }
  }

  return null;
}

/**
 * Find Linear issues by identifiers
 */
export async function findLinearIssuesByIdentifiers(
  identifiers: string[]
): Promise<Map<string, Issue>> {
  if (identifiers.length === 0) {
    return new Map();
  }

  const issues = await Issue.findAll({
    where: {
      identifier: identifiers,
    },
  });

  const issueMap = new Map<string, Issue>();
  for (const issue of issues) {
    issueMap.set(issue.identifier, issue);
  }

  return issueMap;
}

/**
 * Correlate a GitHub PR with Linear issues
 */
export async function correlateGitHubPR(
  pr: GitHubPRType,
  dbPRId: number
): Promise<CorrelationMatch[]> {
  const matches: CorrelationMatch[] = [];

  // Strategy 1: Check branch name (HIGH confidence)
  if (pr.head.ref) {
    const branchIssueId = extractLinearIssueIdFromBranch(pr.head.ref);
    if (branchIssueId) {
      const issueMap = await findLinearIssuesByIdentifiers([branchIssueId]);
      const issue = issueMap.get(branchIssueId);
      if (issue) {
        matches.push({
          linearIssueId: issue.id,
          linearIssueIdentifier: issue.identifier,
          githubPRId: dbPRId,
          linkType: 'branch_name',
          confidence: 'high',
          detectionPattern: pr.head.ref,
        });
        logger.info('Correlated PR via branch name', {
          pr: pr.number,
          branch: pr.head.ref,
          linearIssue: branchIssueId,
        });
      }
    }
  }

  // Strategy 2: Check PR title (MEDIUM confidence)
  const titleIssueIds = extractLinearIssueIds(pr.title);
  const titleUrlIds = extractLinearIssueIdsFromUrls(pr.title);
  const titleIds = [...titleIssueIds, ...titleUrlIds];

  if (titleIds.length > 0) {
    const issueMap = await findLinearIssuesByIdentifiers(titleIds);
    for (const issueId of titleIds) {
      const issue = issueMap.get(issueId);
      if (issue) {
        // Don't duplicate if already found via branch
        if (!matches.some((m) => m.linearIssueId === issue.id)) {
          matches.push({
            linearIssueId: issue.id,
            linearIssueIdentifier: issue.identifier,
            githubPRId: dbPRId,
            linkType: 'pr_title',
            confidence: 'medium',
            detectionPattern: issueId,
          });
          logger.info('Correlated PR via title', {
            pr: pr.number,
            title: pr.title,
            linearIssue: issueId,
          });
        }
      }
    }
  }

  // Strategy 3: Check PR body (MEDIUM confidence)
  if (pr.body) {
    const bodyIssueIds = extractLinearIssueIds(pr.body);
    const bodyUrlIds = extractLinearIssueIdsFromUrls(pr.body);
    const bodyIds = [...bodyIssueIds, ...bodyUrlIds];

    if (bodyIds.length > 0) {
      const issueMap = await findLinearIssuesByIdentifiers(bodyIds);
      for (const issueId of bodyIds) {
        const issue = issueMap.get(issueId);
        if (issue) {
          // Don't duplicate if already found
          if (!matches.some((m) => m.linearIssueId === issue.id)) {
            matches.push({
              linearIssueId: issue.id,
              linearIssueIdentifier: issue.identifier,
              githubPRId: dbPRId,
              linkType: 'pr_body',
              confidence: 'medium',
              detectionPattern: issueId,
            });
            logger.info('Correlated PR via body', {
              pr: pr.number,
              linearIssue: issueId,
            });
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Correlate a GitHub issue with Linear issues
 */
export async function correlateGitHubIssue(
  issue: GitHubIssueType,
  dbIssueId: number
): Promise<CorrelationMatch[]> {
  const matches: CorrelationMatch[] = [];

  // Strategy 1: Check issue title (MEDIUM confidence)
  const titleIssueIds = extractLinearIssueIds(issue.title);
  const titleUrlIds = extractLinearIssueIdsFromUrls(issue.title);
  const titleIds = [...titleIssueIds, ...titleUrlIds];

  if (titleIds.length > 0) {
    const issueMap = await findLinearIssuesByIdentifiers(titleIds);
    for (const linearIssueId of titleIds) {
      const linearIssue = issueMap.get(linearIssueId);
      if (linearIssue) {
        matches.push({
          linearIssueId: linearIssue.id,
          linearIssueIdentifier: linearIssue.identifier,
          githubIssueId: dbIssueId,
          linkType: 'pr_title', // Using pr_title for consistency
          confidence: 'medium',
          detectionPattern: linearIssueId,
        });
        logger.info('Correlated GitHub issue via title', {
          githubIssue: issue.number,
          title: issue.title,
          linearIssue: linearIssueId,
        });
      }
    }
  }

  // Strategy 2: Check issue body (MEDIUM confidence)
  if (issue.body) {
    const bodyIssueIds = extractLinearIssueIds(issue.body);
    const bodyUrlIds = extractLinearIssueIdsFromUrls(issue.body);
    const bodyIds = [...bodyIssueIds, ...bodyUrlIds];

    if (bodyIds.length > 0) {
      const issueMap = await findLinearIssuesByIdentifiers(bodyIds);
      for (const linearIssueId of bodyIds) {
        const linearIssue = issueMap.get(linearIssueId);
        if (linearIssue) {
          // Don't duplicate
          if (!matches.some((m) => m.linearIssueId === linearIssue.id)) {
            matches.push({
              linearIssueId: linearIssue.id,
              linearIssueIdentifier: linearIssue.identifier,
              githubIssueId: dbIssueId,
              linkType: 'pr_body', // Using pr_body for consistency
              confidence: 'medium',
              detectionPattern: linearIssueId,
            });
            logger.info('Correlated GitHub issue via body', {
              githubIssue: issue.number,
              linearIssue: linearIssueId,
            });
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Create or update correlation links in the database
 */
export async function persistCorrelations(matches: CorrelationMatch[]): Promise<number> {
  let createdCount = 0;

  for (const match of matches) {
    try {
      const [link, created] = await IssueGitHubLink.findOrCreate({
        where: {
          issue_id: match.linearIssueId,
          github_pr_id: match.githubPRId || null,
          github_issue_id: match.githubIssueId || null,
        },
        defaults: {
          issue_id: match.linearIssueId,
          github_pr_id: match.githubPRId || null,
          github_issue_id: match.githubIssueId || null,
          link_type: match.linkType,
          confidence: match.confidence,
          detected_at: new Date(),
          detection_pattern: match.detectionPattern,
        },
      });

      if (created) {
        createdCount++;
        logger.info('Created correlation link', {
          linearIssue: match.linearIssueIdentifier,
          githubPR: match.githubPRId,
          githubIssue: match.githubIssueId,
          confidence: match.confidence,
        });
      } else {
        // Update if confidence is higher
        const currentConfidence = link.confidence;
        const newConfidence = match.confidence;

        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        if (confidenceOrder[newConfidence] > confidenceOrder[currentConfidence]) {
          await link.update({
            link_type: match.linkType,
            confidence: match.confidence,
            detection_pattern: match.detectionPattern,
          });
          logger.info('Updated correlation link with higher confidence', {
            linearIssue: match.linearIssueIdentifier,
            oldConfidence: currentConfidence,
            newConfidence: match.confidence,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to persist correlation', {
        match,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return createdCount;
}

/**
 * Batch correlate GitHub data with Linear issues
 * This should be called after syncing GitHub data to the database
 */
export async function correlateBatch(params: {
  prs: Array<{ githubPR: GitHubPRType; dbId?: number }>;
  issues: Array<{ githubIssue: GitHubIssueType; dbId?: number }>;
}): Promise<{ totalMatches: number; createdLinks: number }> {
  const allMatches: CorrelationMatch[] = [];

  // Import database models
  const { GitHubPullRequest, GitHubIssue } = await import('@slack-linear-rundown/database');

  // Correlate PRs
  for (const { githubPR, dbId } of params.prs) {
    let prDbId = dbId;

    // Look up database ID if not provided
    if (!prDbId) {
      const dbPR = await GitHubPullRequest.findOne({
        where: { github_id: String(githubPR.id) },
      });
      if (!dbPR) {
        logger.warn('Could not find database record for GitHub PR', {
          githubPRId: githubPR.id,
          prNumber: githubPR.number,
        });
        continue;
      }
      prDbId = dbPR.id;
    }

    const matches = await correlateGitHubPR(githubPR, prDbId);
    allMatches.push(...matches);
  }

  // Correlate GitHub issues
  for (const { githubIssue, dbId } of params.issues) {
    let issueDbId = dbId;

    // Look up database ID if not provided
    if (!issueDbId) {
      const dbIssue = await GitHubIssue.findOne({
        where: { github_id: String(githubIssue.id) },
      });
      if (!dbIssue) {
        logger.warn('Could not find database record for GitHub issue', {
          githubIssueId: githubIssue.id,
          issueNumber: githubIssue.number,
        });
        continue;
      }
      issueDbId = dbIssue.id;
    }

    const matches = await correlateGitHubIssue(githubIssue, issueDbId);
    allMatches.push(...matches);
  }

  // Persist all correlations
  const createdLinks = await persistCorrelations(allMatches);

  logger.info('Batch correlation complete', {
    totalPRs: params.prs.length,
    totalGitHubIssues: params.issues.length,
    totalMatches: allMatches.length,
    createdLinks,
  });

  return {
    totalMatches: allMatches.length,
    createdLinks,
  };
}

/**
 * Get correlated GitHub work for a Linear issue
 */
export async function getCorrelatedGitHubWork(linearIssueId: number): Promise<{
  pullRequests: any[];
  issues: any[];
}> {
  const links = await IssueGitHubLink.findAll({
    where: { issue_id: linearIssueId },
    include: [
      {
        association: 'github_pull_request',
        required: false,
      },
      {
        association: 'github_issue',
        required: false,
      },
    ],
  });

  const pullRequests = links
    .filter((link) => link.github_pr_id)
    .map((link) => link.github_pull_request)
    .filter(Boolean);

  const issues = links
    .filter((link) => link.github_issue_id)
    .map((link) => link.github_issue)
    .filter(Boolean);

  return { pullRequests, issues };
}
