/**
 * Statistics and analytics types
 */

export interface Stats {
  total: number;
  successful: number;
  failed: number;
}

export interface UserStats {
  total: number;
  active: number;
  receivingReports: number;
  fullyMapped: number;
}
