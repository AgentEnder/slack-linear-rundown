import {
  formatWeeklyReport,
  formatCooldownBanner,
} from './formatters.js';
import type { UserReport, CooldownStatus, Issue } from './types.js';

describe('formatters', () => {
  describe('formatCooldownBanner', () => {
    it('should format cooldown banner correctly', () => {
      const result = formatCooldownBanner(1, 2, new Date('2025-11-10'));

      expect(result).toContain('COOLDOWN MODE ACTIVE');
      expect(result).toContain('Week 1 of 2');
      expect(result).toContain('2025-11-10');
    });
  });

  describe('formatWeeklyReport', () => {
    it('should format empty report', () => {
      const report: UserReport = {
        userName: 'Test User',
        issuesCompleted: [],
        issuesInProgress: [],
        issuesUpdated: [],
        otherOpenIssues: [],
        reportPeriodStart: new Date('2025-10-20'),
        reportPeriodEnd: new Date('2025-10-27'),
      };

      const cooldownStatus: CooldownStatus = {
        isInCooldown: false,
      };

      const result = formatWeeklyReport(report, cooldownStatus);

      expect(result).toContain('Test User');
      expect(result).toContain('2025-10-20');
      expect(result).toContain('2025-10-27');
      expect(result).toContain('No issues to report');
    });

    it('should format report with completed issues', () => {
      const issues: Issue[] = [
        {
          identifier: 'ENG-123',
          title: 'Test Issue',
          state: 'completed',
          projectName: 'Test Project',
        },
      ];

      const report: UserReport = {
        userName: 'Test User',
        issuesCompleted: issues,
        issuesInProgress: [],
        issuesUpdated: [],
        otherOpenIssues: [],
        reportPeriodStart: new Date('2025-10-20'),
        reportPeriodEnd: new Date('2025-10-27'),
      };

      const cooldownStatus: CooldownStatus = {
        isInCooldown: false,
      };

      const result = formatWeeklyReport(report, cooldownStatus);

      expect(result).toContain('Completed This Week');
      expect(result).toContain('ENG-123');
      expect(result).toContain('Test Issue');
      expect(result).toContain('Test Project');
    });

    it('should include cooldown banner when in cooldown', () => {
      const report: UserReport = {
        userName: 'Test User',
        issuesCompleted: [],
        issuesInProgress: [],
        issuesUpdated: [],
        otherOpenIssues: [],
        reportPeriodStart: new Date('2025-10-20'),
        reportPeriodEnd: new Date('2025-10-27'),
      };

      const cooldownStatus: CooldownStatus = {
        isInCooldown: true,
        weekNumber: 1,
        totalWeeks: 2,
        endDate: new Date('2025-11-10'),
      };

      const result = formatWeeklyReport(report, cooldownStatus);

      expect(result).toContain('COOLDOWN MODE ACTIVE');
      expect(result).toContain('Week 1 of 2');
    });

    it('should group issues by project', () => {
      const issues: Issue[] = [
        {
          identifier: 'ENG-123',
          title: 'Issue 1',
          state: 'started',
          projectName: 'Project A',
        },
        {
          identifier: 'ENG-124',
          title: 'Issue 2',
          state: 'started',
          projectName: 'Project A',
        },
        {
          identifier: 'ENG-125',
          title: 'Issue 3',
          state: 'started',
          projectName: 'Project B',
        },
      ];

      const report: UserReport = {
        userName: 'Test User',
        issuesCompleted: [],
        issuesInProgress: issues,
        issuesUpdated: [],
        otherOpenIssues: [],
        reportPeriodStart: new Date('2025-10-20'),
        reportPeriodEnd: new Date('2025-10-27'),
      };

      const cooldownStatus: CooldownStatus = {
        isInCooldown: false,
      };

      const result = formatWeeklyReport(report, cooldownStatus);

      expect(result).toContain('Project A:');
      expect(result).toContain('Project B:');
      expect(result).toContain('ENG-123');
      expect(result).toContain('ENG-125');
    });

    it('should format priority indicators', () => {
      const issues: Issue[] = [
        {
          identifier: 'ENG-123',
          title: 'Urgent Issue',
          state: 'started',
          priority: 1,
        },
        {
          identifier: 'ENG-124',
          title: 'High Issue',
          state: 'started',
          priority: 2,
        },
      ];

      const report: UserReport = {
        userName: 'Test User',
        issuesCompleted: [],
        issuesInProgress: issues,
        issuesUpdated: [],
        otherOpenIssues: [],
        reportPeriodStart: new Date('2025-10-20'),
        reportPeriodEnd: new Date('2025-10-27'),
      };

      const cooldownStatus: CooldownStatus = {
        isInCooldown: false,
      };

      const result = formatWeeklyReport(report, cooldownStatus);

      expect(result).toContain('🔴'); // Urgent
      expect(result).toContain('🟠'); // High
    });
  });
});
