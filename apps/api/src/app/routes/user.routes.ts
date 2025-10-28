/**
 * User API Routes
 *
 * Routes for the user-facing app to fetch issues and filter options.
 */

import { Router } from 'express';
import { requireJWTAuth } from '../middleware/jwt-auth';
import * as IssueSyncService from '../services/issue-sync.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/user/issues/:category
 * Get user's issues by category (completed, started, updated, open)
 */
router.get('/user/issues/:category', requireJWTAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.userId!;

    // Validate category
    const validCategories = ['completed', 'started', 'updated', 'open'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`,
      });
      return;
    }

    // Parse filters from query params
    const filters: any = {};

    if (req.query.projectId) {
      filters.projectId = String(req.query.projectId);
    }

    if (req.query.teamId) {
      filters.teamId = String(req.query.teamId);
    }

    if (req.query.priority !== undefined) {
      filters.priority = Number(req.query.priority);
    }

    if (req.query.stateType) {
      filters.stateType = String(req.query.stateType);
    }

    if (req.query.search) {
      filters.search = String(req.query.search);
    }

    // Fetch issues
    const issues = await IssueSyncService.getUserIssuesByCategory(
      userId,
      category,
      filters
    );

    logger.info('Fetched user issues', {
      userId,
      category,
      count: issues.length,
      filters,
    });

    res.json({
      issues,
      count: issues.length,
      category,
      filters,
    });
  } catch (error) {
    logger.error('Failed to fetch user issues', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.userId,
      category: req.params.category,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch issues.',
    });
  }
});

/**
 * GET /api/user/filter-options
 * Get available filter options (projects, teams) for the user
 */
router.get('/user/filter-options', requireJWTAuth, async (req, res) => {
  try {
    const userId = req.userId!;

    const filterOptions = await IssueSyncService.getUserFilterOptions(userId);

    logger.info('Fetched user filter options', {
      userId,
      projectCount: filterOptions.projects.length,
      teamCount: filterOptions.teams.length,
    });

    res.json(filterOptions);
  } catch (error) {
    logger.error('Failed to fetch user filter options', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.userId,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch filter options.',
    });
  }
});

/**
 * GET /api/user/me
 * Get current user info
 */
router.get('/user/me', requireJWTAuth, async (req, res) => {
  try {
    const user = req.user!;

    res.json({
      id: user.id,
      email: user.email,
      name: user.slack_real_name || user.linear_name || user.email,
      linearUserId: user.linear_user_id,
      slackUserId: user.slack_user_id,
    });
  } catch (error) {
    logger.error('Failed to fetch current user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.userId,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user info.',
    });
  }
});

export { router as userRouter };
