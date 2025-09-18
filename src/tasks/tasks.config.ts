export interface TasksConfig {
  recurringEvent: {
    batchSize: number;
    bufferDays: number;
    concurrentJobs: number;
    cronSchedule: string;
    lockTtlMs: number;
    jobRetryAttempts: number;
    jobRetryDelayMs: number;
    cleanupSchedule: string;
    metricsRetentionDays: number;
  };
}

export const DEFAULT_TASKS_CONFIG: TasksConfig = {
  recurringEvent: {
    batchSize: 50,
    bufferDays: 15,
    concurrentJobs: 5,
    cronSchedule: '*/5 * * * *', // Every 5 minutes
    lockTtlMs: 300000, // 5 minutes
    jobRetryAttempts: 3,
    jobRetryDelayMs: 5000, // 5 seconds
    cleanupSchedule: '0 2 * * *', // Daily at 2 AM
    metricsRetentionDays: 30,
  },
};

export const getTasksConfig = (): TasksConfig => ({
  recurringEvent: {
    batchSize: parseInt(process.env.RECURRING_EVENT_BATCH_SIZE || '50'),
    bufferDays: parseInt(process.env.RECURRING_EVENT_BUFFER_DAYS || '15'),
    concurrentJobs: parseInt(
      process.env.RECURRING_EVENT_CONCURRENT_JOBS || '5',
    ),
    cronSchedule: process.env.RECURRING_EVENT_CRON_SCHEDULE || '*/5 * * * *',
    lockTtlMs: parseInt(process.env.RECURRING_EVENT_LOCK_TTL_MS || '300000'),
    jobRetryAttempts: parseInt(
      process.env.RECURRING_EVENT_JOB_RETRY_ATTEMPTS || '3',
    ),
    jobRetryDelayMs: parseInt(
      process.env.RECURRING_EVENT_JOB_RETRY_DELAY_MS || '5000',
    ),
    cleanupSchedule:
      process.env.RECURRING_EVENT_CLEANUP_SCHEDULE || '0 2 * * *',
    metricsRetentionDays: parseInt(
      process.env.RECURRING_EVENT_METRICS_RETENTION_DAYS || '30',
    ),
  },
});
