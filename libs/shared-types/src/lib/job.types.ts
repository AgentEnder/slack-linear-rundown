/**
 * Job and scheduling types
 */

export interface Job {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleDescription: string;
  lastRun: string | null;
  lastStatus: 'success' | 'failure' | 'running' | null;
  lastError: string | null;
  lastDurationMs: number | null;
  isRunning: boolean;
}

export interface JobRunResult {
  success: boolean;
  message: string;
  details?: any;
}
